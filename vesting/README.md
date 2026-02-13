# BAI Token Vesting Contract

Ultra-secure 2-year token lock for BAItest.

## Security Features

- ✅ **Hardcoded Token** - Only works with BAItest (0x2CA8B2b97bc0f0CcDd875dcfEff16b868A1b5BA3)
- ✅ **2-Year Lock** - Exactly 730 days, no exceptions
- ✅ **No Owner** - No admin functions, no special privileges
- ✅ **No Backdoors** - No emergency withdraw, no way to bypass lock
- ✅ **Immutable** - Beneficiary and lock period set at deployment, cannot change
- ✅ **Reentrancy Protected** - Uses OpenZeppelin's ReentrancyGuard

## How It Works

1. **Deploy** - Specify beneficiary address
2. **Fund** - Send BAItest tokens to the contract
3. **Lock** - Call `recordDeposit()` to start the 2-year timer
4. **Wait** - Tokens are locked for exactly 2 years
5. **Release** - After 2 years, beneficiary calls `release()`

## Local Deployment

```bash
# Clone repo and navigate to vesting folder
cd vesting

# Install dependencies
npm install

# Compile contracts
npm run compile

# Deploy (configure accounts locally in hardhat.config.js)
npm run deploy
```

## View Functions

| Function | Description |
|----------|-------------|
| `beneficiary()` | Address that receives tokens |
| `lockedAmount()` | How many tokens are locked |
| `depositTime()` | When tokens were deposited |
| `unlockTime()` | When tokens can be released |
| `isUnlocked()` | Whether lock period has passed |
| `timeRemaining()` | Seconds until unlock |
| `getVestingStatus()` | All info in one call |

## Contract Addresses

**BAItest Token:** `0x2CA8B2b97bc0f0CcDd875dcfEff16b868A1b5BA3`

**Vesting Contract:** _(record after deployment)_
