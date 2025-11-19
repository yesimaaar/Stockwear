"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import * as LucideIcons from "lucide-react"
const {
  Users,
  Plus,
  Mail,
  Shield,
  Loader2,
  Search,
  X,
  Filter,
  RefreshCw,
} = LucideIcons
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { AdminSectionLayout } from "@/components/admin-section-layout"
import { InviteUserDialog } from "@/components/admin/invite-user-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { AuthService } from "@/lib/services/auth-service"
import type { Usuario } from "@/lib/types"

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
})

const usuarioFormSchema = z.object({
  nombre: z.string().min(2, "Ingresa al menos 2 caracteres"),
  email: z.string().email("Introduce un correo válido"),
  telefono: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? ""),
  rol: z.enum(["admin", "empleado"]),
  estado: z.enum(["activo", "inactivo"]),
})

type UsuarioFormValues = z.infer<typeof usuarioFormSchema>

type RolFilter = "todos" | "admin" | "empleado"
type EstadoFilter = "todos" | "activo" | "inactivo"

type UsuariosMetrics = {
  total: number
  activos: number
  inactivos: number
  admins: number
  empleados: number
}

const DEFAULT_FORM_VALUES: UsuarioFormValues = {
  nombre: "",
  email: "",
  telefono: "",
  rol: "empleado",
  estado: "activo",
}

const ROL_LABEL: Record<Usuario["rol"], string> = {
  admin: "Administrador",
  empleado: "Empleado",
}

const ESTADO_VARIANT: Record<Usuario["estado"], "default" | "secondary"> = {
  activo: "default",
  inactivo: "secondary",
}

function getInitials(nombre: string): string {
  const parts = nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return "U"
  const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase())
  return initials.join("")
}

function formatDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "Sin registro"
  }
  return DATE_FORMATTER.format(parsed)
}

