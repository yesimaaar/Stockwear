"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthService } from "@/features/auth/services/auth-service"

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [error, setError] = useState("")
    const [successMessage, setSuccessMessage] = useState("")
    const [loading, setLoading] = useState(false)

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
        <div className="force-light relative flex min-h-screen items-center overflow-hidden bg-gradient-to-br from-[#f8faff] via-[#f2f4fb] to-[#edf0f7]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(118,131,173,0.25),_transparent_55%)]" />

            <div className="relative mx-auto flex w-full max-w-md flex-col justify-center gap-8 px-6 py-12 text-slate-900">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50">
                        <Image src="/stockwear-icon.png" alt="StockWear" width={40} height={40} priority />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">StockWear</p>
                        <p className="text-3xl font-semibold text-slate-900">Recuperar contraseña</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-slate-600">
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
                            className="h-12 rounded-[16px] border-slate-200 bg-white/80 text-base text-slate-900 placeholder:text-slate-400"
                        />
                    </div>

                    {error ? (
                        <div className="rounded-[16px] border border-red-200 bg-red-50/80 p-3 text-sm text-red-600">{error}</div>
                    ) : null}

                    {successMessage ? (
                        <div className="rounded-[16px] border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-600">
                            {successMessage}
                        </div>
                    ) : null}

                    <Button
                        type="submit"
                        className="h-12 w-full rounded-full bg-slate-900 text-base font-semibold text-white shadow-[0_18px_35px_rgba(15,18,30,0.25)]"
                        disabled={loading || !!successMessage}
                    >
                        {loading ? "Enviando..." : "Enviar instrucciones"}
                        {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>

                    <Link
                        href="/login"
                        className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al inicio de sesión
                    </Link>
                </form>
            </div>
        </div>
    )
}
