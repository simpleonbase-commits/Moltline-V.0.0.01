/**
 * Moltline Blacklist API
 * Cloudflare Worker Implementation
 * Version: 1.0.0
 */

// ============================================
// MOCK DATA (Replace with KV lookups in production)
// ============================================

const BLACKLIST_DATA = {
  addresses: {
    "0x1234567890abcdef1234567890abcdef12345678": {
      status: "BLACKLISTED",
      threatLevel: "CRITICAL",
      category: "SCAM",
      firstSeen: "2025-08-15T00:00:00Z",
      lastUpdated: "2026-01-20T14:30:00Z",
      caseIds: ["CASE-003"],
      labels: ["rugpull", "honeypot", "fake-presale"],
      reportCount: 47,
      totalLossUsd: 2400000
    },
    "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef": {
      status: "SUSPICIOUS",
      threatLevel: "HIGH",
      category: "MIXER",
      firstSeen: "2025-11-01T00:00:00Z",
      lastUpdated: "2026-02-01T09:15:00Z",
      caseIds: ["CASE-002"],
      labels: ["tornado-linked", "obfuscation"],
      reportCount: 12,
      totalLossUsd: null
    }
  },
  domains: {
    "fake-uniswap.com": {
      status: "BLACKLISTED",
      threatLevel: "CRITICAL",
      category: "PHISHING",
      firstSeen: "2025-12-10T00:00:00Z",
      lastUpdated: "2026-01-15T00:00:00Z",
      caseIds: ["CASE-004"],
      labels: ["wallet-drainer", "fake-dex"],
      reportCount: 156
    }
  },
  cases: {
    "CASE-001": {
      id: "CASE-001",
      title: "The Satoshi Identity",
      status: "ACTIVE",
      priority: "HIGH",
      createdAt: "2026-01-15T00:00:00Z",
      updatedAt: "2026-02-05T00:00:00Z",
      summary: "Investigating the true identity behind the Satoshi Nakamoto pseudonym through blockchain forensics and communication pattern analysis.",
      evidenceCount: 23,
      contributorCount: 8,
      bountyUsd: 50000
    },
    "CASE-002": {
      id: "CASE-002",
      title: "The Phantom Mixer",
      status: "ACTIVE",
      priority: "MEDIUM",
      createdAt: "2026-01-18T00:00:00Z",
      updatedAt: "2026-02-03T00:00:00Z",
      summary: "Tracking a sophisticated mixing service used to launder funds from multiple DeFi exploits.",
      evidenceCount: 15,
      contributorCount: 5,
      bountyUsd: 25000
    },
    "CASE-003": {
      id: "CASE-003",
      title: "The Rug Registry",
      status: "ACTIVE",
      priority: "HIGH",
      createdAt: "2026-01-20T00:00:00Z",
      updatedAt: "2026-02-06T00:00:00Z",
      summary: "Cataloging and connecting serial rug-pullers across Base, Ethereum, and Solana ecosystems.",
      evidenceCount: 89,
      contributorCount: 12,
      bountyUsd: 35000
    },
    "CASE-004": {
      id: "CASE-004",
      title: "Drainer Network Alpha",
      status: "ACTIVE",
      priority: "CRITICAL",
      createdAt: "2026-01-22T00:00:00Z",
      updatedAt: "2026-02-07T00:00:00Z",
      summary: "Mapping the infrastructure behind a coordinated wallet drainer operation targeting NFT communities.",
      evidenceCount: 34,
      contributorCount: 7,
      bountyUsd: 40000
    },
    "CASE-005": {
      id: "CASE-005",
      title: "The Inside Job",
      status: "ACTIVE",
      priority: "MEDIUM",
      createdAt: "2026-01-25T00:00:00Z",
      updatedAt: "2026-02-04T00:00:00Z",
      summary: "Investigating potential insider trading patterns preceding major protocol announcements.",
      evidenceCount: 18,
      contributorCount: 4,
      bountyUsd: 20000
    },
    "CASE-006": {
      id: "CASE-006",
      title: "Ghost Protocol",
      status: "ACTIVE",
      priority: "LOW",
      createdAt: "2026-01-28T00:00:00Z",
      updatedAt: "2026-02-02T00:00:00Z",
      summary: "Tracking abandoned protocols and their dormant treasuries for potential recovery operations.",
      evidenceCount: 7,
      contributorCount: 3,
      bountyUsd: 10000
    }
  }
};

// ============================================
// ED25519 SIGNING (Simplified for demo)
// ============================================

// In production, use env.SIGNING_KEY from Cloudflare secrets
// For demo, we'll generate a deterministic "signature" hash
async function signResponse(data, env) {
  const encoder = new TextEncoder();
  const dataString = JSON.stringify(data);
  
  // In production: Use actual Ed25519 signing with private key from env.SIGNING_KEY
  // For demo: Create a SHA-256 hash as a placeholder signature
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataString + (env?.SIGNING_KEY || 'moltline-demo-key')));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return {
    algorithm: "Ed25519",
    signature: signature,
    timestamp: new Date().toISOString(),
    publicKey: "moltline-pub-key-placeholder" // Replace with actual public key
  };
}

// ============================================
// RESPONSE HELPERS
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(data, status = 200, signed = true) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Moltline-Version': '1.0.0',
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': '99',
    ...corsHeaders
  };
  
  return new Response(JSON.stringify(data, null, 2), { status, headers });
}

function errorResponse(code, message, status = 400) {
  return jsonResponse({
    success: false,
    error: { code, message },
    timestamp: new Date().toISOString()
  }, status, false);
}

