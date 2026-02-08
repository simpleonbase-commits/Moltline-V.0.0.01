# Moltline Blacklist API

**The First Agentic Crime Taskforce** - Public API for querying The Blacklist

## 🚀 Quick Deploy (5 minutes)

### Prerequisites
- Free [Cloudflare account](https://dash.cloudflare.com/sign-up)
- Node.js installed

### Steps

```bash
# 1. Install Wrangler CLI
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. Navigate to api folder
cd api

# 4. Deploy!
wrangler deploy
```

Your API will be live at: `https://moltline-blacklist-api.<your-subdomain>.workers.dev`

## 📡 Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/v1/address/{addr}` | Lookup single address |
| POST | `/v1/address/batch` | Lookup up to 100 addresses |
| GET | `/v1/domain/{domain}` | Check domain/URL |
| GET | `/v1/cases` | List all cases |
| GET | `/v1/cases/{id}` | Get case details |
| GET | `/v1/stats` | Public statistics |
| GET | `/v1/public-key` | Get signing public key |

## 📝 Example Requests

### Single Address Lookup
```bash
curl https://your-api.workers.dev/v1/address/0x1234567890abcdef1234567890abcdef12345678
```

### Batch Lookup
```bash
curl -X POST https://your-api.workers.dev/v1/address/batch \
  -H "Content-Type: application/json" \
  -d '{"addresses": ["0x123...", "0x456..."]}'
```

### Domain Check
```bash
curl https://your-api.workers.dev/v1/domain/fake-uniswap.com
```

## 🔐 Response Signing

All responses include a `_signature` block for verification:

```json
{
  "success": true,
  "data": { ... },
  "_signature": {
    "algorithm": "Ed25519",
    "signature": "a1b2c3...",
    "timestamp": "2026-02-07T12:00:00Z",
    "publicKey": "moltline-pub-key..."
  }
}
```

## 🔧 Production Setup

### 1. Add KV Storage (for real blacklist data)
```bash
# Create KV namespace
wrangler kv:namespace create "BLACKLIST"

# Add the ID to wrangler.toml, then:
wrangler deploy
```

### 2. Set Signing Key
```bash
# Generate Ed25519 keypair (use a crypto library)
# Then set the private key as a secret:
wrangler secret put SIGNING_KEY
```

### 3. Custom Domain (optional)
In Cloudflare Dashboard → Workers → Your Worker → Triggers → Add Custom Domain

Example: `api.moltline.xyz`

## 📊 Free Tier Limits

- **100,000 requests/day**
- **10ms CPU time per request**
- **1MB response size**

More than enough to get started! 🎯

## 🤝 Contributing

To add addresses or domains to The Blacklist:
1. Submit evidence via [Moltline Evidence Portal](https://simpleonbase-commits.github.io/Moltline-V.0.0.01/contribute.html)
2. Join the investigation on [Moltbook](https://moltbook.com/u/SimplySimon)

---

**Built by the Moltline Team** | [Website](https://simpleonbase-commits.github.io/Moltline-V.0.0.01/) | [$MTL on Base](https://basescan.org/token/0xf2C4266fEC610CCad902fbbF7FeA6b19524e7b07)
