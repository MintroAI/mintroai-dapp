"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId, usePublicClient } from 'wagmi'
import { formatUnits, parseUnits, type Address, parseAbiItem, getAddress } from 'viem'
import { type Chain, arbitrum, bsc, bscTestnet, auroraTestnet } from 'viem/chains'
import { hyperEVM } from '@/config/customChains'
import vestingABI from '@/constants/vestingContractABI.json'
import erc20ABI from '@/constants/erc20ABI.json'
import { toast } from "sonner"
import { motion } from "framer-motion"
import { 
  Clock, 
  Coins, 
  Calendar, 
  TrendingUp, 
  Wallet, 
  ExternalLink, 
  Copy,
  CheckCircle,
  Info,
  ArrowRight,
  Timer,
  Lock,
  Unlock,
  Shield,
  UserPlus,
  Users,
  Upload,
  Download,
  AlertCircle,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { CustomConnectButton } from "@/components/custom-connect-button"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

interface VestingDashboardProps {
  contractAddress: string
}

interface ClaimHistoryItem {
  transactionHash: string
  timestamp: number
  claimedAmount: string
  totalClaimed: string
  totalAmount: string
  blockNumber: bigint
}

export function VestingDashboard({ contractAddress }: VestingDashboardProps) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const [copiedAddress, setCopiedAddress] = React.useState(false)
  const [claimHistory, setClaimHistory] = React.useState<ClaimHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false)
  
  // Admin state
  const [singleLockAddress, setSingleLockAddress] = React.useState('')
  const [singleLockAmount, setSingleLockAmount] = React.useState('')
  const [depositAmount, setDepositAmount] = React.useState('')
  const [batchLockData, setBatchLockData] = React.useState('')
  const [showBatchConfirmation, setShowBatchConfirmation] = React.useState(false)
  const [pendingBatchData, setPendingBatchData] = React.useState<{addresses: Address[], amounts: bigint[], totalInWei: bigint}>({addresses: [], amounts: [], totalInWei: BigInt(0)})
  const [batchErrors, setBatchErrors] = React.useState<string[]>([])
  
  // Contract read hooks
  const { data: vestingInfo, refetch: refetchVestingInfo } = useReadContract({
    address: contractAddress as Address,
    abi: vestingABI,
    functionName: 'getNextVestingInfo',
    args: address ? [address] : undefined,
  })

  const { refetch: refetchClaimable } = useReadContract({
    address: contractAddress as Address,
    abi: vestingABI,
    functionName: 'getClaimable',
    args: address ? [address] : undefined,
  })

  const { data: userLockInfo, refetch: refetchUserInfo } = useReadContract({
    address: contractAddress as Address,
    abi: vestingABI,
    functionName: 'userToLockInfo',
    args: address ? [address] : undefined,
  })

  const { data: tgeTimestamp } = useReadContract({
    address: contractAddress as Address,
    abi: vestingABI,
    functionName: 'tgeTimestamp',
  })

  const { data: tgeRate } = useReadContract({
    address: contractAddress as Address,
    abi: vestingABI,
    functionName: 'tgeRate',
  })

  const { data: releaseRate } = useReadContract({
    address: contractAddress as Address,
    abi: vestingABI,
    functionName: 'releaseRate',
  })

  const { data: tokenAddress } = useReadContract({
    address: contractAddress as Address,
    abi: vestingABI,
    functionName: 'tokenAddress',
  })

  const { data: owner } = useReadContract({
    address: contractAddress as Address,
    abi: vestingABI,
    functionName: 'owner',
  })

  const { data: totalLocked } = useReadContract({
    address: contractAddress as Address,
    abi: vestingABI,
    functionName: 'totalLocked',
  })

  const { data: period } = useReadContract({
    address: contractAddress as Address,
    abi: vestingABI,
    functionName: 'period',
  })

  const { data: maxTokensToLock } = useReadContract({
    address: contractAddress as Address,
    abi: vestingABI,
    functionName: 'maxTokensToLock',
  })

  // Fetch token decimals from the token contract
  const { data: tokenDecimals } = useReadContract({
    address: tokenAddress as Address,
    abi: erc20ABI,
    functionName: 'decimals',
  })

  const { data: tokenSymbol } = useReadContract({
    address: tokenAddress as Address,
    abi: erc20ABI,
    functionName: 'symbol',
  })

  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: tokenAddress as Address,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: contractAddress ? [contractAddress as Address] : undefined,
  })

  // Claim function
  const { 
    writeContract: claimTokens,
    data: claimHash,
    isPending: isClaimPending
  } = useWriteContract()

  // Admin functions
  const { 
    writeContract: lockToUser,
    data: lockToUserHash,
    isPending: isLockToUserPending
  } = useWriteContract()

  const { 
    writeContract: lockTokensMultiple,
    data: lockMultipleHash,
    isPending: isLockMultiplePending,
    error: lockMultipleError
  } = useWriteContract()

  const {
    writeContract: depositTokens,
    data: depositHash,
    isPending: isDepositPending
  } = useWriteContract()

  const { isLoading: isLockToUserConfirming, isSuccess: isLockToUserSuccess } = useWaitForTransactionReceipt({
    hash: lockToUserHash,
  })

  const { isLoading: isLockMultipleConfirming, isSuccess: isLockMultipleSuccess } = useWaitForTransactionReceipt({
    hash: lockMultipleHash,
  })

  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  })

  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimHash,
  })

  // Handle claim
  const handleClaim = () => {
    try {
      claimTokens({
        address: contractAddress as Address,
        abi: vestingABI,
        functionName: 'claim',
      })
    } catch (error) {
      console.error('Claim error:', error)
      toast.error('Failed to claim tokens')
    }
  }

  // Validate Ethereum address
  const validateAddress = (address: string): { valid: boolean; error?: string } => {
    if (!address) {
      return { valid: false, error: 'Address is required' }
    }
    // Check if it's a valid Ethereum address (42 characters including 0x)
    // and contains only hex characters
    const addressRegex = /^0x[a-fA-F0-9]{40}$/
    if (!addressRegex.test(address)) {
      return { valid: false, error: 'Invalid Ethereum address format' }
    }
    return { valid: true }
  }

  // Validate amount
  const validateAmount = (amount: string): { valid: boolean; error?: string } => {
    if (!amount) {
      return { valid: false, error: 'Amount is required' }
    }
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return { valid: false, error: 'Amount must be a positive number' }
    }
    if (amount.includes('e') || amount.includes('E')) {
      return { valid: false, error: 'Scientific notation not allowed' }
    }
    return { valid: true }
  }

  // Calculate if new allocation would exceed max supply
  const checkMaxSupply = (newAmount: bigint): { valid: boolean; error?: string } => {
    if (!maxTokensToLock || !totalLocked) {
      return { valid: true } // Can't check, proceed with caution
    }
    const maxSupply = maxTokensToLock as bigint
    const currentLocked = totalLocked as bigint
    const remaining = maxSupply - currentLocked
    
    if (newAmount > remaining) {
      return { 
        valid: false, 
        error: `Exceeds remaining supply. Available: ${parseFloat(formatUnits(remaining, (tokenDecimals as number) || 18)).toFixed(4)} ${tokenSymbol || 'tokens'}` 
      }
    }
    return { valid: true }
  }

  // Handle single user lock
  const handleLockToUser = () => {
    // Validate address
    const addressValidation = validateAddress(singleLockAddress)
    if (!addressValidation.valid) {
      toast.error(addressValidation.error!)
      return
    }

    // Validate amount
    const amountValidation = validateAmount(singleLockAmount)
    if (!amountValidation.valid) {
      toast.error(amountValidation.error!)
      return
    }

    if (!tokenDecimals) {
      toast.error('Unable to fetch token decimals. Please try again.')
      return
    }

    try {
      // Convert to checksum address
      const checksumAddress = getAddress(singleLockAddress) as Address
      const amountInWei = parseUnits(singleLockAmount, (tokenDecimals as number) || 18)
      
      // Check max supply
      const supplyCheck = checkMaxSupply(amountInWei)
      if (!supplyCheck.valid) {
        toast.error(supplyCheck.error!)
        return
      }

      lockToUser({
        address: contractAddress as Address,
        abi: vestingABI,
        functionName: 'lockToUser',
        args: [checksumAddress, amountInWei],
      })
    } catch (error) {
      console.error('Lock to user error:', error)
      toast.error('Failed to lock tokens: ' + (error as Error).message)
    }
  }

  // Handle deposit tokens to vesting contract
  const handleDepositTokens = () => {
    // Validate amount
    const amountValidation = validateAmount(depositAmount)
    if (!amountValidation.valid) {
      toast.error(amountValidation.error!)
      return
    }

    if (!tokenDecimals) {
      toast.error('Unable to fetch token decimals. Please try again.')
      return
    }

    if (!tokenAddress) {
      toast.error('Unable to fetch token address. Please try again.')
      return
    }

    try {
      const amountInWei = parseUnits(depositAmount, (tokenDecimals as number) || 18)
      
      // Use ERC20 transfer function to send tokens to vesting contract
      depositTokens({
        address: tokenAddress as Address,
        abi: [
          {
            name: 'transfer',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }]
          }
        ],
        functionName: 'transfer',
        args: [contractAddress as Address, amountInWei],
      })
    } catch (error) {
      console.error('Deposit tokens error:', error)
      toast.error('Failed to deposit tokens: ' + (error as Error).message)
    }
  }

  // Process batch data
  const processBatchData = () => {
    // Clear previous errors
    setBatchErrors([])
    
    if (!batchLockData.trim()) {
      setBatchErrors(['Please enter batch data'])
      return
    }

    if (!tokenDecimals) {
      setBatchErrors(['Unable to fetch token decimals. Please try again.'])
      return
    }

    try {
      const lines = batchLockData.trim().split('\n').filter(line => line.trim())
      const addresses: Address[] = []
      const amounts: bigint[] = []
      const addressSet = new Set<string>()
      let totalAmount = BigInt(0)
      const errors: string[] = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const [addressStr, amountStr] = line.split(',').map(s => s.trim())
        
        if (!addressStr || !amountStr) {
          errors.push(`Line ${i + 1}: Invalid format (expected: address,amount)`)
          continue
        }

        // Validate address
        const addressValidation = validateAddress(addressStr)
        if (!addressValidation.valid) {
          errors.push(`Line ${i + 1}: ${addressValidation.error}`)
          continue
        }

        // Convert to checksum address
        let checksumAddress: Address
        try {
          checksumAddress = getAddress(addressStr) as Address
        } catch {
          errors.push(`Line ${i + 1}: Invalid address ${addressStr}`)
          continue
        }

        // Check for duplicates (using lowercase for comparison)
        const normalizedAddress = checksumAddress.toLowerCase()
        if (addressSet.has(normalizedAddress)) {
          errors.push(`Line ${i + 1}: Duplicate address ${checksumAddress}`)
          continue
        }

        // Validate amount
        const amountValidation = validateAmount(amountStr)
        if (!amountValidation.valid) {
          errors.push(`Line ${i + 1}: ${amountValidation.error}`)
          continue
        }

        addressSet.add(normalizedAddress)
        addresses.push(checksumAddress)
        const amountInWei = parseUnits(amountStr, (tokenDecimals as number) || 18)
        amounts.push(amountInWei)
        totalAmount += amountInWei
      }

      if (errors.length > 0) {
        setBatchErrors(errors)
        return
      }

      if (addresses.length === 0) {
        setBatchErrors(['No valid entries found'])
        return
      }

      // Check total against max supply
      const supplyCheck = checkMaxSupply(totalAmount)
      if (!supplyCheck.valid) {
        setBatchErrors([supplyCheck.error!])
        return
      }

      // Clear errors and show confirmation
      setBatchErrors([])
      setPendingBatchData({ addresses, amounts, totalInWei: totalAmount })
      setShowBatchConfirmation(true)
    } catch (error) {
      console.error('Batch processing error:', error)
      setBatchErrors(['Failed to process batch data: ' + (error as Error).message])
    }
  }

  // Execute batch lock after confirmation
  const executeBatchLock = () => {
    console.log('Executing batch lock...')
    console.log('Contract address:', contractAddress)
    console.log('Addresses:', pendingBatchData.addresses)
    console.log('Amounts:', pendingBatchData.amounts)
    
    try {
      lockTokensMultiple({
        address: contractAddress as Address,
        abi: vestingABI,
        functionName: 'lockTokensMultiple',
        args: [pendingBatchData.addresses, pendingBatchData.amounts],
      })
      setShowBatchConfirmation(false)
    } catch (error) {
      console.error('Error executing batch lock:', error)
      toast.error('Failed to execute batch lock: ' + (error as Error).message)
    }
  }

  // Generate CSV template
  const downloadCSVTemplate = () => {
    const template = `address,amount
# Example entries - replace with actual addresses and amounts
# Amounts should be in token units (not wei)
0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4,1000
0x5aAeb6053f3E94C9b9A09f33669435E7Ef1BeAed,2500.5
0x617F3e2b3a250b5Dd087231c8E7D6d72C4f8eF59,750`
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vesting_allocation_template.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Template downloaded successfully')
  }

  // Handle CSV upload
  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('File too large. Maximum size is 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#')) // Remove empty lines and comments
        
        // Skip header if it exists
        const dataLines = lines[0].toLowerCase().includes('address') ? lines.slice(1) : lines
        
        if (dataLines.length === 0) {
          toast.error('No valid data found in CSV file')
          return
        }
        
        if (dataLines.length > 500) {
          toast.warning('Large batch detected. Processing may take longer.')
        }
        
        setBatchLockData(dataLines.join('\n'))
        toast.success(`Loaded ${dataLines.length} entries from CSV`)
      } catch {
        toast.error('Failed to parse CSV file')
      }
    }
    reader.onerror = () => {
      toast.error('Failed to read file')
    }
    reader.readAsText(file)
    
    // Reset file input
    event.target.value = ''
  }

  // Fetch claim history
  const fetchClaimHistory = React.useCallback(async () => {
    if (!publicClient || !address) return
    
    setIsLoadingHistory(true)
    try {
      const logs = await publicClient.getLogs({
        address: contractAddress as Address,
        event: parseAbiItem('event Claimed(address indexed user, uint256 timestamp, uint256 claimedAmount, uint256 totalClaimed, uint256 totalAmount)'),
        args: {
          user: address,
        },
        fromBlock: 'earliest',
        toBlock: 'latest',
      })

      const history = logs.map((log) => {
        const args = log.args as {
          user?: Address
          timestamp?: bigint
          claimedAmount?: bigint
          totalClaimed?: bigint
          totalAmount?: bigint
        }
        return {
          transactionHash: log.transactionHash,
          timestamp: Number(args.timestamp || 0),
          claimedAmount: formatUnits(args.claimedAmount || BigInt(0), (tokenDecimals as number) || 18),
          totalClaimed: formatUnits(args.totalClaimed || BigInt(0), (tokenDecimals as number) || 18),
          totalAmount: formatUnits(args.totalAmount || BigInt(0), (tokenDecimals as number) || 18),
          blockNumber: log.blockNumber,
        }
      }).reverse() // Most recent first

      setClaimHistory(history)
    } catch (error) {
      console.error('Error fetching claim history:', error)
      toast.error('Failed to fetch claim history')
    } finally {
      setIsLoadingHistory(false)
    }
  }, [publicClient, address, contractAddress, tokenDecimals])

  // Fetch claim history on mount and when address changes
  React.useEffect(() => {
    if (address && publicClient) {
      fetchClaimHistory()
    }
  }, [address, publicClient, fetchClaimHistory])

  // Refetch data after successful claim
  React.useEffect(() => {
    if (isClaimSuccess) {
      toast.success('Tokens claimed successfully!')
      refetchVestingInfo()
      refetchClaimable()
      refetchUserInfo()
      fetchClaimHistory() // Refresh claim history
    }
  }, [isClaimSuccess, refetchVestingInfo, refetchClaimable, refetchUserInfo, fetchClaimHistory])

  // Handle successful lock operations
  React.useEffect(() => {
    if (isLockToUserSuccess) {
      toast.success('Tokens locked successfully for user!')
      setSingleLockAddress('')
      setSingleLockAmount('')
      refetchUserInfo()
    }
  }, [isLockToUserSuccess, refetchUserInfo])

  React.useEffect(() => {
    if (isLockMultipleSuccess) {
      toast.success('Batch token lock successful!')
      setBatchLockData('')
      setBatchErrors([])
      setShowBatchConfirmation(false)
      refetchUserInfo()
    }
  }, [isLockMultipleSuccess, refetchUserInfo])

  React.useEffect(() => {
    if (isDepositSuccess) {
      toast.success('Tokens deposited successfully to vesting contract!')
      setDepositAmount('')
      refetchTokenBalance()
    }
  }, [isDepositSuccess, refetchTokenBalance])

  // Handle batch lock errors
  React.useEffect(() => {
    if (lockMultipleError) {
      console.error('Batch lock error:', lockMultipleError)
      toast.error('Transaction failed: ' + (lockMultipleError as Error).message)
      setBatchErrors(['Transaction failed. Please check the console for details.'])
    }
  }, [lockMultipleError])

  // Get block explorer URL
  const getExplorerUrl = (type: 'address' | 'tx', hash: string) => {
    const chains: Record<number, Chain> = {
      [arbitrum.id]: arbitrum,
      [bscTestnet.id]: bscTestnet,
      [bsc.id]: bsc,
      [auroraTestnet.id]: auroraTestnet,
      [hyperEVM.id]: hyperEVM,
    }
    
    const chain = chains[chainId]
    if (!chain?.blockExplorers?.default?.url) return null
    
    const baseUrl = chain.blockExplorers.default.url
    return type === 'address' ? `${baseUrl}/address/${hash}` : `${baseUrl}/tx/${hash}`
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedAddress(true)
      toast.success('Address copied to clipboard!')
      setTimeout(() => setCopiedAddress(false), 2000)
    } catch {
      toast.error('Failed to copy address')
    }
  }

  // Parse vesting info (tuple return type)
  const vestingInfoArray = vestingInfo as [bigint, bigint, bigint, bigint, bigint] | undefined
  const nextVestingTime = vestingInfoArray?.[0] ? Number(vestingInfoArray[0]) : 0
  const nextTotalVestingAmount = vestingInfoArray?.[1] ?? BigInt(0)
  const totalAmount = vestingInfoArray?.[2] ?? BigInt(0)
  const claimedSoFar = vestingInfoArray?.[3] ?? BigInt(0)
  const claimableNow = vestingInfoArray?.[4] ?? BigInt(0)

  // Parse user lock info (tuple return type)
  const userLockInfoArray = userLockInfo as [bigint, bigint] | undefined
  const userTotalAmount = userLockInfoArray?.[0] ?? BigInt(0)
  const userTotalClaimed = userLockInfoArray?.[1] ?? BigInt(0)

  // Calculate progress
  const vestingProgress = totalAmount > BigInt(0) 
    ? Number((claimedSoFar * BigInt(100)) / totalAmount) 
    : 0

  const isOwner = owner && address && (owner as string).toLowerCase() === address.toLowerCase()

  // Format dates
  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return 'Not set'
    const date = new Date(timestamp * 1000)
    return format(date, "PPP 'at' HH:mm")
  }

  const getTimeUntilNext = (timestamp: number) => {
    if (timestamp === 0) return 'No upcoming vesting'
    const now = Date.now() / 1000
    const diff = timestamp - now
    
    if (diff <= 0) return 'Ready to vest'
    
    const days = Math.floor(diff / 86400)
    const hours = Math.floor((diff % 86400) / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}, ${minutes} minute${minutes > 1 ? 's' : ''}`
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <Image src="/assets/logo-small.svg" alt="Logo" width={32} height={32} className="relative z-10" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/30 transition-colors" />
            </div>
            <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
              MintroAI
            </span>
          </Link>
          <CustomConnectButton />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 border border-white/10"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Vesting Dashboard</h1>
          <div className="flex items-center gap-4 text-white/70">
            <div className="flex items-center gap-2">
              <span>Contract:</span>
              <code className="bg-white/10 px-2 py-1 rounded text-sm font-mono">
                {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(contractAddress)}
                className="p-1 h-auto text-white/70 hover:text-white"
              >
                {copiedAddress ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              {getExplorerUrl('address', contractAddress) && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="p-1 h-auto text-white/70 hover:text-white"
                >
                  <a href={getExplorerUrl('address', contractAddress)!} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
            {isOwner ? (
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                Owner
              </Badge>
            ) : null}
          </div>
        </motion.div>
      </header>

      {!isConnected ? (
        <Card className="bg-black/50 border-white/10 p-8 text-center">
          <Wallet className="w-16 h-16 mx-auto mb-4 text-white/50" />
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-white/70 mb-6">Please connect your wallet to view your vesting information.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Main Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="bg-black/50 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-white/70">Total Allocation</CardTitle>
                    <Coins className="w-4 h-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {userTotalAmount > BigInt(0) ? parseFloat(formatUnits(userTotalAmount, (tokenDecimals as number) || 18)).toFixed(4) : '0'}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="bg-black/50 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-white/70">Claimed So Far</CardTitle>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {userTotalClaimed > BigInt(0) ? parseFloat(formatUnits(userTotalClaimed, (tokenDecimals as number) || 18)).toFixed(4) : '0'}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="bg-black/50 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-white/70">Claimable Now</CardTitle>
                    <Unlock className="w-4 h-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {claimableNow > BigInt(0) ? parseFloat(formatUnits(claimableNow, (tokenDecimals as number) || 18)).toFixed(4) : '0'}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="bg-black/50 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-white/70">Vesting Progress</CardTitle>
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-white">{vestingProgress}%</div>
                    <Progress value={vestingProgress} className="h-2 bg-white/10" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Claim Section */}
          {claimableNow > BigInt(0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    <Coins className="w-5 h-5 text-primary" />
                    Tokens Available to Claim
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-primary mb-2">
                        {parseFloat(formatUnits(claimableNow, (tokenDecimals as number) || 18)).toFixed(4)}
                      </p>
                      <p className="text-white/70">Tokens are ready to be claimed</p>
                    </div>
                    <Button
                      onClick={handleClaim}
                      disabled={isClaimPending || isClaimConfirming}
                      className="bg-primary hover:bg-primary/90 text-white px-6 py-3 text-lg"
                    >
                      {isClaimPending || isClaimConfirming ? (
                        <React.Fragment>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {isClaimConfirming ? 'Confirming...' : 'Claiming...'}
                        </React.Fragment>
                      ) : (
                        <React.Fragment>
                          Claim Tokens
                          <ArrowRight className="ml-2 w-5 h-5" />
                        </React.Fragment>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Detailed Information Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Tabs defaultValue="schedule" className="space-y-4">
              <TabsList className="bg-black/50 border border-white/10">
                <TabsTrigger value="schedule" className="data-[state=active]:bg-primary/20">
                  Vesting Schedule
                </TabsTrigger>
                <TabsTrigger value="contract" className="data-[state=active]:bg-primary/20">
                  Contract Info
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-primary/20">
                  Claim History
                </TabsTrigger>
                {isOwner ? (
                  <TabsTrigger value="admin" className="data-[state=active]:bg-primary/20">
                    <Shield className="w-4 h-4 mr-2" />
                    Admin Control
                  </TabsTrigger>
                ) : null}
              </TabsList>

              <TabsContent value="schedule">
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Vesting Schedule Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <span className="text-white/70 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            TGE Date
                          </span>
                          <span className="text-white font-medium">
                            {tgeTimestamp ? formatDate(Number(tgeTimestamp)) : 'Not set'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <span className="text-white/70 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            TGE Release
                          </span>
                          <span className="text-white font-medium">
                            {tgeRate ? `${Number(tgeRate) / 100}%` : '0%'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <span className="text-white/70 flex items-center gap-2">
                            <Timer className="w-4 h-4" />
                            Release Rate
                          </span>
                          <span className="text-white font-medium">
                            {releaseRate ? `${(Number(releaseRate) / 21600000000).toFixed(4)}% per period` : '0%'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <span className="text-white/70 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Next Vesting
                          </span>
                          <span className="text-white font-medium">
                            {nextVestingTime > 0 ? formatDate(nextVestingTime) : 'No upcoming vesting'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <span className="text-white/70 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Time Until Next
                          </span>
                          <span className="text-white font-medium">
                            {getTimeUntilNext(nextVestingTime)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <span className="text-white/70 flex items-center gap-2">
                            <Coins className="w-4 h-4" />
                            Next Vesting Amount
                          </span>
                          <span className="text-white font-medium">
                            {nextTotalVestingAmount > BigInt(0) 
                              ? parseFloat(formatUnits(nextTotalVestingAmount - claimedSoFar, (tokenDecimals as number) || 18)).toFixed(4)
                              : '0'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Vesting Timeline */}
                    <div className="mt-6 p-4 bg-white/5 rounded-lg">
                      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" />
                        Vesting Timeline
                      </h4>
                      <div className="relative">
                        <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-white/20"></div>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </div>
                            <div>
                              <p className="text-white font-medium">TGE</p>
                              <p className="text-white/50 text-sm">
                                {tgeRate && tgeTimestamp && Date.now() / 1000 > Number(tgeTimestamp) ? `${Number(tgeRate) / 100}% released` : 'Pending'}
                              </p>
                            </div>
                          </div>

                          {vestingProgress > 0 && vestingProgress < 100 && (
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center animate-pulse">
                                <div className="w-2 h-2 rounded-full bg-primary"></div>
                              </div>
                              <div>
                                <p className="text-white font-medium">In Progress</p>
                                <p className="text-white/50 text-sm">{vestingProgress}% vested</p>
                              </div>
                            </div>
                          )}

                          {vestingProgress >= 100 ? (
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                                <Unlock className="w-4 h-4 text-green-500" />
                              </div>
                              <div>
                                <p className="text-white font-medium">Fully Vested</p>
                                <p className="text-white/50 text-sm">100% unlocked</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center">
                                <Lock className="w-4 h-4 text-white/50" />
                              </div>
                              <div>
                                <p className="text-white font-medium">Fully Vested</p>
                                <p className="text-white/50 text-sm">Pending completion</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contract">
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Info className="w-5 h-5 text-primary" />
                      Contract Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-white/70">Token Address</span>
                        <div className="flex items-center gap-2">
                          {tokenAddress ? (
                            <React.Fragment>
                              <code className="bg-white/10 px-2 py-1 rounded text-sm font-mono text-white">
                                {(tokenAddress as string).slice(0, 6)}...{(tokenAddress as string).slice(-4)}
                              </code>
                              {getExplorerUrl('address', tokenAddress as string) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  className="p-1 h-auto text-white/70 hover:text-white"
                                >
                                  <a href={getExplorerUrl('address', tokenAddress as string)!} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </Button>
                              )}
                            </React.Fragment>
                          ) : (
                            <span className="text-white/50">Not set</span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-white/70">Contract Owner</span>
                        <div className="flex items-center gap-2">
                          {owner ? (
                            <React.Fragment>
                              <code className="bg-white/10 px-2 py-1 rounded text-sm font-mono text-white">
                                {(owner as string).slice(0, 6)}...{(owner as string).slice(-4)}
                              </code>
                              {isOwner ? (
                                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                                  {'You'}
                                </Badge>
                              ) : null}
                            </React.Fragment>
                          ) : (
                            <span className="text-white/50">Not set</span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-white/70">Total Locked</span>
                        <span className="text-white font-medium">
                          {totalLocked ? parseFloat(formatUnits(totalLocked as bigint, (tokenDecimals as number) || 18)).toFixed(4) : '0'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-white/70">Your Allocation</span>
                        <span className="text-white font-medium">
                          {userTotalAmount > BigInt(0) ? parseFloat(formatUnits(userTotalAmount, (tokenDecimals as number) || 18)).toFixed(4) : '0'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-white/70">Vesting Period</span>
                        <span className="text-white font-medium">
                          {period ? `${Number(period) / 86400} days` : 'Not set'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card className="bg-black/50 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Claim History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingHistory ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-white/70">Loading claim history...</p>
                      </div>
                    ) : claimHistory.length > 0 ? (
                      <div className="space-y-3">
                        {claimHistory.map((claim) => (
                          <div key={claim.transactionHash} className="p-4 bg-white/5 rounded-lg border border-white/10">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="text-white font-medium mb-1">
                                  Claimed {parseFloat(claim.claimedAmount).toFixed(4)} tokens
                                </p>
                                <p className="text-white/50 text-sm">
                                  {formatDate(claim.timestamp)}
                                </p>
                              </div>
                              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                                Successful
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-white/70">Total Claimed After</span>
                                <span className="text-white">{parseFloat(claim.totalClaimed).toFixed(4)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-white/70">Progress</span>
                                <span className="text-white">
                                  {((parseFloat(claim.totalClaimed) / parseFloat(claim.totalAmount)) * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-white/70">Transaction</span>
                                <div className="flex items-center gap-1">
                                  <code className="text-primary text-xs">
                                    {claim.transactionHash.slice(0, 6)}...{claim.transactionHash.slice(-4)}
                                  </code>
                                  {getExplorerUrl('tx', claim.transactionHash) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      asChild
                                      className="p-0.5 h-auto text-white/70 hover:text-white"
                                    >
                                      <a href={getExplorerUrl('tx', claim.transactionHash)!} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-white/70">Block</span>
                                <span className="text-white/50">#{claim.blockNumber.toString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="w-12 h-12 mx-auto mb-4 text-white/30" />
                        <p className="text-white/70">No claim history yet</p>
                        <p className="text-white/50 text-sm mt-2">
                          Your claims will appear here after you claim tokens
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {isOwner ? (
                <TabsContent value="admin">
                  <Card className="bg-black/50 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Admin Control Panel
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <Alert className="bg-primary/10 border-primary/30">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-white">Admin Access</AlertTitle>
                        <AlertDescription className="text-white/70">
                          You have owner privileges for this vesting contract. Use these tools to manage token allocations.
                        </AlertDescription>
                      </Alert>

                      {/* Deposit Tokens */}
                      <div className="space-y-4">
                        <h3 className="text-white font-medium flex items-center gap-2">
                          <Coins className="w-4 h-4 text-primary" />
                          Deposit Tokens
                        </h3>
                        <p className="text-white/60 text-sm">
                          Transfer tokens from your wallet to the vesting contract for distribution
                        </p>
                        <div className="flex gap-4">
                          <div className="flex-1 space-y-2">
                            <Label htmlFor="deposit-amount" className="text-white/70">Amount to Deposit</Label>
                            <div className="flex gap-2">
                              <Input
                                id="deposit-amount"
                                placeholder="Enter amount"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                              />
                              <div className="flex items-center px-3 bg-white/5 border border-white/10 rounded-md">
                                <span className="text-white/70 text-sm whitespace-nowrap">
                                  {(tokenSymbol as string) || 'Tokens'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={handleDepositTokens}
                            disabled={!depositAmount || isDepositPending || isDepositConfirming}
                            className="self-end"
                          >
                            {isDepositPending || isDepositConfirming ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Deposit Tokens'
                            )}
                          </Button>
                        </div>
                        {tokenBalance !== undefined && (
                          <p className="text-white/60 text-xs">
                            Contract Balance: {parseFloat(formatUnits(tokenBalance as bigint, (tokenDecimals as number) || 18)).toFixed(4)} {(tokenSymbol as string) || 'tokens'}
                          </p>
                        )}
                      </div>

                      <Separator className="bg-white/10" />

                      {/* Single User Lock */}
                      <div className="space-y-4">
                        <h3 className="text-white font-medium flex items-center gap-2">
                          <UserPlus className="w-4 h-4 text-primary" />
                          Lock Tokens for Single User
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="user-address" className="text-white/70">User Address</Label>
                            <Input
                              id="user-address"
                              placeholder="0x..."
                              value={singleLockAddress}
                              onChange={(e) => setSingleLockAddress(e.target.value)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lock-amount" className="text-white/70">Amount (tokens)</Label>
                            <Input
                              id="lock-amount"
                              type="number"
                              placeholder="1000"
                              value={singleLockAmount}
                              onChange={(e) => setSingleLockAmount(e.target.value)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                            />
                          </div>
                        </div>
                        <Button
                          onClick={handleLockToUser}
                          disabled={isLockToUserPending || isLockToUserConfirming}
                          className="bg-primary hover:bg-primary/90 text-white"
                        >
                          {isLockToUserPending || isLockToUserConfirming ? (
                            <React.Fragment>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Locking...
                            </React.Fragment>
                          ) : (
                            <React.Fragment>
                              <Lock className="w-4 h-4 mr-2" />
                              Lock Tokens
                            </React.Fragment>
                          )}
                        </Button>
                      </div>

                      <div className="border-t border-white/10 pt-6">
                        <h3 className="text-white font-medium flex items-center gap-2 mb-4">
                          <Users className="w-4 h-4 text-primary" />
                          Batch Lock Tokens for Multiple Users
                        </h3>
                        
                        <div className="space-y-4">
                          <div className="flex gap-4 items-end">
                            <Button
                              variant="outline"
                              onClick={downloadCSVTemplate}
                              className="border-white/10 text-white hover:bg-white/10"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download Template
                            </Button>
                            <div>
                              <Input
                                id="csv-upload"
                                type="file"
                                accept=".csv"
                                onChange={handleCSVUpload}
                                className="hidden"
                              />
                              <Button
                                variant="outline"
                                onClick={() => document.getElementById('csv-upload')?.click()}
                                className="border-white/10 text-white hover:bg-white/10"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload CSV
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="batch-data" className="text-white/70">
                              Batch Data (address,amount per line)
                            </Label>
                            <Textarea
                              id="batch-data"
                              placeholder="0x123...,1000
0x456...,2000
0x789...,1500"
                              value={batchLockData}
                              onChange={(e) => {
                                setBatchLockData(e.target.value)
                                setBatchErrors([]) // Clear errors when user types
                              }}
                              rows={6}
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-sm"
                            />
                            <p className="text-white/50 text-sm">
                              Enter one allocation per line: address,amount (in {(tokenSymbol as string) || 'tokens'}, not wei)
                            </p>
                            {batchErrors.length > 0 && (
                              <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <p className="text-red-400 text-sm font-medium mb-1">Validation Errors:</p>
                                <ul className="list-disc list-inside text-red-300 text-xs space-y-1">
                                  {batchErrors.slice(0, 5).map((error, i) => (
                                    <li key={i}>{error}</li>
                                  ))}
                                  {batchErrors.length > 5 && (
                                    <li>...and {batchErrors.length - 5} more errors</li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>

                          <Button
                            onClick={processBatchData}
                            disabled={isLockMultiplePending || isLockMultipleConfirming || !batchLockData.trim()}
                            className="bg-primary hover:bg-primary/90 text-white"
                          >
                            {isLockMultiplePending || isLockMultipleConfirming ? (
                              <React.Fragment>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Processing Batch...
                              </React.Fragment>
                            ) : (
                              <React.Fragment>
                                <Users className="w-4 h-4 mr-2" />
                                Lock Tokens (Batch)
                              </React.Fragment>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Contract Stats for Admin */}
                      <div className="border-t border-white/10 pt-6">
                        <h3 className="text-white font-medium mb-4">Contract Statistics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-3 bg-white/5 rounded-lg">
                            <p className="text-white/70 text-sm mb-1">Total Locked</p>
                            <p className="text-white font-medium">
                              {totalLocked ? parseFloat(formatUnits(totalLocked as bigint, (tokenDecimals as number) || 18)).toFixed(4) : '0'} {(tokenSymbol as string) || 'tokens'}
                            </p>
                          </div>
                          <div className="p-3 bg-white/5 rounded-lg">
                            <p className="text-white/70 text-sm mb-1">Max Supply</p>
                            <p className="text-white font-medium">
                              {maxTokensToLock ? parseFloat(formatUnits(maxTokensToLock as bigint, (tokenDecimals as number) || 18)).toFixed(4) : '0'} {(tokenSymbol as string) || 'tokens'}
                            </p>
                          </div>
                          <div className="p-3 bg-white/5 rounded-lg">
                            <p className="text-white/70 text-sm mb-1">Available to Lock</p>
                            <p className="text-white font-medium">
                              {maxTokensToLock && totalLocked 
                                ? parseFloat(formatUnits((maxTokensToLock as bigint) - (totalLocked as bigint), (tokenDecimals as number) || 18)).toFixed(4) 
                                : '0'} {(tokenSymbol as string) || 'tokens'}
                            </p>
                          </div>
                        </div>
                        {tokenBalance ? (
                          <div className="mt-4 p-3 bg-white/5 rounded-lg">
                            <p className="text-white/70 text-sm mb-1">Contract Token Balance</p>
                            <p className="text-white font-medium">
                              {parseFloat(formatUnits(tokenBalance as bigint, (tokenDecimals as number) || 18)).toFixed(4)} {(tokenSymbol as string) || 'tokens'}
                            </p>
                            {(tokenBalance as bigint) < ((maxTokensToLock as bigint) || BigInt(0)) && (
                              <p className="text-yellow-400 text-xs mt-1">
                                ⚠️ Contract balance is less than max supply. Ensure sufficient tokens are transferred.
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>

                      {/* Batch Confirmation Dialog */}
                      {showBatchConfirmation && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                          <div className="bg-black/90 border border-white/10 rounded-lg p-6 max-w-md w-full mx-4">
                            <h3 className="text-white font-bold text-lg mb-4">Confirm Batch Lock</h3>
                            <div className="space-y-3 mb-6">
                              <div className="p-3 bg-white/5 rounded">
                                <p className="text-white/70 text-sm">Number of Recipients</p>
                                <p className="text-white font-medium">{pendingBatchData.addresses.length}</p>
                              </div>
                              <div className="p-3 bg-white/5 rounded">
                                <p className="text-white/70 text-sm">Total Amount</p>
                                <p className="text-white font-medium">
                                  {formatUnits(pendingBatchData.totalInWei, (tokenDecimals as number) || 18)} {(tokenSymbol as string) || 'tokens'}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <Button
                                onClick={executeBatchLock}
                                disabled={isLockMultiplePending || isLockMultipleConfirming}
                                className="flex-1 bg-primary hover:bg-primary/90 text-white"
                              >
                                {isLockMultiplePending || isLockMultipleConfirming ? 'Processing...' : 'Confirm'}
                              </Button>
                              <Button
                                onClick={() => setShowBatchConfirmation(false)}
                                variant="outline"
                                className="flex-1 border-white/10 text-white hover:bg-white/10"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              ) : null}
            </Tabs>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="flex gap-4 justify-center"
          >
            <Button
              variant="outline"
              asChild
              className="border-white/10 text-white hover:bg-white/10"
            >
              <Link href="/">
                Back to Home
              </Link>
            </Button>
            {getExplorerUrl('address', contractAddress) && (
              <Button
                variant="outline"
                asChild
                className="border-white/10 text-white hover:bg-white/10"
              >
                <a href={getExplorerUrl('address', contractAddress)!} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Explorer
                </a>
              </Button>
            )}
          </motion.div>
        </div>
      )}
    </div>
  )
}