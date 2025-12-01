"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useTheme } from "next-themes"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthService } from "@/features/auth/services/auth-service"
import { supabase } from "@/lib/supabase"

export default function UpdatePasswordPage() {
    const router = useRouter()
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [checkingSession, setCheckingSession] = useState(true)

    const logoSrc = resolvedTheme === "dark" ? "/stockwear-icon-white.png" : "/stockwear-icon.png"

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        const checkSession = async () => {
            const { data } = await supabase.auth.getSession()
            if (!data.session) {
                // If no session, redirect to login (or show error)
                // In the reset flow, Supabase should have set the session from the link
                router.replace("/login")
            } else {
                setCheckingSession(false)
            }
        }
        checkSession()
    }, [router])

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError("")
        setLoading(true)

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden")
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres")
            setLoading(false)
            return
        }

        try {
            const result = await AuthService.updatePassword(password)

            if (!result.success) {
                setError(result.message || "Error al actualizar la contraseña")
                return
            }

            // Redirect to dashboard or login
            router.push("/")
        } catch (_error) {
            setError("Ocurrió un problema al actualizar la contraseña")
        } finally {
            setLoading(false)
        }
    }

    if (checkingSession) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-foreground/30 border-t-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">Verificando enlace...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="relative flex min-h-screen items-center overflow-hidden bg-background">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(118,131,173,0.15),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.15),_transparent_55%)]" />

            <div className="relative mx-auto flex w-full max-w-md flex-col justify-center gap-8 px-6 py-12 text-foreground">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card">
                        {mounted && <Image src={logoSrc} alt="StockWear" width={40} height={40} priority />}
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">StockWear</p>
                        <p className="text-3xl font-semibold text-foreground">Nueva contraseña</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                            Nueva contraseña
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            disabled={loading}
                            className="h-12 rounded-[16px] border-border bg-card text-base text-foreground placeholder:text-muted-foreground"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-muted-foreground">
                            Confirmar contraseña
                        </Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            required
                            disabled={loading}
                            className="h-12 rounded-[16px] border-border bg-card text-base text-foreground placeholder:text-muted-foreground"
                        />
                    </div>

                    {error ? (
                        <div className="rounded-[16px] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
                    ) : null}

                    <Button
                        type="submit"
                        className="h-12 w-full rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-lg dark:bg-indigo-600 dark:hover:bg-indigo-500"
                        disabled={loading}
                    >
                        {loading ? "Actualizando..." : "Actualizar contraseña"}
                        {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                </form>
            </div>
        </div>
    )
}
