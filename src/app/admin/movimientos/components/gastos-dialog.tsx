"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Loader2, Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { GastoService } from "@/features/movimientos/services/gasto-service"
import { useToast } from "@/hooks/use-toast"
import { AuthService } from "@/features/auth/services/auth-service"
import { CajaService } from "@/features/caja/services/caja-service"

const gastoSchema = z.object({
    estado: z.enum(["pagado", "pendiente"]),
    fechaGasto: z.date({ required_error: "La fecha es requerida" }),
    categoria: z.string({ required_error: "Selecciona una categoría" }).min(1, "Selecciona una categoría"),
    monto: z.coerce.number().min(1, "El valor debe ser mayor a 0"),
    descripcion: z.string().optional(),
    proveedor: z.string().optional(),
    metodoPago: z.string({ required_error: "Selecciona un método de pago" }).min(1, "Selecciona un método de pago"),
    fechaVencimiento: z.date().optional(),
})

type GastoFormValues = z.infer<typeof gastoSchema>

const CATEGORIAS = [
    "Arriendo",
    "Nómina",
    "Gastos administrativos",
    "Mercadeo y publicidad",
    "Transporte, domicilios y logística",
    "Servicios públicos",
    "Mantenimiento y reparaciones",
    "Impuestos",
    "Otros"
]

const METODOS_PAGO = [
    { id: "efectivo", label: "Efectivo", icon: "💵" },
    { id: "transferencia", label: "Transferencia bancaria", icon: "🏦" },
    { id: "otro", label: "Otro", icon: "⚪" },
]

interface GastosDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function GastosDialog({ open, onOpenChange, onSuccess }: GastosDialogProps) {
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<GastoFormValues>({
        resolver: zodResolver(gastoSchema),
        defaultValues: {
            estado: "pagado",
            fechaGasto: new Date(),
            monto: 0,
            descripcion: "",
            proveedor: "",
            categoria: "",
            metodoPago: "efectivo",
        },
    })

    const estado = form.watch("estado")

    const onSubmit = async (values: GastoFormValues) => {
        setIsSubmitting(true)
        try {
            const user = await AuthService.getCurrentUser()
            const sesion = user ? await CajaService.getSesionActual(user.id) : null

            await GastoService.create({
                descripcion: values.descripcion || "Gasto sin descripción",
                monto: values.monto,
                categoria: values.categoria,
                metodoPago: values.metodoPago,
                proveedor: values.proveedor || null,
                estado: values.estado,
                saldoPendiente: values.estado === "pendiente" ? values.monto : 0,
                fechaVencimiento: values.fechaVencimiento?.toISOString() || null,
                fechaGasto: values.fechaGasto.toISOString(),
                usuarioId: user?.id || null,
                cajaSesionId: sesion?.id || null,
            })

            toast({
                title: "Gasto registrado",
                description: "El gasto se ha guardado correctamente.",
            })

            form.reset()
            onSuccess?.()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "No se pudo registrar el gasto.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                            💸
                        </span>
                        Nuevo gasto
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">

                        {/* Estado Toggle */}
                        <FormField
                            control={form.control}
                            name="estado"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <div className="flex rounded-lg border p-1">
                                            <button
                                                type="button"
                                                onClick={() => field.onChange("pagado")}
                                                className={cn(
                                                    "flex-1 rounded-md py-1.5 text-sm font-medium transition-all",
                                                    field.value === "pagado"
                                                        ? "bg-emerald-600 text-white shadow-sm"
                                                        : "text-muted-foreground hover:bg-muted"
                                                )}
                                            >
                                                Pagada
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => field.onChange("pendiente")}
                                                className={cn(
                                                    "flex-1 rounded-md py-1.5 text-sm font-medium transition-all",
                                                    field.value === "pendiente"
                                                        ? "bg-rose-600 text-white shadow-sm"
                                                        : "text-muted-foreground hover:bg-muted"
                                                )}
                                            >
                                                En deuda
                                            </button>
                                        </div>
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {/* Fecha */}
                        <FormField
                            control={form.control}
                            name="fechaGasto"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha del gasto*</FormLabel>
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

                        {/* Categoria */}
                        <FormField
                            control={form.control}
                            name="categoria"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Categoría del gasto*</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona una categoría" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {CATEGORIAS.map((cat) => (
                                                <SelectItem key={cat} value={cat}>
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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

                        {/* Nombre / Descripción */}
                        <FormField
                            control={form.control}
                            name="descripcion"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>¿Quieres darle un nombre a este gasto?</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Escríbelo aquí" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Proveedor */}
                        <FormField
                            control={form.control}
                            name="proveedor"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Agrega un proveedor al gasto</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input placeholder="Buscar o escribir proveedor..." {...field} className="pl-8" />
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
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
                                    <FormLabel>Selecciona el método de pago*</FormLabel>
                                    <FormControl>
                                        <div className="grid grid-cols-2 gap-2">
                                            {METODOS_PAGO.map((metodo) => (
                                                <div
                                                    key={metodo.id}
                                                    className={cn(
                                                        "cursor-pointer rounded-xl border-2 p-3 transition-all hover:bg-accent",
                                                        field.value === metodo.id
                                                            ? "border-emerald-500 bg-emerald-50/50"
                                                            : "border-transparent bg-card shadow-sm"
                                                    )}
                                                    onClick={() => field.onChange(metodo.id)}
                                                >
                                                    <div className="flex flex-col items-center gap-2 text-center">
                                                        <span className="text-2xl">{metodo.icon}</span>
                                                        <span className="text-xs font-medium">{metodo.label}</span>
                                                        {field.value === metodo.id && (
                                                            <div className="absolute top-2 right-2">
                                                                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                                                                    <Check className="h-2.5 w-2.5" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Fecha Vencimiento (Solo si es deuda) */}
                        {estado === "pendiente" && (
                            <FormField
                                control={form.control}
                                name="fechaVencimiento"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col animate-in fade-in slide-in-from-top-2">
                                        <FormLabel>Fecha de vencimiento</FormLabel>
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
                                                            <span>Selecciona una fecha límite</span>
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
                                                        date < new Date()
                                                    }
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <Button type="submit" className="w-full h-12 text-base mt-4" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                "Crear gasto"
                            )}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
