# MintroAI DApp - TDD Outside-In Development Roadmap (1 Ay)

## 🎯 TDD Outside-In Methodology

### Test Piramidi (Ters Yaklaşım)
```
1. Acceptance Tests (Playwright) - Kullanıcı perspektifi
2. Contract Tests - API sözleşmeleri  
3. Component/Unit Tests - Frontend bileşenleri
4. Backend Tests - API implementation
5. Integration Tests - Sistem bütünlüğü
```

## 📅 4 Haftalık Detaylı Plan

---

## 🔐 HAFTA 1: Authentication Service (TDD Outside-In)

### Gün 1-2: Acceptance Tests (Playwright)

#### Test Senaryoları
```typescript
// tests/e2e/auth.spec.ts
describe('Authentication Flow', () => {
  test('User can connect wallet and authenticate', async ({ page }) => {
    // Given: Kullanıcı ana sayfada
    await page.goto('/')
    
    // When: Connect Wallet butonuna tıklar
    await page.click('[data-testid="connect-wallet"]')
    
    // Then: Wallet seçim modalı açılır
    await expect(page.locator('[data-testid="wallet-modal"]')).toBeVisible()
    
    // When: MetaMask seçer
    await page.click('[data-testid="metamask-option"]')
    
    // Then: MetaMask bağlantı penceresi açılır
    // Mock MetaMask response
    await page.evaluate(() => {
      window.ethereum = {
        request: jest.fn().mockResolvedValue(['0x123...'])
      }
    })
    
    // When: Wallet bağlanır
    await page.click('[data-testid="confirm-connection"]')
    
    // Then: Kullanıcı authenticated duruma geçer
    await expect(page.locator('[data-testid="user-address"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-address"]')).toContainText('0x123')
  })

  test('User can sign authentication message', async ({ page }) => {
    // Given: Wallet bağlı
    await connectWallet(page)
    
    // When: Authentication gerekli bir işlem yapar
    await page.click('[data-testid="create-token"]')
    
    // Then: İmza modalı açılır
    await expect(page.locator('[data-testid="sign-message-modal"]')).toBeVisible()
    
    // When: İmzalar
    await page.click('[data-testid="sign-message"]')
    
    // Then: JWT token alır ve authenticated olur
    await expect(page.locator('[data-testid="authenticated-indicator"]')).toBeVisible()
  })

  test('User session persists after page reload', async ({ page }) => {
    // Given: Authenticated kullanıcı
    await authenticateUser(page)
    
    // When: Sayfa yenilenir
    await page.reload()
    
    // Then: Kullanıcı hala authenticated
    await expect(page.locator('[data-testid="user-address"]')).toBeVisible()
    await expect(page.locator('[data-testid="authenticated-indicator"]')).toBeVisible()
  })

  test('User can logout', async ({ page }) => {
    // Given: Authenticated kullanıcı
    await authenticateUser(page)
    
    // When: Logout yapar
    await page.click('[data-testid="logout-button"]')
    
    // Then: Authentication temizlenir
    await expect(page.locator('[data-testid="connect-wallet"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-address"]')).not.toBeVisible()
  })
})
```

#### Playwright Konfigürasyonu
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### Gün 3: Contract Tests

#### API Contract Testleri
```typescript
// tests/contract/auth-api.contract.ts
import { pactWith } from 'jest-pact'

pactWith({ consumer: 'MintroAI-Frontend', provider: 'MintroAI-Backend' }, provider => {
  describe('Auth API Contract', () => {
    test('POST /api/auth/connect-wallet', async () => {
      // Given: Backend beklentisi
      await provider
        .given('wallet connection request')
        .uponReceiving('a wallet connection request')
        .withRequest({
          method: 'POST',
          path: '/api/auth/connect-wallet',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            walletAddress: '0x123...',
            chainId: 1,
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            challenge: 'Sign this message to authenticate: 12345',
            expiresAt: '2024-01-01T00:00:00Z',
          },
        })

      // When: API çağrısı yapılır
      const response = await fetch(`${provider.mockService.baseUrl}/api/auth/connect-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: '0x123...',
          chainId: 1,
        }),
      })

      // Then: Contract doğrulanır
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.challenge).toBeDefined()
    })

    test('POST /api/auth/verify-signature', async () => {
      await provider
        .given('signature verification request')
        .uponReceiving('a signature verification request')
        .withRequest({
          method: 'POST',
          path: '/api/auth/verify-signature',
          body: {
            walletAddress: '0x123...',
            signature: '0xabc...',
            challenge: 'Sign this message to authenticate: 12345',
          },
        })
        .willRespondWith({
          status: 200,
          body: {
            success: true,
            token: 'jwt-token-here',
            user: {
              id: 'user-id',
              walletAddress: '0x123...',
            },
          },
        })
    })
  })
})
```

### Gün 4-5: Component Tests

#### Auth Hook Tests
```typescript
// tests/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'

