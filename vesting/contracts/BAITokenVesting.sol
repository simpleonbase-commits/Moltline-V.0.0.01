// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BAITokenVesting
 * @notice Ultra-secure 2-year vesting contract for BAItest tokens
 * @dev NO OWNER. NO ADMIN. NO BACKDOORS. Tokens are locked for exactly 2 years.
 * 
 * SECURITY FEATURES:
 * - Hardcoded to BAItest token only (0x2CA8B2b97bc0f0CcDd875dcfEff16b868A1b5BA3)
 * - Immutable 2-year lock period (730 days)
 * - No owner functions
 * - No emergency withdraw
 * - No way to change beneficiary
 * - No way to change unlock time
 * - Reentrancy protected
 * 
 * HOW IT WORKS:
 * 1. Deploy contract with beneficiary address
 * 2. Send BAItest tokens to this contract
 * 3. Call recordDeposit() to lock tokens and start the 2-year timer
 * 4. After 2 years, beneficiary calls release() to withdraw
 */
contract BAITokenVesting is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ IMMUTABLE STATE ============
    
    /// @notice BAItest token address on Base (hardcoded, cannot be changed)
    IERC20 public constant BAITEST_TOKEN = IERC20(0x2CA8B2b97bc0f0CcDd875dcfEff16b868A1b5BA3);
    
    /// @notice Lock period: exactly 2 years (730 days)
    uint256 public constant LOCK_PERIOD = 730 days;
    
    /// @notice Address that will receive tokens after unlock
    address public immutable beneficiary;
    
    /// @notice Timestamp when contract was deployed
    uint256 public immutable deployedAt;

    // ============ STATE ============
    
    /// @notice Amount of tokens locked
    uint256 public lockedAmount;
    
    /// @notice Timestamp when tokens were deposited (starts the lock)
    uint256 public depositTime;
    
    /// @notice Whether tokens have been released
    bool public released;
    
    /// @notice Whether deposit has been recorded
    bool public depositRecorded;

    // ============ EVENTS ============
    
    event TokensLocked(uint256 amount, uint256 unlockTime);
    event TokensReleased(address indexed beneficiary, uint256 amount);

    // ============ ERRORS ============
    
    error NotBeneficiary();
    error TokensStillLocked(uint256 unlockTime, uint256 currentTime);
    error AlreadyReleased();
    error NoTokensToLock();
    error DepositAlreadyRecorded();
    error ZeroAddress();

    // ============ CONSTRUCTOR ============
    
    /**
     * @notice Deploy the vesting contract
     * @param _beneficiary Address that will receive tokens after 2-year lock
     */
    constructor(address _beneficiary) {
        if (_beneficiary == address(0)) revert ZeroAddress();
        beneficiary = _beneficiary;
        deployedAt = block.timestamp;
    }

    // ============ EXTERNAL FUNCTIONS ============
    
    /**
     * @notice Record the token deposit and start the 2-year lock
     * @dev Call this AFTER sending BAItest tokens to this contract
     * @dev Can only be called once - tokens are locked permanently until unlock time
     */
    function recordDeposit() external {
        if (depositRecorded) revert DepositAlreadyRecorded();
        
        uint256 balance = BAITEST_TOKEN.balanceOf(address(this));
        if (balance == 0) revert NoTokensToLock();
        
        depositRecorded = true;
        lockedAmount = balance;
        depositTime = block.timestamp;
        
        emit TokensLocked(balance, block.timestamp + LOCK_PERIOD);
    }

    /**
     * @notice Release tokens to beneficiary after 2-year lock period
     * @dev Can only be called by beneficiary after unlock time
     */
    function release() external nonReentrant {
        if (msg.sender != beneficiary) revert NotBeneficiary();
        if (released) revert AlreadyReleased();
        if (!depositRecorded) revert NoTokensToLock();
        
        uint256 unlockTime = depositTime + LOCK_PERIOD;
        if (block.timestamp < unlockTime) {
            revert TokensStillLocked(unlockTime, block.timestamp);
        }
        
        released = true;
        uint256 amount = lockedAmount;
        
        BAITEST_TOKEN.safeTransfer(beneficiary, amount);
        
        emit TokensReleased(beneficiary, amount);
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get the unlock timestamp
     * @return Timestamp when tokens can be released (0 if not deposited yet)
     */
    function unlockTime() external view returns (uint256) {
        if (!depositRecorded) return 0;
        return depositTime + LOCK_PERIOD;
    }
    
    /**
     * @notice Check if tokens are unlocked
     * @return True if tokens can be released
     */
    function isUnlocked() external view returns (bool) {
        if (!depositRecorded) return false;
        return block.timestamp >= depositTime + LOCK_PERIOD;
    }
    
    /**
     * @notice Get time remaining until unlock
     * @return Seconds until unlock (0 if already unlocked or not deposited)
     */
    function timeRemaining() external view returns (uint256) {
        if (!depositRecorded) return 0;
        uint256 unlock = depositTime + LOCK_PERIOD;
        if (block.timestamp >= unlock) return 0;
        return unlock - block.timestamp;
    }
    
    /**
     * @notice Get complete vesting status
     * @return _beneficiary Address receiving tokens
     * @return _lockedAmount Amount of tokens locked
     * @return _depositTime When tokens were deposited
     * @return _unlockTime When tokens can be released
     * @return _isUnlocked Whether tokens are unlocked
     * @return _released Whether tokens have been released
     */
    function getVestingStatus() external view returns (
        address _beneficiary,
        uint256 _lockedAmount,
        uint256 _depositTime,
        uint256 _unlockTime,
        bool _isUnlocked,
        bool _released
    ) {
        uint256 unlock = depositRecorded ? depositTime + LOCK_PERIOD : 0;
        return (
            beneficiary,
            lockedAmount,
            depositTime,
            unlock,
            depositRecorded && block.timestamp >= unlock,
            released
        );
    }
}
