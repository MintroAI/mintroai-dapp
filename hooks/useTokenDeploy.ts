import { useState } from 'react';
import { useWriteContract, useChainId, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { useNearWallet } from '@/contexts/NearWalletContext';
import { useChainSignatures } from './useChainSignatures';
import { SUPPORTED_NETWORKS } from '@/config/networks'
import { FACTORY_ABI } from '@/config/factory-abi'
import { type TokenDeploymentPayload } from '@/config/chain-signatures';

export function useTokenDeploy() {
  // EVM wallet states
  const chainId = useChainId()
  const { address } = useAccount()
  const { writeContract: deployTokenEVM, isPending: isPendingEVM, data: hash } = useWriteContract()
  const { 
    isLoading: isWaitingEVM, 
    isSuccess: isSuccessEVM, 
    error: errorEVM,
    data: receipt // Transaction receipt
  } = useWaitForTransactionReceipt({
    hash,
  })

  // NEAR wallet states
  const { accountId } = useNearWallet();
  const { deployToken: deployTokenNEAR, loading: loadingNEAR } = useChainSignatures();
  
  // Combined states
  const [isPending, setIsPending] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [nearHash, setNearHash] = useState<string | null>(null);
  const [nearReceipt, setNearReceipt] = useState<any>(null);

  // Determine which wallet is connected
  const isNearConnected = !!accountId;
  const isEVMConnected = !!address;

  const deploy = async (contractCode: string, tokenConfig?: any) => {
    try {
      setError(null);
      setIsSuccess(false);
      setNearHash(null);
      setNearReceipt(null);

      if (isNearConnected && tokenConfig) {
        // Use NEAR Chain Signatures
        setIsPending(true);
        
        // Prepare payload for Chain Signatures
        const payload: TokenDeploymentPayload = {
          bytecode: contractCode,
          tokenConfig: {
            token_name: tokenConfig.name,
            token_symbol: tokenConfig.symbol,
            decimals: tokenConfig.decimals,
            total_supply: tokenConfig.initialSupply,
            target_chain: tokenConfig.targetChain,
            target_chain_name: tokenConfig.targetChainName,
            owner_address: tokenConfig.ownerAddress || 'pending',
          }
        };

        setIsPending(false);
        setIsWaiting(true);
        
        const result = await deployTokenNEAR(payload);
        
        setIsWaiting(false);
        setIsSuccess(true);
        setNearHash(result.hash);
        
        setNearReceipt({
          transactionHash: result.hash,
          chainId: result.chainId,
          logs: [{ address: result.deployedAddress || 'pending' }],
          status: 'success'
        });

      } else if (isEVMConnected) {
        // Use EVM wagmi
        if (!chainId) throw new Error('No chain selected')
        if (!address) throw new Error('Wallet not connected')
        if (!SUPPORTED_NETWORKS[chainId]) throw new Error('Chain not supported')

        let formattedBytecode = contractCode;
        if (formattedBytecode.startsWith('0x')) {
          formattedBytecode = formattedBytecode.slice(2);
        }

        await deployTokenEVM({
          address: SUPPORTED_NETWORKS[chainId].factoryAddress,
          abi: FACTORY_ABI,
          functionName: 'deployBytecode',
          args: [`0x${formattedBytecode}` as `0x${string}`],
          gas: BigInt(2000000)
        })
      } else {
        throw new Error('No wallet connected');
      }

    } catch (err) {
      setIsPending(false);
      setIsWaiting(false);
      setError(err as Error);
      console.error('Deployment error:', err);
    }
  };

  // Return combined states based on which wallet is connected
  if (isNearConnected) {
    return { 
      deploy, 
      isPending: isPending || loadingNEAR,
      isWaiting,
      isSuccess,
      error,
      hash: nearHash,
      receipt: nearReceipt
    };
  } else {
    return { 
      deploy, 
      isPending: isPendingEVM,
      isWaiting: isWaitingEVM,
      isSuccess: isSuccessEVM,
      error: errorEVM,
      hash,
      receipt
    };
  }
} 