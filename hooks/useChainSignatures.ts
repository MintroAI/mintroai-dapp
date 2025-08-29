import { useState } from 'react';
import { useNearWallet } from '@/contexts/NearWalletContext';
import { EVM, ChainSignaturesContract } from 'multichain-tools';
import { KeyPair, connect, keyStores } from 'near-api-js';

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
  const [loading, setLoading] = useState(false);

  // Deploy token using Chain Signatures with multichain-tools
  const deployToken = async (payload: TokenDeploymentPayload, derivationPath: string = DEFAULT_DERIVATION_PATH) => {
    if (!selector || !accountId) {
      throw new Error('Wallet not connected');
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

      const { ethers: ethersLib } = await import('ethers');
      const providerFunding = new ethersLib.JsonRpcProvider(networkConfig.chain.rpcUrls.default.http[0]);

      // Request funding from backend (secure approach)
      console.log('🔐 Requesting secure funding from backend for:', senderAddress);
      
      try {
        // Call backend funding API
        const backendUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3005';
        const fundingResponse = await fetch(`${backendUrl}/api/fund-address`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: senderAddress,
            chainId: chainId.toString(),
          }),
        });

        const fundingResult = await fundingResponse.json();
        
        if (!fundingResponse.ok) {
          console.error('❌ Funding failed:', fundingResult.error);
          // Continue anyway - user might have manual funds
          console.log('⚠️ Continuing without funding - make sure address has funds');
        } else {
          console.log('✅ Funding successful:', fundingResult);
          
          // Wait a bit for transaction to be confirmed
          if (fundingResult.funded) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      } catch (fundingError) {
        console.error('❌ Funding service error:', fundingError);
        console.log('⚠️ Backend funding service unavailable - please fund manually');
        // Continue anyway - user might have manual funds
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
      const data = contractInterface.encodeFunctionData("deployBytecode", [formattedBytecode]);


      // Prepare transaction request
      const transactionRequest: any = {
        to: networkConfig.factoryAddress,
        data: data,
        from: senderAddress,
      };

      Object.assign(transactionRequest, {
        maxFeePerGas: networkConfig.chainSignaturesGasPrice,
        maxPriorityFeePerGas: networkConfig.chainSignaturesGasPrice,
        gasLimit: networkConfig.chainSignaturesGasLimit,
      });
      // ensure legacy gasPrice/type removed
      delete transactionRequest.gasPrice;
      delete transactionRequest.type;


      // Get the MPC payload and transaction
      const { transaction, mpcPayloads } = await evm.getMPCPayloadAndTransaction(transactionRequest);
      
      transaction.maxFeePerGas = networkConfig.chainSignaturesGasPrice;
      transaction.maxPriorityFeePerGas = networkConfig.chainSignaturesGasPrice;
      transaction.gasLimit = networkConfig.chainSignaturesGasLimit;
      delete transaction.gasPrice;
      delete transaction.type;


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
      const successValue = (signResult.status as any)?.SuccessValue;
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