export default function UsuariosPage() {
  const { toast } = useToast()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [rolFilter, setRolFilter] = useState<RolFilter>("todos")
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>("todos")
  const [updatingEstadoId, setUpdatingEstadoId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState<Usuario | null>(null)
  const [saving, setSaving] = useState(false)

  const form = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioFormSchema),
    mode: "onBlur",
    defaultValues: DEFAULT_FORM_VALUES,
  })

  const fetchUsuarios = useCallback(
    async (showFullLoader: boolean) => {
      if (showFullLoader) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      try {
        const data = await AuthService.getAll()
        setUsuarios(data)
      } catch (error) {
        console.error("Error al cargar usuarios", error)
        toast({
          title: "No se pudo cargar la lista",
          description: "Intenta nuevamente en unos segundos.",
          variant: "destructive",
        })
      } finally {
        if (showFullLoader) {
          setLoading(false)
        } else {
          setRefreshing(false)
        }
      }
    },
    [toast],
  )

  useEffect(() => {
    void fetchUsuarios(true)
  }, [fetchUsuarios])

  useEffect(() => {
    if (usuarioEnEdicion) {
      form.reset({
        nombre: usuarioEnEdicion.nombre,
        email: usuarioEnEdicion.email,
        telefono: usuarioEnEdicion.telefono ?? "",
        rol: usuarioEnEdicion.rol,
        estado: usuarioEnEdicion.estado,
      })
    } else {
      form.reset(DEFAULT_FORM_VALUES)
    }
  }, [usuarioEnEdicion, form])

  const metrics: UsuariosMetrics = useMemo(() => {
    const total = usuarios.length
    const activos = usuarios.filter((usuario) => usuario.estado === "activo").length
    const admins = usuarios.filter((usuario) => usuario.rol === "admin").length
    return {
      total,
      activos,
      inactivos: total - activos,
      admins,
      empleados: total - admins,
    }
  }, [usuarios])

  const filteredUsuarios = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return usuarios.filter((usuario) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        usuario.nombre.toLowerCase().includes(normalizedSearch) ||
        usuario.email.toLowerCase().includes(normalizedSearch)

      const matchesRol = rolFilter === "todos" || usuario.rol === rolFilter
      const matchesEstado = estadoFilter === "todos" || usuario.estado === estadoFilter

      return matchesSearch && matchesRol && matchesEstado
    })
  }, [usuarios, searchTerm, rolFilter, estadoFilter])

  const handleRefresh = () => {
    void fetchUsuarios(false)
  }

  const handleOpenEditor = (usuario: Usuario) => {
    setUsuarioEnEdicion(usuario)
    setEditorOpen(true)
  }

  const handleEditorStateChange = (open: boolean) => {
    setEditorOpen(open)
    if (!open) {
      setUsuarioEnEdicion(null)
      setSaving(false)
    }
  }

  const handleToggleEstado = async (usuario: Usuario) => {
    const nextEstado = usuario.estado === "activo" ? "inactivo" : "activo"
    setUpdatingEstadoId(usuario.id)
    try {
      const updated = await AuthService.updateUsuario(usuario.id, { estado: nextEstado })
      if (!updated) {
        throw new Error("Sin respuesta")
      }
      setUsuarios((previous) =>
        previous.map((entry) => (entry.id === updated.id ? updated : entry)),
      )
      toast({
        title: nextEstado === "activo" ? "Usuario activado" : "Usuario desactivado",
        description: `${updated.nombre} ahora está ${nextEstado === "activo" ? "activo" : "inactivo"}.`,
      })
    } catch (error) {
      console.error("Error al actualizar el estado", error)
      toast({
        title: "No se pudo actualizar el estado",
        description: "Intenta de nuevo en unos segundos.",
        variant: "destructive",
      })
    } finally {
      setUpdatingEstadoId(null)
    }
  }

  const onSubmit = async (values: UsuarioFormValues) => {
    if (!usuarioEnEdicion) return

    setSaving(true)
    try {
      const updated = await AuthService.updateUsuario(usuarioEnEdicion.id, {
        nombre: values.nombre.trim(),
        email: values.email.trim().toLowerCase(),
        telefono: values.telefono ? values.telefono.trim() : null,
        rol: values.rol,
        estado: values.estado,
      })

      if (!updated) {
        throw new Error("No se recibió respuesta")
      }

      setUsuarios((previous) =>
        previous.map((entry) => (entry.id === updated.id ? updated : entry)),
      )
      toast({
        title: "Usuario actualizado",
        description: "La información se guardó correctamente.",
      })
      handleEditorStateChange(false)
    } catch (error) {
      console.error("Error al guardar el usuario", error)
      toast({
        title: "No se pudo guardar",
        description: "Revisa los datos e inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AdminSectionLayout
        title="Usuarios"
        description="Gestiona los accesos del equipo, asigna roles y controla el estado de cada cuenta."
        icon={<Users className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
            >
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Actualizar
            </Button>
            <InviteUserDialog onUserInvited={() => void fetchUsuarios(false)} />
          </div>
        }
        sidebar={
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Resumen
              </h3>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Usuarios totales</span>
                  <span className="text-lg font-semibold text-foreground">{metrics.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Activos</span>
                  <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                    {metrics.activos}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Inactivos</span>
                  <span className="text-base font-semibold text-amber-600 dark:text-amber-400">
                    {metrics.inactivos}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Roles
              </h4>
              <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 text-primary" />
                    Administradores
                  </div>
                  <span className="font-semibold text-foreground">{metrics.admins}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Empleados
                  </div>
                  <span className="font-semibold text-foreground">{metrics.empleados}</span>
                </div>
              </div>
            </div>
          </div>
        }
      >
        <Card className="rounded-3xl border border-border shadow-sm">
          <CardContent className="space-y-6 p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="w-full lg:max-w-md">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Busca por nombre o correo"
                    className="pl-9 pr-10"
                  />
                  {searchTerm.length > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setSearchTerm("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  Filtros
                </div>
                <Select value={rolFilter} onValueChange={(value) => setRolFilter(value as RolFilter)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los roles</SelectItem>
                    <SelectItem value="admin">Administradores</SelectItem>
                    <SelectItem value="empleado">Empleados</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={estadoFilter}
                  onValueChange={(value) => setEstadoFilter(value as EstadoFilter)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="activo">Activos</SelectItem>
                    <SelectItem value="inactivo">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`usuario-skeleton-${index}`}
                    className="h-16 w-full animate-pulse rounded-2xl border border-border bg-muted/40"
                  />
                ))}
              </div>
            ) : filteredUsuarios.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                No encontramos usuarios con los filtros seleccionados.
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead>Usuario</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsuarios.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold uppercase text-primary">
                              {getInitials(usuario.nombre)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{usuario.nombre}</p>
                              <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                <span>{usuario.email}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={usuario.rol === "admin" ? "default" : "secondary"}>
                            {ROL_LABEL[usuario.rol]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ESTADO_VARIANT[usuario.estado]}>
                            {usuario.estado === "activo" ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(usuario.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditor(usuario)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant={usuario.estado === "activo" ? "outline" : "secondary"}
                              size="sm"
                              onClick={() => void handleToggleEstado(usuario)}
                              disabled={updatingEstadoId === usuario.id}
                            >
                              {updatingEstadoId === usuario.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              {usuario.estado === "activo" ? "Desactivar" : "Activar"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </AdminSectionLayout>

      <Sheet open={editorOpen} onOpenChange={handleEditorStateChange}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Editar usuario</SheetTitle>
            <SheetDescription>
              Actualiza los datos del usuario seleccionado. Los cambios se aplican de inmediato.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <Form {...form}>
              <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Ana Rodríguez" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="usuario@empresa.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. 3001234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="rol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un rol" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="empleado">Empleado</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un estado" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="activo">Activo</SelectItem>
                              <SelectItem value="inactivo">Inactivo</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <SheetFooter className="flex flex-row items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleEditorStateChange(false)}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Guardar cambios
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
