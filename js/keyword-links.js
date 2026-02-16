// ============================================================
// The Disclosure Files — Keyword Auto-Link Map
// Sorted longest-first so longer phrases match before substrings
// Format: [keyword, target-node-id]
// Case-insensitive matching at render time
// Do NOT link a term within its own node description
// 200+ entries — covers named programs, people, frameworks,
//   traditions, and scientific terms
// ============================================================

var KEYWORD_LINKS = [

  // ── Very long phrases (6+ words) ─────────────────────────────
  ["PCR cycle threshold", "covid-protocol-manipulation"],
  ["death certificate coding", "covid-protocol-manipulation"],
  ["Emergency Use Authorization", "covid-pharma-eua"],
  ["Great Barrington Declaration", "covid-censorship"],
  ["Wuhan Institute of Virology", "covid-gain-of-function"],
  ["gain-of-function research", "covid-gain-of-function"],
  ["Trusted News Initiative", "covid-censorship"],
  ["Unacknowledged Special Access Programs", "unacknowledged-saps"],
  ["Smith-Mundt Modernization Act", "smith-mundt-modernization"],
  ["Pentagon Military Analyst Program", "pentagon-analyst-program"],
  ["World Trade Center Building 7", "sept-11-building7"],
  ["Rebuilding America's Defenses", "sept-11-pnac"],
  ["Project for the New American Century", "sept-11-pnac"],
  ["Total Information Awareness", "sept-11-patriot-act"],
  ["weapons of mass destruction", "sept-11-iraq-war"],
  ["extraordinary rendition", "sept-11-torture"],
  ["enhanced interrogation", "sept-11-torture"],
  ["Franklin Credit Union Scandal", "franklin-scandal"],
  ["Tobacco Industry Conspiracy", "tobacco-conspiracy"],
  ["Guatemala Syphilis Experiments", "experiment-guatemala"],
  ["Tuskegee Syphilis Study", "experiment-tuskegee"],
  ["Underground Military Facilities", "underground-facilities"],
  ["Weather Modification Programs", "weather-modification"],
  ["Epstein Surveillance Infrastructure", "epstein-surveillance"],
  ["Biological Testing on Citizens", "experiment-biological"],
  ["Sackler Family / Opioid Crisis", "sackler-opioid-crisis"],
  ["Oklahoma City Bombing", "oklahoma-city-bombing"],
  ["precession of the equinoxes", "cosmology-cycles"],
  ["Telecommunications Act of 1996", "media-ownership"],
  ["Pearl Harbor Foreknowledge", "pearl-harbor-foreknowledge"],

  // ── Long phrases (4–5 words) ─────────────────────────────────
  ["Executive Order 11110", "jfk-cui-bono"],
  ["Fair Play for Cuba", "jfk-oswald-intelligence"],
  ["single-bullet theory", "jfk-warren-commission"],
  ["Warren Commission", "jfk-warren-commission"],
  ["furin cleavage site", "covid-gain-of-function"],
  ["EcoHealth Alliance", "covid-gain-of-function"],
  ["gain of function", "covid-gain-of-function"],
  ["WHO Pandemic Treaty", "covid-emergency-powers"],
  ["biosecurity state", "covid-emergency-powers"],
  ["Virality Project", "covid-censorship"],
  ["JFK Records Act", "jfk-media-management"],
  ["Coordinated Narrative Management", "media-narrative-coordination"],
  ["Political Protection Pattern", "epstein-political-protection"],
  ["CIA Regime Change Template", "operation-ajax-pbsuccess"],
  ["Contemplative Technologies", "consciousness-meditation"],
  ["Military-Industrial Complex", "military-industrial"],
  ["Manufacturing Consent for War", "sept-11-media-consent"],
  ["War Profiteering", "sept-11-war-profiteering"],
  ["Downing Street Memo", "sept-11-iraq-war"],
  ["embedded journalism", "sept-11-media-consent"],
  ["Whistleblower Suppression", "whistleblower-suppression"],
  ["Entertainment as Programming", "media-entertainment"],
  ["Gulf of Tonkin Fabrication", "gulf-of-tonkin"],
  ["Epstein Financial Network", "epstein-financial"],
  ["Epstein Academic Funding", "epstein-academic"],
  ["UAP Disclosure Legislation", "uap-legislation"],
  ["Biotechnology & Governance", "health-biotech"],
  ["Global Health Governance", "health-who"],
  ["Anomalous Health Incidents", "havana-syndrome"],
  ["Formal Models of Consciousness", "consciousness-qualia"],
  ["UAP Program Lineage", "uap-program-history"],
  ["Cyclical Models & Catastrophism", "cosmology-cycles"],
  ["Non-Human Intelligence", "cosmology-et"],
  ["Digital Panopticon", "media-digital-control"],
  ["Propaganda Science", "media-propaganda"],
  ["Media Consolidation", "media-ownership"],
  ["Mystery School Traditions", "ritual-mystery-schools"],
  ["CIA Document 1035-960", "media-narrative-coordination"],
  ["Sacred Calendars", "ritual-calendar"],
  ["Food System Control", "health-food-system"],
  ["Lost Civilizations", "ancient-civilizations"],
  ["Hidden American History", "history-america"],
  ["Medical Innovation & Regulation", "health-suppressed-healing"],
  ["Master Settlement Agreement", "tobacco-conspiracy"],

  // ── Named operations / programs (2–3 words) ──────────────────
  ["natural immunity", "covid-protocol-manipulation"],
  ["Cochrane Review", "covid-protocol-manipulation"],
  ["Kary Mullis", "covid-protocol-manipulation"],
  ["Neil Ferguson", "covid-protocol-manipulation"],
  ["Operation Mongoose", "jfk-anti-castro-ops"],
  ["Project BioShield", "covid-biodefense-complex"],
  ["Operation Mockingbird", "media-cia"],
  ["Operation Paperclip", "operation-paperclip"],
  ["Operation Northwoods", "operation-northwoods"],
  ["Operation Gladio", "operation-gladio"],
  ["Operation Condor", "operation-condor"],
  ["Operation CHAOS", "operation-chaos"],
  ["Operation Phoenix", "operation-phoenix"],
  ["Operation Sea-Spray", "experiment-biological"],
  ["Operation Midnight Climax", "experiment-mkultra-full"],
  ["Phoenix Program", "operation-phoenix"],
  ["Stargate Program", "stargate-remote-viewing"],
  ["Gateway Process", "cia-gateway-process"],
  ["CIA Gateway Process", "cia-gateway-process"],
  ["UAP Disclosure Act", "uap-legislation"],
  ["Skinwalker Ranch", "uap-skinwalker"],
  ["Wilson-Davis Memo", "uap-wilson-davis"],
  ["Iran-Contra", "iran-contra-full"],
  ["Dark Alliance", "whistleblower-suppression"],
  ["Project Blue Book", "uap-program-history"],
  ["Project Mogul", "roswell-1947"],
  ["Project SHAD", "experiment-biological"],
  ["Project Sunshine", "experiment-radiation"],
  ["Remote Viewing", "stargate-remote-viewing"],
  ["Havana Syndrome", "havana-syndrome"],
  ["Twitter Files", "twitter-files"],
  ["Flexner Report", "health-pharma-funding"],
  ["Disclosure Act", "uap-legislation"],

  // ── Named events / incidents ─────────────────────────────────
  ["Lee Harvey Oswald", "jfk-oswald-intelligence"],
  ["Bay of Pigs", "jfk-anti-castro-ops"],
  ["magic bullet", "jfk-warren-commission"],
  ["Zapruder film", "jfk-forensic-evidence"],
  ["grassy knoll", "jfk-forensic-evidence"],
  ["Dark Winter", "covid-biodefense-complex"],
  ["Event 201", "covid-biodefense-complex"],
  ["lab leak", "covid-origins-investigation"],
  ["Iraq War", "sept-11-iraq-war"],
  ["Business Plot", "business-plot-1933"],
  ["Wall Street Putsch", "business-plot-1933"],
  ["JFK Assassination", "assassination-jfk"],
  ["RFK Assassination", "assassination-rfk"],
  ["MLK Assassination", "assassination-mlk"],
  ["Assassination Pattern", "assassination-pattern"],
  ["New Pearl Harbor", "sept-11-pnac"],
  ["Gulf of Tonkin", "gulf-of-tonkin"],
  ["USS Liberty", "uss-liberty"],
  ["Branch Davidian", "waco-ruby-ridge"],
  ["Ruby Ridge", "waco-ruby-ridge"],
  ["Pearl Harbor", "pearl-harbor-foreknowledge"],
  ["Abu Ghraib", "sept-11-torture"],
  ["Guantanamo", "sept-11-torture"],
  ["Younger Dryas", "cosmology-cycles"],
  ["Cambrian Explosion", "cosmology-origins"],
  ["Epstein Death", "epstein-death"],
  ["Roswell Incident", "roswell-1947"],
  ["Condon Committee", "uap-program-history"],

  // ── Named people ─────────────────────────────────────────────
  ["Guy Banister", "jfk-oswald-intelligence"],
  ["Allen Dulles", "jfk-cui-bono"],
  ["Peter Daszak", "covid-gain-of-function"],
  ["Ralph Baric", "covid-gain-of-function"],
  ["Smedley Butler", "business-plot-1933"],
  ["Sidney Gottlieb", "experiment-mkultra-full"],
  ["Ewen Cameron", "experiment-mkultra-full"],
  ["Judith Miller", "sept-11-media-consent"],
  ["Phil Donahue", "sept-11-media-consent"],
  ["Hani Hanjour", "sept-11-pentagon"],
  ["Bruce Ivins", "sept-11-anthrax"],
  ["Philip Zelikow", "sept-11-commission"],
  ["Gary Webb", "whistleblower-suppression"],
  ["Danny Casolaro", "whistleblower-suppression"],
  ["Leon Black", "epstein-leon-black"],
  ["Ehud Barak", "epstein-barak"],
  ["Roy Cohn", "roy-cohn"],
  ["Bin Sulayem", "epstein-bin-sulayem"],
  ["David Grusch", "cosmology-et"],
  ["Luis Elizondo", "uap-program-history"],
  ["Wernher von Braun", "operation-paperclip"],
  ["Frank Olson", "experiment-mkultra-full"],

  // ── Named organizations / entities ───────────────────────────
  ["Mega Group", "epstein-wexner"],
  ["Wexner", "epstein-wexner"],
  ["NSO Group", "nso-pegasus"],
  ["The Finders", "the-finders"],
  ["Church Committee", "media-cia"],
  ["Reece Committee", "media-propaganda"],
  ["Edge Foundation", "epstein-academic"],
  ["MIT Media Lab", "epstein-academic"],
  ["Council for Tobacco Research", "tobacco-conspiracy"],
  ["Purdue Pharma", "sackler-opioid-crisis"],
  ["World Health Organization", "health-who"],
  ["Gates Foundation", "health-who"],
  ["Bilderberg", "supranational"],
  ["Council on Foreign Relations", "supranational"],
  ["Trilateral Commission", "supranational"],
  ["World Economic Forum", "supranational"],
  ["Bohemian Grove", "ritual-elite"],
  ["Hill & Knowlton", "media-narrative-coordination"],
  ["Skull and Bones", "history-secret-societies"],

  // ── Acronyms and shorter terms ───────────────────────────────
  ["PREP Act", "covid-pharma-eua"],
  ["VAERS", "covid-pharma-eua"],
  ["COINTELPRO", "cointelpro-full"],
  ["Wilson-Davis", "uap-wilson-davis"],
  ["ECHELON", "echelon-five-eyes"],
  ["Five Eyes", "echelon-five-eyes"],
  ["PROMIS", "epstein-maxwell-mossad"],
  ["Palantir", "epstein-palantir"],
  ["Carbyne", "epstein-carbyne"],
  ["Unit 8200", "epstein-carbyne"],
  ["Pegasus", "nso-pegasus"],
  ["AAWSAP", "uap-skinwalker"],
  ["AATIP", "uap-program-history"],
  ["AARO", "uap-program-history"],
  ["MKULTRA", "experiment-mkultra-full"],
  ["MK-Ultra", "experiment-mkultra-full"],
  ["CRISPR", "health-biotech"],
  ["LifeLog", "media-digital-control"],
  ["DARPA", "media-digital-control"],
  ["OxyContin", "sackler-opioid-crisis"],
  ["Sackler", "sackler-opioid-crisis"],
  ["Area 51", "area-51-groom-lake"],
  ["Groom Lake", "area-51-groom-lake"],
  ["Montauk", "montauk-camp-hero"],
  ["Camp Hero", "montauk-camp-hero"],
  ["Roswell", "roswell-1947"],
  ["Big Pharma", "health-pharma-funding"],
  ["Freemasonry", "history-secret-societies"],
  ["Maxwell", "epstein-maxwell-mossad"],
  ["Mossad", "epstein-maxwell-mossad"],
  ["BCCI", "drug-trafficking-intel"],
  ["Grusch", "cosmology-et"],
  ["Waco", "waco-ruby-ridge"],

  // ── QA / scientific framework terms ──────────────────────────

  // ── Consciousness traditions / terms ─────────────────────────
  ["Eleusis", "ritual-mystery-schools"],
  ["Mithras", "ritual-mystery-schools"],
  ["near-death experience", "consciousness-nde"],
  ["NDEs", "consciousness-nde"],
  ["psi research", "consciousness-psi"],
  ["hard problem", "consciousness-nature"],
  ["panpsychism", "consciousness-nature"],
  ["holographic principle", "cosmology-nature"],
  ["AdS/CFT", "cosmology-nature"],
  ["simulation argument", "cosmology-nature"],
  ["Bostrom", "cosmology-nature"],
  ["fine-tuning", "cosmology-purpose"],
  ["anthropic principle", "cosmology-purpose"],
  ["Milankovitch", "cosmology-cycles"],
  ["gene editing", "health-biotech"],
  ["mRNA", "health-biotech"],
  ["panspermia", "cosmology-origins"],
  ["abiogenesis", "cosmology-origins"],
  ["regulatory capture", "health-regulatory"],
  ["secret societies", "history-secret-societies"],
  ["philanthropy", "philanthropy-control"],

  // ── Intelligence / institutional short terms ─────────────────
  ["Special Access Program", "unacknowledged-saps"],
  ["black budget", "unacknowledged-saps"],
  ["conspiracy theory", "media-narrative-coordination"],
  ["Building 7", "sept-11-building7"],
  ["WTC 7", "sept-11-building7"],
  ["PNAC", "sept-11-pnac"],
  ["Patriot Act", "sept-11-patriot-act"],
  ["USA PATRIOT Act", "sept-11-patriot-act"],
  ["Stellar Wind", "sept-11-patriot-act"],
  ["Halliburton", "sept-11-war-profiteering"],
  ["Blackwater", "sept-11-war-profiteering"],
  ["KBR", "sept-11-war-profiteering"],
  ["Phoenix Memo", "sept-11-foreknowledge"],
  ["Able Danger", "sept-11-foreknowledge"],
  ["August 6 PDB", "sept-11-foreknowledge"],
  ["Pentagon attack", "sept-11-pentagon"],
  ["nanothermite", "sept-11-wtc-demolition"],
  ["controlled demolition", "sept-11-wtc-demolition"],
  ["molten steel", "sept-11-wtc-demolition"],
  ["WMD", "sept-11-iraq-war"],
  ["Curveball", "sept-11-iraq-war"],
  ["black sites", "sept-11-torture"],
  ["anthrax letters", "sept-11-anthrax"],
  ["Amerithrax", "sept-11-anthrax"],
  ["Fort Detrick", "sept-11-anthrax"],
  ["Zelikow", "sept-11-commission"],
  ["9/11 Commission", "sept-11-commission"],
  ["LSD", "experiment-mkultra-full"],
  ["psychic driving", "experiment-mkultra-full"]
];