describe('useAuth Hook', () => {
  test('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useAuth())
    
    expect(result.current.isConnected).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBe(null)
  })

  test('should connect wallet successfully', async () => {
    // Mock window.ethereum
    global.window.ethereum = {
      request: jest.fn().mockResolvedValue(['0x123...']),
    }

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.connectWallet()
    })

    expect(result.current.isConnected).toBe(true)
    expect(result.current.walletAddress).toBe('0x123...')
  })

  test('should authenticate with signature', async () => {
    // Mock API calls
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenge: 'test-challenge' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          token: 'jwt-token',
          user: { id: '1', walletAddress: '0x123...' }
        }),
      })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.authenticate()
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.token).toBe('jwt-token')
  })
})
```

#### Auth Components Tests
```typescript
// tests/components/ConnectWalletButton.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ConnectWalletButton } from '@/components/ConnectWalletButton'

describe('ConnectWalletButton', () => {
  test('renders connect button when not connected', () => {
    render(<ConnectWalletButton />)
    
    expect(screen.getByTestId('connect-wallet')).toBeInTheDocument()
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument()
  })

  test('shows wallet address when connected', () => {
    render(<ConnectWalletButton walletAddress="0x123..." />)
    
    expect(screen.getByTestId('user-address')).toBeInTheDocument()
    expect(screen.getByText('0x123...')).toBeInTheDocument()
  })

  test('calls onConnect when button clicked', () => {
    const onConnect = jest.fn()
    render(<ConnectWalletButton onConnect={onConnect} />)
    
    fireEvent.click(screen.getByTestId('connect-wallet'))
    
    expect(onConnect).toHaveBeenCalled()
  })
})
```

### Gün 6-7: Backend Implementation

#### Auth Service Tests
```typescript
// tests/services/auth.service.test.ts
describe('AuthService', () => {
  test('should generate challenge for wallet', async () => {
    const authService = new AuthService()
    const challenge = await authService.generateChallenge('0x123...')
    
    expect(challenge).toMatch(/^Sign this message to authenticate: \d+$/)
  })

  test('should verify valid signature', async () => {
    const authService = new AuthService()
    const isValid = await authService.verifySignature({
      walletAddress: '0x123...',
      signature: 'valid-signature',
      challenge: 'test-challenge',
    })
    
    expect(isValid).toBe(true)
  })

  test('should generate JWT token', async () => {
    const authService = new AuthService()
    const token = await authService.generateToken({
      walletAddress: '0x123...',
      userId: 'user-id',
    })
    
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
  })
})
```

#### API Route Tests
```typescript
// tests/api/auth.api.test.ts
import { POST as connectWallet } from '@/app/api/auth/connect-wallet/route'
import { POST as verifySignature } from '@/app/api/auth/verify-signature/route'

