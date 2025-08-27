import { /* mainnet, polygon, optimism, */ arbitrum, /* base, zora, */ bscTestnet, auroraTestnet } from 'viem/chains'
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
    factoryAddress: "0xB4f2946245D4009B48980C8De88fb84dEF336DD0" as `0x${string}`, // Arbitrum factory address
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
  // BSC Testnet
  [bscTestnet.id]: {
    chain: bscTestnet,
    factoryAddress: "0x7628d1fcf63BFCdB9d705fdB39B0C20de9B3f22E" as `0x${string}`, // BSC Testnet factory address
    chainSignaturesGasPrice: parseUnits('1', 'gwei'),
    chainSignaturesGasLimit: 2000000, // 2M Gas
    chainSignaturesFundingAmount: parseUnits('0.0025', 'ether')
  },
  // Auro Testnet
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
    } as Chain,
    factoryAddress: "0x7628d1fcf63BFCdB9d705fdB39B0C20de9B3f22E" as `0x${string}`, // Aurora Testnet factory address
    chainSignaturesGasPrice: parseUnits('0.07', 'gwei'),
    chainSignaturesGasLimit: 2000000, // 2M Gas
    chainSignaturesFundingAmount: parseUnits('0.00025', 'ether')
  },
  // HyperEVM
  [hyperEVM.id]: {
    chain: hyperEVM,
    factoryAddress: "0x7628d1fcf63BFCdB9d705fdB39B0C20de9B3f22E" as `0x${string}`, // HyperEVM factory address
  }
} 
