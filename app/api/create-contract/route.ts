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

    // Check if external service URL is configured
    const contractGeneratorUrl = process.env.NEXT_PUBLIC_CONTRACT_GENERATOR_URL;
    
    if (!contractGeneratorUrl) {
      // Return mock response for development/testing
      return NextResponse.json({
        success: true,
        contractCode: `// Mock ERC20 Token Contract for ${contractData.contractType === 'token' ? contractData.tokenName : 'Contract'}
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ${contractData.contractType === 'token' ? contractData.tokenName.replace(/[^a-zA-Z0-9]/g, '') : 'MockContract'} is ERC20, Ownable {
    constructor() ERC20("${contractData.contractType === 'token' ? contractData.tokenName : 'Mock Token'}", "${contractData.contractType === 'token' ? contractData.tokenSymbol : 'MOCK'}") {
        _mint(msg.sender, ${contractData.contractType === 'token' ? contractData.initialSupply : '1000000'} * 10**decimals());
    }
}`,
        message: 'Mock contract generated successfully'
      });
    }

    const response = await fetch(`${contractGeneratorUrl}/api/generate-contract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contractData),
    });

    if (!response.ok) {
      throw new Error('Contract generator service error');
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
