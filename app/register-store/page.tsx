'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from "next/image"
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Store, ArrowRight, LayoutDashboard, ShoppingBag, Users } from 'lucide-react'

const features = [
    {
        icon: LayoutDashboard,
        title: "Panel de Control",
        description: "Gestiona tu negocio desde un solo lugar."
    },
    {
        icon: ShoppingBag,
        title: "Catálogo Digital",
        description: "Muestra tus productos al mundo."
    },
    {
        icon: Users,
        title: "Gestión de Equipo",
        description: "Administra permisos y roles fácilmente."
    }
]

export default function RegisterStorePage() {
    const [nombre, setNombre] = useState('')
    const [slug, setSlug] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { toast } = useToast()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData.user) {
                throw new Error('No hay sesión activa')
            }

            // 1. Crear la tienda
            const { data: tienda, error: tiendaError } = await supabase
                .from('tiendas')
                .insert({
                    nombre,
                    slug: slug.toLowerCase().replace(/\s+/g, '-'),
                })
                .select()
                .single()

            if (tiendaError) throw tiendaError

            // 2. Actualizar el usuario con el ID de la tienda
            const { error: userError } = await supabase
                .from('usuarios')
                .update({ tienda_id: tienda.id })
                .eq('auth_uid', userData.user.id)

            if (userError) throw userError

            // 3. Actualizar metadata de auth
            await supabase.auth.updateUser({
                data: { tienda_id: tienda.id }
            })

            toast({
                title: '¡Tienda creada!',
                description: 'Tu tienda ha sido registrada exitosamente.',
            })

            router.push('/admin')
            router.refresh()

        } catch (error: any) {
            console.error('Error registrando tienda:', error)
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'No se pudo registrar la tienda.',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="force-light relative flex min-h-screen items-center overflow-hidden bg-gradient-to-br from-[#f8faff] via-[#f2f4fb] to-[#edf0f7]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(118,131,173,0.25),_transparent_55%)]" />

            <div className="relative mx-auto grid w-full max-w-[1420px] items-center justify-center gap-12 px-6 py-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.2fr)] lg:px-12">
                <section className="mx-auto flex w-full max-w-md flex-col justify-center gap-8 text-slate-900 lg:ml-0">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50">
                            <Store className="h-8 w-8 text-slate-900" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Configuración</p>
                            <p className="text-3xl font-semibold text-slate-900">Registra tu Tienda</p>
                        </div>
                    </div>

                    <div className="space-y-2 text-slate-600">
                        <p>Para comenzar a vender, necesitamos configurar los datos básicos de tu negocio.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="nombre" className="text-sm font-medium text-slate-600">
                                Nombre de la Tienda
                            </Label>
                            <Input
                                id="nombre"
                                placeholder="Ej. Moda Urbana"
                                value={nombre}
                                onChange={(e) => {
                                    setNombre(e.target.value)
                                    if (!slug || slug === e.target.value.toLowerCase().replace(/\s+/g, '-').slice(0, -1)) {
                                        setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))
                                    }
                                }}
                                required
                                disabled={loading}
                                className="h-12 rounded-[16px] border-slate-200 bg-white/80 text-base text-slate-900 placeholder:text-slate-400"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug" className="text-sm font-medium text-slate-600">
                                URL de la Tienda (Slug)
                            </Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-400">stockwear.com/</span>
                                <Input
                                    id="slug"
                                    placeholder="moda-urbana"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                    required
                                    disabled={loading}
                                    className="h-12 rounded-[16px] border-slate-200 bg-white/80 text-base text-slate-900 placeholder:text-slate-400"
                                />
                            </div>
                            <p className="text-xs text-slate-400 pl-1">
                                Identificador único para tu tienda en la URL.
                            </p>
                        </div>

                        <Button
                            type="submit"
                            className="h-12 w-full rounded-full bg-slate-900 text-base font-semibold text-white shadow-[0_18px_35px_rgba(15,18,30,0.25)] hover:bg-slate-800"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creando tienda...
                                </>
                            ) : (
                                <>
                                    Crear Tienda
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>
                </section>

                <section className="relative hidden h-[750px] overflow-hidden rounded-[44px] border border-white/80 bg-white shadow-[0_55px_140px_rgba(15,23,42,0.18)] lg:flex">
                    <div className="absolute inset-0 bg-slate-50/50" />
                    <div className="relative flex h-full w-full flex-col items-center justify-center p-12 text-center">
                        <div className="mb-8 rounded-3xl bg-white p-4 shadow-sm">
                            <Image src="/stockwear-icon.png" alt="StockWear" width={80} height={80} priority />
                        </div>
                        <h3 className="mb-4 text-2xl font-bold text-slate-900">Todo listo para empezar</h3>
                        <p className="mb-12 max-w-md text-slate-500">
                            Una vez creada tu tienda, podrás gestionar tu inventario, registrar empleados y comenzar a vender inmediatamente.
                        </p>

                        <div className="grid w-full max-w-lg gap-4">
                            {features.map((feature, index) => (
                                <div key={index} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-900">
                                        <feature.icon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">{feature.title}</p>
                                        <p className="text-sm text-slate-500">{feature.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
