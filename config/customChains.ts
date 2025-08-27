import { type Chain } from 'viem'

// Custom HyperEVM chain definition
export const hyperEVM = {
  id: 999,
  name: 'HyperEVM',
  nativeCurrency: {
    decimals: 18,
    name: 'HYPE',
    symbol: 'HYPE',
  },
  rpcUrls: {
    default: {
      http: ['https://hyperliquid.drpc.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'HyperEVM Scan',
      url: 'https://hyperevmscan.io',
    },
  },
  iconUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhg-_jsAmk1K0-kX3RU8hBYqCqnofCqB5fnFptxjEA_dryJdo_zrG_Y27XRPa6flPs93M&usqp=CAU',
  testnet: false,
} as const satisfies Chain & { iconUrl: string }
