#!/usr/bin/env python3
"""
Build Unified Graph — Disclosure Files + Intel Console entity mapping.

Inputs:
  - js/keyword-links.js   → 314 keyword→topic mappings
  - js/data.js             → NODES array (id, title, branch, description)
  - IC static/data/entities.json → 762 entities
  - IC static/data/graph.json    → connection counts

Outputs (to data/):
  - topic-entity-map.json  → {byTopic: {topic_id: [entity_ids]}, byEntity: {entity_id: [topic_ids]}}
  - entities-index.json    → {id, name, entity_type, connection_count, aliases}
  - unmatched.json         → entities with no topic match (review file)
"""

import json
import os
import re
import sys
from collections import defaultdict

# ── Paths ──
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
IC_DIR = os.path.expanduser("~/intel-console/static/data")

KEYWORD_LINKS_JS = os.path.join(SCRIPT_DIR, "js", "keyword-links.js")
DATA_JS = os.path.join(SCRIPT_DIR, "js", "data.js")
ENTITIES_JSON = os.path.join(IC_DIR, "entities.json")
GRAPH_JSON = os.path.join(IC_DIR, "graph.json")

OUTPUT_DIR = os.path.join(SCRIPT_DIR, "data")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def parse_keyword_links(path):
    """Parse KEYWORD_LINKS from JS file → list of (keyword, topic_id)."""
    with open(path) as f:
        content = f.read()
    # Match ["keyword", "target-node-id"]
    pairs = re.findall(r'\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\]', content)
    return pairs


def parse_nodes_from_data_js(path):
    """Parse NODES array from data.js → list of {id, title, branch, description}."""
    with open(path) as f:
        content = f.read()

    # Extract NODES array section
    nodes_start = content.find("var NODES = [")
    if nodes_start < 0:
        print("ERROR: Could not find NODES array in data.js")
        sys.exit(1)

    # Find matching bracket - count brackets
    bracket_depth = 0
    start_idx = content.index("[", nodes_start)
    i = start_idx
    while i < len(content):
        if content[i] == "[":
            bracket_depth += 1
        elif content[i] == "]":
            bracket_depth -= 1
            if bracket_depth == 0:
                break
        i += 1

    nodes_json_str = content[start_idx : i + 1]

    try:
        nodes = json.loads(nodes_json_str)
    except json.JSONDecodeError:
        # Fallback: extract id/title/branch with regex per object
        print("WARN: JSON parse of NODES failed, using regex fallback")
        nodes = []
        # Split by object boundaries
        for m in re.finditer(
            r'"id"\s*:\s*"([^"]+)".*?"branch"\s*:\s*"([^"]+)".*?"title"\s*:\s*"([^"]+)"',
            nodes_json_str,
            re.DOTALL,
        ):
            nodes.append({"id": m.group(1), "branch": m.group(2), "title": m.group(3), "description": ""})

    return nodes


def load_ic_entities(path):
    """Load IC entities.json → dict of {id: entity}."""
    with open(path) as f:
        return json.load(f)


def load_ic_graph(path):
    """Load IC graph.json → dict of nodes with connection counts."""
    with open(path) as f:
        data = json.load(f)
    # Build id→connection_count lookup from nodes array
    counts = {}
    for node in data.get("nodes", []):
        counts[node["id"]] = node.get("connection_count", 0)
    return counts


