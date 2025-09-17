# 🚀 Backend Chat Proxy Implementation Guide

## 📋 Overview

This guide provides comprehensive information for backend developers to implement a chat proxy endpoint that will replace the current direct n8n integration in the frontend.

## 🎯 Current Architecture

### Frontend → n8n (Current)
```
Frontend /api/chat → n8n Workflows (Direct)
```

### Frontend → Backend → n8n (Target)
```
Frontend /api/chat → Backend /api/v1/chat → n8n Workflows → Backend → Frontend
```

---

## 🔍 Current Implementation Analysis

### 1. Frontend API Route (`/app/api/chat/route.ts`)

**Request Format:**
```typescript
interface CurrentChatRequest {
  sessionId: string      // UUID for session tracking
  chatInput: string      // User's message
  mode: 'token' | 'vesting' | 'general'  // Chat type
}
```

**Response Format:**
```typescript
interface CurrentChatResponse {
  output?: string        // AI response message
  message?: string       // Alternative response field
  error?: string         // Error message if failed
  raw?: string          // Raw response for debugging
}
```

### 2. n8n Workflow Integration

#### **Mode: 'general'**
- **URL:** `https://chaingpt-proxy-production.up.railway.app/chat/general`
- **Method:** POST
- **Timeout:** 75 seconds
- **Body:**
```json
{
  "sessionId": "uuid",
  "chatInput": "user message",
  "mode": "general"
}
```

#### **Mode: 'token'**
- **URL:** `https://barisarya.app.n8n.cloud/webhook/b8bce491-1fee-470c-aa7a-20a5e619fa51/{sessionId}`
- **Method:** POST
- **Timeout:** 25 seconds
- **Body:**
```json
{
  "sessionId": "uuid",
  "action": "sendMessage",
  "chatInput": "user message"
}
```

#### **Mode: 'vesting'**
- **URL:** `https://mintro.app.n8n.cloud/webhook/9a30de38-7fbc-4de1-bac3-69f5b627304f/{sessionId}`
- **Method:** POST
- **Timeout:** 25 seconds
- **Body:**
```json
{
  "sessionId": "uuid",
  "action": "sendMessage",
  "chatInput": "user message"
}
```

### 3. Current Error Handling

```typescript
// Timeout handling
if (error.message === 'Request timeout') {
  return { error: 'The request took too long to process. Please try again.' }
}

// General error
return { error: 'An error occurred while processing your request. Please try again.' }
```

---

## 🛠 Backend Implementation Requirements

### 1. **Endpoint Specification**

```python
@app.post("/api/v1/chat")
async def chat_proxy(request: ChatRequest, authorization: Optional[str] = Header(None)):
    """
    Chat proxy endpoint that forwards requests to n8n workflows
    with enhanced authentication and rate limiting.
    """
```

### 2. **Request/Response Models**

```python
from pydantic import BaseModel
from typing import Optional, Dict, Any
from enum import Enum

class ChatMode(str, Enum):
    TOKEN = "token"
    VESTING = "vesting"
    GENERAL = "general"

class UserContext(BaseModel):
    wallet_address: Optional[str] = None
    is_authenticated: bool = False
    message_count: Optional[int] = None
    user_type: str = "guest"  # guest, authenticated, premium

class ChatRequest(BaseModel):
    sessionId: str
    chatInput: str
    mode: ChatMode
    userContext: Optional[UserContext] = None

class RateLimitInfo(BaseModel):
    remaining: int
    reset_time: str
    limit: int

class ChatResponse(BaseModel):
    output: Optional[str] = None
    message: Optional[str] = None
    sessionId: str
    timestamp: str
    rateLimitInfo: Optional[RateLimitInfo] = None
    error: Optional[str] = None

class ErrorResponse(BaseModel):
    error: str
    code: int
    details: Optional[Dict[str, Any]] = None
    rateLimitInfo: Optional[RateLimitInfo] = None
```

### 3. **Authentication Integration**

```python
from jose import JWTError, jwt
from fastapi import HTTPException, status

async def verify_jwt_token(authorization: Optional[str]) -> Optional[Dict]:
    """
    Verify JWT token and extract user information.
    Returns None for guest users (no token provided).
    """
    if not authorization:
        return None
    
    try:
        # Remove 'Bearer ' prefix
        token = authorization.replace('Bearer ', '')
        
        # Verify JWT token (use your existing JWT secret)
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        return {
            'wallet_address': payload.get('wallet_address'),
            'wallet_type': payload.get('wallet_type'),  # 'evm' or 'near'
            'exp': payload.get('exp'),
            'user_id': payload.get('sub')
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
```

### 4. **Rate Limiting Implementation**

