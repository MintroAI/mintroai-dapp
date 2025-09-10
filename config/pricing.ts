// Pricing configuration that mirrors backend pricing logic
export const PRICING_CONFIG = {
  token: {
    base: 0, // Free for basic token
    basicFeatures: {
      price: 0.1, // One-time fee if ANY basic feature is selected
      features: ['mintable', 'burnable', 'pausable', 'blacklist'] as const
    },
    advancedFeatures: {
      maxTx: 0.1,       // If maxTxAmount > 0
      transferTax: 0.1,  // If transferTax > 0
      antiBot: 0.1      // If cooldownTime > 0 (antiBot protection)
    }
  },
  vesting: {
    base: 0.1 // Fixed price for vesting contract
  }
};

// Types for form values
export interface TokenPricingParams {
  mintable?: boolean;
  burnable?: boolean;
  pausable?: boolean;
  blacklist?: boolean;
  maxTx?: boolean;
  maxTxAmount?: number;
  transferTax?: number;
  antiBot?: boolean;
  cooldownTime?: number;
  targetChain?: string; // For chain signatures check
}

export interface PriceBreakdown {
  base: number;
  features: Array<{
    name: string;
    price: number;
    features?: string[];
  }>;
  total: number;
  isFree?: boolean;
  freeReason?: string;
}

// Calculate token contract price based on selected features
export function calculateTokenPrice(params: TokenPricingParams, isTestnet: boolean = false): PriceBreakdown {
  // Check if it's a chain signatures deployment (free)
  if (params.targetChain) {
    return {
      base: 0,
      features: [],
      total: 0,
      isFree: true,
      freeReason: 'Chain Signatures deployment'
    };
  }

  // Check if it's testnet (free)
  if (isTestnet) {
    return {
      base: 0,
      features: [],
      total: 0,
      isFree: true,
      freeReason: 'Testnet deployment'
    };
  }

  let totalUSD = PRICING_CONFIG.token.base;
  const breakdown: PriceBreakdown = {
    base: PRICING_CONFIG.token.base,
    features: [],
    total: 0
  };

  // Check if any basic feature is selected
  const hasBasicFeature = PRICING_CONFIG.token.basicFeatures.features.some(
    feature => params[feature] === true
  );

  if (hasBasicFeature) {
    totalUSD += PRICING_CONFIG.token.basicFeatures.price;
    const selectedBasicFeatures = PRICING_CONFIG.token.basicFeatures.features.filter(
      feature => params[feature] === true
    );
    breakdown.features.push({
      name: 'Basic Features',
      features: selectedBasicFeatures,
      price: PRICING_CONFIG.token.basicFeatures.price
    });
  }

  // Check advanced features
  if (params.maxTx && params.maxTxAmount && params.maxTxAmount > 0) {
    totalUSD += PRICING_CONFIG.token.advancedFeatures.maxTx;
    breakdown.features.push({
      name: 'Max Transaction Limit',
      price: PRICING_CONFIG.token.advancedFeatures.maxTx
    });
  }

  if (params.transferTax && params.transferTax > 0) {
    totalUSD += PRICING_CONFIG.token.advancedFeatures.transferTax;
    breakdown.features.push({
      name: 'Transfer Tax',
      price: PRICING_CONFIG.token.advancedFeatures.transferTax
    });
  }

  if (params.antiBot && params.cooldownTime && params.cooldownTime > 0) {
    totalUSD += PRICING_CONFIG.token.advancedFeatures.antiBot;
    breakdown.features.push({
      name: 'Anti-Bot Protection',
      price: PRICING_CONFIG.token.advancedFeatures.antiBot
    });
  }

  breakdown.total = totalUSD;
  return breakdown;
}

// Calculate vesting contract price
export function calculateVestingPrice(isTestnet: boolean = false): PriceBreakdown {
  // Check if it's testnet (free)
  if (isTestnet) {
    return {
      base: 0,
      features: [],
      total: 0,
      isFree: true,
      freeReason: 'Testnet deployment'
    };
  }

  const totalUSD = PRICING_CONFIG.vesting.base;
  return {
    base: PRICING_CONFIG.vesting.base,
    features: [],
    total: totalUSD
  };
}

// Format price for display in button
export function formatPriceDisplay(price: number, isFree: boolean = false): string {
  if (isFree || price === 0) {
    return '$0';
  }
  return `$${price}`;
}

// Check if network is testnet
export function isTestnetNetwork(chainId: number): boolean {
  // List of testnet chain IDs
  const testnetChainIds = [
    97,         // BSC Testnet
    1313161555, // Aurora Testnet
    365,        // Theta Testnet
    // Add more testnet IDs as needed
  ];
  
  return testnetChainIds.includes(chainId);
}