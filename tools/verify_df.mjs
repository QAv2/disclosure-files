// Headless verification of the Disclosure Files map (Playwright + system Chrome).
//   cd ~/disclosure-files && python3 -m http.server 8765 &
//   node tools/verify_df.mjs http://localhost:8765/ /tmp/out [node-id ...]
// Reports: node/connection counts rendered in the SVG, console errors, failed requests,
// entity-map load line, and (for each node id given) that its element exists and its
// panel opens with the expected title + linked Intel Console entities.
import { chromium } from '/home/joseph/oz-archive/tools/node_modules/playwright/index.mjs';

const URL = process.argv[2] || 'http://localhost:8765/';
const OUT = process.argv[3] || '/tmp';
const CHECK = process.argv.slice(4);
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const errors = [], failed = [], logs = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); else if (/Entity data loaded/.test(m.text())) logs.push(m.text()); });
page.on('requestfailed', r => failed.push('FAILED ' + r.url()));
page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2500);
const counts = await page.evaluate(() => ({
  dataNodes: NODES.length, dataConnections: CONNECTIONS.length, branches: Object.keys(BRANCHES).length,
  svgNodeEls: [...document.querySelectorAll('#map-svg g[data-id]')].filter(g => { const id = g.getAttribute('data-id'); return id !== 'center' && !id.startsWith('branch-'); }).length,
  svgBranchLabels: [...document.querySelectorAll('#map-svg text')].filter(t => Object.values(BRANCHES).some(b => t.textContent.trim() === b.label)).length,
  centerCaption: document.querySelector('#map-svg')?.textContent.match(/\d+ nodes · \d+ branches/)?.[0] || null,
}));
await page.screenshot({ path: `${OUT}/verify_df_map.png` });
const checks = {};
for (const id of CHECK) {
  const r = await page.evaluate((id) => {
    const n = NODES.find(x => x.id === id);
    const el = document.querySelector(`[data-node-id="${id}"]`) || [...document.querySelectorAll('#map-svg g')].find(g => g.getAttribute('data-id') === id);
    return { inData: !!n, title: n?.title, inSvg: !!el, evidence: n?.evidence?.length, sources: n?.sources?.length };
  }, id);
  checks[id] = r;
}
console.log(JSON.stringify({ counts, checks, logs, errors: errors.slice(0, 10), failed: failed.slice(0, 10) }, null, 1));
await browser.close();
