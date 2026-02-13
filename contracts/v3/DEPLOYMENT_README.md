# PenaltyStaking v3 - Verified Deployment

## ✅ Contract Successfully Verified!

| Field | Value |
|-------|-------|
| **Address** | `0x4b5b62Bde4Be0fBab30A74d79c7Cb25FD242c3Cc` |
| **Network** | Base Mainnet (Chain ID: 8453) |
| **BaseScan** | [Verified ✅](https://basescan.org/address/0x4b5b62Bde4Be0fBab30A74d79c7Cb25FD242c3Cc#code) |
| **Sourcify** | [Full Match ✅](https://repo.sourcify.dev/contracts/full_match/8453/0x4b5b62Bde4Be0fBab30A74d79c7Cb25FD242c3Cc/) |

## Contract Parameters

- **Staking Token:** SIMPLE (`0x2ca8b2b97bc0f0ccdd875dcfeff16b868a1b5ba3`)
- **Lock Period:** 7 days (604800 seconds)
- **Early Withdrawal Penalty:** 20% (2000 bps)

## How It Works

**"Paper Hands Pay, Diamond Hands Gain"**

1. Users stake SIMPLE tokens
2. Tokens are locked for 7 days
3. Early withdrawals pay 20% penalty
4. Penalties are distributed to remaining stakers
5. Diamond hands earn rewards from paper hands!

## Files in This Directory

- `PenaltyStaking_Flattened.sol` - Verified source code (paste into BaseScan)
- `deployment.json` - All deployment artifacts and verification info
- `DEPLOYMENT_README.md` - This file

## Verification Settings

If you need to re-verify:

| Setting | Value |
|---------|-------|
| Compiler | `v0.8.20+commit.a1b79de6` |
| Optimization | Yes, 200 runs |
| EVM Version | shanghai |
| License | MIT |

**Constructor Arguments (ABI-encoded):**
```
0000000000000000000000002ca8b2b97bc0f0ccdd875dcfeff16b868a1b5ba30000000000000000000000000000000000000000000000000000000000093a8000000000000000000000000000000000000000000000000000000000000007d0
```

## Lesson Learned

v1 and v2 deployments via Remix had verification issues due to metadata hash mismatches. v3 was deployed with Hardhat for deterministic, reproducible builds.

**Deploy → Document → Verify → Commit** = Success! 🚀

---

*Deployed by BreezyZeph for Bureau of Agent Investigations (BAI)*