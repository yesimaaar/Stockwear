"use client"

import { useEffect, useState } from "react"
import { 
    Loader2, 
    Banknote, 
    Landmark, 
    Wallet, 
    Smartphone 
} from "lucide-react"
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
            <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {Object.entries(groups).map(([title, groupMethods]) => {
                if (groupMethods.length === 0) return null
                
                return (
                    <div key={title} className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                            {title}
                            <span className="h-px flex-1 bg-border"></span>
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {groupMethods.map((method) => {
                                const Icon = getIcon(method.tipo)
                                const isActive = method.estado === 'activo'
                                
                                return (
                                    <div 
                                        key={method.id} 
                                        className={cn(
                                            "relative flex items-center justify-between p-3 rounded-lg border transition-all",
                                            isActive 
                                                ? "bg-card border-border" 
                                                : "bg-muted/30 border-transparent opacity-70"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                                                isActive 
                                                    ? "bg-primary/10 text-primary" 
                                                    : "bg-muted text-muted-foreground"
                                            )}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <Label 
                                                htmlFor={`payment-${method.id}`} 
                                                className="font-medium cursor-pointer text-sm"
                                            >
                                                {method.nombre}
                                            </Label>
                                        </div>
                                        
                                        <Switch
                                            id={`payment-${method.id}`}
                                            checked={isActive}
                                            disabled={updating === method.id}
                                            onCheckedChange={() => handleToggle(method.id, method.estado)}
                                            className="data-[state=checked]:bg-green-600"
                                        />
                                        
                                        {updating === method.id && (
                                            <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg">
                                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
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
                <div className="text-center py-6 text-muted-foreground">
                    <p>No se encontraron métodos de pago.</p>
                </div>
            )}
        </div>
    )
}
