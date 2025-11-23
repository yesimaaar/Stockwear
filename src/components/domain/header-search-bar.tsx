"use client"

import { Search } from "lucide-react"
import type { InputHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

export interface HeaderSearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string
  onChange: (value: string) => void
}

export function HeaderSearchBar({
  value,
  onChange,
  placeholder = "Search",
  className,
  ...inputProps
}: HeaderSearchBarProps) {
  const { ["aria-label"]: ariaLabelProp, ...restInputProps } = inputProps
  const ariaLabel = ariaLabelProp ?? "Buscar"
  return (
    <div
      className={cn(
        "flex h-10 w-full items-center gap-2 rounded-xl border border-border/50 bg-muted/50 px-3 text-sm text-foreground transition-colors focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20",
        className,
      )}
    >
      <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        aria-label={ariaLabel}
        {...restInputProps}
      />
    </div>
  )
}

export default HeaderSearchBar
