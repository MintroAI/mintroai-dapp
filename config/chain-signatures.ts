// Chain Signatures Configuration for multichain-tools
export const NEAR_NETWORK_ID = process.env.NEXT_PUBLIC_NEAR_NETWORK_ID || 'testnet';
export const MPC_CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ID || 'v1.signer-prod.testnet';
export const DEFAULT_DERIVATION_PATH = 'ethereum-1';

// Token deployment payload type
export interface TokenDeploymentPayload {
  bytecode: string;
  tokenConfig: {
    target_chain: string;
    target_chain_name: string;
    token_name: string;
    token_symbol: string;
    total_supply: string;
    decimals: number;
    owner_address: string;
  };
}

// Chain Signatures configuration for multichain-tools
export interface ChainSignatureConfig {
  mpcContract: string;
  networkId: string;
}

export const CHAIN_SIGNATURE_CONFIG: ChainSignatureConfig = {
  mpcContract: MPC_CONTRACT,
  networkId: NEAR_NETWORK_ID,
};