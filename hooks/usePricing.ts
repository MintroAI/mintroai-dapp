import { useMemo } from 'react';
import { useChainId } from 'wagmi';
import { useNearWallet } from '@/contexts/NearWalletContext';
import { 
  calculateTokenPrice, 
  calculateVestingPrice, 
  formatPriceDisplay, 
  isTestnetNetwork,
  type TokenPricingParams 
} from '@/config/pricing';

// Hook for token pricing
export function useTokenPricing(params: TokenPricingParams) {
  const chainId = useChainId();
  const { accountId } = useNearWallet();
  
  const { price, displayText } = useMemo(() => {
    // If NEAR wallet is connected, it's chain signatures (free)
    const isChainSignatures = !!accountId && !!params.targetChain;
    
    // Check if current network is testnet
    const isTestnet = isTestnetNetwork(chainId);
    
    // Calculate price with chain signatures check
    const breakdown = calculateTokenPrice(
      { ...params, targetChain: isChainSignatures ? params.targetChain : undefined },
      isTestnet
    );
    
    const display = formatPriceDisplay(breakdown.total, breakdown.isFree);
    
    return {
      price: breakdown.total,
      displayText: display
    };
  }, [params, chainId, accountId]);
  
  return { price, displayText };
}

// Hook for vesting pricing
export function useVestingPricing() {
  const chainId = useChainId();
  
  const { price, displayText } = useMemo(() => {
    // Check if current network is testnet
    const isTestnet = isTestnetNetwork(chainId);
    
    // Calculate vesting price
    const breakdown = calculateVestingPrice(isTestnet);
    const display = formatPriceDisplay(breakdown.total, breakdown.isFree);
    
    return {
      price: breakdown.total,
      displayText: display
    };
  }, [chainId]);
  
  return { price, displayText };
}