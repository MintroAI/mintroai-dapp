# 🚀 MintroAI - AI-Powered Smart Contract Creation Platform

<div align="center">

![MintroAI Logo](public/assets/logo-small.svg)

**Create, Deploy, and Manage Smart Contracts with AI Assistance**

[![Next.js](https://img.shields.io/badge/Next.js-14.2.16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.1-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

[🌐 Live Demo](https://mintro.ai) • [📚 Documentation](#documentation) • [🐛 Report Bug](https://github.com/mintro-ai/saas-dapp/issues) • [✨ Request Feature](https://github.com/mintro-ai/saas-dapp/issues)

</div>

## ✨ Features

### 🤖 AI-Powered Smart Contract Generation
- **Intelligent Token Creation**: Generate ERC-20 tokens with AI assistance
- **Interactive Chat Interface**: Natural language smart contract creation
- **Security Analysis**: Built-in security checks and best practices validation

### 🔧 Advanced Token Features
- **Mintable & Burnable Tokens**: Dynamic supply management
- **Pausable Contracts**: Emergency stop functionality  
- **Anti-Bot Protection**: MEV and bot protection mechanisms
- **Transfer Tax System**: Configurable transaction fees
- **Blacklist Management**: Address-based access control
- **Max Transaction Limits**: Trading volume restrictions

### 🌐 Multi-Chain Support
- **Ethereum**: Full EVM compatibility
- **Arbitrum**: Layer 2 scaling solution
- **BSC Testnet**: Development and testing
- **Extensible**: Easy integration of new EVM chains

### 📊 Real-Time Market Intelligence
- **Live Price Data**: Real-time cryptocurrency prices and market data
- **Security Analysis**: Token and address security verification
- **DeFi Analytics**: Protocol TVL, yields, and performance metrics
- **Social Sentiment**: KOL mentions and social media trends
- **Gas Tracker**: Multi-chain gas price monitoring

### 🔐 Security & Compliance
- **Audited Templates**: Pre-audited smart contract templates
- **Security Scanning**: Automated vulnerability detection
- **Phishing Protection**: URL and address verification
- **Best Practices**: Industry-standard security implementations

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0 or higher
- **npm**, **yarn**, **pnpm**, or **bun**
- **MetaMask** or compatible Web3 wallet

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/truthdeal/mintroai-dapp
   cd saas-dapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your environment variables:
   ```env
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="your_wallet_connect_project_id"
   NEXT_PUBLIC_CHAT_URL="your_chat_api_url"
   NEXT_PUBLIC_CHAT_URL_GENERAL="your_general_chat_api_url"
   NEXT_PUBLIC_WEBSOCKET_URL="your_websocket_url"
   NEXT_PUBLIC_CONTRACT_GENERATOR_URL="your_contract_generator_url"
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Tech Stack

### Frontend
- **[Next.js 14](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Framer Motion](https://www.framer.com/motion/)** - Animation library
- **[Radix UI](https://www.radix-ui.com/)** - Accessible component primitives

### Web3 Integration
- **[Wagmi](https://wagmi.sh/)** - React hooks for Ethereum
- **[RainbowKit](https://www.rainbowkit.com/)** - Wallet connection interface
- **[Viem](https://viem.sh/)** - TypeScript interface for Ethereum

### AI & APIs
- **[ChainGPT API](https://chaingpt.org/)** - AI-powered crypto intelligence
- **Custom Proxy Service** - Railway-hosted API proxy
- **WebSocket Integration** - Real-time data updates

## 📁 Project Structure

```
saas-dapp/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── providers.tsx      # Context providers
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── ai-chat.tsx       # AI chat interface
│   ├── token-creation-form.tsx
│   └── ...
├── hooks/                # Custom React hooks
├── config/               # Configuration files
├── public/               # Static assets
└── lib/                  # Utility functions
```

## 🔧 Configuration

### Wallet Configuration

The platform supports multiple EVM-compatible networks. Configure networks in `app/providers.tsx`:

```typescript
const config = getDefaultConfig({
  appName: 'MintroAI DApp',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  chains: [arbitrum, bscTestnet], // Add your preferred chains
  ssr: true,
})
```

### API Configuration

Configure API endpoints in your environment variables:

- `NEXT_PUBLIC_CHAT_URL`: Token creation AI endpoint
- `NEXT_PUBLIC_CHAT_URL_GENERAL`: General purpose AI endpoint  
- `NEXT_PUBLIC_WEBSOCKET_URL`: Real-time updates
- `NEXT_PUBLIC_CONTRACT_GENERATOR_URL`: Smart contract generation

## 🚀 Deployment

### Vercel (Recommended)

1. **Deploy to Vercel**
   ```bash
   npm run build
   ```

2. **Configure environment variables** in Vercel dashboard

3. **Deploy**
   
   The platform will be automatically deployed on push to main branch.

### Docker

```bash
# Build the image
docker build -t mintro-ai .

# Run the container
docker run -p 3000:3000 mintro-ai
```

### Manual Deployment

```bash
# Build the application
npm run build

# Start the production server
npm run start
```

## 🧪 Testing

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Code Style

- Use **TypeScript** for type safety
- Follow **ESLint** and **Prettier** configurations
- Write **meaningful commit messages**
- Add **tests** for new features

## 📚 Documentation

### API Reference
- [Token Creation API](docs/api/token-creation.md)
- [Market Data API](docs/api/market-data.md)
- [Security API](docs/api/security.md)

### Guides
- [Creating Your First Token](docs/guides/first-token.md)
- [Advanced Token Features](docs/guides/advanced-features.md)
- [Multi-Chain Deployment](docs/guides/multi-chain.md)

## 🔒 Security

### Reporting Security Issues

Please report security vulnerabilities to: security@mintro.ai

### Security Features
- **Audited Smart Contract Templates**
- **Automated Security Scanning**
- **Best Practice Enforcement**
- **Regular Security Updates**


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[ChainGPT](https://chaingpt.org/)** - AI-powered crypto intelligence
- **[Next.js Team](https://nextjs.org/)** - Amazing React framework
- **[Vercel](https://vercel.com/)** - Deployment platform
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling framework

## 📞 Support

- **Website**: [https://mintro.ai](https://mintro.ai)
- **Email**: support@mintro.ai
- **Twitter**: [@MintroAI](https://x.com/MintroAI)

---

<div align="center">

**Made with ❤️ by the MintroAI Team**

[⭐ Star us on GitHub](https://github.com/truthdeal/mintroai-dapp) • [🐦 Follow on Twitter](https://x.com/MintroAI) • [💬 Join Discord](https://discord.gg/mintro)

</div>
