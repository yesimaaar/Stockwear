"use client"

import { useCallback, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Bell, Shield, Database, Palette } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GlobalExcelActions } from "@/features/configuracion/components/global-excel-actions"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function ConfiguracionPage() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

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
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Configuración</h2>
        <p className="text-muted-foreground">Ajustes generales del sistema</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-indigo-500">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Notificaciones</CardTitle>
                <CardDescription>Gestionar alertas del sistema</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="stock-alerts">Alertas de stock bajo</Label>
              <Switch id="stock-alerts" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notifications">Notificaciones por email</Label>
              <Switch id="email-notifications" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-emerald-500">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Seguridad</CardTitle>
                <CardDescription>Configuración de acceso</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="two-factor">Autenticación de dos factores</Label>
              <Switch id="two-factor" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="session-timeout">Cerrar sesión automático</Label>
              <Switch id="session-timeout" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-purple-500">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Base de Datos</CardTitle>
                <CardDescription>Mantenimiento y respaldos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Inventario</h4>
              <div className="flex flex-col gap-2">
                <GlobalExcelActions />
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Sistema</h4>
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="w-full bg-transparent">
                  Crear respaldo
                </Button>
                <Button variant="outline" className="w-full bg-transparent">
                  Restaurar datos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-orange-500">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Apariencia</CardTitle>
                <CardDescription>Personalizar interfaz</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode">Modo oscuro</Label>
              <Switch id="dark-mode" checked={isDarkMode} onCheckedChange={handleThemeToggle} disabled={!mounted} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="compact-view">Vista compacta</Label>
              <Switch id="compact-view" />
            </div>
          </CardContent>
        </Card>

        <CatalogConfigCard />
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
import { Store } from "lucide-react"

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
