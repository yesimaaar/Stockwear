"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { User, Calendar, CreditCard, UserCircle, Receipt, Trash2, Loader2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { VentaService } from "@/features/ventas/services/venta-service"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface VentaDetalleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    venta: any | null
    onSuccess?: () => void
}

const currencyFormatter = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
})

export function VentaDetalleDialog({ open, onOpenChange, venta, onSuccess }: VentaDetalleDialogProps) {
    const { toast } = useToast()
    const [isDeleting, setIsDeleting] = useState(false)

    console.log("VentaDetalleDialog rendering. Open:", open, "HasVenta:", !!venta)
    if (!venta) return null

    const handleUndo = async () => {
        if (!venta) return
        setIsDeleting(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("No hay sesión activa")

            await VentaService.anularVenta(venta.id, user.id)
            
            toast({
                title: "Venta anulada",
                description: "La venta ha sido anulada y el stock restaurado.",
            })
            onOpenChange(false)
            onSuccess?.()
        } catch (error: any) {
            console.error("Error anular venta", error)
            toast({
                title: "Error",
                description: error.message || "No se pudo anular la venta.",
                variant: "destructive"
            })
        } finally {
            setIsDeleting(false)
        }
    }

    const metodoLower = venta.metodo_pago?.nombre?.toLowerCase() || ''
    const isAddi = metodoLower.includes('addi')
    const isTC = metodoLower.includes('tarjeta') || 
                (metodoLower.includes('banco') && !metodoLower.includes('transferencia')) || 
                metodoLower === 'tc' || 
                metodoLower === 'datafono'

    let comisionRate = 0
    let labelComision = ''
    let daysResult = 0

    if (isAddi) {
        comisionRate = 0.1071
        labelComision = 'Comisión Addi'
        daysResult = 8
    } else if (isTC) {
        comisionRate = 0.0361
        labelComision = 'Comisión Datáfono'
        daysResult = 1
    }

    const hasComision = comisionRate > 0
    const montoComision = venta.total * comisionRate
    const montoNeto = venta.total - montoComision
    
    let fechaLiquidacion = null
    if (hasComision) {
        const dateObj = new Date(venta.createdAt)
        dateObj.setDate(dateObj.getDate() + daysResult)
        fechaLiquidacion = dateObj
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-muted-foreground" />
                        Detalle de Venta {venta.folio}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Header Stats */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Fecha Venta
                            </span>
                            <p className="font-medium text-sm">
                                {format(new Date(venta.createdAt), "PP p", { locale: es })}
                            </p>
                        </div>

                        {hasComision && fechaLiquidacion && (
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground flex items-center gap-1 text-emerald-600">
                                    <Calendar className="h-3 w-3" /> Disponible
                                </span>
                                <p className="font-medium text-sm text-emerald-700">
                                    {format(fechaLiquidacion, "PP", { locale: es })}
                                </p>
                            </div>
                        )}

                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" /> Vendedor
                            </span>
                            <p className="font-medium text-sm capitalize">
                                {venta.usuario?.nombre || venta.usuario?.email || "Desconocido"}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <CreditCard className="h-3 w-3" /> Método
                            </span>
                            <p className="font-medium text-sm">
                                {venta.metodo_pago?.nombre || "Efectivo"}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <UserCircle className="h-3 w-3" /> Cliente
                            </span>
                            <p className="font-medium text-sm">
                                {venta.cliente?.nombre || "Cliente General"}
                            </p>
                        </div>
                    </div>

                    {/* Descripción */}
                    {venta.descripcion && (
                        <div className="rounded-md bg-muted/40 p-3 text-sm">
                            <span className="mb-1 block text-xs font-medium text-muted-foreground">Descripción / Notas:</span>
                            <p className="text-foreground">{venta.descripcion}</p>
                        </div>
                    )}

                    {/* Liquidation Info Box (Addi or TC) */}
                    {hasComision && fechaLiquidacion && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-900">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <span className="bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded text-[10px] uppercase">
                                    {isAddi ? 'Addi' : 'Datáfono'}
                                </span>
                                Detalles de Liquidación
                            </h4>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span>Venta Total:</span>
                                    <span className="font-medium">{currencyFormatter.format(venta.total)}</span>
                                </div>
                                <div className="flex justify-between text-rose-600">
                                    <span>{labelComision} ({(comisionRate * 100).toFixed(2)}%):</span>
                                    <span>-{currencyFormatter.format(montoComision)}</span>
                                </div>
                                <div className="col-span-2 border-t border-blue-200 my-1"></div>
                                <div className="flex justify-between font-bold text-sm">
                                    <span>Neto a Recibir:</span>
                                    <span>{currencyFormatter.format(montoNeto)}</span>
                                </div>
                                <div className="flex justify-between text-blue-700 mt-1">
                                    <span>Fecha Disponible:</span>
                                    <span>{format(fechaLiquidacion, "PP", { locale: es })}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Products Table */}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-center">Talla</TableHead>
                                    <TableHead className="text-right">Cant.</TableHead>
                                    <TableHead className="text-right">Precio</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {venta.ventasDetalle?.map((detalle: any) => {
                                    // Si es una venta libre (sin producto real), usamos la descripción de la venta como nombre del producto
                                    const isVentaLibre = !detalle.productoId || detalle.producto?.codigo === 'VL'
                                    const productoNombre = isVentaLibre && venta.descripcion 
                                        ? venta.descripcion 
                                        : (detalle.producto?.nombre || "Producto desconocido")
                                    
                                    const productoCodigo = isVentaLibre ? "Venta Libre" : detalle.producto?.codigo

                                    return (
                                    <TableRow key={detalle.id}>
                                        <TableCell className="font-medium">
                                            {productoNombre}
                                            <div className="text-[10px] text-muted-foreground">{productoCodigo}</div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline">{detalle.talla?.nombre || "-"}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{detalle.cantidad}</TableCell>
                                        <TableCell className="text-right">{currencyFormatter.format(detalle.precioUnitario)}</TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {currencyFormatter.format(detalle.subtotal)}
                                        </TableCell>
                                    </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Totals */}
                    <div className="flex flex-col items-end space-y-2">
                        <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">IVA / Impuestos:</span>
                            <span>$0</span>
                        </div>
                        <div className="flex items-center gap-4 text-xl font-bold">
                            <span>Total:</span>
                            <span>{currencyFormatter.format(venta.total)}</span>
                        </div>
                    </div>

                    <DialogFooter className="sm:justify-between gap-2">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" disabled={isDeleting}>
                                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Deshacer Venta
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción anulará la venta #{venta.folio} y devolverá los productos al inventario.
                                        Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleUndo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        {isDeleting ? "Anulando..." : "Sí, anular venta"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cerrar
                        </Button>
                    </DialogFooter>

                </div>
            </DialogContent>
        </Dialog>
    )
}
