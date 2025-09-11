"use client"

import * as React from "react"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { TokenFormValues } from "./token-creation-form"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface TokenConfirmationDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  formData: TokenFormValues
  deploymentStatus: 'idle' | 'creating' | 'compiling' | 'pricing' | 'deploying' | 'success' | 'error'
}

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-xs font-medium",
      enabled 
        ? "bg-primary/20 text-primary border border-primary/20" 
        : "bg-red-500/10 text-red-400 border border-red-500/20"
    )}>
      {enabled ? 'Enabled' : 'Disabled'}
    </span>
  )
}

function ValueDisplay({ value, symbol }: { value: string | number, symbol?: string }) {
  return (
    <span className="font-medium">
      {value}{symbol}
    </span>
  )
}

export function TokenConfirmationDialog({
  isOpen,
  onConfirm,
  onCancel,
  formData,
  deploymentStatus
}: TokenConfirmationDialogProps) {
  const getButtonContent = () => {
    switch (deploymentStatus) {
      case 'creating':
        return (
          <div className="flex items-center justify-center gap-2 w-full">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-sm">Creating...</span>
          </div>
        )
      case 'compiling':
        return (
          <div className="flex items-center justify-center gap-2 w-full">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-sm">Compiling...</span>
          </div>
        )
      case 'pricing':
        return (
          <div className="flex items-center justify-center gap-2 w-full">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-sm">Calculating Price...</span>
          </div>
        )
      case 'deploying':
        return (
          <div className="flex items-center justify-center gap-2 w-full">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-sm">Deploying...</span>
          </div>
        )
      case 'success':
        return (
          <div className="flex items-center justify-center gap-2 w-full text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm">Success!</span>
          </div>
        )
      case 'error':
        return (
          <div className="flex items-center justify-center gap-2 w-full text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-sm">Failed</span>
          </div>
        )
      default:
        return (
          <span className="text-sm">Create Token</span>
        )
    }
  }

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className={cn(
        "bg-black/90 border-white/10 backdrop-blur-xl text-white",
        "w-[90vw] md:w-[400px]",
        "p-3",
        "rounded-lg",
        "overflow-auto",
        "min-h-[200px]",
        "max-h-[90vh]"
      )}>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          <button
            onClick={onCancel}
            className="absolute right-3 top-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4 text-white" />
            <span className="sr-only">Close</span>
          </button>

          <AlertDialogHeader className="space-y-2">
            <div className="mx-auto w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <AlertDialogTitle className="text-lg font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
              Confirm Token Creation
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-white/70 text-sm">
              You are about to create a new token with the following parameters:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-3 space-y-2">
            <div className="bg-white/5 rounded-lg p-3 space-y-2.5">
              {/* Basic Details */}
              <div className="space-y-2">
                <div className="text-sm text-white/50">Basic Details</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-white/50">Token Name</div>
                    <ValueDisplay value={formData.name} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-white/50">Symbol</div>
                    <ValueDisplay value={formData.symbol} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-white/50">Initial Supply</div>
                    <ValueDisplay value={formData.initialSupply} symbol={` ${formData.symbol}`} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-white/50">Decimals</div>
                    <ValueDisplay value={formData.decimals} />
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="text-sm text-white/50">Features</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'mintable', label: 'Mintable' },
                    { key: 'burnable', label: 'Burnable' },
                    { key: 'pausable', label: 'Pausable' },
                    { key: 'blacklist', label: 'Blacklist' },
                    { key: 'antiBot', label: 'Anti-Bot' }
                  ].map(({ key, label }) => (
                    <span
                      key={key}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs flex items-center gap-2",
                        formData[key as keyof TokenFormValues]
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-white/5 text-white/40 border border-white/10"
                      )}
                    >
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        formData[key as keyof TokenFormValues]
                          ? "bg-primary"
                          : "bg-white/20"
                      )} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Transaction Limits */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="text-sm text-white/50">Transaction Limits</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-white/50">Max Transaction</div>
                    <StatusBadge enabled={formData.maxTx} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-white/50">Max Amount</div>
                    <ValueDisplay value={formData.maxTxAmount} symbol={` ${formData.symbol}`} />
                  </div>
                </div>
              </div>

              {/* Taxes */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="text-sm text-white/50">Taxes</div>
                <div className="space-y-1">
                  <div className="text-xs text-white/50">Transfer Tax</div>
                  <ValueDisplay value={`${formData.transferTax}%`} />
                </div>
              </div>

              {/* Security Settings */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="text-sm text-white/50">Security Settings</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-white/50">Anti-Bot</div>
                    <StatusBadge enabled={formData.antiBot} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-white/50">Cooldown</div>
                    <ValueDisplay value={`${formData.cooldownTime}s`} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <AlertDialogFooter className="mt-3 flex gap-2">
            <button
              onClick={onCancel}
              className={cn(
                "flex-1 min-w-[140px] bg-white/5 hover:bg-white/10 text-white",
                "font-medium py-2.5 rounded-lg transition-colors text-sm"
              )}
              disabled={deploymentStatus !== 'idle' && deploymentStatus !== 'error'}
            >
              {deploymentStatus === 'error' ? 'Close' : 'Cancel'}
            </button>
            <button
              onClick={onConfirm}
              className={cn(
                "flex-1 min-w-[140px] py-2.5 rounded-lg font-medium transition-colors text-sm",
                deploymentStatus === 'success' 
                  ? "bg-green-500 hover:bg-green-600" 
                  : deploymentStatus === 'error'
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-primary hover:bg-primary/90",
                "text-white"
              )}
              disabled={deploymentStatus !== 'idle' && deploymentStatus !== 'error'}
            >
              {getButtonContent()}
            </button>
          </AlertDialogFooter>
        </motion.div>
      </AlertDialogContent>
    </AlertDialog>
  )
} 