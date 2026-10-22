// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SettlementKernel
 * @notice Multilateral obligation settlement kernel on Mezo.
 * Enforces atomic collect-then-distribute settlement of net payment obligations in MUSD.
 * Solvency Invariant: All net debtors must deposit 100% of required funds before distribution.
 * If funding deadline expires without 100% funding or if cycle is cancelled, depositors can claim individual refunds.
 */
contract SettlementKernel is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Constants & System Bounds ---
    uint256 public constant MAX_PARTICIPANTS = 10;
    uint256 public constant MIN_FUNDING_DURATION = 1 hours;
    uint256 public constant MAX_FUNDING_DURATION = 30 days;
    uint256 public constant DEFAULT_FUNDING_DURATION = 72 hours;

    IERC20 public immutable musdToken;

    // --- State Machine ---
    enum CycleState {
        NonExistent,
        Funding,
        ReadyToSettle,
        Completed,
        Expired,
        Refunded,
        Cancelled
    }

    struct CycleInput {
        bytes32 cycleId;
        bytes32 snapshotCommitment;
        string algorithmVersion;
        uint256 grossObligationTotal;
        address[] debtors;
        uint256[] debitAmounts;
        address[] creditors;
        uint256[] creditAmounts;
        uint256 fundingDuration;
    }

    struct CycleStorage {
        bytes32 cycleId;
        bytes32 snapshotCommitment;
        string algorithmVersion;
        uint256 grossObligationTotal;
        uint256 netDebtTotal;
        uint256 totalFunded;
        uint256 totalDistributed;
        uint256 totalRefunded;
        uint256 fundingDeadline;
        CycleState state;
        address creator;
        address[] debtors;
        address[] creditors;
    }

    // cycleId => cycle core metadata
    mapping(bytes32 => CycleStorage) private _cycles;

    // cycleId => debtor address => required amount
    mapping(bytes32 => mapping(address => uint256)) private _requiredDeposit;

    // cycleId => debtor address => funded amount
    mapping(bytes32 => mapping(address => uint256)) private _fundedDeposit;

    // cycleId => creditor address => payout amount
    mapping(bytes32 => mapping(address => uint256)) private _creditorPayout;

    // --- Custom Errors ---
    error ZeroAddressToken();
    error CycleAlreadyExists(bytes32 cycleId);
    error CycleNotFound(bytes32 cycleId);
    error InvalidParticipantBounds(uint256 count);
    error ArrayLengthMismatch();
    error ZeroAddressParticipant();
    error DuplicateParticipant(address participant);
    error DebtorCannotBeCreditor(address participant);
    error InvalidAmount();
    error ImbalancedNetPositions(uint256 totalDebits, uint256 totalCredits);
    error InvalidGrossTotal(uint256 grossTotal, uint256 netTotal);
    error InvalidFundingDuration(uint256 duration);
    error CycleNotInFundingState(bytes32 cycleId, CycleState currentState);
    error FundingDeadlineExpired(bytes32 cycleId, uint256 deadline, uint256 currentTimestamp);
    error FundingDeadlineNotReached(bytes32 cycleId, uint256 deadline, uint256 currentTimestamp);
    error UnauthorizedDebtor(address caller);
    error UnauthorizedCaller(address caller, address required);
    error ExcessiveDeposit(uint256 attempted, uint256 remainingDue);
    error CycleNotReadyToSettle(bytes32 cycleId, uint256 totalFunded, uint256 requiredTotal);
    error CycleAlreadyFullyFunded(bytes32 cycleId);
    error CycleNotInRefundableState(bytes32 cycleId, CycleState state);
    error TerminalStateReached(bytes32 cycleId, CycleState state);
    error NoRefundAvailable(bytes32 cycleId, address caller);

    // --- Events ---
    event CycleCreated(
        bytes32 indexed cycleId,
        bytes32 indexed snapshotCommitment,
        uint256 netDebtTotal,
        uint256 grossObligationTotal,
        uint256 fundingDeadline,
        address indexed creator
    );

    event DepositReceived(
        bytes32 indexed cycleId,
        address indexed debtor,
        uint256 amount,
        uint256 totalDebtorFunded,
        uint256 totalCycleFunded
    );

    event CycleReadyToSettle(bytes32 indexed cycleId, uint256 totalFunded);

    event CycleSettled(
        bytes32 indexed cycleId,
        uint256 totalDistributed,
        uint256 creditorCount,
        uint256 timestamp
    );

    event CycleExpired(bytes32 indexed cycleId, uint256 totalFunded, uint256 timestamp);

    event CycleCancelled(
        bytes32 indexed cycleId,
        address indexed creator,
        uint256 timestamp
    );

    event RefundClaimed(
        bytes32 indexed cycleId,
        address indexed participant,
        uint256 amount,
        uint256 timestamp
    );

    constructor(address _musdToken) {
        if (_musdToken == address(0)) revert ZeroAddressToken();
        musdToken = IERC20(_musdToken);
    }

    /**
     * @notice Creates and freezes a new settlement cycle on-chain.
     * @param input CycleInput struct containing cycle parameters, participant lists, and bounds.
     */
    function createCycle(CycleInput calldata input) external returns (bytes32) {
        bytes32 cycleId = input.cycleId;
        if (_cycles[cycleId].state != CycleState.NonExistent) {
            revert CycleAlreadyExists(cycleId);
        }

        uint256 debtorCount = input.debtors.length;
        uint256 creditorCount = input.creditors.length;
        uint256 totalParticipants = debtorCount + creditorCount;

        if (debtorCount == 0 || creditorCount == 0 || totalParticipants > MAX_PARTICIPANTS) {
            revert InvalidParticipantBounds(totalParticipants);
        }
        if (debtorCount != input.debitAmounts.length || creditorCount != input.creditAmounts.length) {
            revert ArrayLengthMismatch();
        }
        if (input.fundingDuration < MIN_FUNDING_DURATION || input.fundingDuration > MAX_FUNDING_DURATION) {
            revert InvalidFundingDuration(input.fundingDuration);
        }

        uint256 netDebtTotal = 0;
        for (uint256 i = 0; i < debtorCount; i++) {
            address debtor = input.debtors[i];
            uint256 amount = input.debitAmounts[i];

            if (debtor == address(0)) revert ZeroAddressParticipant();
            if (amount == 0) revert InvalidAmount();
            if (_requiredDeposit[cycleId][debtor] > 0) revert DuplicateParticipant(debtor);

            _requiredDeposit[cycleId][debtor] = amount;
            netDebtTotal += amount;
        }

        uint256 netCreditTotal = 0;
        for (uint256 j = 0; j < creditorCount; j++) {
            address creditor = input.creditors[j];
            uint256 amount = input.creditAmounts[j];

            if (creditor == address(0)) revert ZeroAddressParticipant();
            if (amount == 0) revert InvalidAmount();
            if (_requiredDeposit[cycleId][creditor] > 0) revert DebtorCannotBeCreditor(creditor);
            if (_creditorPayout[cycleId][creditor] > 0) revert DuplicateParticipant(creditor);

            _creditorPayout[cycleId][creditor] = amount;
            netCreditTotal += amount;
        }

        if (netDebtTotal != netCreditTotal) {
            revert ImbalancedNetPositions(netDebtTotal, netCreditTotal);
        }
        if (input.grossObligationTotal < netDebtTotal) {
            revert InvalidGrossTotal(input.grossObligationTotal, netDebtTotal);
        }

        uint256 deadline = block.timestamp + input.fundingDuration;

        CycleStorage storage cycle = _cycles[cycleId];
        cycle.cycleId = cycleId;
        cycle.snapshotCommitment = input.snapshotCommitment;
        cycle.algorithmVersion = input.algorithmVersion;
        cycle.grossObligationTotal = input.grossObligationTotal;
        cycle.netDebtTotal = netDebtTotal;
        cycle.fundingDeadline = deadline;
        cycle.state = CycleState.Funding;
        cycle.creator = msg.sender;
        cycle.debtors = input.debtors;
        cycle.creditors = input.creditors;

        emit CycleCreated(
            cycleId,
            input.snapshotCommitment,
            netDebtTotal,
            input.grossObligationTotal,
            deadline,
            msg.sender
        );

        return cycleId;
    }

    /**
     * @dev Internal helper executing debtor accounting and token transfer.
     */
    function _deposit(bytes32 cycleId, uint256 amount, address debtor) internal {
        CycleStorage storage cycle = _cycles[cycleId];
        if (cycle.state == CycleState.NonExistent) revert CycleNotFound(cycleId);
        if (cycle.state != CycleState.Funding) revert CycleNotInFundingState(cycleId, cycle.state);
        if (block.timestamp > cycle.fundingDeadline) {
            cycle.state = CycleState.Expired;
            emit CycleExpired(cycleId, cycle.totalFunded, block.timestamp);
            revert FundingDeadlineExpired(cycleId, cycle.fundingDeadline, block.timestamp);
        }
        if (amount == 0) revert InvalidAmount();

        uint256 required = _requiredDeposit[cycleId][debtor];
        if (required == 0) revert UnauthorizedDebtor(debtor);

        uint256 alreadyFunded = _fundedDeposit[cycleId][debtor];
        uint256 remainingDue = required - alreadyFunded;
        if (amount > remainingDue) revert ExcessiveDeposit(amount, remainingDue);

        // State update before external transfer (Checks-Effects-Interactions)
        _fundedDeposit[cycleId][debtor] = alreadyFunded + amount;
        cycle.totalFunded += amount;

        if (cycle.totalFunded == cycle.netDebtTotal) {
            cycle.state = CycleState.ReadyToSettle;
            emit CycleReadyToSettle(cycleId, cycle.totalFunded);
        }

        emit DepositReceived(
            cycleId,
            debtor,
            amount,
            alreadyFunded + amount,
            cycle.totalFunded
        );

        musdToken.safeTransferFrom(debtor, address(this), amount);
    }

    /**
     * @notice Deposits MUSD toward a participant's net debtor obligation.
     * @param cycleId Identifier of the active settlement cycle.
     * @param amount Amount of MUSD to deposit in base units.
     */
    function deposit(bytes32 cycleId, uint256 amount) external nonReentrant {
        _deposit(cycleId, amount, msg.sender);
    }

    /**
     * @notice Deposits MUSD using an EIP-2612 permit signature, enabling 1-click approvals.
     * @param cycleId Identifier of the active settlement cycle.
     * @param amount Amount of MUSD to deposit in base units.
     * @param deadline Expiration timestamp of the permit signature.
     * @param v ECDSA recovery byte.
     * @param r ECDSA signature point r.
     * @param s ECDSA signature point s.
     */
    function depositWithPermit(
        bytes32 cycleId,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        try IERC20Permit(address(musdToken)).permit(msg.sender, address(this), amount, deadline, v, r, s) {} catch {}
        _deposit(cycleId, amount, msg.sender);
    }

    /**
     * @notice Cooperatively cancels an active settlement cycle before 100% funding.
     * Callable only by the cycle creator.
     * Transitions cycle to Cancelled state, allowing depositors to claim immediate refunds.
     * @param cycleId Identifier of the active settlement cycle.
     */
    function cancelCycle(bytes32 cycleId) external nonReentrant {
        CycleStorage storage cycle = _cycles[cycleId];
        if (cycle.state == CycleState.NonExistent) revert CycleNotFound(cycleId);
        if (cycle.state != CycleState.Funding) revert CycleNotInFundingState(cycleId, cycle.state);
        if (msg.sender != cycle.creator) revert UnauthorizedCaller(msg.sender, cycle.creator);
        if (cycle.totalFunded == cycle.netDebtTotal) revert CycleAlreadyFullyFunded(cycleId);

        cycle.state = CycleState.Cancelled;
        emit CycleCancelled(cycleId, msg.sender, block.timestamp);
    }

    /**
     * @notice Atomically distributes deposited MUSD to all net creditors.
     * Permissionless: any caller can trigger settlement once 100% funded.
     * @param cycleId Identifier of the fully funded settlement cycle.
     */
    function executeSettlement(bytes32 cycleId) external nonReentrant {
        CycleStorage storage cycle = _cycles[cycleId];
        if (cycle.state == CycleState.NonExistent) revert CycleNotFound(cycleId);
        if (cycle.state == CycleState.Completed) revert TerminalStateReached(cycleId, cycle.state);
        if (cycle.state == CycleState.Refunded) revert TerminalStateReached(cycleId, cycle.state);

        if (cycle.state != CycleState.ReadyToSettle && cycle.totalFunded != cycle.netDebtTotal) {
            revert CycleNotReadyToSettle(cycleId, cycle.totalFunded, cycle.netDebtTotal);
        }

        // Transition to terminal state before external transfers
        cycle.state = CycleState.Completed;
        cycle.totalDistributed = cycle.netDebtTotal;

        address[] memory creditors = cycle.creditors;
        uint256 creditorCount = creditors.length;

        for (uint256 i = 0; i < creditorCount; i++) {
            address creditor = creditors[i];
            uint256 payout = _creditorPayout[cycleId][creditor];
            musdToken.safeTransfer(creditor, payout);
        }

        emit CycleSettled(cycleId, cycle.netDebtTotal, creditorCount, block.timestamp);
    }

    /**
     * @notice Claims a refund for a previously funded deposit if the cycle expired without 100% funding
     * or was cancelled by the coordinator.
     * @param cycleId Identifier of the expired or cancelled settlement cycle.
     */
    function claimRefund(bytes32 cycleId) external nonReentrant {
        CycleStorage storage cycle = _cycles[cycleId];
        if (cycle.state == CycleState.NonExistent) revert CycleNotFound(cycleId);
        if (cycle.state == CycleState.Completed) revert TerminalStateReached(cycleId, cycle.state);

        if (cycle.state == CycleState.Funding) {
            if (block.timestamp <= cycle.fundingDeadline) {
                revert FundingDeadlineNotReached(cycleId, cycle.fundingDeadline, block.timestamp);
            }
            cycle.state = CycleState.Expired;
            emit CycleExpired(cycleId, cycle.totalFunded, block.timestamp);
        } else if (cycle.state != CycleState.Expired && cycle.state != CycleState.Cancelled && cycle.state != CycleState.Refunded) {
            revert CycleNotInRefundableState(cycleId, cycle.state);
        }

        uint256 depositAmount = _fundedDeposit[cycleId][msg.sender];
        if (depositAmount == 0) revert NoRefundAvailable(cycleId, msg.sender);

        // Clear deposit before transfer (Checks-Effects-Interactions)
        _fundedDeposit[cycleId][msg.sender] = 0;
        cycle.totalRefunded += depositAmount;

        if (cycle.totalRefunded == cycle.totalFunded) {
            cycle.state = CycleState.Refunded;
        }

        emit RefundClaimed(cycleId, msg.sender, depositAmount, block.timestamp);

        musdToken.safeTransfer(msg.sender, depositAmount);
    }

    // --- Query & View Functions ---

    function getCycle(bytes32 cycleId) external view returns (
        bytes32 snapshotCommitment,
        string memory algorithmVersion,
        uint256 grossObligationTotal,
        uint256 netDebtTotal,
        uint256 totalFunded,
        uint256 totalDistributed,
        uint256 totalRefunded,
        uint256 fundingDeadline,
        CycleState state,
        address creator
    ) {
        CycleStorage storage cycle = _cycles[cycleId];
        if (cycle.state == CycleState.NonExistent) revert CycleNotFound(cycleId);

        return (
            cycle.snapshotCommitment,
            cycle.algorithmVersion,
            cycle.grossObligationTotal,
            cycle.netDebtTotal,
            cycle.totalFunded,
            cycle.totalDistributed,
            cycle.totalRefunded,
            cycle.fundingDeadline,
            cycle.state,
            cycle.creator
        );
    }

    function getCycleParticipants(bytes32 cycleId) external view returns (
        address[] memory debtors,
        address[] memory creditors
    ) {
        CycleStorage storage cycle = _cycles[cycleId];
        if (cycle.state == CycleState.NonExistent) revert CycleNotFound(cycleId);
        return (cycle.debtors, cycle.creditors);
    }

    function getDebtorStatus(bytes32 cycleId, address debtor) external view returns (
        uint256 required,
        uint256 funded,
        bool isFullyFunded
    ) {
        required = _requiredDeposit[cycleId][debtor];
        funded = _fundedDeposit[cycleId][debtor];
        isFullyFunded = (required > 0 && funded >= required);
    }

    function getCreditorPayout(bytes32 cycleId, address creditor) external view returns (uint256) {
        return _creditorPayout[cycleId][creditor];
    }

    function isCycleFullyFunded(bytes32 cycleId) external view returns (bool) {
        CycleStorage storage cycle = _cycles[cycleId];
        return (cycle.netDebtTotal > 0 && cycle.totalFunded >= cycle.netDebtTotal);
    }
}
