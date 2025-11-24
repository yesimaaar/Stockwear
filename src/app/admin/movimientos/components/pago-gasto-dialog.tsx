"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Check, Banknote, Building2, HelpCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PagoGastoService } from "@/features/movimientos/services/pago-gasto-service"
import { useToast } from "@/hooks/use-toast"
import { AuthService } from "@/features/auth/services/auth-service"
import { CajaService } from "@/features/caja/services/caja-service"
import type { Gasto } from "@/lib/types"

const currencyFormatter = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
})

const pagoSchema = z.object({
    monto: z.coerce.number().min(1, "El valor debe ser mayor a 0"),
    metodoPago: z.string({ required_error: "Selecciona un método de pago" }).min(1, "Selecciona un método de pago"),
    nota: z.string().optional(),
})

type PagoFormValues = z.infer<typeof pagoSchema>

const METODOS_PAGO = [
    { id: "efectivo", label: "Efectivo", icon: Banknote },
    { id: "transferencia", label: "Transferencia", icon: Building2 },
    { id: "otro", label: "Otro", icon: HelpCircle },
]

interface PagoGastoDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    gasto: Gasto | null
    onSuccess?: () => void
}

export function PagoGastoDialog({ open, onOpenChange, gasto, onSuccess }: PagoGastoDialogProps) {
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<PagoFormValues>({
        resolver: zodResolver(pagoSchema),
        defaultValues: {
            monto: 0,
            metodoPago: "efectivo",
            nota: "",
        },
    })

    useEffect(() => {
        if (gasto && open) {
            form.reset({
                monto: gasto.saldoPendiente,
                metodoPago: "efectivo",
                nota: "",
            })
        }
    }, [gasto, open, form])

    const onSubmit = async (values: PagoFormValues) => {
        if (!gasto) return

        if (values.monto > gasto.saldoPendiente) {
            form.setError("monto", {
                type: "manual",
                message: `El monto no puede ser mayor al saldo pendiente (${currencyFormatter.format(gasto.saldoPendiente)})`
            })
            return
        }

        setIsSubmitting(true)
        try {
            const user = await AuthService.getCurrentUser()
            const sesion = user ? await CajaService.getSesionActual(user.id) : null

            await PagoGastoService.create({
                gastoId: gasto.id,
                monto: values.monto,
                metodoPago: values.metodoPago,
                nota: values.nota,
                usuarioId: user?.id || null,
                cajaSesionId: sesion?.id || null,
            })

            toast({
                title: "Pago registrado",
                description: "El pago del gasto se ha guardado correctamente.",
            })

            onSuccess?.()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "No se pudo registrar el pago.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!gasto) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                            💰
                        </span>
                        Registrar pago de gasto
                    </DialogTitle>
                </DialogHeader>

                <div className="mb-4 rounded-lg bg-muted/50 p-4 text-sm">
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground">Estás registrando un pago para:</span>
                        <span className="font-medium text-foreground">{gasto.descripcion}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t pt-3">
                        <span className="text-muted-foreground">Saldo pendiente:</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                            {currencyFormatter.format(gasto.saldoPendiente)}
                        </span>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        {/* Valor */}
                        <FormField
                            control={form.control}
                            name="monto"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Monto a pagar</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                            <Input
                                                type="number"
                                                className="pl-7 text-lg font-semibold"
                                                placeholder="0"
                                                {...field}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Metodo de Pago */}
                        <FormField
                            control={form.control}
                            name="metodoPago"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Método de pago</FormLabel>
                                    <FormControl>
                                        <div className="grid grid-cols-3 gap-2">
                                            {METODOS_PAGO.map((metodo) => {
                                                const Icon = metodo.icon
                                                return (
                                                    <div
                                                        key={metodo.id}
                                                        className={cn(
                                                            "cursor-pointer rounded-xl border-2 p-2 transition-all hover:bg-accent hover:text-accent-foreground",
                                                            field.value === metodo.id
                                                                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20"
                                                                : "border-transparent bg-card shadow-sm"
                                                        )}
                                                        onClick={() => field.onChange(metodo.id)}
                                                    >
                                                        <div className="flex flex-col items-center gap-2 text-center py-1">
                                                            <Icon className={cn(
                                                                "h-5 w-5",
                                                                field.value === metodo.id ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                                                            )} />
                                                            <span className="text-[10px] font-medium leading-tight">{metodo.label}</span>
                                                            {field.value === metodo.id && (
                                                                <div className="absolute top-1 right-1">
                                                                    <div className="flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-white">
                                                                        <Check className="h-2 w-2" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Nota */}
                        <FormField
                            control={form.control}
                            name="nota"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nota (Opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Algún detalle sobre este pago..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Registrando pago...
                                </>
                            ) : (
                                "Confirmar pago"
                            )}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

