"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Loader2, Check, Banknote, CreditCard, Building2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"
import { AuthService } from "@/features/auth/services/auth-service"
import { CajaService } from "@/features/caja/services/caja-service"
import { supabase } from "@/lib/supabase"
import { getCurrentTiendaId } from "@/features/auth/services/tenant-service"

const currencyFormatter = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
})

const ventaLibreSchema = z.object({
    fechaVenta: z.date({ required_error: "La fecha es requerida" }),
    monto: z.coerce.number().min(1, "El valor debe ser mayor a 0"),
    descripcion: z.string().optional(),
    metodoPagoId: z.string({ required_error: "Selecciona un método de pago" }).min(1, "Selecciona un método de pago"),
})

type VentaLibreFormValues = z.infer<typeof ventaLibreSchema>

const METODOS_PAGO = [
    { id: "efectivo", label: "Efectivo", icon: Banknote },
    { id: "tarjeta", label: "Tarjeta", icon: CreditCard },
    { id: "transferencia", label: "Transferencia", icon: Building2 },
]

interface VentaLibreDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function VentaLibreDialog({ open, onOpenChange, onSuccess }: VentaLibreDialogProps) {
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [metodosPago, setMetodosPago] = useState<{ id: number; nombre: string }[]>([])

    const form = useForm<VentaLibreFormValues>({
        resolver: zodResolver(ventaLibreSchema),
        defaultValues: {
            fechaVenta: new Date(),
            monto: 0,
            descripcion: "",
            metodoPagoId: "",
        },
    })

    // Load payment methods when dialog opens
    useEffect(() => {
        if (open) {
            const loadMetodos = async () => {
                try {
                    const allMethods = await CajaService.getMetodosPago() || []
                    console.log("All payment methods:", allMethods)

                    // Filter out credit methods to match Cart logic
                    const filteredMethods = allMethods.filter(m => {
                        const name = m.nombre.toLowerCase()
                        return !['crédito', 'credito', 'por cobrar'].includes(name)
                    })

                    console.log("Filtered payment methods:", filteredMethods)
                    setMetodosPago(filteredMethods)

                    // Set default to first method if available
                    if (filteredMethods.length > 0 && !form.getValues("metodoPagoId")) {
                        form.setValue("metodoPagoId", String(filteredMethods[0].id))
                    }
                } catch (error) {
                    console.error("Error loading payment methods", error)
                }
            }
            void loadMetodos()
        }
    }, [open, form])

    const onSubmit = async (values: VentaLibreFormValues) => {
        setIsSubmitting(true)
        try {
            const user = await AuthService.getCurrentUser()
            const sesion = user ? await CajaService.getSesionActual(user.id) : null
            const tiendaId = await getCurrentTiendaId()

            // Generate folio
            const now = new Date()
            const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
            const randomPart = Math.floor(Math.random() * 9000 + 1000)
            const folio = `VL-${datePart}-${randomPart}`

            // Create the sale record
            const { data: ventaData, error: ventaError } = await supabase
                .from('ventas')
                .insert({
                    folio,
                    total: values.monto,
                    usuarioId: user?.id || null,
                    createdAt: values.fechaVenta.toISOString(),
                    tienda_id: tiendaId,
                    metodo_pago_id: Number(values.metodoPagoId),
                    caja_sesion_id: sesion?.id || null,
                    tipo_venta: 'contado',
                    saldo_pendiente: 0,
                    numero_cuotas: 1,
                    interes_porcentaje: 0,
                    monto_cuota: 0,
                })
                .select()
                .single()

            if (ventaError) {
                console.error('Error creating free sale:', ventaError)
                throw new Error('No se pudo registrar la venta libre')
            }

            // If there's a description, create a dummy product detail for display purposes
            if (values.descripcion && values.descripcion.trim()) {
                await supabase
                    .from('ventasDetalle')
                    .insert({
                        ventaId: ventaData.id,
                        productoId: null, // No product associated
                        stockId: null,
                        cantidad: 1,
                        precioUnitario: values.monto,
                        descuento: 0,
                        subtotal: values.monto,
                        tienda_id: tiendaId,
                    })

                // Store description in historial for reference
                await supabase.from('historialStock').insert({
                    tipo: 'venta',
                    productoId: null,
                    tallaId: null,
                    almacenId: null,
                    cantidad: 1,
                    stockAnterior: 0,
                    stockNuevo: 0,
                    usuarioId: user?.id || null,
                    motivo: `Venta libre: ${values.descripcion} (${folio})`,
                    costoUnitario: values.monto,
                    createdAt: values.fechaVenta.toISOString(),
                    tienda_id: tiendaId,
                })
            }

            toast({
                title: "Venta registrada",
                description: `Se registró la venta de ${currencyFormatter.format(values.monto)}`,
            })

            form.reset()
            onSuccess?.()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "No se pudo registrar la venta libre.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                            💵
                        </span>
                        Crear Venta
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        {/* Fecha */}
                        <FormField
                            control={form.control}
                            name="fechaVenta"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha de la venta*</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP", { locale: es })
                                                    ) : (
                                                        <span>Selecciona una fecha</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date > new Date() || date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Valor */}
                        <FormField
                            control={form.control}
                            name="monto"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Valor*</FormLabel>
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

                        {/* Método de Pago */}
                        <FormField
                            control={form.control}
                            name="metodoPagoId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Método de pago*</FormLabel>
                                    <FormControl>
                                        <div className="grid grid-cols-3 gap-2">
                                            {metodosPago.map((metodo) => {
                                                // Find matching icon based on name
                                                let MetodoIcon = Banknote
                                                const name = metodo.nombre.toLowerCase()
                                                if (name.includes('tarjeta')) MetodoIcon = CreditCard
                                                else if (name.includes('transferencia')) MetodoIcon = Building2

                                                return (
                                                    <div
                                                        key={metodo.id}
                                                        className={cn(
                                                            "cursor-pointer rounded-xl border-2 p-2 transition-all hover:bg-accent hover:text-accent-foreground relative",
                                                            field.value === String(metodo.id)
                                                                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20"
                                                                : "border-transparent bg-card shadow-sm"
                                                        )}
                                                        onClick={() => field.onChange(String(metodo.id))}
                                                    >
                                                        <div className="flex flex-col items-center gap-2 text-center py-1">
                                                            <MetodoIcon className={cn(
                                                                "h-5 w-5",
                                                                field.value === String(metodo.id) ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                                                            )} />
                                                            <span className="text-[10px] font-medium leading-tight">{metodo.nombre}</span>
                                                            {field.value === String(metodo.id) && (
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

                        {/* Descripción */}
                        <FormField
                            control={form.control}
                            name="descripcion"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción (Opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="¿Qué se vendió? Ej: Servicio de consultoría, reparación, etc."
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
                                    Registrando venta...
                                </>
                            ) : (
                                "Crear Venta"
                            )}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