describe('/api/auth/connect-wallet', () => {
  test('should return challenge for valid wallet', async () => {
    const request = new Request('http://localhost:3000/api/auth/connect-wallet', {
      method: 'POST',
      body: JSON.stringify({
        walletAddress: '0x123...',
        chainId: 1,
      }),
    })

    const response = await connectWallet(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.challenge).toBeDefined()
  })
})
```

---

## 🪙 HAFTA 2: Token Service (TDD Outside-In)

### Gün 8-9: Token Creation Acceptance Tests

```typescript
// tests/e2e/token-creation.spec.ts
describe('Token Creation Flow', () => {
  test('User can create a token end-to-end', async ({ page }) => {
    // Given: Authenticated kullanıcı
    await authenticateUser(page)
    
    // When: Token creation sayfasına gider
    await page.click('[data-testid="create-token"]')
    
    // Then: Token form görünür
    await expect(page.locator('[data-testid="token-form"]')).toBeVisible()
    
    // When: Token bilgilerini doldurur
    await page.fill('[data-testid="token-name"]', 'MyToken')
    await page.fill('[data-testid="token-symbol"]', 'MTK')
    await page.fill('[data-testid="initial-supply"]', '1000000')
    
    // When: Create butonuna tıklar
    await page.click('[data-testid="create-token-submit"]')
    
    // Then: Loading state görünür
    await expect(page.locator('[data-testid="creating-token"]')).toBeVisible()
    
    // Then: Success message görünür
    await expect(page.locator('[data-testid="token-created-success"]')).toBeVisible()
    
    // Then: Contract address gösterilir
    await expect(page.locator('[data-testid="contract-address"]')).toBeVisible()
  })

  test('User can preview token before creation', async ({ page }) => {
    await authenticateUser(page)
    await page.goto('/create-token')
    
    // When: Form doldurulur
    await fillTokenForm(page, {
      name: 'PreviewToken',
      symbol: 'PVT',
      supply: '500000',
    })
    
    // When: Preview butonuna tıklar
    await page.click('[data-testid="preview-token"]')
    
    // Then: Preview modal açılır
    await expect(page.locator('[data-testid="token-preview"]')).toBeVisible()
    
    // Then: Token detayları doğru gösterilir
    await expect(page.locator('[data-testid="preview-name"]')).toContainText('PreviewToken')
    await expect(page.locator('[data-testid="preview-symbol"]')).toContainText('PVT')
  })
})
```

### Gün 10: Token API Contract Tests

```typescript
// tests/contract/token-api.contract.ts
describe('Token API Contract', () => {
  test('POST /api/tokens/create', async () => {
    await provider
      .given('token creation request')
      .uponReceiving('a token creation request')
      .withRequest({
        method: 'POST',
        path: '/api/tokens/create',
        headers: {
          'Authorization': 'Bearer jwt-token',
          'Content-Type': 'application/json',
        },
        body: {
          name: 'MyToken',
          symbol: 'MTK',
          initialSupply: 1000000,
          decimals: 18,
          features: {
            mintable: true,
            burnable: false,
            pausable: true,
          },
        },
      })
      .willRespondWith({
        status: 200,
        body: {
          success: true,
          tokenId: 'token-id-123',
          contractCode: 'contract-code-here',
          estimatedGas: 2500000,
        },
      })
  })

  test('POST /api/tokens/deploy', async () => {
    await provider
      .given('token deployment request')
      .uponReceiving('a token deployment request')
      .withRequest({
        method: 'POST',
        path: '/api/tokens/deploy',
        headers: {
          'Authorization': 'Bearer jwt-token',
        },
        body: {
          tokenId: 'token-id-123',
          networkId: 1,
        },
      })
      .willRespondWith({
        status: 200,
        body: {
          success: true,
          transactionHash: '0xabc...',
          contractAddress: '0x456...',
          status: 'pending',
        },
      })
  })
})
```

### Gün 11-12: Token Components Tests

```typescript
// tests/components/TokenCreationForm.test.tsx
describe('TokenCreationForm', () => {
  test('validates required fields', async () => {
    render(<TokenCreationForm />)
    
    // When: Submit without filling
    fireEvent.click(screen.getByTestId('create-token-submit'))
    
    // Then: Validation errors shown
    await waitFor(() => {
      expect(screen.getByText('Token name is required')).toBeInTheDocument()
      expect(screen.getByText('Symbol is required')).toBeInTheDocument()
    })
  })

  test('calculates gas estimation on form change', async () => {
    render(<TokenCreationForm />)
    
    // When: Form filled
    fireEvent.change(screen.getByTestId('token-name'), { target: { value: 'Test' } })
    fireEvent.click(screen.getByTestId('mintable-checkbox'))
    
    // Then: Gas estimation updated
    await waitFor(() => {
      expect(screen.getByTestId('gas-estimation')).toHaveTextContent('~2,500,000 gas')
    })
  })
})

