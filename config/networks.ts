import { /* mainnet, polygon, optimism, */ arbitrum, /* base, zora, */ bsc, bscTestnet, auroraTestnet, theta, thetaTestnet, soneium } from 'viem/chains'
import { type Chain } from 'viem'
import { hyperEVM } from './customChains'
import { parseUnits } from 'ethers'
export interface NetworkConfig {
  chain: Chain
  factoryAddress: `0x${string}`
  chainSignaturesGasPrice?: bigint
  chainSignaturesGasLimit?: number
  chainSignaturesFundingAmount?: bigint
}

export const SUPPORTED_NETWORKS: { [key: number]: NetworkConfig } = {
  // Ethereum Mainnet
  // [mainnet.id]: {
  //   chain: mainnet,
  //   factoryAddress: "0x1234..." as `0x${string}`, // Mainnet factory address
  // },
  // Polygon
  // [polygon.id]: {
  //   chain: polygon,
  //   factoryAddress: "0x..." as `0x${string}`, // Polygon factory address
  // },
  // Optimism
  // [optimism.id]: {
  //   chain: optimism,
  //   factoryAddress: "0x..." as `0x${string}`, // Optimism factory address
  // },
  // Arbitrum
  [arbitrum.id]: {
    chain: arbitrum,
    factoryAddress: "0xCe60855D40fa04c18990F94e673c769d91c37737" as `0x${string}`, // Arbitrum factory address
  },
  // Base
  // [base.id]: {
  //   chain: base,
  //   factoryAddress: "0x..." as `0x${string}`, // Base factory address
  // },
  // Zora
  // [zora.id]: {
  //   chain: zora,
  //   factoryAddress: "0x..." as `0x${string}`, // Zora factory address
  // },
  // BSC Mainnet
  [bsc.id]: {
    chain: {
      ...bsc,
      rpcUrls: {
        default: {
          http: ['https://bsc-rpc.publicnode.com/'],
        },
      },
    } as Chain,
    factoryAddress: "0xCe60855D40fa04c18990F94e673c769d91c37737" as `0x${string}`, // BSC Mainnet factory address
  },
  // HyperEVM
  [hyperEVM.id]: {
    chain: hyperEVM,
    factoryAddress: "0xCe60855D40fa04c18990F94e673c769d91c37737" as `0x${string}`, // HyperEVM factory address
  },
  // BSC Testnet
  [bscTestnet.id]: {
    chain: bscTestnet,
    factoryAddress: "0xCe60855D40fa04c18990F94e673c769d91c37737" as `0x${string}`, // BSC Testnet factory address
    chainSignaturesGasPrice: parseUnits('1', 'gwei'),
    chainSignaturesGasLimit: 2000000, // 2M Gas
    chainSignaturesFundingAmount: parseUnits('0.0025', 'ether')
  },
  // Aurora Testnet
  [auroraTestnet.id]: {
    // Override explorer URL to explorer.testnet.aurora.dev
    chain: {
      ...auroraTestnet,
      blockExplorers: {
        default: {
          name: 'Aurora Testnet Explorer',
          url: 'https://explorer.testnet.aurora.dev'
        },
      },
      iconUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/14803.png',
    } as Chain,
    factoryAddress: "0xCe60855D40fa04c18990F94e673c769d91c37737" as `0x${string}`, // Aurora Testnet factory address
    chainSignaturesGasPrice: parseUnits('0.07', 'gwei'),
    chainSignaturesGasLimit: 2000000, // 2M Gas
    chainSignaturesFundingAmount: parseUnits('0.0001', 'ether')
  },
  // Theta Mainnet
  [theta.id]: {
    chain: {
      ...theta,
      iconUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2416.png',
    } as Chain,
    factoryAddress: "0xCe60855D40fa04c18990F94e673c769d91c37737" as `0x${string}`, // Theta Mainnet factory address
  },
  // Theta Testnet
  [thetaTestnet.id]: {
    chain: {
      ...thetaTestnet,
      iconUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2416.png',
    } as Chain,
    factoryAddress: "0xCe60855D40fa04c18990F94e673c769d91c37737" as `0x${string}`, // Theta Testnet factory address
  },
  // Soneium Mainnet
  [soneium.id]: {
    chain: {
      ...soneium,
      iconUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/35635.png',
    } as Chain,
    factoryAddress: "0xCe60855D40fa04c18990F94e673c769d91c37737" as `0x${string}`, // Soneium Mainnet factory address
  }
} 
