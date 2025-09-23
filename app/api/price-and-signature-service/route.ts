import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { contractData, bytecode } = await request.json();


    if (!contractData) {
      return NextResponse.json(
        { error: 'contractData is required' },
        { status: 400 }
      );
    }

    if (!bytecode) {
      return NextResponse.json(
        { error: 'bytecode is required' },
        { status: 400 }
      );
    }

    if (!contractData.ownerAddress) {
      return NextResponse.json(
        { error: 'ownerAddress is required in contractData' },
        { status: 400 }
      );
    }

    if (!contractData.chainId) {
      return NextResponse.json(
        { error: 'chainId is required in contractData' },
        { status: 400 }
      );
    }

    // Get auth header from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Use FastAPI backend for price calculation
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
    
    // Ensure bytecode is properly formatted (starts with 0x)
    const formattedBytecode = bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`;
    
    // Call the FastAPI backend
    const requestPayload = {
      contractData,
      bytecode: formattedBytecode,
      deploymentType: 'create' // Default deployment type
    };

    const response = await fetch(`${backendUrl}/api/v1/price-contract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Backend price service failed: ${response.status} - ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error in price service:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get contract price';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
