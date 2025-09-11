import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { contractData, bytecode } = await request.json();


    if (!contractData) {
      console.error('contractData is missing');
      return NextResponse.json(
        { error: 'contractData is required' },
        { status: 400 }
      );
    }

    if (!bytecode) {
      console.error('bytecode is missing');
      return NextResponse.json(
        { error: 'bytecode is required' },
        { status: 400 }
      );
    }

    if (!contractData.ownerAddress) {
      console.error('ownerAddress is missing in contractData');
      return NextResponse.json(
        { error: 'ownerAddress is required in contractData' },
        { status: 400 }
      );
    }

    if (!contractData.chainId) {
      console.error('chainId is missing in contractData');
      return NextResponse.json(
        { error: 'chainId is required in contractData' },
        { status: 400 }
      );
    }

    // Extract deployer address from contract data (same as owner address)
    const deployerAddress = contractData.ownerAddress;

    // Check if signature service URL is configured
    const signatureServiceUrl = process.env.NEXT_PUBLIC_SIGNATURE_SERVICE_URL;
    
    if (!signatureServiceUrl) {
      // Return mock response for development/testing
      return NextResponse.json({
        success: true,
        data: {
          signature: 'mock_signature_data',
          deploymentData: 'mock_deployment_data',
          pricing: {
            usd: 0.001,
            isFree: true
          },
          txValue: '0',
          network: {
            name: 'testnet',
            chainId: contractData.chainId,
            gasToken: 'ETH'
          },
          signer: 'mock_signer'
        },
        message: 'Mock price and signature service response'
      });
    }

    // Ensure bytecode is properly formatted (starts with 0x)
    const formattedBytecode = bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`;
    
    // Call the signature service
    const requestPayload = {
      contractData,
      bytecode: formattedBytecode,
      deployerAddress,
      deploymentType: 'create' // Default deployment type
    };

    const response = await fetch(`${signatureServiceUrl}/api/signature/prepare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Signature service error response:', errorText);
      throw new Error(`Signature service error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error in price and signature service:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get price and signature';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
