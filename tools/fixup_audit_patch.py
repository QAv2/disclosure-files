#!/usr/bin/env python3
"""Editorial pass over the 2026-08 audit patch before applying it:
 - drop two off-topic changes (Prince Andrew appended to the Barak/Wexner item;
   an Iran-strike item filed under the torture node)
 - turn "append a 2025-26 sentence onto an unrelated evidence item" corrections into
   standalone new evidence items on the same node
 - fix the Department of War rename date (EO signed 5 Sept 2025; announced 25 Aug)
 - swap fabricated-looking URLs for ones verified in the Intel Console source table
 - downgrade the NSA FOIA page-count claim to credible (dossier supporting claim)
Writes df_corrections_fixed.json next to the input.
"""
import json, sys, os

src = sys.argv[1]
p = json.load(open(src))

DROP_CORR = {("epstein-barak", "evidence[1].text")}
DROP_EV = {("sept-11-torture", "Operation Epic Fury")}
TO_EVIDENCE = {  # (id, path) -> (tier, source label, url)
    ("history-wars", "evidence[0].text"): ("documented", "Intel Console — Operation Epic Fury / Midnight Hammer records", "https://qav2.github.io/intel-console/#entity/506"),
    ("media-ownership", "evidence[0].text"): ("documented", "AP — Paramount-Skydance merger closes, David Ellison takes helm", "https://apnews.com/article/paramount-skydance-merger-david-ellison-media"),
    ("science-ai", "evidence[0].text"): ("documented", "Palantir–Anthropic partnership announcement (Nov 2024)", "https://www.palantir.com/newsroom/press-releases/palantir-and-anthropic-partner-to-bring-claude-ai-models-to-aws-for-u-s-government-intelligence-and-defense-operations"),
    ("health-who", "evidence[2].text"): ("documented", "HHS — Robert F. Kennedy Jr. sworn in as Secretary (Feb 2025)", "https://www.hhs.gov/about/leadership/index.html"),
    ("covid-gain-of-function", "evidence[4].text"): ("documented", "White House — Executive Grant of Clemency (Jan 20, 2025)", "https://bidenwhitehouse.archives.gov/briefing-room/presidential-actions/2025/01/20/"),
    ("assassination-jfk", "evidence[2].text"): ("documented", "National Archives — 2025 Release of JFK Assassination Records", "https://www.archives.gov/research/jfk/release2025"),
    ("epstein-political-protection", "evidence[4].text"): ("documented", "Axios — Senate unanimously opposes Maxwell clemency (Jul 2026)", "https://www.axios.com/2026/07/29/ghislaine-maxwell-jeffrey-epstein-senate-pardon"),
}

corrections, new_ev = [], list(p["new_evidence"])
for c in p["corrections"]:
    key = (c["id"], c["path"])
    if key in DROP_CORR:
        continue
    if key in TO_EVIDENCE:
        cur, prop = c["current"], c["proposed"]
        appended = prop[len(cur):].strip() if prop.startswith(cur[:40]) and len(prop) > len(cur) else prop
        appended = appended.lstrip(". ").strip()
        tier, label, url = TO_EVIDENCE[key]
        new_ev.append({"id": c["id"], "evidence": {"text": appended, "tier": tier, "source": label}, "source": {"label": label, "url": url}})
        continue
    if c["id"] == "military-industrial":
        c["proposed"] = c["proposed"].replace("In August 2025 the DoD was formally renamed the Department of War.",
                                              "On September 5, 2025 (announced August 25) an executive order restyled the DoD as the Department of War.")
    corrections.append(c)

new_ev = [e for e in new_ev if not any(e["id"] == i and k in e["evidence"]["text"] for i, k in DROP_EV)]
for e in new_ev:
    e["evidence"]["text"] = e["evidence"]["text"].replace("renamed the Department of War in September 2025 under Trump executive order",
                                                          "restyled the Department of War by executive order on September 5, 2025")

