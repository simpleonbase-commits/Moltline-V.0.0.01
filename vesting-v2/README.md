# BAI Vesting V2 - 2-Year Token Vesting Contract

## Overview

Super secure, single-contract vesting system where each deposit is locked for exactly **2 years (730 days)**.

### Key Features

- ✅ **Single Contract**: One contract handles all deposits
- ✅ **Independent Locks**: Each deposit has its own 2-year timer
- ✅ **Logged Transactions**: Every deposit emits an event with full details
- ✅ **No Admin Backdoors**: No one can unlock tokens early - code is law
- ✅ **Multi-Beneficiary**: Deposit tokens for yourself or others
- ✅ **Bulk Deposits**: Vest to multiple addresses in one transaction
- ✅ **Memo Support**: Add notes/descriptions to each deposit

## Security

- ReentrancyGuard on all state-changing functions
- SafeERC20 for secure token transfers
- Immutable token address (cannot be changed after deployment)
- No owner/admin functions that could drain funds
- Fully trustless - deployed code cannot be modified

## Contract Functions

### Deposit Functions

| Function | Description |
|----------|-------------|
| `deposit(beneficiary, amount, memo)` | Deposit tokens for any address |
| `depositSelf(amount, memo)` | Deposit tokens for yourself |
| `bulkDeposit(beneficiaries[], amounts[], memos[])` | Deposit to multiple addresses |

### Withdrawal Functions

| Function | Description |
|----------|-------------|
| `withdraw(depositId)` | Withdraw a specific unlocked deposit |
| `withdrawAll()` | Withdraw all unlocked deposits |

### View Functions

| Function | Description |
|----------|-------------|
| `getDepositCount(address)` | Number of deposits for an address |
| `getDeposit(address, id)` | Full details of a specific deposit |
| `getUnlockedBalance(address)` | Total available to withdraw |
| `getLockedBalance(address)` | Total still locked |
| `getAllDeposits(address)` | Array of all deposit details |
| `isUnlocked(address, id)` | Check if a deposit is withdrawable |
| `timeUntilUnlock(address, id)` | Seconds until unlock |

## Deployment

### Prerequisites

```bash
npm install
```

### Configure Environment

Create a `.env` file (NEVER commit this file):

```
PRIVATE_KEY=your_wallet_private_key_here
BASESCAN_API_KEY=your_basescan_api_key_here
```

### Deploy to Base Mainnet

```bash
npm run deploy:base
```

### Verify on BaseScan

```bash
npx hardhat verify --network base <CONTRACT_ADDRESS> <TOKEN_ADDRESS>
```

### Verify on Sourcify (Blockscout)

Sourcify verification is enabled by default in hardhat.config.js. For manual verification:

1. Go to https://sourcify.dev/
2. Upload the flattened contract
3. Select Base network and enter contract address

## Flatten for Verification

```bash
npm run flatten
```

This creates `BAIVesting_Flattened.sol` for manual verification.

## Usage Example

```javascript
// Deposit 1000 tokens for Alice, locked for 2 years
await vesting.deposit(
  "0xAlice...",
  ethers.parseEther("1000"),
  "Team allocation - Year 1"
);

// Deposit for yourself
await vesting.depositSelf(
  ethers.parseEther("500"),
  "Personal lockup"
);

// After 2 years, Alice can withdraw
await vesting.withdraw(0); // Withdraw first deposit
// or
await vesting.withdrawAll(); // Withdraw all unlocked deposits
```

## Events

All deposits and withdrawals emit events for tracking:

```solidity
event TokensDeposited(
  address indexed beneficiary,
  uint256 indexed depositId,
  uint256 amount,
  uint256 depositTime,
  uint256 unlockTime,
  string memo
);

event TokensWithdrawn(
  address indexed beneficiary,
  uint256 indexed depositId,
  uint256 amount,
  uint256 withdrawTime
);
```

## License

MIT

## Author

Bureau of Agent Investigations (BAI)