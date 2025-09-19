import { useState } from 'react';
import { useNearWallet } from '@/contexts/NearWalletContext';
import { useAuthentication } from '@/hooks/useAuthentication';
import { EVM } from 'multichain-tools';

import { SUPPORTED_NETWORKS } from '@/config/networks';
import { FACTORY_ABI } from '@/config/factory-abi';
import { 
  MPC_CONTRACT,
  NEAR_NETWORK_ID,
  DEFAULT_DERIVATION_PATH,
  type TokenDeploymentPayload 
} from '../config/chain-signatures';

export function useChainSignatures() {
  const { selector, accountId } = useNearWallet();
  const { authToken, isAuthenticated } = useAuthentication();
  const [loading, setLoading] = useState(false);

  // Deploy token using Chain Signatures with multichain-tools
  const deployToken = async (payload: TokenDeploymentPayload, derivationPath: string = DEFAULT_DERIVATION_PATH) => {
    if (!selector || !accountId) {
      throw new Error('Wallet not connected');
    }

    if (!isAuthenticated || !authToken) {
      throw new Error('User not authenticated. Please authenticate first.');
    }

    setLoading(true);

    try {
      const chainId = parseInt(payload.tokenConfig.target_chain);
      const networkConfig = SUPPORTED_NETWORKS[chainId];
      
      if (!networkConfig) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      const evm = new EVM({
        providerUrl: networkConfig.chain.rpcUrls.default.http[0],
        contract: MPC_CONTRACT,
        nearNetworkId: NEAR_NETWORK_ID as 'testnet' | 'mainnet',
      });

      // Get derived address using multichain-tools EVM
      const { address: senderAddress } = await evm.deriveAddressAndPublicKey(
        accountId,
        derivationPath
      );

      // Note: Provider is no longer needed here as funding is handled by backend

      // Request funding from backend (secure approach)
      console.log('🔐 Requesting secure funding from backend for:', senderAddress);
      
      try {
        // Use proper FastAPI backend URL
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const fundingResponse = await fetch(`${backendUrl}/api/v1/fund-address`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            address: senderAddress,
            chain_id: chainId.toString(),  // Backend snake_case beklediği için
          }),
        });

        const fundingResult = await fundingResponse.json();
        
        if (!fundingResponse.ok) {
          // Handle different error types
          if (fundingResponse.status === 401) {
            throw new Error('Authentication failed. Please re-authenticate and try again.');
          } else if (fundingResponse.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.');
          } else if (fundingResponse.status === 400) {
            console.error('❌ Funding validation failed:', fundingResult.error);
            console.log('⚠️ Continuing without funding - make sure address has funds');
          } else {
            console.error('❌ Funding failed:', fundingResult.error);
            console.log('⚠️ Continuing without funding - make sure address has funds');
          }
        } else {
          console.log('✅ Funding successful:', fundingResult);
          
          // Wait for transaction confirmation if funded
          if (fundingResult.funded && fundingResult.transactionHash) {
            console.log('⏳ Waiting for funding transaction confirmation:', fundingResult.transactionHash);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds for confirmation
          }
        }
      } catch (fundingError) {
        console.error('❌ Funding service error:', fundingError);
        
        // Re-throw authentication errors
        if (fundingError instanceof Error && fundingError.message.includes('Authentication failed')) {
          throw fundingError;
        }
        
        console.log('⚠️ Backend funding service unavailable - please fund manually');
        // Continue anyway - user might have manual funds for other errors
      }

      let formattedBytecode = payload.bytecode;
      
      formattedBytecode = formattedBytecode.replace(/\s/g, '');
      
      // 0x prefix if not present
      if (!formattedBytecode.startsWith('0x')) {
        formattedBytecode = '0x' + formattedBytecode;
      }
      
      
      // Contract interface to encode the function call
      const { ethers } = await import('ethers');
      const contractInterface = new ethers.Interface(FACTORY_ABI);
      
      // Use deployBytecodeWithPayment with the signed parameters (0 value for chain signatures)
      const data = contractInterface.encodeFunctionData("deployBytecodeWithPayment", [
        formattedBytecode,
        payload.paymentAmount || BigInt(0),  // Payment amount (0 for chain signatures)
        payload.deadline || BigInt(0),        // Deadline from signature service
        payload.nonce || BigInt(0),           // Nonce from signature service
        payload.signature || '0x'             // Signature from backend
      ]);


      // Prepare transaction request
      const transactionRequest = {
        to: networkConfig.factoryAddress,
        data: data,
        from: senderAddress,
        maxFeePerGas: networkConfig.chainSignaturesGasPrice,
        maxPriorityFeePerGas: networkConfig.chainSignaturesGasPrice,
        gasLimit: networkConfig.chainSignaturesGasLimit,
      };


      // Get the MPC payload and transaction
      const { transaction, mpcPayloads } = await evm.getMPCPayloadAndTransaction(transactionRequest);
      
      transaction.maxFeePerGas = networkConfig.chainSignaturesGasPrice;
      transaction.maxPriorityFeePerGas = networkConfig.chainSignaturesGasPrice;
      transaction.gasLimit = networkConfig.chainSignaturesGasLimit;
      // Remove legacy properties if they exist
      if ('gasPrice' in transaction) delete (transaction as Record<string, unknown>).gasPrice;
      if ('type' in transaction) delete (transaction as Record<string, unknown>).type;


      // Get the wallet for signing
      const wallet = await selector.wallet();

      // Construct the MPC contract call to obtain signature
      const signArgs = {
        request: {
          payload: Array.from(mpcPayloads[0].payload),
          path: derivationPath,
          key_version: 0,
        },
      };



      const signResult = await wallet.signAndSendTransaction({
        receiverId: MPC_CONTRACT,
        actions: [
          {
            type: 'FunctionCall',
            params: {
              methodName: 'sign',
              args: signArgs,
              gas: '300000000000000', // 300 TGas
              deposit: '1000000000000000000000000', // 1 NEAR (yoctoNEAR)
            },
          },
        ],
      });



      if (!signResult || !signResult.transaction_outcome) {
        throw new Error('Failed to get signature from MPC contract');
      }

      // Parse signature from transaction outcome
      const successValue = (signResult.status as { SuccessValue?: string })?.SuccessValue;
      if (!successValue) {
        throw new Error('No signature returned from MPC contract');
      }

      const signatureResult = JSON.parse(atob(successValue));


      const mpcSignature = {
        big_r: { affine_point: signatureResult.big_r.affine_point },
        s: { scalar: signatureResult.s.scalar },
        recovery_id: signatureResult.recovery_id,
      };



      const broadcastResult = await evm.addSignatureAndBroadcast({
        transaction,
        mpcSignatures: [mpcSignature],
      });



      // Wait for receipt
      const provider = new ethers.JsonRpcProvider(networkConfig.chain.rpcUrls.default.http[0]);
      const receipt = await provider.waitForTransaction(broadcastResult);


      let deployedAddress: string | null = null;
      if (receipt?.contractAddress) {
        deployedAddress = receipt.contractAddress;
      } else if (receipt?.logs?.length) {
        deployedAddress = ethers.getAddress(receipt.logs[0].address);
      }

      setLoading(false);

      return {
        hash: broadcastResult,
        chainId,
        deployedAddress,
        receipt,
      };

    } catch (error) {
      setLoading(false);
      console.error('Chain Signatures deployment error:', error);
      throw error;
    }
  };

  return {
    loading,
    deployToken,
  };
}
