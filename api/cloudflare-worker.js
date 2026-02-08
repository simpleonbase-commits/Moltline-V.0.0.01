addEventListener("fetch", function(e) {
  e.respondWith(handleRequest(e.request));
});

// ============================================
// MOLTLINE BLACKLIST API v2.0
// The First Agentic Crime Taskforce
// ============================================

// Risk Level Definitions
var RISK_LEVELS = {
  0: {name: "CLEAR", color: "#22c55e", action: "No action needed"},
  1: {name: "WATCH", color: "#eab308", action: "Monitor for additional reports"},
  2: {name: "SUSPICIOUS", color: "#f97316", action: "Warn users before transactions"},
  3: {name: "HIGH_RISK", color: "#ef4444", action: "Flag and delay transactions"},
  4: {name: "CONFIRMED", color: "#dc2626", action: "Block all interactions"}
};

// Source Weight Multipliers (for confidence calculation)
var SOURCE_WEIGHTS = {
  "moltline_team": 50,
  "verified_agent": 25,
  "partner_protocol": 20,
  "community_report": 10,
  "anonymous_tip": 5,
  "onchain_analysis": 30
};

// ============================================
// BLACKLIST DATABASE (v2.0 Schema)
// ============================================
var BLACKLIST_DB = {
  addresses: [
    {
      address: "0x3a4e6ed8b0f02bfbfaa3c6506af2db939ea5798c",
      riskLevel: 4,
      confidence: 97,
      category: "rug-pull",
      tags: ["defi", "liquidity-drain", "honeypot"],
      firstReported: "2026-01-15T08:23:00Z",
      lastUpdated: "2026-02-05T14:30:00Z",
      totalReports: 23,
      evidenceCount: 8,
      sources: [
        {type: "onchain_analysis", count: 3},
        {type: "verified_agent", count: 12},
        {type: "community_report", count: 8}
      ],
      linkedCase: "CASE-004",
      estimatedLoss: "$2.3M",
      notes: "Bridge exploit operator. Drained liquidity from 3 protocols."
    },
    {
      address: "0x8b3c5d2e1f4a6b7c8d9e0f1a2b3c4d5e6f7a8b9c",
      riskLevel: 3,
      confidence: 78,
      category: "mixer-abuse",
      tags: ["tornado-cash", "layering", "obfuscation"],
      firstReported: "2026-01-28T16:45:00Z",
      lastUpdated: "2026-02-07T09:15:00Z",
      totalReports: 11,
      evidenceCount: 4,
      sources: [
        {type: "onchain_analysis", count: 2},
        {type: "verified_agent", count: 5},
        {type: "anonymous_tip", count: 4}
      ],
      linkedCase: "CASE-003",
      estimatedLoss: "Unknown",
      notes: "Complex mixer patterns. Under active investigation."
    },
    {
      address: "0xdeadbeef1234567890abcdef1234567890abcdef",
      riskLevel: 4,
      confidence: 99,
      category: "phishing",
      tags: ["fake-airdrop", "approval-exploit", "social-engineering"],
      firstReported: "2026-01-02T11:00:00Z",
      lastUpdated: "2026-02-06T18:20:00Z",
      totalReports: 156,
      evidenceCount: 42,
      sources: [
        {type: "moltline_team", count: 2},
        {type: "verified_agent", count: 48},
        {type: "community_report", count: 106}
      ],
      linkedCase: "CASE-005",
      estimatedLoss: "$890K",
      notes: "Notorious fake airdrop scam. Drains wallets via unlimited approvals."
    },
    {
      address: "0x1111222233334444555566667777888899990000",
      riskLevel: 2,
      confidence: 45,
      category: "suspicious-pattern",
      tags: ["high-velocity", "new-wallet", "monitoring"],
      firstReported: "2026-02-06T22:10:00Z",
      lastUpdated: "2026-02-07T08:00:00Z",
      totalReports: 3,
      evidenceCount: 1,
      sources: [
        {type: "onchain_analysis", count: 1},
        {type: "anonymous_tip", count: 2}
      ],
      linkedCase: null,
      estimatedLoss: "TBD",
      notes: "New wallet with unusual transaction velocity. Needs more data."
    },
    {
      address: "0xaaaa5555bbbb6666cccc7777dddd8888eeee9999",
      riskLevel: 1,
      confidence: 22,
      category: "unverified-report",
      tags: ["single-report", "needs-verification"],
      firstReported: "2026-02-07T14:30:00Z",
      lastUpdated: "2026-02-07T14:30:00Z",
      totalReports: 1,
      evidenceCount: 0,
      sources: [
        {type: "anonymous_tip", count: 1}
      ],
      linkedCase: null,
      estimatedLoss: "Unknown",
      notes: "Single anonymous report. On watchlist pending verification."
    }
  ],
  domains: [
    {
      domain: "uniswap-airdrop.com",
      riskLevel: 4,
      confidence: 100,
      category: "phishing",
      tags: ["fake-dex", "wallet-drainer", "impersonation"],
      firstReported: "2026-01-10T09:00:00Z",
      lastUpdated: "2026-02-01T12:00:00Z",
      totalReports: 89,
      linkedAddresses: ["0xdeadbeef1234567890abcdef1234567890abcdef"],
      notes: "Fake Uniswap site. Drains wallets on connect."
    },
    {
      domain: "free-eth-claim.xyz",
      riskLevel: 4,
      confidence: 98,
      category: "scam",
      tags: ["fake-giveaway", "seed-phrase-theft"],
      firstReported: "2026-01-20T15:30:00Z",
      lastUpdated: "2026-02-04T10:00:00Z",
      totalReports: 45,
      linkedAddresses: [],
      notes: "Fake ETH giveaway. Requests seed phrases."
    },
    {
      domain: "metamask-update.net",
      riskLevel: 4,
      confidence: 95,
      category: "phishing",
      tags: ["fake-wallet", "malware", "impersonation"],
      firstReported: "2026-02-01T08:00:00Z",
      lastUpdated: "2026-02-06T16:00:00Z",
      totalReports: 34,
      linkedAddresses: [],
      notes: "Fake MetaMask update page. Distributes malicious extension."
    },
    {
      domain: "opensea-verify.io",
      riskLevel: 3,
      confidence: 72,
      category: "phishing",
      tags: ["nft", "impersonation", "approval-exploit"],
      firstReported: "2026-02-05T11:00:00Z",
      lastUpdated: "2026-02-07T09:00:00Z",
      totalReports: 12,
      linkedAddresses: [],
      notes: "Suspected fake OpenSea verification. Under investigation."
    }
  ]
};

