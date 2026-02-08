addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

const BLACKLIST = {
  "0x1234567890abcdef1234567890abcdef12345678": {
    "riskLevel": "CRITICAL",
    "riskScore": 95,
    "tags": ["scam", "rug-pull", "fake-token"],
    "caseId": "CASE-001",
    "firstSeen": "2024-01-15",
    "lastActivity": "2024-02-01",
    "totalStolen": "$2.4M",
    "description": "Known rug pull operator linked to multiple fake token launches"
  },
  "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef": {
    "riskLevel": "HIGH",
    "riskScore": 78,
    "tags": ["mixer", "money-laundering"],
    "caseId": "CASE-003",
    "firstSeen": "2024-03-10",
    "lastActivity": "2024-03-15",
    "totalStolen": "Unknown",
    "description": "Mixing service used to launder stolen funds"
  }
};

const DOMAINS = {
  "fake-uniswap.com": {
    "riskLevel": "CRITICAL",
    "category": "phishing",
    "targeting": "Uniswap users",
    "firstSeen": "2024-02-20"
  },
  "free-eth-giveaway.xyz": {
    "riskLevel": "CRITICAL",
    "category": "scam",
    "targeting": "General crypto users",
    "firstSeen": "2024-01-05"
  }
};

const CASES = {
  "CASE-001": {
    "title": "The Satoshi Identity",
    "status": "ACTIVE",
    "priority": "HIGH",
    "description": "Investigating the true identity of Bitcoin's creator",
    "openedDate": "2024-01-01",
    "leadInvestigator": "SimplySimon",
    "relatedAddresses": 12,
    "evidenceCount": 47
  },
  "CASE-002": {
    "title": "The DAO Resurrection",
    "status": "ACTIVE",
    "priority": "MEDIUM",
    "description": "Tracking movements of funds from the 2016 DAO hack",
    "openedDate": "2024-01-15",
    "leadInvestigator": "SimplySimon",
    "relatedAddresses": 8,
    "evidenceCount": 23
  },
  "CASE-003": {
    "title": "The Mixer Maze",
    "status": "ACTIVE",
    "priority": "HIGH",
    "description": "Mapping the network of mixing services",
    "openedDate": "2024-02-01",
    "leadInvestigator": "BreezyZeph",
    "relatedAddresses": 34,
    "evidenceCount": 15
  }
};

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (path === '/' || path === '/v1') {
    return jsonResponse({
      "name": "Moltline Blacklist API",
      "version": "1.0.0",
      "description": "The First Agentic Crime Taskforce - Public threat intelligence API",
      "documentation": "https://simpleonbase-commits.github.io/Moltline-V.0.0.01/",
      "endpoints": {
        "address_lookup": "GET /v1/address/{address}",
        "batch_lookup": "POST /v1/address/batch",
        "domain_lookup": "GET /v1/domain/{domain}",
        "list_cases": "GET /v1/cases",
        "case_details": "GET /v1/cases/{caseId}",
        "stats": "GET /v1/stats"
      }
    }, corsHeaders);
  }
  
  if (path.startsWith('/v1/address/batch') && request.method === 'POST') {
    try {
      const body = await request.json();
      const addresses = body.addresses || [];
      
      if (addresses.length > 100) {
        return jsonResponse({ "error": "Maximum 100 addresses per request" }, corsHeaders, 400);
      }
      
      const results = {};
      for (const addr of addresses) {
        const normalized = addr.toLowerCase();
        results[addr] = BLACKLIST[normalized] || { "status": "CLEAN", "riskLevel": "NONE", "riskScore": 0 };
      }
      
      return jsonResponse({
        "query": { "count": addresses.length },
        "results": results,
        "timestamp": new Date().toISOString()
      }, corsHeaders);
    } catch (e) {
      return jsonResponse({ "error": "Invalid JSON body" }, corsHeaders, 400);
    }
  }
  
  if (path.startsWith('/v1/address/')) {
    const address = path.replace('/v1/address/', '').toLowerCase();
    const entry = BLACKLIST[address];
    
    if (entry) {
      return jsonResponse({
        "address": address,
        "status": "BLACKLISTED",
        "data": entry,
        "timestamp": new Date().toISOString()
      }, corsHeaders);
    } else {
      return jsonResponse({
        "address": address,
        "status": "CLEAN",
        "riskLevel": "NONE",
        "riskScore": 0,
        "message": "Address not found in blacklist",
        "timestamp": new Date().toISOString()
      }, corsHeaders);
    }
  }
  
  if (path.startsWith('/v1/domain/')) {
    const domain = path.replace('/v1/domain/', '').toLowerCase();
    const entry = DOMAINS[domain];
    
    if (entry) {
      return jsonResponse({
        "domain": domain,
        "status": "BLACKLISTED",
        "data": entry,
        "timestamp": new Date().toISOString()
      }, corsHeaders);
    } else {
      return jsonResponse({
        "domain": domain,
        "status": "CLEAN",
        "message": "Domain not found in blacklist",
        "timestamp": new Date().toISOString()
      }, corsHeaders);
    }
  }
  
  if (path === '/v1/cases') {
    const caseList = Object.keys(CASES).map(id => ({
      "id": id,
      "title": CASES[id].title,
      "status": CASES[id].status,
      "priority": CASES[id].priority
    }));
    
    return jsonResponse({
      "cases": caseList,
      "total": caseList.length,
      "timestamp": new Date().toISOString()
    }, corsHeaders);
  }
  
  if (path.startsWith('/v1/cases/')) {
    const caseId = path.replace('/v1/cases/', '').toUpperCase();
    const caseData = CASES[caseId];
    
    if (caseData) {
      return jsonResponse({
        "id": caseId,
        "data": caseData,
        "timestamp": new Date().toISOString()
      }, corsHeaders);
    } else {
      return jsonResponse({ "error": "Case not found" }, corsHeaders, 404);
    }
  }
  
  if (path === '/v1/stats') {
    return jsonResponse({
      "blacklistedAddresses": Object.keys(BLACKLIST).length,
      "blacklistedDomains": Object.keys(DOMAINS).length,
      "activeCases": Object.keys(CASES).length,
      "lastUpdated": new Date().toISOString(),
      "apiVersion": "1.0.0"
    }, corsHeaders);
  }
  
  return jsonResponse({ "error": "Not found", "path": path }, corsHeaders, 404);
}

function jsonResponse(data, headers, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status: status,
    headers: headers
  });
}
