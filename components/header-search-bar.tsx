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
        "flex h-12 w-full items-center gap-3 px-0 text-sm text-foreground/80",
        "bg-transparent border-none shadow-none",
        className,
      )}
    >
      <Search className="h-4 w-4 text-foreground/70" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-base text-foreground placeholder:text-foreground/50 focus:outline-none"
        aria-label={ariaLabel}
        {...restInputProps}
      />
    </div>
  )
}

export default HeaderSearchBar
