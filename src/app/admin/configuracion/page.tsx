"use client"

import { useCallback, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Bell, Shield, Database, Palette, Settings, Store, CreditCard, Users, FileText, Check } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GlobalExcelActions } from "@/features/configuracion/components/global-excel-actions"
import { PaymentMethodsSettings } from "@/features/configuracion/components/payment-methods-settings"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

export default function ConfiguracionPage() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("general")

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

  return (
    <div className="flex flex-col gap-6 md:flex-row md:gap-8 min-h-[calc(100vh-8rem)]">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 space-y-4 shrink-0">
        <div className="flex flex-col gap-2">
           <h2 className="text-2xl font-bold px-2 mb-4">Configuración</h2>
           <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
             <Button
                variant={activeTab === "general" ? "secondary" : "ghost"}
                className="justify-start gap-2 h-10 px-4 font-normal"
                onClick={() => setActiveTab("general")}
             >
                <Settings className="h-4 w-4" />
                General
             </Button>
             <Button
                variant={activeTab === "pagos" ? "secondary" : "ghost"}
                className="justify-start gap-2 h-10 px-4 font-normal"
                onClick={() => setActiveTab("pagos")}
             >
                <CreditCard className="h-4 w-4" />
                Pagos y Facturación
             </Button>
             <Button
                variant={activeTab === "notificaciones" ? "secondary" : "ghost"}
                className="justify-start gap-2 h-10 px-4 font-normal"
                onClick={() => setActiveTab("notificaciones")}
             >
                <Bell className="h-4 w-4" />
                Notificaciones
             </Button>
             <Button
                variant={activeTab === "datos" ? "secondary" : "ghost"}
                className="justify-start gap-2 h-10 px-4 font-normal"
                onClick={() => setActiveTab("datos")}
             >
                <Database className="h-4 w-4" />
                Datos y Respaldo
             </Button>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6">
        {/* Header mobile only */}
        <div className="md:hidden pb-4 border-b">
           <h3 className="text-lg font-semibold capitalize">{activeTab.replace("-", " ")}</h3>
        </div>

        {activeTab === "general" && (
           <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
              <CatalogConfigCard />

              <Card>
                <CardHeader>
                  <CardTitle>Apariencia</CardTitle>
                  <CardDescription>Personaliza cómo se ve el sistema en tu dispositivo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Modo Oscuro</Label>
                      <p className="text-sm text-muted-foreground">Cambia entre tema claro y oscuro.</p>
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
                   <CardTitle>Información del Plan</CardTitle>
                   <CardDescription>Detalles de tu suscripción</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                   <div className="p-4 border rounded-lg bg-card/50 flex flex-col gap-2">
                        <Label className="text-muted-foreground">Plan Actual</Label>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">Pro</span>
                            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Activo</Badge>
                        </div>
                    </div>
                 </CardContent>
              </Card>
           </div>
        )}

        {activeTab === "pagos" && (
           <div className="animate-in fade-in slide-in-from-left-4 duration-300">
               <PaymentMethodsSettings />
           </div>
        )}

        {activeTab === "notificaciones" && (
           <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
              <Card>
                <CardHeader>
                  <CardTitle>Preferencias de Alertas</CardTitle>
                  <CardDescription>Decide cuándo y cómo quieres ser notificado.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
                      <div className="space-y-0.5">
                        <Label>Alertas de stock bajo</Label>
                        <p className="text-sm text-muted-foreground">Recibe un aviso cuando un producto tenga menos de 5 unidades.</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
                      <div className="space-y-0.5">
                        <Label>Reporte diario de ventas</Label>
                        <p className="text-sm text-muted-foreground">Recibe un resumen por email al cierre de caja.</p>
                      </div>
                      <Switch />
                    </div>
                </CardContent>
              </Card>
           </div>
        )}

        {activeTab === "datos" && (
           <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Datos</CardTitle>
                  <CardDescription>Herramientas para administración masiva de inventario.</CardDescription>
                </CardHeader>
                <CardContent>
                   <GlobalExcelActions />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-red-500">Zona de Peligro</CardTitle>
                  <CardDescription>Acciones irreversibles.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Button variant="destructive" variant="outline" className="w-full sm:w-auto">
                      Restablecer configuración de fábrica
                   </Button>
                </CardContent>
              </Card>
           </div>
        )}
      </div>
    </div>
  )
}

import { getStoreSettings, updateStoreSettings } from "@/app/actions/store-actions"
import { uploadStoreLogo } from "@/features/stores/services/store-image-service"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import Image from "next/image"
// Remove duplicate Store import from lucide-react since it is already imported at the top
// import { Store } from "lucide-react"

function CatalogConfigCard() {
  const [whatsapp, setWhatsapp] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
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

      const res = await updateStoreSettings({ whatsapp, logo_url: logoUrl }, token)
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

      // We need the store ID to upload. Since we don't have it readily available in the component state
      // (we only fetched settings), we might need to fetch it or update the upload service to handle it.
      // However, the upload service requires storeId.
      // Let's re-fetch settings to get the ID if we didn't store it, or just fetch the user profile to get the store ID.
      // Actually, getStoreSettings returns the ID. Let's store it in state.

      // Wait, I didn't store the ID in the state above. Let me fix that in the next iteration or just fetch it now.
      // To be clean, let's fetch the store ID first.

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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-pink-500">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Catálogo</CardTitle>
            <CardDescription>Configuración de tu tienda pública</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp para pedidos</Label>
          <Input
            id="whatsapp"
            placeholder="Ej: 573001234567"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Este número recibirá los pedidos realizados a través del catálogo.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Logo de la tienda</Label>
          <div className="flex items-start gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-lg border bg-muted">
              {logoUrl ? (
                <Image src={logoUrl} alt="Logo" fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  Sin logo
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={loading || uploadingLogo}
              />
              <p className="text-xs text-muted-foreground">
                Sube una imagen cuadrada para mejor visualización. (Max 2MB)
              </p>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading || saving || uploadingLogo} className="w-full">
          {saving ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </CardContent>
    </Card>
  )
}
