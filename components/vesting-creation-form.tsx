"use client"

import * as React from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { motion } from "framer-motion"
import { Calendar as CalendarIcon, Clock, Users, Trash2, Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { VestingConfirmationDialog } from "./vesting-confirmation-dialog"
import { useSession } from "@/hooks/useSession"
import { useAccount } from 'wagmi'
import { useTokenDeploy } from '@/hooks/useTokenDeploy'

const vestingFormSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  tokenContractAddress: z.string().min(42, "Valid contract address is required").max(42, "Invalid contract address"),
  tokenDecimals: z.number().min(0).max(18),
  vestingTGE: z.string().min(1, "TGE date and time (UTC) is required").refine((val) => {
    const date = new Date(val);
    return date > new Date();
  }, "TGE date must be in the future (UTC)"),
  tgeReleasePercentage: z.number().min(0).max(100),
  cliffMonths: z.number().min(0).max(60),
  vestingType: z.enum(["daily", "monthly"]),
  releaseMonthsCount: z.number().min(1).max(120),
  totalVestingAmount: z.string().min(1, "Total vesting amount is required"),
  vestingUsers: z.array(z.object({
    address: z.string().min(42, "Valid wallet address is required").max(42, "Invalid wallet address"),
    amount: z.string().min(1, "Amount is required")
  })).optional()
})

export type VestingFormValues = z.infer<typeof vestingFormSchema>

