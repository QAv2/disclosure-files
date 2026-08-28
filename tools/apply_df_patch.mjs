// Apply a corrections/additions patch to js/data.js.
//
//   node tools/apply_df_patch.mjs <patch.json> [--dry-run]
//
// Patch format (see the 2026-08 audit): { corrections:[{id,path,current,proposed}],
//   new_evidence:[{id,evidence:{text,tier,source},source:{label,url}}],
//   new_nodes:[node], new_connections:[[a,b]], notes:[...] }
// The file is rewritten as: header comment (verbatim) + BRANCHES + NODES + CONNECTIONS,
// each serialized with JSON.stringify(_, null, 2). Validates unique ids, resolvable
// connections, evidence tiers and required node fields before writing.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DATA_JS = path.join(ROOT, 'js', 'data.js');
const patchPath = process.argv[2];
const dry = process.argv.includes('--dry-run');
if (!patchPath) { console.error('usage: node tools/apply_df_patch.mjs <patch.json> [--dry-run]'); process.exit(2); }

const src = fs.readFileSync(DATA_JS, 'utf8');
const ctx = {}; vm.createContext(ctx); vm.runInContext(src, ctx);
const BRANCHES = ctx.BRANCHES, NODES = ctx.NODES, CONNECTIONS = ctx.CONNECTIONS;
const header = src.slice(0, src.indexOf('var BRANCHES'));
const patch = JSON.parse(fs.readFileSync(patchPath, 'utf8'));
const TIERS = new Set(['documented', 'credible', 'inference', 'speculative']);
const byId = new Map(NODES.map(n => [n.id, n]));
const problems = [], applied = [];

// ---- corrections ----
function getPath(obj, p) {
  const m = p.match(/^(description|fullDescription|title)$/);
  if (m) return [obj, m[1]];
  const e = p.match(/^evidence\[(\d+)\]\.(text|tier|source)$/);
  if (e) return [obj.evidence?.[+e[1]], e[2]];
  const s = p.match(/^sources\[(\d+)\]\.(label|url)$/);
  if (s) return [obj.sources?.[+s[1]], s[2]];
  return [null, null];
}
for (const c of patch.corrections || []) {
  const n = byId.get(c.id);
  if (!n) { problems.push(`correction: unknown node ${c.id}`); continue; }
  const [target, key] = getPath(n, c.path);
  if (!target) { problems.push(`correction ${c.id}: bad path ${c.path}`); continue; }
  if (c.current != null && target[key] !== c.current) {
    // tolerate whitespace-only differences; otherwise refuse (the audit may have paraphrased)
    const norm = s => String(s).replace(/\s+/g, ' ').trim();
    if (norm(target[key]) !== norm(c.current)) {
      if (String(target[key]).includes(norm(c.current).slice(0, 60))) {
        // partial match on prefix: replace the matched substring only
        target[key] = String(target[key]).replace(c.current, c.proposed);
        applied.push(`~ ${c.id}.${c.path} (substring)`); continue;
      }
      problems.push(`correction ${c.id}.${c.path}: 'current' does not match file (skipped)`); continue;
    }
  }
  if (key === 'tier' && !TIERS.has(c.proposed)) { problems.push(`correction ${c.id}: illegal tier ${c.proposed}`); continue; }
  target[key] = c.proposed; applied.push(`~ ${c.id}.${c.path}`);
}

// ---- new evidence ----
for (const ne of patch.new_evidence || []) {
  const n = byId.get(ne.id);
  if (!n) { problems.push(`new_evidence: unknown node ${ne.id}`); continue; }
  const ev = ne.evidence;
  if (!ev?.text || !TIERS.has(ev.tier)) { problems.push(`new_evidence ${ne.id}: bad evidence`); continue; }
  if ((n.evidence || []).some(x => x.text === ev.text)) continue;   // idempotent
  n.evidence = n.evidence || []; n.evidence.push({ text: ev.text, tier: ev.tier, source: ev.source || '' });
  if (ne.source?.url && !(n.sources || []).some(s => s.url === ne.source.url)) { n.sources = n.sources || []; n.sources.push({ label: ne.source.label, url: ne.source.url }); }
  applied.push(`+ev ${ne.id}`);
}

