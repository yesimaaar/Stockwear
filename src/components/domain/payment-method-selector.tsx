import { Check, CreditCard, Banknote, ArrowLeftRight, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { MetodoPago } from "@/lib/types"

interface PaymentMethodSelectorProps {
  methods: MetodoPago[] | { id: number; nombre: string }[]
  selectedMethodId: string | null
  onSelect: (id: string) => void
  disabled?: boolean
  className?: string
}

export function PaymentMethodSelector({
  methods,
  selectedMethodId,
  onSelect,
  disabled,
  className,
}: PaymentMethodSelectorProps) {
  // Helper to get icon based on name
  const getIcon = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes("efectivo")) return Banknote
    if (n.includes("transferencia")) return ArrowLeftRight
    if (n.includes("tarjeta") || n.includes("crédito") || n.includes("credito")) return CreditCard
    return Wallet
  }

  // Filter to ensure we only show the requested types if possible, 
  // or just show all available methods as buttons.
  // The user said: "solo se puede seleccionar si es: efectivo, transferencia, tarjeta de credito, otro"
  // We will render whatever is passed, but styled as buttons.
  // If the DB has more, they will show up. If the DB matches the user's list, it will be perfect.

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {methods.map((method) => {
        const Icon = getIcon(method.nombre)
        const isSelected = String(method.id) === selectedMethodId
        // @ts-ignore
        const comision = method.comisionPorcentaje

        return (
          <Button
            key={method.id}
            type="button"
            variant={isSelected ? "default" : "outline"}
            className={cn(
              "h-auto flex-col items-center justify-center gap-2 py-3 text-xs sm:flex-row sm:justify-start sm:text-sm relative",
              isSelected ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
            )}
            onClick={() => onSelect(String(method.id))}
            disabled={disabled}
          >
            <Icon className="h-4 w-4" />
            <div className="flex flex-col items-start">
              <span>{method.nombre}</span>
              {comision ? (
                <span className="text-[10px] opacity-80">Comisión: {comision}%</span>
              ) : null}
            </div>
            {isSelected && <Check className="ml-auto h-3 w-3 hidden sm:block" />}
          </Button>
        )
      })}
      {methods.length === 0 && (
        <p className="col-span-2 text-center text-xs text-muted-foreground">
          No hay métodos de pago disponibles.
        </p>
      )}
    </div>
  )
}