```python
import redis
from datetime import datetime, timedelta
import json

class RateLimiter:
    def __init__(self, redis_client):
        self.redis = redis_client
        
    async def check_rate_limit(self, user_context: UserContext, client_ip: str) -> RateLimitInfo:
        """
        Check rate limits based on user type and return limit info.
        """
        if user_context.is_authenticated:
            # Authenticated users: 100 messages per hour
            key = f"rate_limit:user:{user_context.wallet_address}"
            limit = 100
            window = 3600  # 1 hour
        else:
            # Guest users: 3 messages per 24 hours per IP
            key = f"rate_limit:guest:{client_ip}"
            limit = 3
            window = 86400  # 24 hours
        
        current_count = await self.redis.get(key)
        if current_count is None:
            current_count = 0
            await self.redis.setex(key, window, 1)
        else:
            current_count = int(current_count)
            if current_count >= limit:
                ttl = await self.redis.ttl(key)
                reset_time = (datetime.now() + timedelta(seconds=ttl)).isoformat()
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "Rate limit exceeded",
                        "rateLimitInfo": {
                            "remaining": 0,
                            "reset_time": reset_time,
                            "limit": limit
                        }
                    }
                )
            await self.redis.incr(key)
        
        remaining = limit - (current_count + 1)
        ttl = await self.redis.ttl(key)
        reset_time = (datetime.now() + timedelta(seconds=ttl)).isoformat()
        
        return RateLimitInfo(
            remaining=remaining,
            reset_time=reset_time,
            limit=limit
        )
```

### 5. **n8n Workflow Integration**

```python
import httpx
from typing import Dict, Any

class N8nClient:
    def __init__(self):
        self.workflows = {
            ChatMode.TOKEN: {
                "url": "https://barisarya.app.n8n.cloud/webhook/b8bce491-1fee-470c-aa7a-20a5e619fa51",
                "timeout": 25,
                "url_pattern": "{base_url}/{session_id}",
                "body_format": "action_based"
            },
            ChatMode.VESTING: {
                "url": "https://mintro.app.n8n.cloud/webhook/9a30de38-7fbc-4de1-bac3-69f5b627304f",
                "timeout": 25,
                "url_pattern": "{base_url}/{session_id}",
                "body_format": "action_based"
            },
            ChatMode.GENERAL: {
                "url": "https://chaingpt-proxy-production.up.railway.app/chat/general",
                "timeout": 75,
                "url_pattern": "{base_url}",
                "body_format": "direct"
            }
        }
    
    async def send_to_n8n(self, request: ChatRequest, user_context: Optional[UserContext] = None) -> Dict[str, Any]:
        """
        Send request to appropriate n8n workflow based on mode.
        """
        workflow_config = self.workflows[request.mode]
        
        # Build URL
        if workflow_config["url_pattern"] == "{base_url}/{session_id}":
            url = f"{workflow_config['url']}/{request.sessionId}"
        else:
            url = workflow_config["url"]
        
        # Build request body
        if workflow_config["body_format"] == "action_based":
            body = {
                "sessionId": request.sessionId,
                "action": "sendMessage",
                "chatInput": request.chatInput
            }
        else:  # direct format
            body = {
                "sessionId": request.sessionId,
                "chatInput": request.chatInput,
                "mode": request.mode.value
            }
        
        # Add user context if available
        if user_context:
            body["userContext"] = {
                "walletAddress": user_context.wallet_address,
                "isAuthenticated": user_context.is_authenticated,
                "userType": user_context.user_type
            }
        
        # Send request to n8n
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    json=body,
                    headers={"Content-Type": "application/json"},
                    timeout=workflow_config["timeout"]
                )
                
                # Handle response
                if response.headers.get('content-type', '').startswith('application/json'):
                    return response.json()
                else:
                    text = response.text
                    try:
                        return json.loads(text)
                    except json.JSONDecodeError:
                        return {"error": "Invalid response from n8n", "raw": text}
                        
            except httpx.TimeoutException:
                raise HTTPException(
                    status_code=504,
                    detail="Request timeout - n8n workflow took too long to respond"
                )
            except httpx.RequestError as e:
                raise HTTPException(
                    status_code=502,
                    detail=f"Failed to connect to n8n workflow: {str(e)}"
                )
```

### 6. **Main Endpoint Implementation**

```python
from fastapi import FastAPI, Request, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
import logging

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
rate_limiter = RateLimiter(redis_client)
n8n_client = N8nClient()

@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat_proxy(
    request: ChatRequest,
    http_request: Request,
    authorization: Optional[str] = Header(None)
):
    """
    Chat proxy endpoint with authentication and rate limiting.
    """
    start_time = datetime.now()
    client_ip = http_request.client.host
    
    try:
        # 1. Verify authentication (optional for guests)
        user_info = await verify_jwt_token(authorization)
        
        # 2. Build user context
        user_context = UserContext(
            wallet_address=user_info.get('wallet_address') if user_info else None,
            is_authenticated=bool(user_info),
            user_type="authenticated" if user_info else "guest"
        )
        
        # 3. Check rate limits
        rate_limit_info = await rate_limiter.check_rate_limit(user_context, client_ip)
        
        # 4. Send to n8n workflow
        n8n_response = await n8n_client.send_to_n8n(request, user_context)
        
        # 5. Log interaction
        await log_chat_interaction(
            session_id=request.sessionId,
            user_context=user_context,
            chat_input=request.chatInput,
            mode=request.mode,
            response=n8n_response,
            duration=(datetime.now() - start_time).total_seconds(),
            client_ip=client_ip
        )
        
        # 6. Return response
        return ChatResponse(
            output=n8n_response.get('output'),
            message=n8n_response.get('message'),
            sessionId=request.sessionId,
            timestamp=datetime.now().isoformat(),
            rateLimitInfo=rate_limit_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Chat proxy error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Internal server error occurred while processing chat request"
        )
```

