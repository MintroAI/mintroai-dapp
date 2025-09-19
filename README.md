# MintroAI - AI-Powered Smart Contract Platform

An **AI-powered smart contract creation and deployment platform** built on **BNB Smart Chain (BSC)** and **NEAR Protocol**, compatible with multiple EVM networks. Create, deploy, and manage smart contracts with natural language AI assistance and revolutionary cross-chain capabilities through NEAR Chain Signatures.

## Technology Stack

- **Blockchain**: BNB Smart Chain + EVM-compatible chains + NEAR Protocol
- **Smart Contracts**: Solidity ^0.8.17, OpenZeppelin libraries
- **Frontend**: Next.js 14 + wagmi + RainbowKit + ethers.js
- **Development**: Hardhat, OpenZeppelin Upgradeable contracts
- **AI Integration**: Custom AI APIs for smart contract generation
- **Cross-Chain**: NEAR Chain Signatures for multi-chain deployment

## Supported Networks

### Primary Networks
- **BNB Smart Chain Mainnet** (Chain ID: 56) - Primary EVM Network
- **BNB Smart Chain Testnet** (Chain ID: 97) - BSC Testing Network
- **NEAR Protocol Mainnet** - Cross-chain deployment via Chain Signatures
- **NEAR Protocol Testnet** - Testing Chain Signatures

### Additional EVM Networks
- **Arbitrum One** (Chain ID: 42161)
- **Theta Network** (Chain ID: 361)
- **Theta Testnet** (Chain ID: 365)
- **HyperEVM** (Chain ID: 998)
- **Aurora Testnet** (Chain ID: 1313161555)

### Revolutionary Cross-Chain Support
- **NEAR Chain Signatures** - Deploy to BSC and any EVM chain from NEAR wallet
- **No Bridging Required** - Direct deployment through MPC technology
- **Gas-Free Deployments** - NEAR covers gas fees for Chain Signatures

## Contract Addresses

| Network | Factory Contract | Payment Processor | Token Template |
|---------|-----------------|-------------------|----------------|
| **BNB Mainnet** | `0xCe60855D40fa04c18990F94e673c769d91c37737` | Integrated | BEP-20/ERC-20 |
| **BNB Testnet** | `0xCe60855D40fa04c18990F94e673c769d91c37737` | Integrated | BEP-20/ERC-20 |
| Arbitrum | `0xCe60855D40fa04c18990F94e673c769d91c37737` | Integrated | ERC-20 |
| Theta Mainnet | `0xCe60855D40fa04c18990F94e673c769d91c37737` | Integrated | ERC-20 |
| HyperEVM | `0xCe60855D40fa04c18990F94e673c769d91c37737` | Integrated | ERC-20 |
| Aurora Testnet | `0xCe60855D40fa04c18990F94e673c769d91c37737` | Integrated | ERC-20 |

## Features

### 🔗 BNB Chain Optimized Features
- **Low-cost deployments on BSC** - Optimized gas usage for BNB Chain
- **BSC-native RPC endpoints** - Direct connection to BNB Smart Chain nodes
- **BNB payment integration** - Native BNB token payment support
- **Gas-efficient contract design** - Minimized transaction costs on BSC
- **BSC explorer integration** - Direct links to BSCScan for verification
- **BEP-20 token standard** - Full compatibility with BSC ecosystem

### 🌐 NEAR Protocol Integration
- **Chain Signatures Technology** - Revolutionary MPC-based cross-chain deployment
- **Deploy to BSC from NEAR** - Use NEAR wallet to deploy on BNB Chain
- **No Gas Fees Required** - NEAR Protocol covers deployment costs
- **Multi-Chain Access** - One NEAR account, deploy to any EVM chain
- **Secure MPC Network** - Decentralized signing without private key exposure
- **Instant Cross-Chain** - No bridges, no wrapping, direct deployment

### 🤖 AI-Powered Smart Contract Generation
- **Natural language contract creation** - Describe your needs in plain English
- **Interactive chat interface** - Real-time AI assistance for contract customization
- **Security analysis** - Built-in security checks and best practices validation
- **Custom contract templates** - Pre-audited templates for common use cases

### 🔗 Multi-Wallet & Cross-Chain Support
- **EVM Wallets**: MetaMask, WalletConnect, and 100+ wallets via RainbowKit
- **NEAR Protocol Integration**: Deploy to BSC and other EVM chains from NEAR wallet
- **Chain Signatures**: Secure cross-chain deployment without bridging
- **Multi-chain deployment**: Single interface for all supported networks

### 💎 Advanced Token Features
- **Mintable & Burnable** - Dynamic supply management
- **Pausable Contracts** - Emergency stop functionality
- **Anti-Bot Protection** - MEV and bot protection with cooldown
- **Transfer Tax System** - Configurable transaction fees
- **Blacklist Management** - Address-based access control
- **Max Transaction Limits** - Trading volume restrictions
- **Vesting Contracts** - Customizable token vesting schedules

### 💰 Dynamic Pricing System
- **Real-time price calculation** - See costs before deployment
- **Feature-based pricing** - Pay only for what you use
- **Free deployments** - On testnets and via Chain Signatures
- **Signature verification** - Secure payment processing on-chain

## BSC Configuration

### Network Configuration
```javascript
// config/networks.ts
export const SUPPORTED_NETWORKS = {
  // BNB Smart Chain Mainnet - PRIMARY NETWORK
  [56]: {
    chain: bsc,
    factoryAddress: "0xCe60855D40fa04c18990F94e673c769d91c37737",
    rpcUrls: {
      default: 'https://bsc-rpc.publicnode.com/'
    }
  },
  // BNB Smart Chain Testnet
  [97]: {
    chain: bscTestnet,
    factoryAddress: "0xCe60855D40fa04c18990F94e673c769d91c37737",
    chainSignaturesGasPrice: parseUnits('1', 'gwei'),
    chainSignaturesGasLimit: 2000000
  }
}
```

