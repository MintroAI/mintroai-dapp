import { NextRequest, NextResponse } from 'next/server';

// Type for token contract data
interface TokenContractData {
  contractType: 'token';
  chatId: string;
  contractName: string;
  tokenName: string;
  tokenSymbol: string;
  decimals: number;
  initialSupply: string;
  ownerAddress: string;
  chainId: string;
  isChainSignatures: boolean;
  mintable: boolean;
  burnable: boolean;
  pausable: boolean;
  blacklist: boolean;
  maxTx: boolean;
  maxTxAmount: number;
  transferTax: number;
  antiBot: boolean;
  cooldownTime: number;
}

// Type for vesting contract data
interface VestingContractData {
  contractType: 'vesting';
  chatId: string;
  contractName: string;
  tokenAddress: string;
  tgeTimestamp: number;
  tgeRate: number;
  cliff: number;
  releaseRate: number;
  period: number;
  vestingSupply: number;
  decimals: number;
  users: string[];
  amts: number[];
}

type ContractData = TokenContractData | VestingContractData;

export async function POST(request: NextRequest) {
  try {
    const contractData: ContractData = await request.json();

    // Get auth header from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Use FastAPI backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
    
    const response = await fetch(`${backendUrl}/api/v1/generate-contract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(contractData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || 'Contract generation failed');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error in contract generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate contract';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