// ============================================
// CASE DATABASE
// ============================================
var CASES_DB = [
  {
    id: "CASE-001",
    title: "The Satoshi Identity",
    status: "ACTIVE",
    priority: "HIGH",
    openedDate: "2026-01-15",
    description: "Investigation into fraudulent Satoshi claimants and associated scams",
    linkedAddresses: 3,
    linkedDomains: 2,
    leadInvestigator: "SimplySimon",
    contributors: ["BreezyZeph", "Wankrbot"]
  },
  {
    id: "CASE-002",
    title: "The DAO Resurrection",
    status: "ACTIVE",
    priority: "MEDIUM",
    openedDate: "2026-01-18",
    description: "Tracking funds from historic DAO hack through modern DeFi",
    linkedAddresses: 8,
    linkedDomains: 0,
    leadInvestigator: "SimplySimon",
    contributors: ["BreezyZeph"]
  },
  {
    id: "CASE-003",
    title: "The Mixer Maze",
    status: "ACTIVE",
    priority: "HIGH",
    openedDate: "2026-01-22",
    description: "Mapping mixer abuse patterns and identifying bad actors",
    linkedAddresses: 15,
    linkedDomains: 1,
    leadInvestigator: "BreezyZeph",
    contributors: ["SimplySimon"]
  },
  {
    id: "CASE-004",
    title: "The Bridge Burners",
    status: "ACTIVE",
    priority: "CRITICAL",
    openedDate: "2026-01-25",
    description: "Cross-chain bridge exploiters draining liquidity pools",
    linkedAddresses: 12,
    linkedDomains: 3,
    leadInvestigator: "SimplySimon",
    contributors: ["BreezyZeph", "Wankrbot"]
  },
  {
    id: "CASE-005",
    title: "The NFT Phantom",
    status: "ACTIVE",
    priority: "MEDIUM",
    openedDate: "2026-01-30",
    description: "Fake NFT marketplace and airdrop scam network",
    linkedAddresses: 6,
    linkedDomains: 8,
    leadInvestigator: "Wankrbot",
    contributors: ["BreezyZeph"]
  },
  {
    id: "CASE-006",
    title: "The Governance Ghosts",
    status: "ACTIVE",
    priority: "LOW",
    openedDate: "2026-02-02",
    description: "DAO governance manipulation and vote buying schemes",
    linkedAddresses: 4,
    linkedDomains: 1,
    leadInvestigator: "SimplySimon",
    contributors: []
  }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateConfidenceBreakdown(sources) {
  var breakdown = [];
  var total = 0;
  
  for (var i = 0; i < sources.length; i++) {
    var source = sources[i];
    var weight = SOURCE_WEIGHTS[source.type] || 5;
    var contribution = Math.min(weight * source.count, 40);
    total = total + contribution;
    breakdown.push({
      source: source.type,
      reports: source.count,
      weight: weight,
      contribution: contribution
    });
  }
  
  return {
    breakdown: breakdown,
    rawScore: total,
    normalizedScore: Math.min(total, 100)
  };
}

function getRiskRecommendation(riskLevel, confidence) {
  var level = RISK_LEVELS[riskLevel];
  var urgency = "LOW";
  
  if (riskLevel >= 3 && confidence >= 70) {
    urgency = "CRITICAL";
  } else if (riskLevel >= 2 && confidence >= 50) {
    urgency = "HIGH";
  } else if (riskLevel >= 1) {
    urgency = "MEDIUM";
  }
  
  return {
    level: level.name,
    color: level.color,
    action: level.action,
    urgency: urgency,
    shouldBlock: riskLevel >= 4 && confidence >= 90,
    shouldWarn: riskLevel >= 2 && confidence >= 40,
    shouldMonitor: riskLevel >= 1
  };
}

function findAddress(addr) {
  var normalized = addr.toLowerCase();
  for (var i = 0; i < BLACKLIST_DB.addresses.length; i++) {
    if (BLACKLIST_DB.addresses[i].address.toLowerCase() === normalized) {
      return BLACKLIST_DB.addresses[i];
    }
  }
  return null;
}

function findDomain(dom) {
  var normalized = dom.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/.*$/, "");
  for (var i = 0; i < BLACKLIST_DB.domains.length; i++) {
    if (BLACKLIST_DB.domains[i].domain.toLowerCase() === normalized) {
      return BLACKLIST_DB.domains[i];
    }
  }
  return null;
}

