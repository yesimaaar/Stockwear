"use client"

import { useCallback, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { 
  Bell, 
  Database, 
  Settings, 
  Store, 
  CreditCard, 
  Facebook, 
  Instagram, 
  Plus, 
  X,
  Crown,
  Palette,
  Moon,
  Sun
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GlobalExcelActions } from "@/features/configuracion/components/global-excel-actions"
import { PaymentMethodsSettings } from "@/features/configuracion/components/payment-methods-settings"
import { SubscriptionCard } from "@/components/admin/subscription-card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getStoreSettings, updateStoreSettings } from "@/app/actions/store-actions"
import { uploadStoreLogo } from "@/features/stores/services/store-image-service"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import Image from "next/image"

type TabId = "tienda" | "suscripcion" | "apariencia" | "notificaciones" | "datos"

interface NavItem {
  id: TabId
  label: string
  icon: React.ElementType
  description: string
}

const navItems: NavItem[] = [
  { id: "tienda", label: "Mi Tienda", icon: Store, description: "Catálogo y métodos de pago" },
  { id: "suscripcion", label: "Suscripción", icon: Crown, description: "Plan y facturación" },
  { id: "apariencia", label: "Apariencia", icon: Palette, description: "Tema y personalización" },
  { id: "notificaciones", label: "Notificaciones", icon: Bell, description: "Alertas y avisos" },
  { id: "datos", label: "Datos", icon: Database, description: "Respaldo y gestión" },
]

export default function ConfiguracionPage() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>("tienda")

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeToggle = useCallback(
    (checked: boolean) => {
      setTheme(checked ? "dark" : "light")
    },
    [setTheme],
  )

  const isDarkMode = mounted && resolvedTheme === "dark"

  const activeNavItem = navItems.find(item => item.id === activeTab)

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8 min-h-[calc(100vh-8rem)]">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-72 shrink-0">
        <div className="sticky top-20">
          <div className="flex items-center gap-2 px-2 mb-6">
            <Settings className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Configuración</h2>
          </div>
          
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all ${
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isActive ? "" : "text-foreground"}`}>
                      {item.label}
                    </p>
                    <p className={`text-xs truncate ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {item.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            {activeNavItem && <activeNavItem.icon className="h-6 w-6 text-primary" />}
            <div>
              <h3 className="text-xl font-semibold">{activeNavItem?.label}</h3>
              <p className="text-sm text-muted-foreground">{activeNavItem?.description}</p>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300" key={activeTab}>
          
          {/* ============ MI TIENDA ============ */}
          {activeTab === "tienda" && (
            <>
              <CatalogConfigCard />
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>Métodos de Pago</CardTitle>
                      <CardDescription>Configura cómo pueden pagar tus clientes</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <PaymentMethodsSettings />
                </CardContent>
              </Card>
            </>
          )}

          {/* ============ SUSCRIPCIÓN ============ */}
          {activeTab === "suscripcion" && (
            <>
              <SubscriptionCard />
              
              <Card>
                <CardHeader>
                  <CardTitle>Historial de Facturación</CardTitle>
                  <CardDescription>Revisa tus pagos anteriores</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CreditCard className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No hay facturas disponibles</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Las facturas aparecerán aquí cuando realices pagos
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ============ APARIENCIA ============ */}
          {activeTab === "apariencia" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Tema de la Aplicación</CardTitle>
                  <CardDescription>Personaliza cómo se ve el sistema en tu dispositivo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                    <div className="flex items-center gap-3">
                      {isDarkMode ? (
                        <Moon className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Sun className="h-5 w-5 text-amber-500" />
                      )}
                      <div>
                        <Label className="text-base font-medium">Modo Oscuro</Label>
                        <p className="text-sm text-muted-foreground">
                          {isDarkMode ? "Activo - Reduce la fatiga visual" : "Inactivo - Tema claro"}
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={isDarkMode}
                      onCheckedChange={handleThemeToggle}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Idioma y Región</CardTitle>
                  <CardDescription>Preferencias de localización</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                    <div>
                      <Label className="text-base font-medium">Idioma</Label>
                      <p className="text-sm text-muted-foreground">Español (Colombia)</p>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      Próximamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ============ NOTIFICACIONES ============ */}
          {activeTab === "notificaciones" && (
            <Card>
              <CardHeader>
                <CardTitle>Preferencias de Alertas</CardTitle>
                <CardDescription>Decide cuándo y cómo quieres ser notificado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Alertas de stock bajo</Label>
                    <p className="text-sm text-muted-foreground">
                      Recibe un aviso cuando un producto tenga menos de 5 unidades
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Reporte diario de ventas</Label>
                    <p className="text-sm text-muted-foreground">
                      Recibe un resumen por email al cierre de caja
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Nuevos pedidos</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificación instantánea cuando llegue un pedido por WhatsApp
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Actualizaciones del sistema</Label>
                    <p className="text-sm text-muted-foreground">
                      Recibe información sobre nuevas funciones y mejoras
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ============ DATOS ============ */}
          {activeTab === "datos" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Importar y Exportar</CardTitle>
                  <CardDescription>Herramientas para administración masiva de inventario</CardDescription>
                </CardHeader>
                <CardContent>
                  <GlobalExcelActions />
                </CardContent>
              </Card>

              <Card className="border-red-200 dark:border-red-900/50">
                <CardHeader>
                  <CardTitle className="text-red-600 dark:text-red-400">Zona de Peligro</CardTitle>
                  <CardDescription>Estas acciones son permanentes e irreversibles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-red-200 dark:border-red-900/50 rounded-lg bg-red-50/50 dark:bg-red-900/10">
                    <div>
                      <p className="font-medium">Eliminar todos los productos</p>
                      <p className="text-sm text-muted-foreground">
                        Borra permanentemente todos los productos e inventario
                      </p>
                    </div>
                    <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20">
                      Eliminar productos
                    </Button>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-red-200 dark:border-red-900/50 rounded-lg bg-red-50/50 dark:bg-red-900/10">
                    <div>
                      <p className="font-medium">Restablecer configuración</p>
                      <p className="text-sm text-muted-foreground">
                        Vuelve a los valores predeterminados del sistema
                      </p>
                    </div>
                    <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20">
                      Restablecer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// CATALOG CONFIG CARD COMPONENT
// ============================================================================

function CatalogConfigCard() {
  const [whatsapp, setWhatsapp] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [socials, setSocials] = useState<{ facebook?: string; instagram?: string }>({})
  const { toast } = useToast()

  useEffect(() => {
    let active = true
    const load = async () => {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) return

      const res = await getStoreSettings(token)
      if (active && res.success && res.data) {
        setWhatsapp(res.data.whatsapp ?? "")
        setLogoUrl(res.data.logo_url ?? "")
        setSocials({
          facebook: res.data.facebook ?? undefined,
          instagram: res.data.instagram ?? undefined
        })
      }
      if (active) setLoading(false)
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        toast({ title: "Error", description: "No hay sesión activa", variant: "destructive" })
        return
      }

      const res = await updateStoreSettings({
        whatsapp,
        logo_url: logoUrl,
        facebook: socials.facebook ?? null,
        instagram: socials.instagram ?? null
      }, token)

      if (res.success) {
        toast({ title: "Guardado", description: "Configuración actualizada correctamente" })
      } else {
        toast({ title: "Error", description: res.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Ocurrió un error al guardar", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      if (!token) throw new Error("No session")

      const settingsRes = await getStoreSettings(token)
      if (!settingsRes.success || !settingsRes.data?.id) {
        throw new Error("No se pudo obtener el ID de la tienda")
      }

      const { url } = await uploadStoreLogo(file, settingsRes.data.id)
      setLogoUrl(url)
      toast({ title: "Logo subido", description: "Recuerda guardar los cambios para aplicar el nuevo logo." })

    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "No se pudo subir el logo", variant: "destructive" })
    } finally {
      setUploadingLogo(false)
      e.target.value = ""
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Catálogo Público</CardTitle>
            <CardDescription>Configura cómo ven tu tienda los clientes</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo */}
        <div className="space-y-3">
          <Label className="text-base">Logo de la tienda</Label>
          <div className="flex items-start gap-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-xl border-2 border-dashed bg-muted flex items-center justify-center">
              {logoUrl ? (
                <Image src={logoUrl} alt="Logo" fill className="object-cover" />
              ) : (
                <Store className="h-8 w-8 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={loading || uploadingLogo}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Imagen cuadrada recomendada. Máximo 2MB. Formatos: JPG, PNG, WebP.
              </p>
            </div>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="space-y-2">
          <Label htmlFor="whatsapp" className="text-base">WhatsApp para pedidos</Label>
          <Input
            id="whatsapp"
            placeholder="Ej: 573001234567"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Los pedidos del catálogo se enviarán a este número. Incluye el código del país.
          </p>
        </div>

        {/* Redes Sociales */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">Redes Sociales</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Plus className="h-4 w-4" />
                  Agregar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setSocials(prev => ({ ...prev, facebook: prev.facebook || "" }))}
                  disabled={socials.facebook !== undefined}
                >
                  <Facebook className="mr-2 h-4 w-4 text-blue-600" />
                  Facebook
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSocials(prev => ({ ...prev, instagram: prev.instagram || "" }))}
                  disabled={socials.instagram !== undefined}
                >
                  <Instagram className="mr-2 h-4 w-4 text-pink-600" />
                  Instagram
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-3">
            {socials.facebook !== undefined && (
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <Facebook className="h-5 w-5" />
                </div>
                <Input
                  placeholder="https://facebook.com/tu-tienda"
                  value={socials.facebook}
                  onChange={(e) => setSocials(prev => ({ ...prev, facebook: e.target.value }))}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setSocials(prev => {
                    const newSocials = { ...prev }
                    delete newSocials.facebook
                    return newSocials
                  })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {socials.instagram !== undefined && (
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-pink-50 text-pink-600 dark:bg-pink-950 dark:text-pink-400">
                  <Instagram className="h-5 w-5" />
                </div>
                <Input
                  placeholder="https://instagram.com/tu-tienda"
                  value={socials.instagram}
                  onChange={(e) => setSocials(prev => ({ ...prev, instagram: e.target.value }))}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setSocials(prev => {
                    const newSocials = { ...prev }
                    delete newSocials.instagram
                    return newSocials
                  })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {socials.facebook === undefined && socials.instagram === undefined && (
              <p className="text-sm text-muted-foreground py-2">
                Agrega tus redes sociales para mostrarlas en el catálogo
              </p>
            )}
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading || saving || uploadingLogo} className="w-full">
          {saving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </CardContent>
    </Card>
  )
}
