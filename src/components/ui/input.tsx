import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/**
 * `underline` (default) is the base-sera look: a bottom rule only, transparent
 * background. `filled` is a conventional boxed field with a full border and a
 * background.
 */
export type InputVariant = "underline" | "filled"

const inputBase =
  "h-10 w-full min-w-0 py-1 text-base transition-[color,border-color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"

const inputVariants: Record<InputVariant, string> = {
  underline:
    "border border-transparent border-b-input bg-transparent px-0 focus-visible:border-b-ring aria-invalid:border-b-destructive dark:aria-invalid:border-b-destructive/50",
  filled:
    "border border-input bg-background px-3 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
}

function Input({
  className,
  type,
  variant = "underline",
  ...props
}: React.ComponentProps<"input"> & { variant?: InputVariant }) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputBase, inputVariants[variant], className)}
      {...props}
    />
  )
}

export { Input }
