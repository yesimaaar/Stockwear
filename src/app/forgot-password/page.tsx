"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useTheme } from "next-themes"
import { ArrowRight, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthService } from "@/features/auth/services/auth-service"

export default function ForgotPasswordPage() {
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [email, setEmail] = useState("")
    const [error, setError] = useState("")
    const [successMessage, setSuccessMessage] = useState("")
    const [loading, setLoading] = useState(false)

    const logoSrc = resolvedTheme === "dark" ? "/stockwear-icon-white.png" : "/stockwear-icon.png"

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError("")
        setSuccessMessage("")
        setLoading(true)

        try {
            const result = await AuthService.resetPasswordForEmail(email.trim())

            if (!result.success) {
                setError(result.message || "Error al enviar el correo de recuperación")
                return
            }

            setSuccessMessage(result.message || "Correo enviado correctamente")
        } catch (_error) {
            setError("Ocurrió un problema al enviar la solicitud")
        } finally {
            setLoading(false)
        }
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
                        <p className="text-3xl font-semibold text-foreground">Recuperar contraseña</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                            Correo electrónico
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="tu-email@stockwear.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            disabled={loading || !!successMessage}
                            className="h-12 rounded-[16px] border-border bg-card text-base text-foreground placeholder:text-muted-foreground"
                        />
                    </div>

                    {error ? (
                        <div className="rounded-[16px] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
                    ) : null}

                    {successMessage ? (
                        <div className="rounded-[16px] border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
                            {successMessage}
                        </div>
                    ) : null}

                    <Button
                        type="submit"
                        className="h-12 w-full rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-lg dark:bg-indigo-600 dark:hover:bg-indigo-500"
                        disabled={loading || !!successMessage}
                    >
                        {loading ? "Enviando..." : "Enviar instrucciones"}
                        {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>

                    <Link
                        href="/login"
                        className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al inicio de sesión
                    </Link>
                </form>
            </div>
        </div>
    )
}
