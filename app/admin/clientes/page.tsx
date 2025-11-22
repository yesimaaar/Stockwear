"use client"

import { useState, useEffect } from "react"
import { Plus, Search, DollarSign, History, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ClienteService } from "@/lib/services/cliente-service"
import type { Cliente, Abono } from "@/lib/types"

export default function ClientesPage() {
    const { toast } = useToast()
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    // New Client State
    const [isNewClientOpen, setIsNewClientOpen] = useState(false)
    const [newClient, setNewClient] = useState({ nombre: "", documento: "", telefono: "", email: "" })

    // Payment State
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
    const [isPaymentOpen, setIsPaymentOpen] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState("")
    const [paymentNote, setPaymentNote] = useState("")
    const [abonos, setAbonos] = useState<Abono[]>([])
    const [loadingAbonos, setLoadingAbonos] = useState(false)

    const loadClientes = async () => {
        setLoading(true)
        try {
            const data = search ? await ClienteService.search(search) : await ClienteService.getAll()
            setClientes(data)
        } catch (error) {
            console.error(error)
            toast({ title: "Error", description: "No se pudieron cargar los clientes", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timeout = setTimeout(() => {
            void loadClientes()
        }, 300)
        return () => clearTimeout(timeout)
    }, [search])

    const handleCreateClient = async () => {
        if (!newClient.nombre) return
        try {
            const created = await ClienteService.create(newClient)
            if (created) {
                toast({ title: "Cliente creado", description: `${created.nombre} ha sido registrado.` })
                setIsNewClientOpen(false)
                setNewClient({ nombre: "", documento: "", telefono: "", email: "" })
                void loadClientes()
            }
        } catch (error) {
            toast({ title: "Error", description: "No se pudo crear el cliente", variant: "destructive" })
        }
    }

    const handleOpenPayment = async (cliente: Cliente) => {
        setSelectedCliente(cliente)
        setIsPaymentOpen(true)
        setPaymentAmount("")
        setPaymentNote("")
        setLoadingAbonos(true)
        try {
            const historial = await ClienteService.getAbonos(cliente.id)
            setAbonos(historial)
        } finally {
            setLoadingAbonos(false)
        }
    }

    const handleRegisterPayment = async () => {
        if (!selectedCliente || !paymentAmount) return
        const monto = Number(paymentAmount)
        if (monto <= 0) {
            toast({ title: "Monto inválido", description: "El monto debe ser mayor a 0", variant: "destructive" })
            return
        }

        try {
            await ClienteService.registrarAbono({
                clienteId: selectedCliente.id,
                monto,
                nota: paymentNote
            })
            toast({ title: "Abono registrado", description: "El saldo del cliente ha sido actualizado." })
            setIsPaymentOpen(false)
            void loadClientes()
        } catch (error) {
            toast({ title: "Error", description: "No se pudo registrar el abono", variant: "destructive" })
        }
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Clientes y Cuentas por Cobrar</h1>
                    <p className="text-muted-foreground">Gestiona tus clientes y sus estados de cuenta.</p>
                </div>
                <Dialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
                            <DialogDescription>Ingresa los datos del cliente para futuras ventas.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nombre">Nombre completo</Label>
                                <Input
                                    id="nombre"
                                    value={newClient.nombre}
                                    onChange={(e) => setNewClient({ ...newClient, nombre: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="documento">Documento (Opcional)</Label>
                                <Input
                                    id="documento"
                                    value={newClient.documento}
                                    onChange={(e) => setNewClient({ ...newClient, documento: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="telefono">Teléfono (Opcional)</Label>
                                <Input
                                    id="telefono"
                                    value={newClient.telefono}
                                    onChange={(e) => setNewClient({ ...newClient, telefono: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreateClient}>Guardar Cliente</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre o documento..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {clientes.map((cliente) => (
                    <Card key={cliente.id} className="overflow-hidden">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <CardTitle className="text-base font-medium">
                                {cliente.nombre}
                            </CardTitle>
                            <User className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                ${cliente.saldoActual.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Deuda Total
                            </p>
                            <div className="mt-4 flex gap-2">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => handleOpenPayment(cliente)}
                                >
                                    <DollarSign className="mr-2 h-4 w-4" />
                                    Abonar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {!loading && clientes.length === 0 && (
                    <div className="col-span-full text-center text-muted-foreground py-10">
                        No se encontraron clientes.
                    </div>
                )}
            </div>

            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Registrar Abono - {selectedCliente?.nombre}</DialogTitle>
                        <DialogDescription>
                            Deuda actual: <span className="font-bold text-destructive">${selectedCliente?.saldoActual.toLocaleString()}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="monto">Monto a abonar</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                <Input
                                    id="monto"
                                    type="number"
                                    className="pl-7"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="nota">Nota (Opcional)</Label>
                            <Input
                                id="nota"
                                value={paymentNote}
                                onChange={(e) => setPaymentNote(e.target.value)}
                                placeholder="Ej: Pago parcial en efectivo"
                            />
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                                <History className="h-4 w-4" /> Historial de Pagos
                            </h4>
                            <div className="rounded-md border h-[200px] overflow-y-auto p-4 space-y-4">
                                {loadingAbonos ? (
                                    <p className="text-sm text-muted-foreground text-center">Cargando historial...</p>
                                ) : abonos.length > 0 ? (
                                    abonos.map((abono) => (
                                        <div key={abono.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                                            <div>
                                                <p className="font-medium">${abono.monto.toLocaleString()}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(abono.createdAt).toLocaleDateString()} {new Date(abono.createdAt).toLocaleTimeString()}
                                                </p>
                                            </div>
                                            {abono.nota && (
                                                <p className="text-xs text-muted-foreground max-w-[200px] truncate" title={abono.nota}>
                                                    {abono.nota}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center">No hay abonos registrados.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>Cancelar</Button>
                        <Button onClick={handleRegisterPayment}>Confirmar Abono</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