### 7. **Logging and Monitoring**

```python
async def log_chat_interaction(
    session_id: str,
    user_context: UserContext,
    chat_input: str,
    mode: ChatMode,
    response: Dict[str, Any],
    duration: float,
    client_ip: str
):
    """
    Log chat interactions for audit trail and monitoring.
    """
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "session_id": session_id,
        "wallet_address": user_context.wallet_address,
        "is_authenticated": user_context.is_authenticated,
        "chat_mode": mode.value,
        "message_length": len(chat_input),
        "response_success": "error" not in response,
        "duration_seconds": duration,
        "client_ip": client_ip,
        "user_agent": "...",  # Extract from request headers
    }
    
    # Store in database or logging service
    await store_chat_log(log_entry)
```

---

## 🔧 Environment Configuration

```bash
# JWT Configuration
JWT_SECRET=your-jwt-secret-key
JWT_ALGORITHM=HS256

# Redis Configuration (for rate limiting)
REDIS_URL=redis://localhost:6379

# n8n Workflow URLs
N8N_TOKEN_WORKFLOW_URL=https://barisarya.app.n8n.cloud/webhook/b8bce491-1fee-470c-aa7a-20a5e619fa51
N8N_VESTING_WORKFLOW_URL=https://mintro.app.n8n.cloud/webhook/9a30de38-7fbc-4de1-bac3-69f5b627304f
N8N_GENERAL_WORKFLOW_URL=https://chaingpt-proxy-production.up.railway.app/chat/general

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost/mintro_chat

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
```

---

## 🧪 Testing Requirements

### 1. **Unit Tests**
```python
import pytest
from fastapi.testclient import TestClient

def test_chat_proxy_guest_user():
    """Test chat proxy with guest user (no authentication)."""
    response = client.post("/api/v1/chat", json={
        "sessionId": "test-session-123",
        "chatInput": "Hello, how are you?",
        "mode": "general"
    })
    assert response.status_code == 200
    assert "rateLimitInfo" in response.json()

def test_chat_proxy_authenticated_user():
    """Test chat proxy with authenticated user."""
    headers = {"Authorization": "Bearer valid-jwt-token"}
    response = client.post("/api/v1/chat", 
        json={
            "sessionId": "test-session-456",
            "chatInput": "Create a token",
            "mode": "token"
        },
        headers=headers
    )
    assert response.status_code == 200

def test_rate_limit_exceeded():
    """Test rate limiting for guest users."""
    # Send 4 requests (limit is 3)
    for i in range(4):
        response = client.post("/api/v1/chat", json={
            "sessionId": f"test-session-{i}",
            "chatInput": f"Message {i}",
            "mode": "general"
        })
        if i < 3:
            assert response.status_code == 200
        else:
            assert response.status_code == 429
```

### 2. **Integration Tests**
- Test n8n workflow communication
- Test JWT token validation
- Test rate limiting with Redis
- Test error handling scenarios

---

## 📊 Monitoring and Metrics

### Key Metrics to Track:
- **Response Time:** Average, P95, P99 latencies
- **Success Rate:** Percentage of successful requests
- **Rate Limit Violations:** Number of 429 responses
- **n8n Workflow Health:** Success rates per workflow
- **User Activity:** Messages per user, authentication rates

### Logging Requirements:
- All chat interactions with user context
- Rate limit violations with IP/user info
- n8n workflow response times and errors
- Authentication failures and attempts

---

## 🚀 Deployment Checklist

- [ ] Set up Redis for rate limiting
- [ ] Configure JWT secret and algorithm
- [ ] Set up database for chat logs
- [ ] Configure n8n workflow URLs
- [ ] Set up CORS for frontend domain
- [ ] Implement health check endpoint
- [ ] Set up monitoring and alerting
- [ ] Configure logging infrastructure
- [ ] Test all chat modes (token, vesting, general)
- [ ] Test rate limiting scenarios
- [ ] Test authentication flow
- [ ] Performance test with concurrent users

---

## 📞 Support and Questions

For implementation questions or clarifications:
1. Check existing authentication system integration
2. Review current n8n workflow responses
3. Test rate limiting behavior requirements
4. Validate JWT token format and claims

This guide should provide all necessary information to implement the backend chat proxy. The implementation should maintain backward compatibility while adding enhanced authentication and rate limiting features.