### BSC RPC Endpoints
```env
# Primary BSC RPC endpoints configured in .env
BSC_MAINNET_RPC=https://bsc-rpc.publicnode.com/
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
```

## Quick Start

### Prerequisites
- Node.js 18.0+ 
- npm/yarn/pnpm
- Docker (optional, for containerized deployment)
- MetaMask or compatible Web3 wallet
- BNB tokens for deployment fees (BSC)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/MintroAI/mintroai-dapp
cd mintroai-dapp
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Wallet Configuration
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="your_project_id"

# BSC Configuration 
NEXT_PUBLIC_DEFAULT_CHAIN_ID="56" # BSC Mainnet

# NEAR Protocol Configuration
NEXT_PUBLIC_NEAR_NETWORK_ID="testnet"
NEXT_PUBLIC_CONTRACT_ID="v1.signer-prod.testnet"

# API Endpoints
NEXT_PUBLIC_SIGNATURE_SERVICE_URL="your_signature_service"
NEXT_PUBLIC_WEBSOCKET_URL="your_websocket_url"
NEXT_PUBLIC_CHAT_URL="your_chat_api_url"
NEXT_PUBLIC_CONTRACT_GENERATOR_URL="your_contract_generator_url"
```

4. **Run development server**
```bash
npm run dev
```

5. **Open browser**
Navigate to [http://localhost:3000](http://localhost:3000)

### Docker Deployment
```bash
# Build and run with Docker
docker build -t mintroai-dapp .
docker run -p 3000:3000 --env-file .env.local mintroai-dapp
```

## BSC Deployment Guide

### Deploying Tokens on BSC

1. **Connect to BSC Network**
   - Open MetaMask or preferred wallet
   - Select BNB Smart Chain network
   - Ensure you have BNB for gas fees

2. **Configure Your Token**
   - Enter token details (name, symbol, supply)
   - Select features (see real-time pricing)
   - Review BSC deployment costs

3. **Deploy Contract**
   - Click "Create Token ($X.XX)"
   - Approve transaction in wallet
   - Contract deploys to BSC
   - View on BSCScan via provided link

### BSC-Specific Optimizations

- **Gas Price Optimization**: Automatic gas price adjustment for BSC
- **BEP-20 Standard**: Full compliance with BSC token standards
- **PancakeSwap Integration**: Tokens ready for DEX listing
- **BSC Validator Support**: Compatible with all BSC validators

## NEAR Chain Signatures (Cross-Chain Deployment)

Deploy to BSC and other EVM chains directly from your NEAR wallet:

1. **Connect NEAR Wallet**
   - Use NEAR wallet selector
   - No bridging required

2. **Select Target Chain**
   - Choose BSC or any supported EVM chain
   - System derives EVM address from NEAR account

3. **Deploy via MPC**
   - NEAR's MPC network signs transactions
   - Deploy directly to BSC from NEAR
   - Free deployment (gas covered by protocol)

### Supported Chain Signatures Networks
- BSC Mainnet & Testnet
- Arbitrum
- Aurora Testnet

## Testing on BSC Testnet

1. **Get Test BNB**
   - Visit [BSC Testnet Faucet](https://testnet.bnbchain.org/faucet-smart)
   - Request test BNB tokens

2. **Switch to Testnet**
   - Network: BSC Testnet
   - Chain ID: 97
   - RPC: https://data-seed-prebsc-1-s1.binance.org:8545/

3. **Deploy Test Contracts**
   - All features available
   - Free deployment on testnet
   - Full BSCScan integration

## Project Structure

```
mintroai-dapp/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (pricing, signatures)
│   └── providers.tsx      # BSC & wallet providers
├── components/            # React components
│   ├── token-creation-form.tsx
│   ├── vesting-creation-form.tsx
│   └── ai-chat.tsx
├── config/               
│   ├── networks.ts       # BSC & network configuration
│   ├── pricing.ts        # Dynamic pricing logic
│   └── factory-abi.ts    # Contract interfaces
├── hooks/                # Custom React hooks
└── lib/                  # Utilities
```

## Security

### Smart Contract Security
- **Audited factory contracts** on BSC
- **OpenZeppelin standards** for all contracts
- **Signature-based payments** prevent unauthorized deployments
- **Anti-bot mechanisms** protect against MEV

### BSC Security Features
- **BSC validator verification**
- **Time-locked functions** for admin operations
- **Emergency pause** capability
- **Upgradeable proxy patterns** for safety

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/bsc-improvement`
3. Commit changes: `git commit -m 'Add BSC feature'`
4. Push branch: `git push origin feature/bsc-improvement`
5. Open Pull Request

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

## Support & Links

- **Website**: [https://mintro.ai](https://mintro.ai)
- **GitHub**: [https://github.com/MintroAI/mintroai-dapp](https://github.com/MintroAI/mintroai-dapp)
- **Twitter**: [@MintroAI](https://x.com/MintroAI)

---

<div align="center">

[Deploy on BSC](https://mintro.ai) • [Deploy via NEAR](https://mintro.ai) • [BSCScan](https://bscscan.com/address/0xCe60855D40fa04c18990F94e673c769d91c37737) • [NEAR Explorer](https://explorer.near.org/)

**Bridging the Gap Between NEAR and EVM Chains**

</div>