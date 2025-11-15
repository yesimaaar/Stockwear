"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import * as LucideIcons from "lucide-react"
const { UserPlus, ShieldCheck } = LucideIcons
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GoogleIcon } from "@/components/icons/google-icon"
import { AuthService } from "@/lib/services/auth-service"

const phonePrefixes = [
  { value: "+52", label: "México (+52)" },
  { value: "+57", label: "Colombia (+57)" },
  { value: "+1", label: "Estados Unidos (+1)" },
  { value: "+34", label: "España (+34)" },
  { value: "+51", label: "Perú (+51)" },
  { value: "+56", label: "Chile (+56)" },
  { value: "+54", label: "Argentina (+54)" },
]

export default function RegisterPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [telefono, setTelefono] = useState("")
  const [prefijo, setPrefijo] = useState("+52")
  const [rol, setRol] = useState<"admin" | "empleado">("empleado")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    setLoading(true)

  const telefonoNormalizado = telefono.replace(/\D+/g, "")
    const telefonoConPrefijo = `${prefijo}${telefonoNormalizado}`

    const result = await AuthService.register({
      nombre: nombre.trim(),
      email: email.trim(),
      password,
      rol,
      telefono: telefonoConPrefijo,
    })

    if (!result.success) {
      setError(result.message || "No se pudo registrar al usuario")
      setLoading(false)
      return
    }

    setSuccess("Registro exitoso. Redirigiendo al inicio de sesión...")
    setLoading(false)

    setTimeout(() => {
      router.push("/login")
    }, 1500)
  }

  const handleGoogleSignup = async () => {
    if (googleLoading) return
    setError("")
    setSuccess("")
    setGoogleLoading(true)
    const result = await AuthService.signInWithGoogle()
    if (!result.success) {
      setError(result.message || "No se pudo continuar con Google")
      setGoogleLoading(false)
    }
  }

  return (
    <div className="force-light relative flex min-h-screen items-center overflow-hidden bg-gradient-to-br from-[#f8faff] via-[#f2f4fb] to-[#edf0f7]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(118,131,173,0.25),_transparent_55%)]" />
      <div className="relative mx-auto flex w-full max-w-[1300px] flex-col gap-12 px-6 py-12 text-slate-900 lg:flex-row lg:items-center lg:gap-16 lg:py-0">
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/60 bg-white/70 shadow-sm">
              <Image src="/stockwear-icon.png" alt="StockWear" width={48} height={48} priority />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">StockWear</p>
              <h1 className="text-4xl font-semibold text-slate-900">Crea tu cuenta profesional</h1>
            </div>
          </div>

          <p className="max-w-xl text-base text-slate-500">
            Mantén la operación alineada con roles claros y flujos compartidos. Configura accesos de administradores y empleados en minutos.
          </p>

          <div className="grid gap-4 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-[0_25px_90px_rgba(15,23,42,0.08)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-900">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Accesos para equipos</p>
                <p className="text-sm text-slate-500">Registra administradores y empleados con permisos diferenciados.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-900">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Seguridad reforzada</p>
                <p className="text-sm text-slate-500">Autenticación verificada y trazabilidad completa de las operaciones.</p>
              </div>
            </div>
          </div>
        </div>

        <section className="w-full max-w-lg rounded-[40px] border border-white/80 bg-white/95 p-8 shadow-[0_45px_120px_rgba(15,23,42,0.18)] backdrop-blur-xl">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Registro</p>
            <h2 className="text-3xl font-semibold text-slate-900">Completa tus datos</h2>
            <p className="text-sm text-slate-500">Una sola cuenta te da acceso a todos los módulos según tu rol.</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-sm font-medium text-slate-600">
                Nombre completo
              </Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Ana Martínez"
                required
                disabled={loading}
                className="h-12 rounded-[16px] border-slate-200 bg-white/90 text-slate-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-600">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nombre@stockwear.com"
                required
                disabled={loading}
                className="h-12 rounded-[16px] border-slate-200 bg-white/90 text-slate-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono" className="text-sm font-medium text-slate-600">
                Número de teléfono
              </Label>
              <div className="grid gap-2 sm:grid-cols-[minmax(120px,0.45fr)_1fr]">
                <Select value={prefijo} onValueChange={setPrefijo} disabled={loading}>
                  <SelectTrigger aria-label="Prefijo telefónico" className="h-12 rounded-[16px] border-slate-200 bg-white/90 text-slate-900">
                    <SelectValue placeholder="Prefijo" />
                  </SelectTrigger>
                  <SelectContent>
                    {phonePrefixes.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="telefono"
                  type="tel"
                  value={telefono}
                  onChange={(event) => setTelefono(event.target.value.replace(/\D+/g, ""))}
                  placeholder="1234567890"
                  inputMode="tel"
                  required
                  disabled={loading}
                  className="h-12 rounded-[16px] border-slate-200 bg-white/90 text-slate-900"
                />
              </div>
              <p className="text-xs text-slate-400">Escribe el número sin prefijo; lo añadiremos automáticamente.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-600">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="h-12 rounded-[16px] border-slate-200 bg-white/90 text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-600">
                  Confirmar contraseña
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="h-12 rounded-[16px] border-slate-200 bg-white/90 text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-600">Tipo de cuenta</Label>
              <div className="grid gap-4 sm:grid-cols-2">
                {[{
                  value: "empleado" as const,
                  label: "Empleado",
                  description: "Opera inventario y ventas",
                  icon: UserPlus,
                }, {
                  value: "admin" as const,
                  label: "Administrador",
                  description: "Configura y supervisa",
                  icon: ShieldCheck,
                }].map(({ value, label, description, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRol(value)}
                    disabled={loading}
                    className={cn(
                      "rounded-2xl border border-slate-200 bg-white/80 p-4 text-left transition-all hover:border-slate-300",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
                      rol === value
                        ? "border-slate-900 bg-slate-900 text-white shadow-[0_20px_45px_rgba(15,23,42,0.25)]"
                        : "text-slate-900",
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-2xl border",
                        rol === value ? "border-white/50 bg-white/20 text-white" : "border-slate-200 bg-slate-50 text-slate-600",
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{label}</p>
                        <p className={cn("text-xs", rol === value ? "text-white/80" : "text-slate-500")}>{description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600">{error}</p>
            ) : null}
            {success ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>
            ) : null}

            <div className="space-y-3">
              <Button
                type="submit"
                className="h-12 w-full rounded-full bg-slate-900 text-base font-semibold text-white shadow-[0_18px_35px_rgba(15,18,30,0.25)]"
                disabled={loading || googleLoading}
              >
                {loading ? "Registrando..." : "Crear cuenta"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignup}
                disabled={loading || googleLoading}
                className="h-12 w-full rounded-full border-slate-200 bg-white/80 text-base font-semibold text-slate-700 hover:bg-white"
              >
                <GoogleIcon className="mr-2 h-5 w-5" />
                {googleLoading ? "Conectando con Google..." : "Registrarse con Google"}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?
            <Link href="/login" className="ml-1 font-semibold text-slate-900 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