// tests/hooks/useTokenCreation.test.ts
describe('useTokenCreation Hook', () => {
  test('should create token successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, tokenId: '123' }),
    })

    const { result } = renderHook(() => useTokenCreation())

    await act(async () => {
      await result.current.createToken({
        name: 'TestToken',
        symbol: 'TEST',
        initialSupply: 1000000,
      })
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.token).toEqual({ tokenId: '123' })
  })
})
```

### Gün 13-14: Token Backend Implementation

```typescript
// tests/services/token.service.test.ts
describe('TokenService', () => {
  test('should generate contract code', async () => {
    const tokenService = new TokenService()
    const code = await tokenService.generateContract({
      name: 'TestToken',
      symbol: 'TEST',
      initialSupply: 1000000,
      features: { mintable: true },
    })
    
    expect(code).toContain('contract TestToken')
    expect(code).toContain('function mint(')
  })

  test('should compile contract', async () => {
    const tokenService = new TokenService()
    const result = await tokenService.compileContract('contract code here')
    
    expect(result.success).toBe(true)
    expect(result.bytecode).toBeDefined()
    expect(result.abi).toBeDefined()
  })

  test('should estimate gas', async () => {
    const tokenService = new TokenService()
    const gasEstimate = await tokenService.estimateGas({
      features: { mintable: true, burnable: false },
    })
    
    expect(gasEstimate).toBeGreaterThan(2000000)
  })
})
```

---

## 💬 HAFTA 3: Chat Service (TDD Outside-In)

### Gün 15-16: Chat Acceptance Tests

```typescript
// tests/e2e/chat.spec.ts
describe('AI Chat Flow', () => {
  test('User can chat with token creation assistant', async ({ page }) => {
    await authenticateUser(page)
    
    // When: Chat input'a mesaj yazar
    await page.fill('[data-testid="chat-input"]', 'Create a token called MyToken')
    await page.click('[data-testid="send-message"]')
    
    // Then: Message gönderilir
    await expect(page.locator('[data-testid="user-message"]').last()).toContainText('Create a token called MyToken')
    
    // Then: AI response gelir
    await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible()
    await expect(page.locator('[data-testid="typing-indicator"]')).not.toBeVisible()
  })

  test('Chat maintains conversation context', async ({ page }) => {
    await authenticateUser(page)
    
    // Given: İlk mesaj
    await sendChatMessage(page, 'I want to create a token')
    await waitForAIResponse(page)
    
    // When: Follow-up mesaj
    await sendChatMessage(page, 'Make it mintable')
    
    // Then: Context korunur
    const response = await page.locator('[data-testid="ai-message"]').last()
    await expect(response).toContainText('mintable')
  })
})
```

### Gün 17: Chat API Contracts

```typescript
// tests/contract/chat-api.contract.ts
describe('Chat API Contract', () => {
  test('POST /api/chat/token', async () => {
    await provider
      .uponReceiving('a token chat request')
      .withRequest({
        method: 'POST',
        path: '/api/chat/token',
        headers: { 'Authorization': 'Bearer jwt-token' },
        body: {
          message: 'Create a token called MyToken',
          sessionId: 'session-123',
        },
      })
      .willRespondWith({
        status: 200,
        body: {
          response: 'I can help you create MyToken. What features would you like?',
          suggestions: ['mintable', 'burnable', 'pausable'],
          sessionId: 'session-123',
        },
      })
  })
})
```

### Gün 18-19: Chat Components Tests & Implementation

### Gün 20-21: Chat Backend Implementation

---

## 🔗 HAFTA 4: Integration & Deployment

### Gün 22-23: End-to-End Integration Tests

```typescript
// tests/e2e/complete-flow.spec.ts
describe('Complete Token Creation Flow', () => {
  test('User can complete full token creation journey', async ({ page }) => {
    // 1. Authentication
    await page.goto('/')
    await connectAndAuthenticateWallet(page)
    
    // 2. Chat with AI
    await page.click('[data-testid="ai-chat-tab"]')
    await sendChatMessage(page, 'I want to create a DeFi token with staking rewards')
    await waitForAIResponse(page)
    
    // 3. Form auto-population from chat
    await page.click('[data-testid="token-creation-tab"]')
    await expect(page.locator('[data-testid="token-name"]')).toHaveValue('DeFiToken')
    
    // 4. Token creation
    await page.click('[data-testid="create-token-submit"]')
    await waitForTokenCreation(page)
    
    // 5. Deployment
    await page.click('[data-testid="deploy-token"]')
    await waitForDeployment(page)
    
    // 6. Success confirmation
    await expect(page.locator('[data-testid="deployment-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="contract-address"]')).toBeVisible()
    
    // 7. Transaction history
    await page.click('[data-testid="view-history"]')
    await expect(page.locator('[data-testid="deployment-history"]')).toContainText('DeFiToken')
  })
})
```

### Gün 24-25: Performance & Security Tests

```typescript
// tests/performance/load.test.ts
describe('Performance Tests', () => {
  test('should handle 100 concurrent users', async () => {
    const users = Array.from({ length: 100 }, () => createUser())
    
    const results = await Promise.all(
      users.map(user => simulateTokenCreation(user))
    )
    
    const successRate = results.filter(r => r.success).length / results.length
    expect(successRate).toBeGreaterThan(0.95)
    
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
    expect(avgResponseTime).toBeLessThan(2000) // 2 seconds
  })
})