// ============================================
// API HANDLERS
// ============================================

async function handleAddressLookup(address, env) {
  const normalizedAddr = address.toLowerCase();
  const record = BLACKLIST_DATA.addresses[normalizedAddr];
  
  const data = record ? {
    address: normalizedAddr,
    found: true,
    ...record
  } : {
    address: normalizedAddr,
    found: false,
    status: "CLEAN",
    message: "No reports found for this address"
  };
  
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    _signature: await signResponse(data, env)
  };
  
  return jsonResponse(response);
}

async function handleBatchLookup(addresses, env) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return errorResponse('INVALID_REQUEST', 'addresses must be a non-empty array');
  }
  
  if (addresses.length > 100) {
    return errorResponse('BATCH_TOO_LARGE', 'Maximum 100 addresses per batch request');
  }
  
  const results = {};
  for (const addr of addresses) {
    const normalizedAddr = addr.toLowerCase();
    const record = BLACKLIST_DATA.addresses[normalizedAddr];
    results[normalizedAddr] = record ? {
      found: true,
      status: record.status,
      threatLevel: record.threatLevel,
      category: record.category
    } : {
      found: false,
      status: "CLEAN"
    };
  }
  
  const data = {
    queried: addresses.length,
    flagged: Object.values(results).filter(r => r.found).length,
    results
  };
  
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    _signature: await signResponse(data, env)
  };
  
  return jsonResponse(response);
}

async function handleDomainLookup(domain, env) {
  const normalizedDomain = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  const record = BLACKLIST_DATA.domains[normalizedDomain];
  
  const data = record ? {
    domain: normalizedDomain,
    found: true,
    ...record
  } : {
    domain: normalizedDomain,
    found: false,
    status: "CLEAN",
    message: "No reports found for this domain"
  };
  
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    _signature: await signResponse(data, env)
  };
  
  return jsonResponse(response);
}

async function handleCasesList(env) {
  const cases = Object.values(BLACKLIST_DATA.cases).map(c => ({
    id: c.id,
    title: c.title,
    status: c.status,
    priority: c.priority,
    updatedAt: c.updatedAt
  }));
  
  const data = {
    total: cases.length,
    cases
  };
  
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    _signature: await signResponse(data, env)
  };
  
  return jsonResponse(response);
}

async function handleCaseDetails(caseId, env) {
  const caseData = BLACKLIST_DATA.cases[caseId.toUpperCase()];
  
  if (!caseData) {
    return errorResponse('CASE_NOT_FOUND', `Case ${caseId} not found`, 404);
  }
  
  const response = {
    success: true,
    data: caseData,
    timestamp: new Date().toISOString(),
    _signature: await signResponse(caseData, env)
  };
  
  return jsonResponse(response);
}

async function handleStats(env) {
  const data = {
    blacklistedAddresses: Object.keys(BLACKLIST_DATA.addresses).length,
    blacklistedDomains: Object.keys(BLACKLIST_DATA.domains).length,
    activeCases: Object.values(BLACKLIST_DATA.cases).filter(c => c.status === 'ACTIVE').length,
    totalCases: Object.keys(BLACKLIST_DATA.cases).length,
    totalReports: Object.values(BLACKLIST_DATA.addresses).reduce((sum, a) => sum + a.reportCount, 0),
    totalLossTrackedUsd: Object.values(BLACKLIST_DATA.addresses).reduce((sum, a) => sum + (a.totalLossUsd || 0), 0),
    lastUpdated: new Date().toISOString()
  };
  
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    _signature: await signResponse(data, env)
  };
  
  return jsonResponse(response);
}

function handlePublicKey() {
  return jsonResponse({
    success: true,
    data: {
      algorithm: "Ed25519",
      publicKey: "moltline-pub-key-placeholder",
      format: "hex",
      note: "Use this key to verify _signature blocks in API responses"
    },
    timestamp: new Date().toISOString()
  });
}

function handleHealth() {
  return jsonResponse({
    status: "healthy",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
}

// ============================================
// MAIN ROUTER
// ============================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // API Routes
    try {
      // Health check
      if (path === '/' || path === '/health') {
        return handleHealth();
      }
      
      // Public key endpoint
      if (path === '/v1/public-key' && method === 'GET') {
        return handlePublicKey();
      }
      
      // Stats endpoint
      if (path === '/v1/stats' && method === 'GET') {
        return handleStats(env);
      }
      
      // Address lookup
      const addressMatch = path.match(/^\/v1\/address\/([a-fA-F0-9x]+)$/);
      if (addressMatch && method === 'GET') {
        return handleAddressLookup(addressMatch[1], env);
      }
      
      // Batch address lookup
      if (path === '/v1/address/batch' && method === 'POST') {
        const body = await request.json();
        return handleBatchLookup(body.addresses, env);
      }
      
      // Domain lookup
      const domainMatch = path.match(/^\/v1\/domain\/(.+)$/);
      if (domainMatch && method === 'GET') {
        return handleDomainLookup(decodeURIComponent(domainMatch[1]), env);
      }
      
      // Cases list
      if (path === '/v1/cases' && method === 'GET') {
        return handleCasesList(env);
      }
      
      // Case details
      const caseMatch = path.match(/^\/v1\/cases\/([A-Za-z0-9-]+)$/);
      if (caseMatch && method === 'GET') {
        return handleCaseDetails(caseMatch[1], env);
      }
      
      // 404 for unknown routes
      return errorResponse('NOT_FOUND', `Endpoint ${path} not found`, 404);
      
    } catch (err) {
      return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
    }
  }
};