def build_mapping(keyword_links, df_nodes, ic_entities):
    """
    Multi-pass mapping: keyword matching, description scanning, topic-keyword expansion.
    Returns (by_topic, by_entity, unmatched).
    """
    by_topic = defaultdict(set)
    by_entity = defaultdict(set)
    matched_entity_ids = set()

    # Build lookup structures
    # keyword → set of topic_ids
    keyword_to_topics = defaultdict(set)
    for keyword, topic_id in keyword_links:
        keyword_to_topics[keyword.lower()].add(topic_id)

    # ── Supplementary description→topic signals ──
    # These catch entities whose descriptions mention topic-relevant terms
    # not covered by keyword-links.js (which maps DF cross-references, not IC entities)
    DESCRIPTION_SIGNALS = {
        # Epstein network
        "epstein-wexner": ["wexner", "mega group", "les wexner", "limited brands"],
        "epstein-financial": ["epstein.*financ", "epstein.*bank", "epstein.*money", "bear stearns.*epstein", "deutsche bank.*epstein", "epstein.*hedge fund"],
        "epstein-political-protection": ["epstein.*plea", "epstein.*prosecut", "non-prosecution", "acosta.*epstein", "epstein.*plea deal"],
        "epstein-maxwell-mossad": ["maxwell", "mossad", "ghislaine", "robert maxwell", "promis software", "epstein.*intelligence", "epstein.*mossad"],
        # Broad Epstein network catch-all — entities mentioning Epstein get mapped here
        "epstein-wexner": ["epstein.*network", "epstein.*connect", "epstein.*associate"],
        "epstein-leon-black": ["leon black", "apollo global"],
        "epstein-academic": ["epstein.*harvard", "epstein.*mit", "epstein.*science"],
        "epstein-surveillance": ["epstein.*surveillance", "epstein.*camera", "epstein.*tape", "epstein.*blackmail"],
        "epstein-barak": ["ehud barak", "barak"],
        "epstein-carbyne": ["carbyne", "unit 8200"],
        "epstein-death": ["epstein.*death", "epstein.*suicide", "metropolitan correctional"],
        "epstein-bin-sulayem": ["bin sulayem", "dubai.*epstein"],
        "epstein-palantir": ["palantir", "peter thiel.*epstein"],
        # Central banking / finance
        "central-banking": ["federal reserve", "central bank", "bank of england", "imf", "world bank", "bis ", "jpmorgan", "goldman sachs", "deutsche bank", "bank.*suspicious.*wire", "bcci", "first american bank"],
        # Intelligence
        "intelligence": ["intelligence communit", "intelligence agenc", "covert operation", "special access program", "classified.*program"],
        # Drug trafficking
        "drug-trafficking-intel": ["drug traffic", "cocaine", "heroin", "narcotics", "air america", "mena airport", "contra.*drug", "drug.*cia"],
        # Iran-Contra
        "iran-contra-full": ["iran.contra", "oliver north", "contras", "boland amendment", "arms.*iran"],
        # Family networks / organized crime
        "family-networks": ["crime family", "mafia", "mob boss", "organized crime", "cosa nostra", "gambino", "genovese", "lucchese", "colombo", "bonanno", "philadelphia.*mob", "lansky"],
        # 9/11 topics
        "sept-11-foreknowledge": ["9/11.*foreknowledge", "pre-9/11", "before september 11"],
        "sept-11-commission": ["9/11 commission", "zelikow"],
        "sept-11-iraq-war": ["iraq war", "weapons of mass destruction", "wmds"],
        "sept-11-war-profiteering": ["halliburton", "blackwater", "war profiteer", "kbr "],
        "sept-11-torture": ["abu ghraib", "guantanamo", "rendition", "black site", "waterboard"],
        "sept-11-patriot-act": ["patriot act", "nsa.*surveil", "mass surveillance", "bulk collection", "section 215", "fisa"],
        # Assassination
        "assassination-jfk": ["jfk", "kennedy assassination", "dealey plaza", "oswald"],
        "assassination-rfk": ["rfk", "robert kennedy", "sirhan"],
        "assassination-mlk": ["martin luther king", "mlk.*assassin"],
        # MK-Ultra / experiments
        "experiment-mkultra-full": ["mkultra", "mk-ultra", "mind control", "gottlieb", "subproject"],
        "experiment-biological": ["biological.*experiment", "biological.*test.*citizen", "biological.*weapon"],
        "experiment-radiation": ["radiation.*experiment", "plutonium.*inject"],
        # UAP
        "uap-program-history": ["uap ", "ufo", "unidentified aerial", "aatip", "aawsap", "elizondo"],
        "uap-legislation": ["uap.*disclosure", "uap.*act", "uap.*legislat"],
        "uap-wilson-davis": ["wilson.davis", "wilson memo"],
        "uap-skinwalker": ["skinwalker", "aawsap", "bigelow"],
        "uap-legal-architecture": ["daniel sheehan", "new paradigm institute", "disclosure project"],
        # Supranational
        "supranational": ["bilderberg", "council on foreign relations", "trilateral commission", "world economic forum", "davos", "cfr ", "bohemian grove"],
        # Media
        "media-cia": ["mockingbird", "church committee", "cia.*media", "cia.*journalist"],
        "media-narrative-coordination": ["conspiracy theor", "narrative.*control", "information warfare"],
        "media-digital-control": ["social media.*censor", "content moderat", "deplatform", "lifelog"],
        # COVID
        "covid-gain-of-function": ["gain.of.function", "wuhan", "ecohealth", "lab leak"],
        "covid-censorship": ["covid.*censor", "pandemic.*censor", "trusted news initiative"],
        "covid-emergency-powers": ["emergency.*power", "lockdown.*power", "pandemic.*authorit"],
        # Health
        "health-pharma-funding": ["pharma.*lobby", "pharma.*funding", "flexner report", "rockefeller.*medicine"],
        "health-who": ["world health organization", "gates foundation.*health"],
        "sackler-opioid-crisis": ["opioid", "oxycontin", "purdue pharma", "sackler"],
        # Tobacco
        "tobacco-conspiracy": ["tobacco", "cigarette.*cancer", "council for tobacco"],
        # Consciousness
        "stargate-remote-viewing": ["remote viewing", "stargate.*program", "psychic.*spy", "ingo swann"],
        "cia-gateway-process": ["gateway process", "hemi-sync", "monroe institute"],
        "consciousness-nature": ["consciousness.*fundamental", "hard problem", "panpsychism"],
        # Whistleblower
        "whistleblower-suppression": ["whistleblower", "retaliation.*disclos"],
        # Secret societies / ritual
        "ritual-elite": ["bohemian grove", "skull and bones", "elite.*ritual"],
        "history-secret-societies": ["freemason", "skull.*bones", "secret societ"],
        # Franklin
        "franklin-scandal": ["franklin.*scandal", "franklin.*credit", "larry king.*omaha"],
        # Roy Cohn
        "roy-cohn": ["roy cohn", "cohn.*mccarthy", "cohn.*trump"],
        # Broad Epstein catch-all for people mentioning Epstein connection
        "epstein-financial": ["epstein's.*island", "little st.*james", "epstein.*virgin islands", "epstein.*palm beach"],
        # Watergate
        "watergate": ["watergate", "nixon.*tape"],
        # NSO/Pegasus
        "nso-pegasus": ["nso group", "pegasus.*spyware"],
        # COINTELPRO
        "cointelpro-full": ["cointelpro", "counter.*intelligence program"],
        # Operations
        "operation-paperclip": ["operation paperclip", "project paperclip", "wernher von braun"],
        "operation-gladio": ["operation gladio", "gladio", "stay-behind"],
        "operation-condor": ["operation condor"],
        "operation-phoenix": ["phoenix program", "operation phoenix"],
        "business-plot-1933": ["business plot", "smedley butler", "wall street putsch"],
        # Corporate capture
        "corporate-capture": ["corporate.*capture", "revolving door", "regulatory.*capture", "corporate.*lobby"],
        # Philanthropy
        "philanthropy-control": ["philanthrop.*control", "foundation.*influence", "ford foundation", "rockefeller foundation", "carnegie"],
        # Finders
        "the-finders": ["the finders", "finders.*cult"],
        # Oklahoma City
        "oklahoma-city-bombing": ["oklahoma city.*bomb", "timothy mcveigh", "terry nichols"],
        # Waco/Ruby Ridge
        "waco-ruby-ridge": ["waco", "ruby ridge", "branch davidian"],
    }

    # Add description signals to keyword_to_topics
    for topic_id, patterns in DESCRIPTION_SIGNALS.items():
        for pat in patterns:
            keyword_to_topics[pat.lower()].add(topic_id)

    # DF node titles → node_id
    title_to_node = {}
    node_titles = {}
    for node in df_nodes:
        nid = node["id"]
        title = node.get("title", nid)
        node_titles[nid] = title
        title_to_node[title.lower()] = nid
        title_to_node[nid.lower()] = nid

    # All keyword patterns sorted longest-first for matching
    all_keywords = sorted(keyword_to_topics.keys(), key=len, reverse=True)

    # Separate: plain keywords vs regex patterns (contain . * + etc)
    plain_keywords = []
    regex_keywords = []
    for kw in all_keywords:
        if any(c in kw for c in ".*+?()[]"):
            regex_keywords.append(kw)
        else:
            plain_keywords.append(kw)

    def match_entity(eid, entity):
        """Try to match an entity to topics. Returns True if matched."""
        name = entity["name"].lower()
        aliases = entity.get("aliases", "").lower()
        desc = entity.get("description", "").lower()
        name_tokens = [name] + [a.strip() for a in aliases.split(",") if a.strip()]
        matched = False

        # 1. Name/alias against plain keywords
        for token in name_tokens:
            for kw in plain_keywords:
                if kw == token or (len(kw) >= 4 and kw in token) or (len(token) >= 4 and token in kw):
                    for topic_id in keyword_to_topics[kw]:
                        by_topic[topic_id].add(eid)
                        by_entity[eid].add(topic_id)
                        matched = True

            # Name against DF node titles
            for title_lower, nid in title_to_node.items():
                if token == title_lower or (len(token) > 3 and token in title_lower) or (len(title_lower) > 3 and title_lower in token):
                    by_topic[nid].add(eid)
                    by_entity[eid].add(nid)
                    matched = True

        # 2. Description scanning — plain keywords (require 6+ chars or 2+ hits)
        if desc:
            topic_hits = defaultdict(int)
            desc_lower = desc

            for kw in plain_keywords:
                if len(kw) < 4:
                    continue
                if kw in desc_lower:
                    for topic_id in keyword_to_topics[kw]:
                        topic_hits[topic_id] += 1

            # Regex keywords against description
            for kw in regex_keywords:
                try:
                    if re.search(kw, desc_lower):
                        for topic_id in keyword_to_topics[kw]:
                            topic_hits[topic_id] += 1
                except re.error:
                    pass

            # Single hit ok for long specific keywords (6+ chars), 2+ for short
            for topic_id, count in topic_hits.items():
                if count >= 1:
                    by_topic[topic_id].add(eid)
                    by_entity[eid].add(topic_id)
                    matched = True

        return matched

    # ── Run matching on all entities ──
    for eid_str, entity in ic_entities.items():
        eid = int(eid_str)
        if match_entity(eid, entity):
            matched_entity_ids.add(eid)

    # Collect unmatched
    all_eids = set(int(k) for k in ic_entities.keys())
    unmatched_ids = all_eids - matched_entity_ids

    return by_topic, by_entity, unmatched_ids


