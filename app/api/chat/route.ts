import { NextRequest, NextResponse } from 'next/server'

// Backend URL configuration
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 80 // Maximum duration in seconds

export async function POST(req: NextRequest) {
  try {
    const { sessionId, chatInput, mode } = await req.json()

    // Validate required fields
    if (!sessionId || !chatInput || !mode) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, chatInput, or mode' },
        { status: 400 }
      )
    }

    // Validate mode
    if (!['general', 'token', 'vesting'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be: general, token, or vesting' },
        { status: 400 }
      )
    }

    // Validate chat input length
    if (chatInput.length < 1 || chatInput.length > 2000) {
      return NextResponse.json(
        { error: 'Chat input must be between 1 and 2000 characters' },
        { status: 400 }
      )
    }

    // Get JWT token from Authorization header if present
    const authHeader = req.headers.get('authorization')
    
    // Prepare headers for backend request
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // Add JWT token if available
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    // Set timeout based on mode (backend already handles this, but we keep client-side timeout too)
    const timeoutDuration = mode === 'general' ? 75000 : 25000 // 75 seconds vs 25 seconds

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeoutDuration)
    })

    // Make request to backend proxy
    const fetchPromise = fetch(`${BACKEND_URL}/api/v1/chat/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sessionId,
        chatInput,
        mode
      }),
    })

    // Race between request and timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]) as Response

    // Parse response
    const data = await response.json()

    // Handle rate limit response
    if (response.status === 429) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: data.message || 'You have exceeded your chat limit. Please try again later.',
          rateLimitInfo: data.rateLimitInfo
        },
        { status: 429 }
      )
    }

    // Handle authentication errors
    if (response.status === 401) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: data.message || 'Please login to continue.'
        },
        { status: 401 }
      )
    }

    // Handle other error responses
    if (!response.ok) {
      console.error('Backend proxy error:', data)
      return NextResponse.json(
        {
          error: data.error || 'Backend error',
          message: data.message || 'An error occurred while processing your request.'
        },
        { status: response.status }
      )
    }

    // Transform backend response to match frontend expectations
    // Backend returns 'response' field, but frontend expects 'output' or 'message'
    const transformedData = {
      ...data,
      output: data.response || data.output || data.message,
      message: data.response || data.message || data.output,
    }

    // Return successful response
    return NextResponse.json(transformedData)

  } catch (error) {
    console.error('Chat proxy error:', error)
    
    // Handle timeout error
    if (error instanceof Error && error.message === 'Request timeout') {
      return NextResponse.json(
        { 
          error: 'Request timeout',
          message: 'The request took too long to process. Please try again.' 
        },
        { status: 408 }
      )
    }

    // Handle network errors
    if (error instanceof Error && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          error: 'Network error',
          message: 'Could not connect to the chat service. Please check your connection and try again.' 
        },
        { status: 503 }
      )
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again.' 
      },
      { status: 500 }
    )
  }
}