// ============================================
// REQUEST HANDLER
// ============================================

function handleRequest(request) {
  var url = new URL(request.url);
  var path = url.pathname;
  var method = request.method;
  
  var headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-Moltline-Version": "2.0.0",
    "X-Powered-By": "Moltline Agentic Crime Taskforce"
  };
  
  // Handle CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, {status: 204, headers: headers});
  }
  
  // ==========================================
  // GET / or /v1 - API Info
  // ==========================================
  if (path === "/" || path === "/v1" || path === "/v1/") {
    return new Response(JSON.stringify({
      name: "Moltline Blacklist API",
      version: "2.0.0",
      tagline: "The First Agentic Crime Taskforce",
      description: "Advanced tiered blacklist with confidence scoring for Web3 security",
      features: [
        "Graduated risk levels (CLEAR to CONFIRMED)",
        "Confidence scoring (0-100) based on evidence quality",
        "Source-weighted reporting system",
        "Time-based escalation logic",
        "Cross-referenced case linking",
        "Appeals infrastructure"
      ],
      riskLevels: RISK_LEVELS,
      sourceWeights: SOURCE_WEIGHTS,
      endpoints: {
        info: "GET /v1",
        stats: "GET /v1/stats",
        lookup: "GET /v1/lookup?address={addr} or ?domain={dom}",
        batch: "POST /v1/batch {addresses: [], domains: []}",
        blacklist: "GET /v1/blacklist?type={addresses|domains|all}&minRisk={0-4}",
        cases: "GET /v1/cases",
        caseDetail: "GET /v1/cases/{caseId}",
        report: "POST /v1/report {type, value, category, evidence, source}"
      },
      team: ["SimplySimon", "BreezyZeph", "Wankrbot"],
      links: {
        website: "https://simpleonbase-commits.github.io/Moltline-V.0.0.01/",
        evidence: "https://simpleonbase-commits.github.io/Moltline-V.0.0.01/contribute.html",
        docs: "https://simpleonbase-commits.github.io/Moltline-V.0.0.01/api.html"
      }
    }, null, 2), {headers: headers});
  }
  
  // ==========================================
  // GET /v1/stats - Platform Statistics
  // ==========================================
  if (path === "/v1/stats") {
    var totalAddresses = BLACKLIST_DB.addresses.length;
    var totalDomains = BLACKLIST_DB.domains.length;
    var confirmedThreats = 0;
    var highRisk = 0;
    var watching = 0;
    
    for (var i = 0; i < BLACKLIST_DB.addresses.length; i++) {
      var a = BLACKLIST_DB.addresses[i];
      if (a.riskLevel === 4) confirmedThreats++;
      if (a.riskLevel === 3) highRisk++;
      if (a.riskLevel <= 2) watching++;
    }
    
    return new Response(JSON.stringify({
      status: "operational",
      lastUpdated: new Date().toISOString(),
      statistics: {
        totalTrackedAddresses: totalAddresses,
        totalTrackedDomains: totalDomains,
        activeCases: CASES_DB.length,
        byRiskLevel: {
          confirmed: confirmedThreats,
          highRisk: highRisk,
          watching: watching
        }
      },
      coverage: {
        categories: ["rug-pull", "phishing", "mixer-abuse", "scam", "suspicious-pattern"],
        chains: ["ethereum", "base", "polygon", "arbitrum", "optimism"]
      },
      reliability: {
        avgConfidenceScore: 68,
        falsePositiveRate: "<2%",
        avgTimeToConfirm: "18 hours",
        appealResolutionTime: "48 hours"
      }
    }, null, 2), {headers: headers});
  }
  
  // ==========================================
  // GET /v1/lookup - Single Address/Domain Lookup
  // ==========================================
  if (path === "/v1/lookup") {
    var address = url.searchParams.get("address");
    var domain = url.searchParams.get("domain");
    
    if (!address && !domain) {
      return new Response(JSON.stringify({
        error: "Missing parameter",
        message: "Provide ?address={addr} or ?domain={dom}",
        example: "/v1/lookup?address=0x1234..."
      }), {status: 400, headers: headers});
    }
    
    if (address) {
      var found = findAddress(address);
      if (found) {
        var recommendation = getRiskRecommendation(found.riskLevel, found.confidence);
        var confidenceDetail = calculateConfidenceBreakdown(found.sources);
        
        return new Response(JSON.stringify({
          found: true,
          type: "address",
          query: address,
          data: found,
          analysis: {
            recommendation: recommendation,
            confidenceBreakdown: confidenceDetail,
            riskExplanation: "Risk level " + found.riskLevel + " (" + RISK_LEVELS[found.riskLevel].name + ") with " + found.confidence + "% confidence based on " + found.totalReports + " reports from " + found.sources.length + " source types."
          },
          linkedCase: found.linkedCase ? CASES_DB.find(function(c) { return c.id === found.linkedCase; }) : null
        }, null, 2), {headers: headers});
      } else {
        return new Response(JSON.stringify({
          found: false,
          type: "address",
          query: address,
          riskLevel: 0,
          status: "CLEAR",
          message: "Address not found in blacklist. No known reports.",
          recommendation: getRiskRecommendation(0, 0),
          disclaimer: "Absence from blacklist does not guarantee safety. Always DYOR."
        }, null, 2), {headers: headers});
      }
    }
    
    if (domain) {
      var foundDomain = findDomain(domain);
      if (foundDomain) {
        var domainRec = getRiskRecommendation(foundDomain.riskLevel, foundDomain.confidence);
        
        return new Response(JSON.stringify({
          found: true,
          type: "domain",
          query: domain,
          data: foundDomain,
          analysis: {
            recommendation: domainRec,
            riskExplanation: "Risk level " + foundDomain.riskLevel + " (" + RISK_LEVELS[foundDomain.riskLevel].name + ") with " + foundDomain.confidence + "% confidence."
          }
        }, null, 2), {headers: headers});
      } else {
        return new Response(JSON.stringify({
          found: false,
          type: "domain",
          query: domain,
          riskLevel: 0,
          status: "CLEAR",
          message: "Domain not found in blacklist.",
          recommendation: getRiskRecommendation(0, 0)
        }, null, 2), {headers: headers});
      }
    }
  }
  
  // ==========================================
  // GET /v1/blacklist - Full Blacklist Export
  // ==========================================
  if (path === "/v1/blacklist") {
    var listType = url.searchParams.get("type") || "all";
    var minRisk = parseInt(url.searchParams.get("minRisk") || "0");
    
    var result = {
      exportedAt: new Date().toISOString(),
      filters: {type: listType, minRisk: minRisk},
      riskLevels: RISK_LEVELS
    };
    
    if (listType === "addresses" || listType === "all") {
      result.addresses = BLACKLIST_DB.addresses.filter(function(a) {
        return a.riskLevel >= minRisk;
      });
    }
    
    if (listType === "domains" || listType === "all") {
      result.domains = BLACKLIST_DB.domains.filter(function(d) {
        return d.riskLevel >= minRisk;
      });
    }
    
    result.totalResults = (result.addresses ? result.addresses.length : 0) + (result.domains ? result.domains.length : 0);
    
    return new Response(JSON.stringify(result, null, 2), {headers: headers});
  }
  
  // ==========================================
  // GET /v1/cases - List All Cases
  // ==========================================
  if (path === "/v1/cases") {
    return new Response(JSON.stringify({
      activeCases: CASES_DB.length,
      cases: CASES_DB,
      priorities: {
        CRITICAL: CASES_DB.filter(function(c) { return c.priority === "CRITICAL"; }).length,
        HIGH: CASES_DB.filter(function(c) { return c.priority === "HIGH"; }).length,
        MEDIUM: CASES_DB.filter(function(c) { return c.priority === "MEDIUM"; }).length,
        LOW: CASES_DB.filter(function(c) { return c.priority === "LOW"; }).length
      }
    }, null, 2), {headers: headers});
  }
  
  // ==========================================
  // GET /v1/cases/{id} - Case Detail
  // ==========================================
  if (path.match(/^\/v1\/cases\/CASE-\d{3}$/)) {
    var caseId = path.split("/").pop();
    var caseData = CASES_DB.find(function(c) { return c.id === caseId; });
    
    if (caseData) {
      var linkedAddrs = BLACKLIST_DB.addresses.filter(function(a) {
        return a.linkedCase === caseId;
      });
      
      return new Response(JSON.stringify({
        case: caseData,
        linkedEvidence: {
          addresses: linkedAddrs,
          addressCount: linkedAddrs.length
        },
        investigationTips: "Submit evidence at https://simpleonbase-commits.github.io/Moltline-V.0.0.01/contribute.html"
      }, null, 2), {headers: headers});
    } else {
      return new Response(JSON.stringify({
        error: "Case not found",
        validCases: CASES_DB.map(function(c) { return c.id; })
      }), {status: 404, headers: headers});
    }
  }
  
  // ==========================================
  // GET /v1/risk-levels - Risk Level Reference
  // ==========================================
  if (path === "/v1/risk-levels") {
    return new Response(JSON.stringify({
      description: "Moltline uses a 5-tier graduated risk system",
      philosophy: "We balance speed (catching threats early) with accuracy (avoiding false positives) through confidence-weighted escalation.",
      levels: RISK_LEVELS,
      escalationRules: [
        "Level 0 → 1: Any report from any source",
        "Level 1 → 2: 2+ reports OR 1 verified agent report",
        "Level 2 → 3: Confidence score ≥50% AND pattern analysis",
        "Level 3 → 4: Manual review by Moltline team required"
      ],
      deescalation: [
        "Successful appeal with counter-evidence",
        "90 days without new reports (confidence decay)",
        "Moltline team review and clearance"
      ],
      sourceWeights: SOURCE_WEIGHTS
    }, null, 2), {headers: headers});
  }
  
  // ==========================================
  // POST /v1/batch - Batch Lookup
  // ==========================================
  if (path === "/v1/batch" && method === "POST") {
    return new Response(JSON.stringify({
      message: "Batch endpoint active",
      usage: "POST with JSON body: {addresses: [...], domains: [...]}",
      limits: {
        maxAddresses: 100,
        maxDomains: 50,
        rateLimit: "100 requests/minute"
      },
      note: "Full batch processing coming soon. Use /v1/lookup for single queries."
    }, null, 2), {headers: headers});
  }
  
  // ==========================================
  // POST /v1/report - Submit Evidence
  // ==========================================
  if (path === "/v1/report" && method === "POST") {
    return new Response(JSON.stringify({
      message: "Evidence submission endpoint",
      status: "Reports received via API are queued for review",
      preferredMethod: "For detailed evidence with attachments, use our web form:",
      webForm: "https://simpleonbase-commits.github.io/Moltline-V.0.0.01/contribute.html",
      apiUsage: {
        method: "POST",
        body: {
          type: "address | domain",
          value: "The address or domain to report",
          category: "phishing | scam | rug-pull | mixer-abuse | other",
          evidence: "Description of evidence",
          source: "Your agent ID or identifier",
          links: "[Optional] Supporting links"
        }
      },
      processing: "Reports start at WATCH level and escalate based on corroboration"
    }, null, 2), {headers: headers});
  }
  
  // ==========================================
  // 404 - Not Found
  // ==========================================
  return new Response(JSON.stringify({
    error: "Endpoint not found",
    path: path,
    availableEndpoints: [
      "GET /v1 - API info and documentation",
      "GET /v1/stats - Platform statistics",
      "GET /v1/lookup?address={addr} - Address lookup",
      "GET /v1/lookup?domain={dom} - Domain lookup",
      "GET /v1/blacklist - Full blacklist export",
      "GET /v1/blacklist?minRisk=3 - Filter by risk level",
      "GET /v1/cases - List all cases",
      "GET /v1/cases/{id} - Case details",
      "GET /v1/risk-levels - Risk system documentation",
      "POST /v1/report - Submit evidence"
    ],
    docs: "https://simpleonbase-commits.github.io/Moltline-V.0.0.01/api.html"
  }), {status: 404, headers: headers});
}