export function VestingCreationForm() {
  const { sessionId } = useSession()
  const { address } = useAccount()
  const { deploy, isPending, isWaiting, isSuccess, error, hash, receipt } = useTokenDeploy()
  
  const [showConfirmation, setShowConfirmation] = React.useState(false)
  const [deploymentStatus, setDeploymentStatus] = React.useState<'idle' | 'creating' | 'compiling' | 'deploying' | 'success' | 'error'>('idle')
  const [formData, setFormData] = React.useState<VestingFormValues | null>(null)

  const form = useForm<VestingFormValues>({
    resolver: zodResolver(vestingFormSchema),
    defaultValues: {
      projectName: "",
      tokenContractAddress: "",
      tokenDecimals: 18,
      vestingTGE: "",
      tgeReleasePercentage: 10,
      cliffMonths: 6,
      vestingType: "monthly",
      releaseMonthsCount: 24,
      totalVestingAmount: "",
      vestingUsers: []
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "vestingUsers"
  })

  const addVestingUser = () => {
    append({ address: "", amount: "" })
  }

  // useEffect to track deployment status
  React.useEffect(() => {
    if (isPending || isWaiting) {
      setDeploymentStatus('deploying')
    } else if (isSuccess && receipt) {
      setDeploymentStatus('success')
      const deployedAddr = receipt.logs[0].address
      console.log('Transaction hash:', hash)
      console.log('Deployed vesting contract address:', deployedAddr)
      
      // Reset form after successful creation
      setTimeout(() => {
        setShowConfirmation(false)
        setDeploymentStatus('idle')
        setFormData(null)
        form.reset()
      }, 2000)
    } else if (error) {
      setDeploymentStatus('error')
    }
  }, [isPending, isWaiting, isSuccess, error, hash, receipt, form])

  const onSubmit = async (values: VestingFormValues) => {
    if (!address) {
      console.error('Please connect your wallet first');
      return;
    }
    
    setFormData(values)
    setShowConfirmation(true)
  }

  const handleConfirm = async () => {
    if (!formData || !address) return

    try {
      // Contract Creation
      setDeploymentStatus('creating')
      
      // Convert form data to API format
      const users = formData.vestingUsers?.map(user => user.address) || []
      const amts = formData.vestingUsers?.map(user => parseInt(user.amount)) || []
      
      // Parse TGE date to seconds timestamp for blockchain
      const tgeDate = new Date(formData.vestingTGE);
      const tgeTimestamp = Math.floor(tgeDate.getTime() / 1000);
      
      const contractData = {
        contractType: 'vesting' as const,
        chatId: sessionId,
        contractName: formData.projectName,
        tokenAddress: formData.tokenContractAddress,
        tgeTimestamp: tgeTimestamp,
        tgeRate: formData.tgeReleasePercentage,
        cliff: formData.cliffMonths,
        releaseRate: formData.releaseMonthsCount,
        period: formData.vestingType === 'daily' ? 1 : 30, // 1 day or 30 days
        vestingSupply: parseInt(formData.totalVestingAmount),
        decimals: formData.tokenDecimals,
        users,
        amts,
      };

      console.log('Contract data:', contractData);

      // 1. Contract Creation
      const createResponse = await fetch('/api/create-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contractData),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create vesting contract');
      }

      const createData = await createResponse.json();
      console.log('Vesting contract created:', createData);

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
        throw new Error('Failed to compile vesting contract');
      }

      const compileData = await compileResponse.json();
      console.log('Vesting contract compiled:', compileData);

      // 3. Deploy contract
      const deployResponse = await deploy(compileData.bytecode);
      console.log('Vesting contract deployed:', deployResponse);


    } catch (error) {
      console.error('Vesting creation error:', error)
      setDeploymentStatus('error')
    }
  }

  const handleCancel = () => {
    setShowConfirmation(false)
    setDeploymentStatus('idle')
    setFormData(null)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-8">
        <div className="space-y-6">
          <div className="flex items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarIcon className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-white">Vesting Schedule</h2>
            </div>
          </div>

          {/* Basic Information */}
          <motion.div
            className="grid gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Project Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My Amazing Project"
                      {...field}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30
                        focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tokenContractAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Token Contract Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0x..."
                        {...field}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30
                          focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 font-mono"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tokenDecimals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Token Decimals</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="18"
                        value={field.value.toString()}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30
                          focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vestingTGE"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">TGE Date & Time (UTC)</FormLabel>
                    <FormControl>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10",
                              !field.value && "text-white/50"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              (() => {
                                const utcDate = new Date(field.value);
                                const formattedDate = format(utcDate, "PPP");
                                const utcHours = utcDate.getUTCHours().toString().padStart(2, '0');
                                const utcMinutes = utcDate.getUTCMinutes().toString().padStart(2, '0');
                                return `${formattedDate} ${utcHours}:${utcMinutes} UTC`;
                              })()
                            ) : (
                              <span>Pick a date & time</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-black/90 border-white/10" align="start">
                          <div className="p-3 space-y-3">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date: Date | undefined) => {
                                if (date) {
                                  // UTC time
                                  const utcDate = new Date(Date.UTC(
                                    date.getFullYear(),
                                    date.getMonth(), 
                                    date.getDate(),
                                    0, // Hour
                                    0  // Minute
                                  ));
                                  
                                  if (field.value) {
                                    const currentTime = new Date(field.value);
                                    utcDate.setUTCHours(currentTime.getUTCHours());
                                    utcDate.setUTCMinutes(currentTime.getUTCMinutes());
                                  }
                                  
                                  field.onChange(utcDate.toISOString());
                                }
                              }}
                              disabled={(date) => {
                                // Disable past dates, today is not included
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return date < today;
                              }}
                              initialFocus
                              className="bg-transparent"
                            />
                            <div className="border-t border-white/10 pt-3">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" />
                                <span className="text-sm text-white">Time (UTC):</span>
                              </div>
                              <div className="flex gap-2 mt-2">
                                <Select
                                  value={field.value ? new Date(field.value).getUTCHours().toString().padStart(2, '0') : "00"}
                                  onValueChange={(hour) => {
                                    const date = field.value ? new Date(field.value) : new Date()
                                    date.setUTCHours(parseInt(hour))
                                    field.onChange(date.toISOString())
                                  }}
                                >
                                  <SelectTrigger className="w-20 bg-white/5 border-white/10 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-black/90 border-white/10 max-h-40">
                                    {Array.from({ length: 24 }, (_, i) => (
                                      <SelectItem key={i} value={i.toString().padStart(2, '0')} className="text-white focus:text-white focus:bg-white/10">
                                        {i.toString().padStart(2, '0')}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <span className="text-white self-center">:</span>
                                <Select
                                  value={field.value ? new Date(field.value).getUTCMinutes().toString().padStart(2, '0') : "00"}
                                  onValueChange={(minute) => {
                                    const date = field.value ? new Date(field.value) : new Date()
                                    date.setUTCMinutes(parseInt(minute))
                                    field.onChange(date.toISOString())
                                  }}
                                >
                                  <SelectTrigger className="w-20 bg-white/5 border-white/10 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-black/90 border-white/10 max-h-40">
                                    {Array.from({ length: 60 }, (_, i) => (
                                      <SelectItem key={i} value={i.toString().padStart(2, '0')} className="text-white focus:text-white focus:bg-white/10">
                                        {i.toString().padStart(2, '0')}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    <div className="text-xs text-white/40 mt-1 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Current UTC: {new Date().toISOString().replace('T', ' ').slice(0, 16)}
                    </div>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tgeReleasePercentage"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel className="text-white">TGE Release Percentage (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={value.toString()}
                        onChange={(e) => onChange(Number(e.target.value))}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30
                          focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="totalVestingAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Total Vesting Amount</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1000000"
                      {...field}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30
                        focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
          </motion.div>

          <Separator className="bg-white/10" />

          {/* Vesting Configuration */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="vesting-config" className="border-white/10">
              <AccordionTrigger className="text-white hover:text-primary">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Vesting Configuration
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cliffMonths"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel className="text-white">Cliff Period (Months)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="120"
                            value={value.toString()}
                            onChange={(e) => onChange(Number(e.target.value))}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30
                              focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vestingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Vesting Frequency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                              <SelectValue placeholder="Select vesting type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-black/90 border-white/10">
                            <SelectItem value="daily" className="text-white focus:text-white focus:bg-white/10">
                              Daily Linear Vesting
                            </SelectItem>
                            <SelectItem value="monthly" className="text-white focus:text-white focus:bg-white/10">
                              Monthly Linear Vesting
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="releaseMonthsCount"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel className="text-white">Total Release Period (Months)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="120"
                          value={value.toString()}
                          onChange={(e) => onChange(Number(e.target.value))}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30
                            focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Vesting Users */}
            <AccordionItem value="vesting-users" className="border-white/10">
              <AccordionTrigger className="text-white hover:text-primary">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Vesting Recipients ({fields.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-medium">Recipient #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`vestingUsers.${index}.address`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Wallet Address</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="0x..."
                                  {...field}
                                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30
                                    focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 font-mono text-sm"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`vestingUsers.${index}.amount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Amount</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="100000"
                                  {...field}
                                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30
                                    focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </motion.div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addVestingUser}
                    className="w-full border-white/10 text-white hover:bg-white/5 hover:border-primary/50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Vesting Recipient
                  </Button>
                </div>
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
              <span className="relative z-10 flex items-center gap-2">
                Create Vesting Contract
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/10 to-primary/0 
                translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </Button>
          </div>
        </div>
      </form>

      <VestingConfirmationDialog
        isOpen={showConfirmation}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        formData={formData || {} as VestingFormValues}
        deploymentStatus={deploymentStatus}
      />
    </Form>
  )
} 