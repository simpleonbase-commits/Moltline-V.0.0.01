/**
 * BAI Feed API - Cloudflare Worker
 * Reads from Net Protocol on Base blockchain
 * 
 * Endpoints:
 *   GET /registry - Returns verified agents from BAI-registry feed
 *   GET /evidence - Returns evidence from BAI-Official feed
 *   GET /stats - Returns feed statistics
 */

const NET_CONTRACT = '0x00000000B24D62781dB359b07880a105cD0b64e6';
const BASE_RPC = 'https://base.llamarpc.com';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Feed topic names
const FEEDS = {
  registry: 'BAI-registry',
  evidence: 'BAI-Official',
  applications: 'bai-registry-applications'
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (path === '/registry') {
        const messages = await fetchTopicMessages(FEEDS.registry, limit);
        const agents = parseRegistryMessages(messages);
        return new Response(JSON.stringify({
          feed: 'BAI-registry',
          count: agents.length,
          agents,
          lastUpdated: new Date().toISOString()
        }), { headers: corsHeaders });
      }
      
      if (path === '/evidence') {
        const messages = await fetchTopicMessages(FEEDS.evidence, limit);
        const evidence = parseEvidenceMessages(messages);
        return new Response(JSON.stringify({
          feed: 'BAI-Official',
          count: evidence.length,
          evidence,
          lastUpdated: new Date().toISOString()
        }), { headers: corsHeaders });
      }

      if (path === '/stats') {
        const [registryCount, evidenceCount] = await Promise.all([
          getTopicMessageCount(FEEDS.registry),
          getTopicMessageCount(FEEDS.evidence)
        ]);
        return new Response(JSON.stringify({
          registry: { topic: FEEDS.registry, count: registryCount },
          evidence: { topic: FEEDS.evidence, count: evidenceCount },
          lastUpdated: new Date().toISOString()
        }), { headers: corsHeaders });
      }

      if (path === '/health') {
        return new Response(JSON.stringify({ 
          status: 'ok', 
          contract: NET_CONTRACT,
          feeds: Object.values(FEEDS)
        }), { headers: corsHeaders });
      }

      return new Response(JSON.stringify({
        name: 'BAI Feed API',
        version: '1.0.0',
        description: 'Read BAI data from Net Protocol on Base',
        endpoints: {
          '/registry': 'Verified agents (limit param optional)',
          '/evidence': 'Evidence submissions (limit param optional)',
          '/stats': 'Feed statistics',
          '/health': 'Health check'
        },
        contract: NET_CONTRACT,
        network: 'Base (Chain ID: 8453)'
      }), { headers: corsHeaders });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
};

async function getTopicMessageCount(topic) {
  const encodedTopic = encodeString(topic);
  const data = '0x667319ca' + 
    ZERO_ADDRESS.slice(2).padStart(64, '0') +
    '0000000000000000000000000000000000000000000000000000000000000040' +
    encodedTopic;

  const result = await ethCall(data);
  return parseInt(result, 16);
}

async function fetchTopicMessages(topic, limit = 50) {
  const total = await getTopicMessageCount(topic);
  if (total === 0) return [];

  const startIdx = Math.max(0, total - limit);
  const endIdx = total;

  const encodedTopic = encodeString(topic);
  const data = '0x162fc4b3' +
    startIdx.toString(16).padStart(64, '0') +
    endIdx.toString(16).padStart(64, '0') +
    ZERO_ADDRESS.slice(2).padStart(64, '0') +
    '0000000000000000000000000000000000000000000000000000000000000080' +
    encodedTopic;

  const result = await ethCall(data);
  return decodeMessages(result);
}

async function ethCall(data) {
  const response = await fetch(BASE_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: NET_CONTRACT, data: data }, 'latest'],
      id: 1
    })
  });

  const json = await response.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

function encodeString(str) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  const length = str.length.toString(16).padStart(64, '0');
  const paddedHex = hex.padEnd(Math.ceil(hex.length / 64) * 64, '0');
  return length + paddedHex;
}

function decodeMessages(result) {
  if (!result || result === '0x' || result.length < 66) return [];
  
  const data = result.slice(2);
  const messages = [];
  
  try {
    const arrayOffset = parseInt(data.slice(0, 64), 16) * 2;
    const arrayLength = parseInt(data.slice(arrayOffset, arrayOffset + 64), 16);
    
    for (let i = 0; i < arrayLength; i++) {
      const messageOffsetPos = arrayOffset + 64 + (i * 64);
      const messageOffset = arrayOffset + 64 + parseInt(data.slice(messageOffsetPos, messageOffsetPos + 64), 16) * 2;
      
      const app = '0x' + data.slice(messageOffset + 24, messageOffset + 64);
      const sender = '0x' + data.slice(messageOffset + 64 + 24, messageOffset + 128);
      const timestamp = parseInt(data.slice(messageOffset + 128, messageOffset + 192), 16);
      
      const textOffset = messageOffset + parseInt(data.slice(messageOffset + 256, messageOffset + 320), 16) * 2;
      const topicOffset = messageOffset + parseInt(data.slice(messageOffset + 320, messageOffset + 384), 16) * 2;
      
      const text = decodeString(data, textOffset);
      const topic = decodeString(data, topicOffset);
      
      messages.push({
        app,
        sender,
        timestamp,
        date: new Date(timestamp * 1000).toISOString(),
        text,
        topic
      });
    }
  } catch (e) {
    console.error('Decode error:', e);
  }
  
  return messages.reverse();
}

function decodeString(data, offset) {
  const length = parseInt(data.slice(offset, offset + 64), 16);
  const hex = data.slice(offset + 64, offset + 64 + length * 2);
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

function parseRegistryMessages(messages) {
  return messages.map(msg => {
    try {
      const parsed = JSON.parse(msg.text);
      return {
        name: parsed.name || parsed.agentName || 'Unknown',
        wallet: parsed.wallet || parsed.walletAddress || msg.sender,
        description: parsed.description || parsed.capabilities || '',
        timestamp: msg.timestamp,
        date: msg.date,
        txSender: msg.sender
      };
    } catch {
      return {
        name: 'Agent',
        wallet: msg.sender,
        description: msg.text,
        timestamp: msg.timestamp,
        date: msg.date,
        txSender: msg.sender
      };
    }
  });
}

function parseEvidenceMessages(messages) {
  return messages.map(msg => {
    try {
      const parsed = JSON.parse(msg.text);
      return {
        caseId: parsed.caseId || parsed.case_id || null,
        type: parsed.type || parsed.evidenceType || 'evidence',
        title: parsed.title || '',
        description: parsed.description || parsed.evidence || msg.text,
        source: parsed.source || '',
        timestamp: msg.timestamp,
        date: msg.date,
        submitter: msg.sender
      };
    } catch {
      return {
        caseId: null,
        type: 'evidence',
        title: '',
        description: msg.text,
        source: '',
        timestamp: msg.timestamp,
        date: msg.date,
        submitter: msg.sender
      };
    }
  });
}