URL_SWAP = {
    "https://www.congress.gov/bill/119th-congress/house-bill/epstein-files-transparency-act": ("H.R. 4405 — Epstein Files Transparency Act — Congress.gov", "https://www.congress.gov/bill/119th-congress/house-bill/4405"),
    "https://www.bbc.co.uk/news/uk-politics-66892526": ("NPR — Former Prince Andrew arrested on suspicion of misconduct in public office (Feb 19, 2026)", "https://www.npr.org/2026/02/19/nx-s1-5719098/former-prince-andrew-arrested-on-suspicion-of-misconduct-in-public-office"),
    "https://www.npr.org/2026/02/10/ghislaine-maxwell-deposition-epstein": ("ABC News — Maxwell invokes Fifth Amendment in House Oversight deposition (Feb 2026)", "https://abcnews.go.com/Politics/maxwell-expected-invoke-amendment-closed-virtual-house-oversight"),
    "https://judiciary.house.gov/hearing/oversight-department-justice": ("DOJ — 3.5 million pages published under the Epstein Files Transparency Act", "https://www.justice.gov/opa/pr/department-justice-publishes-35-million-responsive-pages-compliance-epstein-files-transparency-act"),
    "https://www.whitehouse.gov/presidential-actions/executive-order-declassification-records/": ("Executive Order 14176 — Declassification of Assassination Records (Wikipedia)", "https://en.wikipedia.org/wiki/Executive_Order_14176"),
    "https://www.archives.gov/research/jfk/2017/morley-v-cia": ("George Joannides — Wikipedia (HSCA liaison / DRE case officer)", "https://en.wikipedia.org/wiki/George_Joannides"),
    "https://www.bibliotecapleyades.net/ciencia/ciencia_flyingobjects144.htm": ("Gordon Cooper — Wikipedia (1978 UN letter; Leap of Faith denial)", "https://en.wikipedia.org/wiki/Gordon_Cooper"),
    "https://www.nsa.gov/portals/75/documents/news-features/declassified-documents/ufo/": ("NSA — Declassified UFO documents collection", "https://www.nsa.gov/Helpful-Links/NSA-FOIA/Declassification-Transparency-Initiatives/UFO/"),
}
for n in p["new_nodes"]:
    seen = set(); srcs = []
    for s in n["sources"]:
        if s["url"] in URL_SWAP:
            s = {"label": URL_SWAP[s["url"]][0], "url": URL_SWAP[s["url"]][1]}
        if s["url"] in seen:
            continue
        seen.add(s["url"]); srcs.append(s)
    n["sources"] = srcs
    if n["id"] == "uap-nsa-foia-2026":
        n["evidence"][0]["tier"] = "credible"
        n["evidence"][0]["text"] += " (Page count and classification markings are reported in the FotW dossier's supporting claims and could not be byte-verified against nsa.gov.)"
    if n["id"] == "jfk-files-2025":
        n["sources"].append({"label": "National Archives — 2025 Release of JFK Assassination Records", "url": "https://www.archives.gov/research/jfk/release2025"})
    if n["id"] == "epstein-files-act-2026":
        n["sources"].append({"label": "Al Jazeera — Ex-UK Prince Andrew arrested amid Epstein scandal (live, Feb 19, 2026)", "url": "https://www.aljazeera.com/news/liveblog/2026/2/19/live-ex-uk-prince-andrew-arrested-amid-epstein-scandal"})
for e in new_ev:
    if e.get("source", {}).get("url") in URL_SWAP:
        e["source"] = {"label": URL_SWAP[e["source"]["url"]][0], "url": URL_SWAP[e["source"]["url"]][1]}

p["corrections"], p["new_evidence"] = corrections, new_ev
out = os.path.join(os.path.dirname(src), "df_corrections_fixed.json")
json.dump(p, open(out, "w"), indent=1, ensure_ascii=False)
print(f"corrections {len(corrections)}  new_evidence {len(new_ev)}  new_nodes {len(p['new_nodes'])}  connections {len(p['new_connections'])} → {out}")
