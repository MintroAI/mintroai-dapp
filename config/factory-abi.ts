export const FACTORY_ABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_signer",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "DeploymentFailed",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InsufficientPayment",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidBytecode",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidDeadline",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidSignature",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidSigner",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "LegacyDeploymentDisabled",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "SignatureAlreadyUsed",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "SignatureExpired",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "UnauthorizedDeployer",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "deployedAddress",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "deployer",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "bytecodeHash",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "paymentAmount",
          "type": "uint256"
        }
      ],
      "name": "ContractDeployed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "bool",
          "name": "enabled",
          "type": "bool"
        }
      ],
      "name": "LegacyDeploymentStatusUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "PaymentWithdrawn",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "oldSigner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newSigner",
          "type": "address"
        }
      ],
      "name": "SignerUpdated",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "bytes",
          "name": "bytecode",
          "type": "bytes"
        },
        {
          "internalType": "bytes32",
          "name": "salt",
          "type": "bytes32"
        }
      ],
      "name": "computeAddress",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes",
          "name": "bytecode",
          "type": "bytes"
        }
      ],
      "name": "deployBytecode",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes",
          "name": "bytecode",
          "type": "bytes"
        },
        {
          "internalType": "uint256",
          "name": "paymentAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "deadline",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "nonce",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "signature",
          "type": "bytes"
        }
      ],
      "name": "deployBytecodeWithPayment",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes",
          "name": "bytecode",
          "type": "bytes"
        },
        {
          "internalType": "bytes32",
          "name": "salt",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "paymentAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "deadline",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "nonce",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "signature",
          "type": "bytes"
        }
      ],
      "name": "deployBytecodeWithSaltAndPayment",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getBalance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "bytecodeHash",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "paymentAmount",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "deployer",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "deadline",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "nonce",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "chainId",
              "type": "uint256"
            }
          ],
          "internalType": "struct MintroContractDeployer.DeploymentData",
          "name": "data",
          "type": "tuple"
        }
      ],
      "name": "getMessageHash",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "isLegacyDeploymentEnabled",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes",
          "name": "signature",
          "type": "bytes"
        }
      ],
      "name": "isSignatureUsed",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bool",
          "name": "enabled",
          "type": "bool"
        }
      ],
      "name": "setLegacyDeploymentStatus",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "signer",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newSigner",
          "type": "address"
        }
      ],
      "name": "updateSigner",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "usedSignatures",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "bytecodeHash",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "paymentAmount",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "deployer",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "deadline",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "nonce",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "signature",
          "type": "bytes"
        }
      ],
      "name": "verifySignature",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address payable",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "withdraw",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address payable",
          "name": "to",
          "type": "address"
        }
      ],
      "name": "withdrawAll",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
] as const; 