import * as React from "react"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import confetti from 'canvas-confetti'
import { useChainId } from 'wagmi'
import { type Chain, arbitrum, bsc, bscTestnet, auroraTestnet } from 'viem/chains'
import { hyperEVM } from '@/config/customChains'
import { ExternalLink, Copy, Calendar, Users, Clock } from 'lucide-react'
import { VestingFormValues } from "./vesting-creation-form"
import { format } from "date-fns"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface VestingSuccessDialogProps {
  isOpen: boolean
  onCreateAnother: () => void
  contractAddress: string
  transactionHash: string
  formData: VestingFormValues
}

export function VestingSuccessDialog({
  isOpen,
  onCreateAnother,
  contractAddress,
  transactionHash,
  formData
}: VestingSuccessDialogProps) {
  const chainId = useChainId()
  const router = useRouter()

  // Get block explorer URL based on chain
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

  const contractExplorerUrl = getExplorerUrl('address', contractAddress)

  // Confetti animation on dialog open
  React.useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })
    }
  }, [isOpen])

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${type} copied to clipboard!`)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      toast.error(`Failed to copy ${type.toLowerCase()}`)
    }
  }

  const formatTGEDate = (dateString: string) => {
    const utcDate = new Date(dateString)
    const formattedDate = format(utcDate, "PPP")
    const utcHours = utcDate.getUTCHours().toString().padStart(2, '0')
    const utcMinutes = utcDate.getUTCMinutes().toString().padStart(2, '0')
    return `${formattedDate} ${utcHours}:${utcMinutes} UTC`
  }

  const handleGoToDashboard = () => {
    router.push(`/vesting-dashboard?address=${contractAddress}`)
  }

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="bg-black/90 border-white/10 backdrop-blur-xl text-white p-6 w-[90vw] md:w-[600px] max-h-[90vh] overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AlertDialogHeader className="space-y-3">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <AlertDialogTitle className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-400">
              Vesting Contract Created!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-white/70">
              Your vesting schedule has been successfully deployed to the blockchain!
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-6 space-y-6">
            {/* Contract Information */}
            <div className="bg-white/5 rounded-lg p-4 space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Contract Details
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Contract Address:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-white/10 px-2 py-1 rounded text-sm font-mono">
                      {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(contractAddress, 'Contract address')}
                      className="p-1 h-auto text-white/70 hover:text-white"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white/70">Transaction Hash:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-white/10 px-2 py-1 rounded text-sm font-mono">
                      {transactionHash.slice(0, 6)}...{transactionHash.slice(-4)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(transactionHash, 'Transaction hash')}
                      className="p-1 h-auto text-white/70 hover:text-white"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {contractExplorerUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full border-white/10 text-white hover:bg-white/10"
                  >
                    <a href={contractExplorerUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Contract on Explorer
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Vesting Schedule Summary */}
            <div className="bg-white/5 rounded-lg p-4 space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Vesting Schedule Summary
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div>
                    <span className="text-white/70">Project:</span>
                    <div className="font-medium">{formData.projectName}</div>
                  </div>
                  <div>
                    <span className="text-white/70">Total Amount:</span>
                    <div className="font-medium text-primary">{formData.totalVestingAmount}</div>
                  </div>
                  <div>
                    <span className="text-white/70">TGE Release:</span>
                    <div className="font-medium">{formData.tgeReleasePercentage}%</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-white/70">TGE Date:</span>
                    <div className="font-medium">{formatTGEDate(formData.vestingTGE)}</div>
                  </div>
                  <div>
                    <span className="text-white/70">Cliff Period:</span>
                    <div className="font-medium">{formData.cliffMonths} months</div>
                  </div>
                  <div>
                    <span className="text-white/70">Vesting Period:</span>
                    <div className="font-medium">{formData.releaseMonthsCount} months ({formData.vestingType})</div>
                  </div>
                </div>
              </div>

              {formData.vestingUsers && formData.vestingUsers.length > 0 && (
                <div className="pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-white/70">Recipients: {formData.vestingUsers.length}</span>
                  </div>
                  <div className="text-xs text-white/50">
                    {formData.vestingUsers.length} wallet{formData.vestingUsers.length !== 1 ? 's' : ''} will receive tokens according to this vesting schedule
                  </div>
                </div>
              )}
            </div>
          </div>

          <AlertDialogFooter className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={onCreateAnother}
              className="flex-1 border-white/10 text-white hover:bg-white/10"
            >
              Create Another Vesting
            </Button>
            <Button
              onClick={handleGoToDashboard}
              className="flex-1 bg-primary hover:bg-primary/90 text-white"
            >
              Go to Dashboard
            </Button>
          </AlertDialogFooter>
        </motion.div>
      </AlertDialogContent>
    </AlertDialog>
  )
} 