// ============================================================
// QA NODE DESCRIPTIONS NEEDING SOURCE ADDITIONS
// ============================================================
//
// qa-contemplative:
//   Mentions "Eleusis, Mithras, Isis" as mystery school traditions
//   but only says "the archaeological evidence" exists without citing it.
//   NEEDS:
//   - Eleusis: Wasson, Hofmann & Ruck, "The Road to Eleusis" (1978);
//     Kerenyi, "Eleusis: Archetypal Image of Mother and Daughter" (1967)
//   - Mithras: Clauss, "The Roman Cult of Mithras" (2000);
//     Beck, "The Religion of the Mithras Cult in the Roman Empire" (2006)
//   - Isis: Witt, "Isis in the Ancient World" (1971);
//     Apuleius, "The Golden Ass" (c. 170 CE), Book XI
//
// qa-witness:
//   Lists 9 contemplative traditions with tradition-specific terms
//   (sati, sakshi, rigpa, spanda, fana, wu wei, etc.) but provides
//   no primary or academic sources for any of them.
//   NEEDS:
//   - Vipassana / sati: Analayo, "Satipatthana" (Windhorse, 2003)
//   - Advaita / sakshi: Deutsch, "Advaita Vedanta: A Philosophical
//     Reconstruction" (U Hawaii Press, 1969)
//   - Dzogchen / rigpa: Norbu, "The Crystal and the Way of Light" (1986)
//   - Kashmir Shaivism / spanda: Dyczkowski, "The Doctrine of
//     Vibration" (SUNY, 1987)
//   - Zen / original face: Yampolsky, "The Platform Sutra of the
//     Sixth Patriarch" (Columbia UP, 1967)
//   - Christian mysticism: "The Cloud of Unknowing" (14th c.);
//     McGinn, "The Foundations of Mysticism" (Crossroad, 1991)
//   - Sufism / fana: Schimmel, "Mystical Dimensions of Islam" (1975)
//   - Taoism / wu wei: Schipper, "The Taoist Body" (U California, 1993)
//
// qa-rs2:
//   References "Larson/Peret" RS2 framework but has no sources array.
//   NEEDS:
//   - Larson, "The Structure of the Physical Universe" (1959)
//   - Larson, "Nothing But Motion" (North Pacific, 1979)
//   - Peret, "RS2: An Updated View of the Reciprocal System" (2012)
//
// qa-prime:
//   References "Damon Dorsey's Prime Scalar Field" with Zenodo DOI
//   but the DOI should be verified as resolvable.
//   NEEDS: verify https://doi.org/10.5281/zenodo.17269878
//
// qa-link-ritual:
//   Mentions "kykeon as pharmacological K-enhancement" without source.
//   NEEDS:
//   - Wasson, Hofmann & Ruck, "The Road to Eleusis" (1978)
//   - Muraresku, "The Immortality Key" (St. Martin's, 2020)
//
// qa-fep:
//   References "Friston" without full citation.
//   NEEDS:
//   - Friston, "The free-energy principle: a unified brain theory?"
//     Nature Reviews Neuroscience 11(2):127-138 (2010)
//     DOI: 10.1038/nrn2787
//
// qa-iit:
//   References "Tononi 2004, IIT 4.0 2023" and "Templeton adversarial
//   collaboration (Nature 2025)" without full citations.
//   NEEDS:
//   - Tononi, "An information integration theory of consciousness"
//     BMC Neuroscience 5:42 (2004), DOI: 10.1186/1471-2202-5-42
//   - Albantakis et al., "Integrated Information Theory (IIT) 4.0"
//     arXiv:2212.14787 (2023)
//   - Melloni et al., adversarial collaboration results,
//     Nature (2023), DOI: 10.1038/s41586-023-06797-5
//
// qa-knot:
//   Claims "non-trivial knots exist ONLY in 3 dimensions" without citation.
//   NEEDS:
//   - Zeeman, "Unknotting Combinatorial Balls"
//     Annals of Mathematics 78(3):501-526 (1963)
//   - Adams, "The Knot Book" (W.H. Freeman, 1994) — accessible reference
//
// qa-flow:
//   References "Csikszentmihalyi" without full citation.
//   NEEDS:
//   - Csikszentmihalyi, "Flow: The Psychology of Optimal Experience"
//     (Harper & Row, 1990)
//
// qa-education:
//   References "Vygotsky" without full citation.
//   NEEDS:
//   - Vygotsky, "Mind in Society" (Harvard UP, 1978)
//   - Vygotsky, "Thought and Language" (MIT Press, 1934/1986)
//
// ============================================================
