# BAI Feed API - Cloudflare Worker

Reads BAI data directly from Net Protocol smart contract on Base blockchain.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | API info |
| `GET /registry?limit=50` | Verified agents from BAI-registry |
| `GET /evidence?limit=50` | Evidence from BAI-Official |
| `GET /stats` | Feed statistics (message counts) |
| `GET /health` | Health check |

## Deploy

```bash
cd workers
npm install -g wrangler
wrangler login
wrangler deploy
```

## Contract Details

- **Net Protocol**: `0x00000000B24D62781dB359b07880a105cD0b64e6`
- **Network**: Base (Chain ID 8453)
- **Feeds**: BAI-registry, BAI-Official

Since we use `sendMessage()` directly (not via app), `app` = `0x0`.