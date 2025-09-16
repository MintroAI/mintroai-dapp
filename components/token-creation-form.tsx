"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { motion } from "framer-motion"
import { type CheckedState } from "@radix-ui/react-checkbox"
import { Coins, Shield, Gauge, Percent, Sparkles, AlertCircle } from "lucide-react"
import { useWebSocket } from "@/hooks/useWebSocket"
import { useSession } from "@/hooks/useSession"
import { useAccount } from 'wagmi'
import { useNearWallet } from '@/contexts/NearWalletContext'
import { useAuth } from '@/contexts/AuthContext'
import { EVM } from 'multichain-tools'
import { MPC_CONTRACT, NEAR_NETWORK_ID, DEFAULT_DERIVATION_PATH } from '@/config/chain-signatures'
import { TokenConfirmationDialog } from "@/components/token-confirmation-dialog"
import { useTokenDeploy } from '@/hooks/useTokenDeploy'
import { TokenSuccessDialog } from "@/components/token-success-dialog"
import { AuthenticationModal } from "@/components/authentication-modal"
import { Alert, AlertDescription } from "@/components/ui/alert"

const tokenFormSchema = z.object({
  name: z.string().min(1, "Token name is required"),
  symbol: z.string().min(1, "Token symbol is required"),
  decimals: z.number().min(0).max(18),
  initialSupply: z.string().min(1, "Initial supply is required"),
  targetChain: z.string().optional(), // For NEAR Chain Signatures
  mintable: z.boolean(),
  burnable: z.boolean(),
  pausable: z.boolean(),
  blacklist: z.boolean(),
  maxTx: z.boolean(),
  maxTxAmount: z.number().min(0),
  transferTax: z.number().min(0).max(30),
  antiBot: z.boolean(),
  cooldownTime: z.number(),
})

export type TokenFormValues = z.infer<typeof tokenFormSchema>

// Input wrapper component'i - moved outside to prevent recreation
const AnimatedFormInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { isUpdated?: boolean }
>(({ className, isUpdated, ...props }, ref) => (
  <Input
    ref={ref}
    className={`${className} ${isUpdated ? 'highlight-update' : ''}`}
    {...props}
  />
))
AnimatedFormInput.displayName = 'AnimatedFormInput'

// Checkbox wrapper component'i - moved outside to prevent recreation
const AnimatedFormCheckbox = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Checkbox> & { isUpdated?: boolean }
>(({ className, isUpdated, ...props }, ref) => (
  <Checkbox
    ref={ref}
    className={`${className} ${isUpdated ? 'highlight-update' : ''}`}
    {...props}
  />
))
AnimatedFormCheckbox.displayName = 'AnimatedFormCheckbox'

// Target chains for NEAR Chain Signatures
const TARGET_CHAINS = [
  { id: '97', name: 'BSC Testnet' },
  { id: '1313161555', name: 'Aurora Testnet' },
];