// ---- new nodes ----
for (const nn of patch.new_nodes || []) {
  const req = ['id', 'branch', 'ring', 'title', 'description', 'fullDescription', 'evidence', 'sources'];
  const missing = req.filter(k => nn[k] === undefined);
  if (missing.length) { problems.push(`new_node ${nn.id}: missing ${missing}`); continue; }
  if (!BRANCHES[nn.branch]) { problems.push(`new_node ${nn.id}: unknown branch ${nn.branch}`); continue; }
  if (![1, 2, 3].includes(nn.ring)) { problems.push(`new_node ${nn.id}: ring must be 1-3`); continue; }
  if (!nn.evidence.every(e => e.text && TIERS.has(e.tier))) { problems.push(`new_node ${nn.id}: bad evidence tier/text`); continue; }
  if (!nn.sources.every(s => s.label && /^https?:\/\//.test(s.url))) { problems.push(`new_node ${nn.id}: bad source url`); continue; }
  if (byId.has(nn.id)) { // replace existing draft of same id
    const i = NODES.findIndex(n => n.id === nn.id); NODES[i] = nn; byId.set(nn.id, nn); applied.push(`= node ${nn.id} (replaced)`); continue;
  }
  NODES.push(nn); byId.set(nn.id, nn); applied.push(`+ node ${nn.id} [${nn.branch} r${nn.ring}]`);
}

// ---- new connections ----
const connKey = c => c.slice(0, 2).sort().join('|');
const have = new Set(CONNECTIONS.map(connKey));
for (const c of patch.new_connections || []) {
  if (!byId.has(c[0]) || !byId.has(c[1])) { problems.push(`connection ${c[0]}–${c[1]}: unknown node`); continue; }
  if (c[0] === c[1] || have.has(connKey(c))) continue;
  CONNECTIONS.push([c[0], c[1]]); have.add(connKey(c)); applied.push(`+ conn ${c[0]} — ${c[1]}`);
}

// ---- global validation ----
const ids = NODES.map(n => n.id);
if (new Set(ids).size !== ids.length) problems.push('duplicate node ids after patch');
for (const c of CONNECTIONS) if (!byId.has(c[0]) || !byId.has(c[1])) problems.push(`dangling connection ${c}`);

console.log(`applied ${applied.length} changes; ${problems.length} problems`);
applied.forEach(a => console.log('  ' + a));
problems.forEach(p => console.log('  !! ' + p));
if (dry) { console.log('(dry run — nothing written)'); process.exit(problems.length ? 1 : 0); }
if (problems.some(p => p.startsWith('duplicate') || p.startsWith('dangling'))) { console.error('refusing to write: structural problems'); process.exit(1); }

// keep the header's MAP_CONFIG / comment counts honest
const nB = Object.keys(BRANCHES).length, nN = NODES.length;
const branchList = Object.values(BRANCHES).map(b => b.label).join(', ');
const header2 = header
  .replace(/\d+ disclosure nodes \+ \d+ QA nodes across \d+ branches/, `${nN} disclosure nodes across ${nB} branches`)
  .replace(/\d+ nodes · \d+ branches/, `${nN} nodes · ${nB} branches`)
  .replace(/\d+ nodes across \d+ branches:[^"]*"/, `${nN} nodes across ${nB} branches: ${branchList}."`);
const out = header2
  + 'var BRANCHES = ' + JSON.stringify(BRANCHES, null, 2) + ';\n\n'
  + 'var NODES = ' + JSON.stringify(NODES, null, 2) + ';\n\n'
  + 'var CONNECTIONS = ' + JSON.stringify(CONNECTIONS, null, 2) + ';\n';
fs.writeFileSync(DATA_JS, out);
console.log(`wrote ${DATA_JS}: ${NODES.length} nodes, ${CONNECTIONS.length} connections, ${Object.keys(BRANCHES).length} branches`);