def main():
    print("Loading inputs...")

    keyword_links = parse_keyword_links(KEYWORD_LINKS_JS)
    print(f"  Keyword links: {len(keyword_links)}")

    df_nodes = parse_nodes_from_data_js(DATA_JS)
    print(f"  DF nodes: {len(df_nodes)}")

    ic_entities = load_ic_entities(ENTITIES_JSON)
    print(f"  IC entities: {len(ic_entities)}")

    connection_counts = load_ic_graph(GRAPH_JSON)
    print(f"  IC graph nodes: {len(connection_counts)}")

    print("\nMapping entities to topics...")
    by_topic, by_entity, unmatched_ids = build_mapping(keyword_links, df_nodes, ic_entities)

    # Convert sets to sorted lists
    by_topic_out = {k: sorted(v) for k, v in sorted(by_topic.items())}
    by_entity_out = {str(k): sorted(v) for k, v in sorted(by_entity.items())}

    matched_count = len(by_entity_out)
    total = len(ic_entities)
    topic_count = len(by_topic_out)

    print(f"\n── Results ──")
    print(f"  Matched entities: {matched_count}/{total} ({100*matched_count/total:.1f}%)")
    print(f"  Topics with entities: {topic_count}")
    print(f"  Unmatched entities: {len(unmatched_ids)}")

    # Top topics by entity count
    print(f"\n── Top 15 topics by entity count ──")
    sorted_topics = sorted(by_topic_out.items(), key=lambda x: len(x[1]), reverse=True)
    for topic_id, eids in sorted_topics[:15]:
        print(f"  {topic_id}: {len(eids)} entities")

    # ── Write topic-entity-map.json ──
    topic_entity_map = {
        "byTopic": by_topic_out,
        "byEntity": by_entity_out,
    }
    out_path = os.path.join(OUTPUT_DIR, "topic-entity-map.json")
    with open(out_path, "w") as f:
        json.dump(topic_entity_map, f, separators=(",", ":"))
    print(f"\nWrote {out_path} ({os.path.getsize(out_path)} bytes)")

    # ── Write entities-index.json ──
    entities_index = {}
    for eid_str, entity in ic_entities.items():
        eid = int(eid_str)
        entities_index[eid] = {
            "id": eid,
            "name": entity["name"],
            "entity_type": entity["entity_type"],
            "connection_count": connection_counts.get(eid, 0),
            "aliases": entity.get("aliases", ""),
        }

    out_path = os.path.join(OUTPUT_DIR, "entities-index.json")
    with open(out_path, "w") as f:
        json.dump(entities_index, f, separators=(",", ":"))
    print(f"Wrote {out_path} ({os.path.getsize(out_path)} bytes)")

    # ── Write unmatched.json ──
    unmatched = []
    for eid in sorted(unmatched_ids):
        entity = ic_entities[str(eid)]
        unmatched.append({
            "id": eid,
            "name": entity["name"],
            "entity_type": entity["entity_type"],
            "description_preview": entity.get("description", "")[:150],
        })

    out_path = os.path.join(OUTPUT_DIR, "unmatched.json")
    with open(out_path, "w") as f:
        json.dump(unmatched, f, indent=2)
    print(f"Wrote {out_path} ({len(unmatched)} entities)")


if __name__ == "__main__":
    main()
