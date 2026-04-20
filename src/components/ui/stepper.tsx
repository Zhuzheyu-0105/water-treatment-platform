import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Stepper Context
interface StepperContextValue {
  value: number
  onValueChange: (value: number) => void
}

const StepperContext = React.createContext<StepperContextValue | undefined>(undefined)

function useStepper() {
  const context = React.useContext(StepperContext)
  if (!context) {
    throw new Error("useStepper must be used within a Stepper")
  }
  return context
}

// Stepper Root
interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  onValueChange: (value: number) => void
}

function Stepper({ value, onValueChange, className, children, ...props }: StepperProps) {
  return (
    <StepperContext.Provider value={{ value, onValueChange }}>
      <div className={cn("flex gap-2", className)} {...props}>
        {children}
      </div>
    </StepperContext.Provider>
  )
}

// Stepper Item
interface StepperItemProps extends React.HTMLAttributes<HTMLDivElement> {
  step: number
}

function StepperItem({ step, className, children, ...props }: StepperItemProps) {
  const { value } = useStepper()
  const isActive = value === step
  const isCompleted = value > step

  return (
    <div
      className={cn(
        "relative flex flex-col",
        isActive && "active",
        isCompleted && "completed",
        className
      )}
      aria-current={isActive ? "step" : undefined}
      {...props}
    >
      {children}
    </div>
  )
}

// Stepper Trigger
interface StepperTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

function StepperTrigger({ className, children, disabled, ...props }: StepperTriggerProps) {
  const { value, onValueChange } = useStepper()
  
  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      disabled={disabled}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  )
}

// Stepper Indicator
const stepperIndicatorVariants = cva(
  "flex items-center justify-center rounded-full border-2 font-semibold text-sm transition-all",
  {
    variants: {
      variant: {
        default: "border-gray-300 text-gray-300",
        active: "border-blue-500 text-blue-500 bg-blue-50",
        completed: "border-blue-500 bg-blue-500 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface StepperIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stepperIndicatorVariants> {}

function StepperIndicator({ className, variant, ...props }: StepperIndicatorProps) {
  return (
    <div className={cn(stepperIndicatorVariants({ variant }), className)} {...props} />
  )
}

// Stepper Title
interface StepperTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

function StepperTitle({ className, ...props }: StepperTitleProps) {
  return <h3 className={cn("font-medium", className)} {...props} />
}

// Stepper Description
interface StepperDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

function StepperDescription({ className, ...props }: StepperDescriptionProps) {
  return <p className={cn("text-sm text-gray-500", className)} {...props} />
}

// Stepper Separator
interface StepperSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

function StepperSeparator({ className, ...props }: StepperSeparatorProps) {
  return (
    <div
      className={cn("h-0.5 flex-1 bg-gray-200", className)}
      role="separator"
      {...props}
    />
  )
}

export {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperTitle,
  StepperDescription,
  StepperSeparator,
}