export function TokenCreationForm() {
  const { sessionId, isInitialized } = useSession()
  const { address } = useAccount()
  const { accountId, selector } = useNearWallet()
  const { isAuthenticated } = useAuth()
  const [showAuthModal, setShowAuthModal] = React.useState(false)
  const [walletError, setWalletError] = React.useState<string | null>(null)
  
  const form = useForm<TokenFormValues>({
    resolver: zodResolver(tokenFormSchema),
    defaultValues: {
      name: "",
      symbol: "",
      decimals: 18,
      initialSupply: "",
      targetChain: TARGET_CHAINS[0].id, // Default to first chain
      mintable: false,
      burnable: false,
      pausable: false,
      maxTx: false,
      maxTxAmount: 0,
      blacklist: false,
      transferTax: 0,
      antiBot: false,
      cooldownTime: 0,
    },
  })

  const [updatedFields, setUpdatedFields] = React.useState<Set<string>>(new Set())
  const [updatedSections, setUpdatedSections] = React.useState<Set<string>>(new Set())
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [deploymentStatus, setDeploymentStatus] = React.useState<'idle' | 'creating' | 'compiling' | 'deploying' | 'success' | 'error'>('idle')
  const [showSuccess, setShowSuccess] = React.useState(false)
  const [deployedAddress, setDeployedAddress] = React.useState<string | null>(null)

  const { deploy, isPending, isWaiting, isSuccess, error, hash, receipt } = useTokenDeploy()

  // Section'ları field'larla eşleştir
  const fieldToSection: { [key: string]: string } = {
    mintable: 'features',
    burnable: 'features',
    pausable: 'features',
    blacklist: 'features',
    maxTx: 'limits',
    maxTxAmount: 'limits',
    transferTax: 'taxes',
    antiBot: 'security',
    cooldownTime: 'security',
  }

  useWebSocket(sessionId, isInitialized, (config) => {
    
    const newUpdatedFields = new Set<string>()
    const newUpdatedSections = new Set<string>()
    let hasChanges = false
    
    // Form değerlerini güncelle
    Object.keys(config).forEach((key) => {
      if (key in form.getValues()) {
        let value = config[key];
        const currentValue = form.getValues()[key as keyof TokenFormValues];
        const formValueType = typeof currentValue;

        // Tip dönüşümü yap
        if (formValueType === 'number' && typeof value === 'string') {
          value = parseFloat(value);
        } else if (formValueType === 'string' && typeof value === 'number') {
          value = value.toString();
        } else if (formValueType === 'boolean' && typeof value !== 'boolean') {
          value = Boolean(value);
        }

        // Yeni değeri mevcut değerle karşılaştır
        const hasChanged = JSON.stringify(currentValue) !== JSON.stringify(value);
        if (hasChanged) {
          form.setValue(key as keyof TokenFormValues, value, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
          newUpdatedFields.add(key)
          hasChanges = true
          
          // Field'ın bağlı olduğu section'ı da güncelle
          if (fieldToSection[key]) {
            newUpdatedSections.add(fieldToSection[key])
          }
        }
      }
    })
    
    // Sadece değişiklik varsa state'leri güncelle
    if (hasChanges) {
      setUpdatedFields(new Set(newUpdatedFields))
      setUpdatedSections(new Set(newUpdatedSections))
      
      // 4 saniye sonra highlight'ları temizle
      setTimeout(() => {
        setUpdatedFields(new Set())
        setUpdatedSections(new Set())
      }, 4000)
    }

  })

  // useEffect to track deployment status
  React.useEffect(() => {
    if (isPending || isWaiting) {
      setDeploymentStatus('deploying')
    } else if (isSuccess && receipt) {
      setDeploymentStatus('success')
      const deployedAddr = receipt.logs[0].address
      setDeployedAddress(deployedAddr)

      
      // Confirmation dialog'u kapat ve success dialog'u aç
      setTimeout(() => {
        setShowConfirmation(false)
        setDeploymentStatus('idle')
        setShowSuccess(true)
      }, 1000)
    } else if (error) {
      setDeploymentStatus('error')
    }
  }, [isPending, isWaiting, isSuccess, error, hash, receipt])

  // Clear wallet error when wallet connects
  React.useEffect(() => {
    if (address || accountId) {
      setWalletError(null);
    }
  }, [address, accountId])

  const onSubmit = async () => {
    // Clear any previous errors
    setWalletError(null);
    
    // First check wallet connection
    if (!address && !accountId) {
      setWalletError('Please connect your wallet first to create a token');
      // Scroll to top to show the error
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Then check authentication
    if (!isAuthenticated) {
      // Show authentication modal
      setShowAuthModal(true);
      return;
    }
    
    // All checks passed, show confirmation dialog
    setShowConfirmation(true);
  }
  
  const handleConfirm = async () => {
    try {
      setDeploymentStatus('creating')
      
      // Determine owner address based on connected wallet
      let ownerAddress = address; // EVM wallet address (if connected)
      
      // If NEAR wallet is connected, derive the Chain Signatures address
      if (accountId && selector) {
        const targetChain = TARGET_CHAINS.find(chain => chain.id === form.getValues().targetChain);
        if (!targetChain) {
          throw new Error('Invalid target chain selected');
        }

        // Initialize Chain Signatures to get derived address
        const evm = new EVM({
          providerUrl: targetChain.id === '97' ? 'https://data-seed-prebsc-1-s1.binance.org:8545' :
                      'https://testnet.aurora.dev',
          contract: MPC_CONTRACT,
          nearNetworkId: NEAR_NETWORK_ID as 'testnet' | 'mainnet',
        });

        // Derive the Chain Signatures address to use as owner
        const { address: derivedAddress } = await evm.deriveAddressAndPublicKey(
          accountId,
          DEFAULT_DERIVATION_PATH
        );

        const { ethers } = await import('ethers');
        ownerAddress = ethers.getAddress(derivedAddress) as `0x${string}`;
        console.log('User derived address:', derivedAddress)

      }

      const contractData = {
        contractType: 'token' as const,
        chatId: sessionId,
        contractName: form.getValues().name,
        tokenName: form.getValues().name,
        tokenSymbol: form.getValues().symbol,
        decimals: form.getValues().decimals,
        initialSupply: form.getValues().initialSupply,
        ownerAddress: ownerAddress,
        mintable: form.getValues().mintable,
        burnable: form.getValues().burnable,
        pausable: form.getValues().pausable,
        blacklist: form.getValues().blacklist,
        maxTx: form.getValues().maxTx,
        maxTxAmount: form.getValues().maxTxAmount,
        transferTax: form.getValues().transferTax,
        antiBot: form.getValues().antiBot,
        cooldownTime: form.getValues().cooldownTime,
      };

      // 1. Contract Creation
      const createResponse = await fetch('/api/create-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contractData),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create contract');
      }

      await createResponse.json();


      // 2. Contract Compilation
      setDeploymentStatus('compiling')
      const compileResponse = await fetch('/api/compile-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatId: sessionId }),
      });

      if (!compileResponse.ok) {
        throw new Error('Failed to compile contract');
      }

      const compileData = await compileResponse.json();


      // 3. Deploy contract
      setDeploymentStatus('deploying')
      
      if (accountId) {
        // NEAR Chain Signatures deployment
        const targetChain = TARGET_CHAINS.find(chain => chain.id === form.getValues().targetChain);
        await deploy(compileData.bytecode, {
          name: form.getValues().name,
          symbol: form.getValues().symbol,
          decimals: form.getValues().decimals,
          initialSupply: form.getValues().initialSupply,
          targetChain: form.getValues().targetChain,
          targetChainName: targetChain?.name,
          ownerAddress: ownerAddress,
        });
      } else {
        // EVM deployment
        await deploy(compileData.bytecode);
      }
      


    } catch (error) {
      console.error('Error:', error);
      setDeploymentStatus('error')
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-8">
          {/* Wallet Connection Alert */}
          {walletError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{walletError}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-6">
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Coins className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-white">Token Details</h2>
              </div>
            </div>

            <motion.div
              className="grid gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Token Name</FormLabel>
                    <FormControl>
                      <AnimatedFormInput
                        placeholder="MyToken"
                        {...field}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30
                          focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                        isUpdated={updatedFields.has("name")}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Token Symbol</FormLabel>
                    <FormControl>
                      <AnimatedFormInput
                        placeholder="MTK"
                        {...field}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30
                          focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                        isUpdated={updatedFields.has("symbol")}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              
              {/* Target Chain Selector - Only show for NEAR wallet */}
              {accountId && (
                <FormField
                  control={form.control}
                  name="targetChain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Target Chain</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30
                            focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300
                            w-full px-3 py-2 rounded-md border"
                        >
                          {TARGET_CHAINS.map((chain) => (
                            <option key={chain.id} value={chain.id} className="bg-gray-900 text-white">
                              {chain.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              )}
              
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="decimals"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel className="text-white">Decimals</FormLabel>
                      <FormControl>
                        <AnimatedFormInput
                          type="number"
                          value={value.toString()}
                          onChange={(e) => onChange(Number(e.target.value))}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30
                            focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                          isUpdated={updatedFields.has("decimals")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="initialSupply"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Initial Supply</FormLabel>
                      <FormControl>
                        <AnimatedFormInput
                          placeholder="1000000"
                          {...field}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30
                            focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                          isUpdated={updatedFields.has("initialSupply")}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </div>
            </motion.div>
          </div>

          <Separator className="bg-white/10" />

          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="features" className={`border-white/10 px-2 group ${updatedSections.has('features') ? 'highlight-section rounded-lg' : ''}`}>
              <AccordionTrigger className="text-white hover:text-primary transition-colors py-4 group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <span>Basic Features</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="grid gap-4 pt-4">
                {["mintable", "burnable", "pausable", "blacklist"].map((feature) => (
                  <FormField
                    key={feature}
                    control={form.control}
                    name={feature as keyof TokenFormValues}
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <AnimatedFormCheckbox
                            checked={value as boolean}
                            onCheckedChange={(checked: CheckedState) => {
                              onChange(checked === true)
                            }}
                            className="border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            isUpdated={updatedFields.has(feature)}
                            {...field}
                          />
                        </FormControl>
                        <FormLabel className="text-white font-normal">
                          {feature.charAt(0).toUpperCase() + feature.slice(1)}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="limits" className={`border-white/10 px-2 group ${updatedSections.has('limits') ? 'highlight-section rounded-lg' : ''}`}>
              <AccordionTrigger className="text-white hover:text-primary transition-colors py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Gauge className="w-5 h-5 text-primary" />
                  </div>
                  <span>Limits & Trading</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="maxTx"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <AnimatedFormCheckbox
                          checked={value as boolean}
                          onCheckedChange={(checked: CheckedState) => {
                            onChange(checked === true)
                          }}
                          className="border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          isUpdated={updatedFields.has("maxTx")}
                          {...field}
                        />
                      </FormControl>
                      <FormLabel className="text-white font-normal">Max Transaction Limit</FormLabel>
                    </FormItem>
                  )}
                />
                {form.watch("maxTx") && (
                  <FormField
                    control={form.control}
                    name="maxTxAmount" 
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel className="text-white">Max Transaction Amount</FormLabel>
                        <FormControl>
                          <AnimatedFormInput
                            type="number"
                            placeholder="10000"
                            value={value.toString()}
                            onChange={(e) => onChange(Number(e.target.value))}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30
                              focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                            isUpdated={updatedFields.has("maxTxAmount")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="taxes" className={`border-white/10 px-2 group ${updatedSections.has('taxes') ? 'highlight-section rounded-lg' : ''}`}>
              <AccordionTrigger className="text-white hover:text-primary transition-colors py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Percent className="w-5 h-5 text-primary" />
                  </div>
                  <span>Taxes</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="grid gap-4 pt-4">
                {[/* "buyTax", "sellTax", */ "transferTax"].map((tax) => (
                  <FormField
                    key={tax}
                    control={form.control}
                    name={tax as keyof TokenFormValues}
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel className="text-white">{tax.replace("Tax", " Tax (%)")}</FormLabel>
                        <FormControl>
                          <AnimatedFormInput
                            type="number"
                            value={value?.toString() || ''}
                            onChange={(e) => onChange(Number(e.target.value))}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30
                              focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                            isUpdated={updatedFields.has(tax)}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                ))}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="security" className={`border-white/10 px-2 group ${updatedSections.has('security') ? 'highlight-section rounded-lg' : ''}`}>
              <AccordionTrigger className="text-white hover:text-primary transition-colors py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <span>Security</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="antiBot"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <AnimatedFormCheckbox
                          checked={value as boolean}
                          onCheckedChange={(checked: CheckedState) => {
                            onChange(checked === true)
                          }}
                          className="border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          isUpdated={updatedFields.has("antiBot")}
                          {...field}
                        />
                      </FormControl>
                      <FormLabel className="text-white font-normal">Anti-bot Protection</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cooldownTime"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel className="text-white">Cooldown Time (seconds)</FormLabel>
                      <FormControl>
                        <AnimatedFormInput
                          type="number"
                          value={value.toString()}
                          onChange={(e) => onChange(Number(e.target.value))}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30
                            focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                          isUpdated={updatedFields.has("cooldownTime")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="pt-6">
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold
                transition-all duration-300 hover:shadow-[0_0_20px_rgba(124,58,237,0.3)]
                relative overflow-hidden group"
            >
              <span className="relative z-10">Create Token</span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/10 to-primary/0 
                translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </Button>
          </div>
        </form>
      </Form>
      
      <TokenConfirmationDialog
        isOpen={showConfirmation}
        onConfirm={handleConfirm}
        onCancel={() => {
          if (deploymentStatus === 'idle' || deploymentStatus === 'error') {
            setShowConfirmation(false)
            // Error durumunda deployment status'u da sıfırla
            if (deploymentStatus === 'error') {
              setDeploymentStatus('idle')
            }
          }
        }}
        formData={form.getValues()}
        deploymentStatus={deploymentStatus}
      />

      {deployedAddress && (
        <TokenSuccessDialog
          isOpen={showSuccess}
          onClose={() => setShowSuccess(false)}
          tokenAddress={deployedAddress}
          tokenName={form.getValues().name}
          tokenSymbol={form.getValues().symbol}
          targetChainId={form.getValues().targetChain}
        />
      )}
      
      <AuthenticationModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false)
          // After successful auth, re-submit the form
          // Form validation will pass and it will go directly to confirmation
          form.handleSubmit(onSubmit)();
        }}
        trigger="manual"
      />
    </>
  )
}
