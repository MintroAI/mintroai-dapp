"use client"

import * as React from "react"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { VestingFormValues } from "./vesting-creation-form"
import { X, Calendar, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { format } from "date-fns"

interface VestingConfirmationDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  formData: VestingFormValues
  deploymentStatus: 'idle' | 'creating' | 'compiling' | 'pricing' | 'deploying' | 'success' | 'error'
}

function ValueDisplay({ value, symbol }: { value: string | number, symbol?: string }) {
  return (
    <span className="font-medium">
      {value}{symbol}
    </span>
  )
}

function VestingTypeDisplay({ type }: { type: "daily" | "monthly" }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/20">
      {type === "daily" ? "Daily Linear Vesting" : "Monthly Linear Vesting"}
    </span>
  )
}

export function VestingConfirmationDialog({
  isOpen,
  onConfirm,
  onCancel,
  formData,
  deploymentStatus
}: VestingConfirmationDialogProps) {
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
            <span className="text-sm">Getting Price...</span>
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
          <span className="text-sm">Create Vesting Schedule</span>
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
              <Calendar className="w-7 h-7 text-primary" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
              Confirm Vesting Schedule
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-white/70 text-sm">
              You are about to create a new vesting schedule with the following parameters:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-3 space-y-2">
            <div className="bg-white/5 rounded-lg p-3 space-y-2.5">
              {/* Project Details */}
              <div className="space-y-2">
                <div className="text-sm text-white/50">Project Details</div>
                <div className="space-y-1">
                  <div className="text-xs text-white/50">Project Name</div>
                  <ValueDisplay value={formData.projectName} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-white/50">Token Contract Address</div>
                    <div className="font-medium font-mono text-xs break-all">
                      {formData.tokenContractAddress}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-white/50">Token Decimals</div>
                    <ValueDisplay value={formData.tokenDecimals} />
                  </div>
                </div>
              </div>

              {/* TGE Details */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="text-sm text-white/50">TGE Details</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-white/50">TGE Date & Time (UTC)</div>
                    {formData.vestingTGE ? (
                      (() => {
                        const utcDate = new Date(formData.vestingTGE);
                        const formattedDate = format(utcDate, "PPP");
                        const utcHours = utcDate.getUTCHours().toString().padStart(2, '0');
                        const utcMinutes = utcDate.getUTCMinutes().toString().padStart(2, '0');
                        return (
                          <span className="font-medium">
                            {formattedDate} {utcHours}:{utcMinutes} UTC
                          </span>
                        );
                      })()
                    ) : (
                      <span className="font-medium">Not set</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-white/50">TGE Release</div>
                    <span className="font-medium text-primary">
                      {formData.tgeReleasePercentage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Vesting Configuration */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="text-sm text-white/50">Vesting Configuration</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-white/50">Cliff Period</div>
                    <ValueDisplay value={formData.cliffMonths} symbol=" months" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-white/50">Release Period</div>
                    <ValueDisplay value={formData.releaseMonthsCount} symbol=" months" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-white/50">Vesting Type</div>
                    <VestingTypeDisplay type={formData.vestingType} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-white/50">Total Amount</div>
                    <ValueDisplay value={formData.totalVestingAmount} />
                  </div>
                </div>
              </div>

              {/* Vesting Recipients */}
              {formData.vestingUsers && formData.vestingUsers.length > 0 && (
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <div className="text-sm text-white/50">Recipients ({formData.vestingUsers.length})</div>
                  </div>
                  <div className="space-y-2 max-h-24 overflow-y-auto">
                    {formData.vestingUsers.map((user, index) => (
                      <div key={index} className="bg-white/5 rounded p-2 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-white/70">#{index + 1}</span>
                          <span className="text-primary font-medium">{user.amount}</span>
                        </div>
                        <div className="text-white/50 font-mono text-xs break-all">{user.address}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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