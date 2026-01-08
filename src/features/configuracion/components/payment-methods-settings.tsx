"use client"

import { useEffect, useState } from "react"
import { 
    CreditCard, 
    Loader2, 
    Banknote, 
    Landmark, 
    Wallet, 
    Smartphone 
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CajaService } from "@/features/caja/services/caja-service"
import { useToast } from "@/hooks/use-toast"
import type { MetodoPago } from "@/lib/types"
import { cn } from "@/lib/utils"

export function PaymentMethodsSettings() {
    const { toast } = useToast()
    const [methods, setMethods] = useState<MetodoPago[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<number | null>(null)

    useEffect(() => {
        loadMethods()
    }, [])

    const loadMethods = async () => {
        setLoading(true)
        try {
            // First ensure we have the defaults created
            await CajaService.ensureDefaults() 
            // Then fetch ALL methods, including inactive ones
            const data = await CajaService.getAllMetodosPago()
            setMethods(data)
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "No se pudieron cargar los métodos de pago",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const handleToggle = async (methodId: number, currentStatus: string) => {
        setUpdating(methodId)
        const newStatus = currentStatus === 'activo' ? 'inactivo' : 'activo'
        
        try {
            const success = await CajaService.updateMetodoPagoStatus(methodId, newStatus)
            if (success) {
                setMethods(prev => prev.map(m => m.id === methodId ? { ...m, estado: newStatus } : m))
                toast({
                    title: newStatus === 'activo' ? "Habilitado" : "Deshabilitado",
                    description: `El método de pago se ha ${newStatus === 'activo' ? 'activado' : 'desactivado'} correctamente.`
                })
            } else {
                 throw new Error("Failed to update")
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo actualizar el estado",
                variant: "destructive"
            })
        } finally {
            setUpdating(null)
        }
    }

    const getIcon = (tipo: string) => {
        switch (tipo) {
            case 'efectivo': return Banknote
            case 'banco': return Landmark
            case 'digital': return Smartphone
            default: return Wallet
        }
    }

    const groups = {
        'Efectivo': methods.filter(m => m.tipo === 'efectivo'),
        'Bancos y Tarjetas': methods.filter(m => m.tipo === 'banco'),
        'Plataformas y Otros': methods.filter(m => !['efectivo', 'banco'].includes(m.tipo))
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400">
                             <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                             <CardTitle>Métodos de Pago</CardTitle>
                             <CardDescription>Cargando configuración...</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/40 pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800">
                         <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                         <CardTitle className="text-lg">Métodos de Pago</CardTitle>
                         <CardDescription>Administra las formas de pago aceptadas en tu tienda</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
                {Object.entries(groups).map(([title, groupMethods]) => {
                    if (groupMethods.length === 0) return null
                    
                    return (
                        <div key={title} className="space-y-3">
                            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                {title}
                                <span className="h-px flex-1 bg-border"></span>
                            </h3>
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {groupMethods.map((method) => {
                                    const Icon = getIcon(method.tipo)
                                    const isActive = method.estado === 'activo'
                                    
                                    return (
                                        <div 
                                            key={method.id} 
                                            className={cn(
                                                "relative flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
                                                isActive 
                                                    ? "bg-card border-border shadow-sm hover:shadow-md hover:border-green-500/50" 
                                                    : "bg-muted/50 border-transparent opacity-80 hover:opacity-100 hover:bg-muted"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 pr-4">
                                                <div className={cn(
                                                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
                                                    isActive 
                                                        ? "bg-primary/10 text-primary" 
                                                        : "bg-muted text-muted-foreground"
                                                )}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label 
                                                        htmlFor={`payment-${method.id}`} 
                                                        className="font-medium cursor-pointer leading-none"
                                                    >
                                                        {method.nombre}
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground capitalize">
                                                        {method.tipo}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <Switch
                                                id={`payment-${method.id}`}
                                                checked={isActive}
                                                disabled={updating === method.id}
                                                onCheckedChange={() => handleToggle(method.id, method.estado)}
                                                className="data-[state=checked]:bg-green-600"
                                            />
                                            
                                            {updating === method.id && (
                                                <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-xl backdrop-blur-[1px]">
                                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}

                {methods.length === 0 && (
                     <div className="text-center py-8 text-muted-foreground">
                        <p>No se encontraron métodos de pago.</p>
                     </div>
                )}
            </CardContent>
        </Card>
    )
}
