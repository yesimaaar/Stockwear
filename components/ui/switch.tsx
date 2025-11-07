'use client'

import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn } from '@/lib/utils'

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-border/60 bg-input/60 p-[2px] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:border-primary/60 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input/60 dark:data-[state=unchecked]:bg-muted/70',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform duration-200 ease-out data-[state=checked]:translate-x-[calc(100%-4px)] data-[state=checked]:bg-primary-foreground data-[state=unchecked]:translate-x-0 dark:data-[state=unchecked]:bg-foreground/90"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
