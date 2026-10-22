// Auto-generated typed ABI for SettlementKernel
export const settlementKernelAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_musdToken",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "DEFAULT_FUNDING_DURATION",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_FUNDING_DURATION",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_PARTICIPANTS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_FUNDING_DURATION",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cancelCycle",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimRefund",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createCycle",
    "inputs": [
      {
        "name": "input",
        "type": "tuple",
        "internalType": "struct SettlementKernel.CycleInput",
        "components": [
          {
            "name": "cycleId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "snapshotCommitment",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "algorithmVersion",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "grossObligationTotal",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "debtors",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "debitAmounts",
            "type": "uint256[]",
            "internalType": "uint256[]"
          },
          {
            "name": "creditors",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "creditAmounts",
            "type": "uint256[]",
            "internalType": "uint256[]"
          },
          {
            "name": "fundingDuration",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "deposit",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "depositWithPermit",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "deadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "v",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "r",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "executeSettlement",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getCreditorPayout",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "creditor",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getCycle",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "snapshotCommitment",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "algorithmVersion",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "grossObligationTotal",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "netDebtTotal",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalFunded",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalDistributed",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalRefunded",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "fundingDeadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "state",
        "type": "uint8",
        "internalType": "enum SettlementKernel.CycleState"
      },
      {
        "name": "creator",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getCycleParticipants",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "debtors",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "creditors",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getDebtorStatus",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "debtor",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "required",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "funded",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "isFullyFunded",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isCycleFullyFunded",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "musdToken",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC20"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "CycleCancelled",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CycleCreated",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "snapshotCommitment",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "netDebtTotal",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "grossObligationTotal",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "fundingDeadline",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CycleExpired",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "totalFunded",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CycleReadyToSettle",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "totalFunded",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CycleSettled",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "totalDistributed",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "creditorCount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DepositReceived",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "debtor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "totalDebtorFunded",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "totalCycleFunded",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RefundClaimed",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "participant",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "ArrayLengthMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CycleAlreadyExists",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "CycleAlreadyFullyFunded",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "CycleNotFound",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "CycleNotInFundingState",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "currentState",
        "type": "uint8",
        "internalType": "enum SettlementKernel.CycleState"
      }
    ]
  },
  {
    "type": "error",
    "name": "CycleNotInRefundableState",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "state",
        "type": "uint8",
        "internalType": "enum SettlementKernel.CycleState"
      }
    ]
  },
  {
    "type": "error",
    "name": "CycleNotReadyToSettle",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "totalFunded",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "requiredTotal",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "DebtorCannotBeCreditor",
    "inputs": [
      {
        "name": "participant",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "DuplicateParticipant",
    "inputs": [
      {
        "name": "participant",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ExcessiveDeposit",
    "inputs": [
      {
        "name": "attempted",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "remainingDue",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "FundingDeadlineExpired",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "deadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "currentTimestamp",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "FundingDeadlineNotReached",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "deadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "currentTimestamp",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ImbalancedNetPositions",
    "inputs": [
      {
        "name": "totalDebits",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalCredits",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidAmount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidFundingDuration",
    "inputs": [
      {
        "name": "duration",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidGrossTotal",
    "inputs": [
      {
        "name": "grossTotal",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "netTotal",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidParticipantBounds",
    "inputs": [
      {
        "name": "count",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NoRefundAvailable",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "caller",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "TerminalStateReached",
    "inputs": [
      {
        "name": "cycleId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "state",
        "type": "uint8",
        "internalType": "enum SettlementKernel.CycleState"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnauthorizedCaller",
    "inputs": [
      {
        "name": "caller",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "required",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnauthorizedDebtor",
    "inputs": [
      {
        "name": "caller",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroAddressParticipant",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAddressToken",
    "inputs": []
  }
] as const;