// tests/security/security.test.ts
describe('Security Tests', () => {
  test('should prevent unauthorized access', async () => {
    const response = await fetch('/api/tokens/create', {
      method: 'POST',
      body: JSON.stringify({ name: 'HackToken' }),
    })
    
    expect(response.status).toBe(401)
  })

  test('should validate input sanitization', async () => {
    const maliciousInput = '<script>alert("xss")</script>'
    
    const response = await fetch('/api/tokens/create', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer valid-token' },
      body: JSON.stringify({ name: maliciousInput }),
    })
    
    expect(response.status).toBe(400)
  })
})
```

### Gün 26-27: Deployment Pipeline & Monitoring

```typescript
// tests/deployment/deployment.test.ts
describe('Deployment Tests', () => {
  test('should deploy to staging successfully', async () => {
    const deploymentResult = await deployToStaging()
    
    expect(deploymentResult.success).toBe(true)
    expect(deploymentResult.healthCheck).toBe('healthy')
  })

  test('should run smoke tests on production', async () => {
    const smokeTests = await runSmokeTests('production')
    
    expect(smokeTests.allPassed).toBe(true)
    expect(smokeTests.responseTime).toBeLessThan(1000)
  })
})
```

### Gün 28: Documentation & Handover

## 📊 Test Coverage Hedefleri

- **Acceptance Tests**: Tüm kritik user journeys
- **Contract Tests**: Tüm API endpoints
- **Unit Tests**: 95%+ code coverage
- **Component Tests**: 90%+ component coverage
- **Integration Tests**: Tüm servis etkileşimleri
- **Performance Tests**: Load, stress, endurance
- **Security Tests**: OWASP Top 10

## 🛠️ Kullanılacak Tools

### Testing Framework Stack
```json
{
  "e2e": "@playwright/test",
  "contract": "jest-pact",
  "unit": "jest + @testing-library/react",
  "component": "@testing-library/react",
  "api": "supertest",
  "performance": "k6",
  "security": "jest + custom security tests"
}
```

### CI/CD Pipeline
```yaml
# .github/workflows/tdd-pipeline.yml
name: TDD Pipeline
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test:unit
      
  component-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test:component
      
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test:contract
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test:e2e
      
  deploy:
    needs: [unit-tests, component-tests, contract-tests, e2e-tests]
    runs-on: ubuntu-latest
    steps:
      - run: deploy-to-staging
```

## 📈 Success Metrics

### Haftalık Milestone'lar
- **Hafta 1**: Auth flow %100 test coverage, tüm acceptance testler geçiyor
- **Hafta 2**: Token creation flow %100 test coverage, contract testler geçiyor  
- **Hafta 3**: Chat integration %100 test coverage, AI responses working
- **Hafta 4**: Full integration, performance targets met, production ready

### Quality Gates
- Tüm testler geçmeli (red -> green -> refactor cycle)
- Code coverage minimum %90
- Performance benchmarks karşılanmalı
- Security testleri %100 geçmeli
- Documentation complete olmalı

Bu roadmap TDD Outside-In yaklaşımını tam anlamıyla uygular ve her adımda test-first development sağlar. Her gün sonunda working software ve comprehensive test suite'imiz olacak.