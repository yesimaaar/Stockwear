"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Head from "next/head"
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

  return (
    <>
      <Head>
        <title>Crear cuenta | StockWear</title>
      </Head>

  <div className="relative grid min-h-screen w-full grid-cols-1 overflow-y-auto bg-background text-foreground lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="relative hidden items-center justify-center overflow-hidden bg-[#050507] text-primary-foreground lg:flex">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.22),transparent_55%)] opacity-80" />
          <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
          <div className="relative z-10 w-full max-w-lg space-y-8 px-12 py-16">
            <div className="flex items-center gap-3">
              <Image src="/stockwear-icon.png" alt="StockWear" width={90} height={90} />
              <span className="text-2xl font-semibold">StockWear</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight text-balance">Crea tu acceso a StockWear</h1>
              <p className="text-lg text-primary-foreground/80">
                Organiza tu inventario, colabora con tu equipo y mantén los datos seguros según el rol que elijas.
              </p>
            </div>

            <div className="grid gap-4 rounded-2xl border border-white/15 bg-white/10 p-8 backdrop-blur-md">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Accesos para equipos</p>
                  <p className="text-sm text-primary-foreground/75">Registra administradores y empleados con permisos diferenciados.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Seguridad reforzada</p>
                  <p className="text-sm text-primary-foreground/75">Valida los datos y protege tus operaciones con autenticación verificada.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-full w-full items-center justify-center bg-background px-6 py-12 lg:px-12">
          <div className="w-full max-w-md space-y-8">
            <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
              <Image src="/stockwear-icon.png" alt="StockWear" width={72} height={72} />
              <span className="text-xl font-semibold">StockWear</span>
            </div>

            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-3xl font-semibold text-foreground">Crear cuenta</h2>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-sm text-muted-foreground">
                  Nombre completo
                </Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  placeholder="Ana Martínez"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-muted-foreground">
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono" className="text-sm text-muted-foreground">
                  Número de teléfono
                </Label>
                <div className="grid gap-2 sm:grid-cols-[minmax(120px,0.4fr)_1fr]">
                  <Select value={prefijo} onValueChange={setPrefijo} disabled={loading}>
                    <SelectTrigger aria-label="Prefijo telefónico">
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
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Escribe el número sin prefijo; lo añadiremos automáticamente.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm text-muted-foreground">
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm text-muted-foreground">
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
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Tipo de cuenta</Label>
                <div className="grid gap-3 sm:grid-cols-2">
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
                        "rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                        "hover:border-primary/60 hover:bg-accent/60",
                        rol === value
                          ? "border-primary bg-primary text-primary-foreground shadow-[0_16px_32px_-22px_rgba(99,102,241,0.9)]"
                          : "border-border/60 bg-background",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full border",
                          rol === value ? "border-primary-foreground bg-primary-foreground/20" : "border-border/50 bg-muted/40",
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">{label}</p>
                          <p className="text-xs text-muted-foreground/90">{description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              {success && (
                <p className="rounded-md border border-emerald-200/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                  {success}
                </p>
              )}

              <Button type="submit" className="h-11 w-full text-base font-medium" disabled={loading}>
                {loading ? "Registrando..." : "Crear cuenta"}
              </Button>
            </form>

            <div className="space-y-2 border-t border-border/60 pt-6 text-center">
              <p className="text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Inicia sesión
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
