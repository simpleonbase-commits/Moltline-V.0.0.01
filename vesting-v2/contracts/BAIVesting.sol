// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BAIVesting - 2-Year Token Vesting Vault
 * @author Bureau of Agent Investigations (BAI)
 * @notice Secure vesting contract where each deposit unlocks after 2 years
 * @dev Single contract handles multiple deposits, each with independent 2-year locks
 * 
 * Security Features:
 * - ReentrancyGuard on all state-changing functions
 * - SafeERC20 for token transfers
 * - Immutable token address (cannot be changed)
 * - Each deposit tracked independently
 * - No admin functions that can unlock early
 * - Fully trustless - code is law
 */
contract BAIVesting is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    uint256 public constant VESTING_DURATION = 730 days; // Exactly 2 years
    
    // ============ Immutables ============
    IERC20 public immutable vestingToken;
    
    // ============ Structs ============
    struct Deposit {
        uint256 amount;         // Amount of tokens deposited
        uint256 depositTime;    // When the deposit was made
        uint256 unlockTime;     // When tokens can be withdrawn
        bool withdrawn;         // Whether tokens have been withdrawn
        string memo;            // Optional memo/note for the deposit
    }
    
    // ============ State ============
    mapping(address => Deposit[]) public deposits;
    mapping(address => uint256) public totalDeposited;
    mapping(address => uint256) public totalWithdrawn;
    
    uint256 public totalVested;           // Total tokens currently vesting
    uint256 public totalDepositCount;     // Total number of deposits ever made
    
    // ============ Events ============
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
    
    event BulkDeposit(
        address indexed depositor,
        uint256 totalAmount,
        uint256 depositCount
    );

    // ============ Errors ============
    error ZeroAmount();
    error ZeroAddress();
    error DepositNotFound();
    error TokensStillLocked(uint256 unlockTime);
    error AlreadyWithdrawn();
    error ArrayLengthMismatch();

    // ============ Constructor ============
    /**
     * @notice Deploy the vesting contract for a specific token
     * @param _vestingToken The ERC20 token address to vest
     */
    constructor(address _vestingToken) {
        if (_vestingToken == address(0)) revert ZeroAddress();
        vestingToken = IERC20(_vestingToken);
    }

    // ============ Deposit Functions ============
    
    /**
     * @notice Deposit tokens for a beneficiary with 2-year vesting
     * @param beneficiary Address that will receive tokens after vesting
     * @param amount Amount of tokens to vest
     * @param memo Optional memo/note for this deposit
     * @return depositId The ID of this deposit for the beneficiary
     */
    function deposit(
        address beneficiary,
        uint256 amount,
        string calldata memo
    ) external nonReentrant returns (uint256 depositId) {
        if (beneficiary == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        // Transfer tokens from sender to this contract
        vestingToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Calculate unlock time
        uint256 unlockTime = block.timestamp + VESTING_DURATION;
        
        // Create deposit record
        depositId = deposits[beneficiary].length;
        deposits[beneficiary].push(Deposit({
            amount: amount,
            depositTime: block.timestamp,
            unlockTime: unlockTime,
            withdrawn: false,
            memo: memo
        }));
        
        // Update totals
        totalDeposited[beneficiary] += amount;
        totalVested += amount;
        totalDepositCount++;
        
        emit TokensDeposited(
            beneficiary,
            depositId,
            amount,
            block.timestamp,
            unlockTime,
            memo
        );
    }
    
    /**
     * @notice Deposit tokens for yourself with 2-year vesting
     * @param amount Amount of tokens to vest
     * @param memo Optional memo/note for this deposit
     * @return depositId The ID of this deposit
     */
    function depositSelf(
        uint256 amount,
        string calldata memo
    ) external nonReentrant returns (uint256 depositId) {
        if (amount == 0) revert ZeroAmount();
        
        vestingToken.safeTransferFrom(msg.sender, address(this), amount);
        
        uint256 unlockTime = block.timestamp + VESTING_DURATION;
        
        depositId = deposits[msg.sender].length;
        deposits[msg.sender].push(Deposit({
            amount: amount,
            depositTime: block.timestamp,
            unlockTime: unlockTime,
            withdrawn: false,
            memo: memo
        }));
        
        totalDeposited[msg.sender] += amount;
        totalVested += amount;
        totalDepositCount++;
        
        emit TokensDeposited(
            msg.sender,
            depositId,
            amount,
            block.timestamp,
            unlockTime,
            memo
        );
    }
    
    /**
     * @notice Bulk deposit to multiple beneficiaries
     * @param beneficiaries Array of addresses to receive vested tokens
     * @param amounts Array of amounts for each beneficiary
     * @param memos Array of memos for each deposit
     */
    function bulkDeposit(
        address[] calldata beneficiaries,
        uint256[] calldata amounts,
        string[] calldata memos
    ) external nonReentrant {
        uint256 len = beneficiaries.length;
        if (len != amounts.length || len != memos.length) revert ArrayLengthMismatch();
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < len; i++) {
            totalAmount += amounts[i];
        }
        
        // Single transfer for all tokens
        vestingToken.safeTransferFrom(msg.sender, address(this), totalAmount);
        
        uint256 unlockTime = block.timestamp + VESTING_DURATION;
        
        for (uint256 i = 0; i < len; i++) {
            address beneficiary = beneficiaries[i];
            uint256 amount = amounts[i];
            
            if (beneficiary == address(0)) revert ZeroAddress();
            if (amount == 0) revert ZeroAmount();
            
            uint256 depositId = deposits[beneficiary].length;
            deposits[beneficiary].push(Deposit({
                amount: amount,
                depositTime: block.timestamp,
                unlockTime: unlockTime,
                withdrawn: false,
                memo: memos[i]
            }));
            
            totalDeposited[beneficiary] += amount;
            totalDepositCount++;
            
            emit TokensDeposited(
                beneficiary,
                depositId,
                amount,
                block.timestamp,
                unlockTime,
                memos[i]
            );
        }
        
        totalVested += totalAmount;
        emit BulkDeposit(msg.sender, totalAmount, len);
    }

    // ============ Withdrawal Functions ============
    
    /**
     * @notice Withdraw a specific unlocked deposit
     * @param depositId The ID of the deposit to withdraw
     */
    function withdraw(uint256 depositId) external nonReentrant {
        if (depositId >= deposits[msg.sender].length) revert DepositNotFound();
        
        Deposit storage dep = deposits[msg.sender][depositId];
        
        if (dep.withdrawn) revert AlreadyWithdrawn();
        if (block.timestamp < dep.unlockTime) revert TokensStillLocked(dep.unlockTime);
        
        uint256 amount = dep.amount;
        dep.withdrawn = true;
        
        totalWithdrawn[msg.sender] += amount;
        totalVested -= amount;
        
        vestingToken.safeTransfer(msg.sender, amount);
        
        emit TokensWithdrawn(msg.sender, depositId, amount, block.timestamp);
    }
    
    /**
     * @notice Withdraw all unlocked deposits
     * @return totalAmount Total amount withdrawn
     * 
     * ⚠️ GAS WARNING: If you have 500+ deposits, this function may run out of gas.
     * RECOMMENDATION: After 2 years, call withdrawAll() periodically (monthly) 
     * rather than waiting to withdraw 730+ deposits at once.
     * You can always use withdraw(depositId) individually if this hits gas limits.
     */
    function withdrawAll() external nonReentrant returns (uint256 totalAmount) {
        Deposit[] storage userDeposits = deposits[msg.sender];
        uint256 len = userDeposits.length;
        
        for (uint256 i = 0; i < len; i++) {
            Deposit storage dep = userDeposits[i];
            
            if (!dep.withdrawn && block.timestamp >= dep.unlockTime) {
                totalAmount += dep.amount;
                dep.withdrawn = true;
                
                emit TokensWithdrawn(msg.sender, i, dep.amount, block.timestamp);
            }
        }
        
        if (totalAmount == 0) revert ZeroAmount();
        
        totalWithdrawn[msg.sender] += totalAmount;
        totalVested -= totalAmount;
        
        vestingToken.safeTransfer(msg.sender, totalAmount);
    }

    // ============ View Functions ============
    
    /**
     * @notice Get the number of deposits for an address
     * @param beneficiary The address to query
     * @return The number of deposits
     */
    function getDepositCount(address beneficiary) external view returns (uint256) {
        return deposits[beneficiary].length;
    }
    
    /**
     * @notice Get deposit details
     * @param beneficiary The address to query
     * @param depositId The deposit ID
     * @return amount The deposit amount
     * @return depositTime When the deposit was made
     * @return unlockTime When tokens unlock
     * @return withdrawn Whether already withdrawn
     * @return memo The deposit memo
     */
    function getDeposit(
        address beneficiary,
        uint256 depositId
    ) external view returns (
        uint256 amount,
        uint256 depositTime,
        uint256 unlockTime,
        bool withdrawn,
        string memory memo
    ) {
        if (depositId >= deposits[beneficiary].length) revert DepositNotFound();
        Deposit storage dep = deposits[beneficiary][depositId];
        return (dep.amount, dep.depositTime, dep.unlockTime, dep.withdrawn, dep.memo);
    }
    
    /**
     * @notice Get total unlocked (withdrawable) balance
     * @param beneficiary The address to query
     * @return unlocked Total amount available to withdraw
     */
    function getUnlockedBalance(address beneficiary) external view returns (uint256 unlocked) {
        Deposit[] storage userDeposits = deposits[beneficiary];
        uint256 len = userDeposits.length;
        
        for (uint256 i = 0; i < len; i++) {
            Deposit storage dep = userDeposits[i];
            if (!dep.withdrawn && block.timestamp >= dep.unlockTime) {
                unlocked += dep.amount;
            }
        }
    }
    
    /**
     * @notice Get total locked (still vesting) balance
     * @param beneficiary The address to query
     * @return locked Total amount still locked
     */
    function getLockedBalance(address beneficiary) external view returns (uint256 locked) {
        Deposit[] storage userDeposits = deposits[beneficiary];
        uint256 len = userDeposits.length;
        
        for (uint256 i = 0; i < len; i++) {
            Deposit storage dep = userDeposits[i];
            if (!dep.withdrawn && block.timestamp < dep.unlockTime) {
                locked += dep.amount;
            }
        }
    }
    
    /**
     * @notice Get all deposits for an address (for UI display)
     * @param beneficiary The address to query
     * @return amounts Array of deposit amounts
     * @return depositTimes Array of deposit timestamps
     * @return unlockTimes Array of unlock timestamps
     * @return withdrawnFlags Array of withdrawn flags
     */
    function getAllDeposits(address beneficiary) external view returns (
        uint256[] memory amounts,
        uint256[] memory depositTimes,
        uint256[] memory unlockTimes,
        bool[] memory withdrawnFlags
    ) {
        Deposit[] storage userDeposits = deposits[beneficiary];
        uint256 len = userDeposits.length;
        
        amounts = new uint256[](len);
        depositTimes = new uint256[](len);
        unlockTimes = new uint256[](len);
        withdrawnFlags = new bool[](len);
        
        for (uint256 i = 0; i < len; i++) {
            amounts[i] = userDeposits[i].amount;
            depositTimes[i] = userDeposits[i].depositTime;
            unlockTimes[i] = userDeposits[i].unlockTime;
            withdrawnFlags[i] = userDeposits[i].withdrawn;
        }
    }
    
    /**
     * @notice Check if a deposit is unlocked
     * @param beneficiary The address to query
     * @param depositId The deposit ID
     * @return True if unlocked and not withdrawn
     */
    function isUnlocked(address beneficiary, uint256 depositId) external view returns (bool) {
        if (depositId >= deposits[beneficiary].length) return false;
        Deposit storage dep = deposits[beneficiary][depositId];
        return !dep.withdrawn && block.timestamp >= dep.unlockTime;
    }
    
    /**
     * @notice Get time remaining until unlock
     * @param beneficiary The address to query
     * @param depositId The deposit ID
     * @return secondsRemaining Seconds until unlock (0 if unlocked)
     */
    function timeUntilUnlock(
        address beneficiary,
        uint256 depositId
    ) external view returns (uint256 secondsRemaining) {
        if (depositId >= deposits[beneficiary].length) return 0;
        Deposit storage dep = deposits[beneficiary][depositId];
        if (block.timestamp >= dep.unlockTime) return 0;
        return dep.unlockTime - block.timestamp;
    }
}
