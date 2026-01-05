"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
import { User, Calendar, CreditCard, UserCircle, Receipt } from "lucide-react"

interface VentaDetalleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    venta: any | null
}

const currencyFormatter = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
})

export function VentaDetalleDialog({ open, onOpenChange, venta }: VentaDetalleDialogProps) {
    console.log("VentaDetalleDialog rendering. Open:", open, "HasVenta:", !!venta)
    if (!venta) return null

    const isAddi = venta.metodo_pago?.nombre?.toLowerCase() === 'addi'
    const comisionAddi = isAddi ? venta.total * 0.1071 : 0
    const netoAddi = isAddi ? venta.total - comisionAddi : venta.total

    let fechaLiquidacion = null
    if (isAddi) {
        const dateObj = new Date(venta.createdAt)
        dateObj.setDate(dateObj.getDate() + 7)
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
                                <Calendar className="h-3 w-3" /> Fecha
                            </span>
                            <p className="font-medium text-sm">
                                {format(new Date(venta.createdAt), "PP p", { locale: es })}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" /> Vendedor
                            </span>
                            <p className="font-medium text-sm capitalize">
                                {venta.usuario?.nombre || "Desconocido"}
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

                    {/* Addi Info Box */}
                    {isAddi && fechaLiquidacion && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-900">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <span className="bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded textxs">Addi</span>
                                Detalles de Liquidación
                            </h4>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span>Venta Total:</span>
                                    <span className="font-medium">{currencyFormatter.format(venta.total)}</span>
                                </div>
                                <div className="flex justify-between text-rose-600">
                                    <span>Comisión (10.71%):</span>
                                    <span>-{currencyFormatter.format(comisionAddi)}</span>
                                </div>
                                <div className="col-span-2 border-t border-blue-200 my-1"></div>
                                <div className="flex justify-between font-bold text-sm">
                                    <span>Neto a Recibir:</span>
                                    <span>{currencyFormatter.format(netoAddi)}</span>
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
                                {venta.ventasDetalle?.map((detalle: any) => (
                                    <TableRow key={detalle.id}>
                                        <TableCell className="font-medium">
                                            {detalle.producto?.nombre || "Producto eliminado"}
                                            <div className="text-[10px] text-muted-foreground">{detalle.producto?.codigo}</div>
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
                                ))}
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

                </div>
            </DialogContent>
        </Dialog>
    )
}
