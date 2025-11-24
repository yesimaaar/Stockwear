"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Users,
  Plus,
  Mail,
  Shield,
  Loader2,
  Search,
  X,
  Filter,
  Trash2,
  Moon,
  MoreVertical,
  Clock,
} from "lucide-react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { AdminSectionLayout } from "@/components/domain/admin-section-layout"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { AuthService } from "@/features/auth/services/auth-service"
import { getCurrentTiendaId } from "@/features/auth/services/tenant-service"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deactivatingAll, setDeactivatingAll] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState<Usuario | null>(null)
  const [saving, setSaving] = useState(false)
  const [deactivateAllDialogOpen, setDeactivateAllDialogOpen] = useState(false)
  const [sleepScheduleDialogOpen, setSleepScheduleDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null)
  const [sleepScheduleEnabled, setSleepScheduleEnabled] = useState(false)
  const [sleepScheduleTime, setSleepScheduleTime] = useState("22:00")
  const [wakeScheduleTime, setWakeScheduleTime] = useState("07:00")
  const [savingSleepSchedule, setSavingSleepSchedule] = useState(false)
  const [owner, setOwner] = useState<Usuario | null>(null)
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)

  const form = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioFormSchema),
    mode: "onBlur",
    defaultValues: DEFAULT_FORM_VALUES,
  })

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

  const fetchUsuarios = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    else setRefreshing(true)

    try {
      const [data, currentUserData] = await Promise.all([
        AuthService.getAll(),
        AuthService.getCurrentUser()
      ])

      setUsuarios(data)
      setCurrentUser(currentUserData)

      // Identify owner (earliest created user)
      if (data.length > 0) {
        const sortedUsers = [...data].sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        setOwner(sortedUsers[0])
      }

      // Load sleep schedule
      const tiendaId = await getCurrentTiendaId()
      const { data: tienda, error } = await supabase
        .from('tiendas')
        .select('sleep_schedule_enabled, sleep_schedule_time, wake_schedule_time')
        .eq('id', tiendaId)
        .single()

      if (!error && tienda) {
        setSleepScheduleEnabled(tienda.sleep_schedule_enabled)
        if (tienda.sleep_schedule_time) {
          // Format time to HH:MM
          setSleepScheduleTime(tienda.sleep_schedule_time.substring(0, 5))
        }
        if (tienda.wake_schedule_time) {
          setWakeScheduleTime(tienda.wake_schedule_time.substring(0, 5))
        }
      }

    } catch (error) {
      console.error("Error al cargar usuarios", error)
      toast({
        title: "Error de conexión",
        description: "No pudimos cargar la lista de usuarios.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [toast])

  useEffect(() => {
    void fetchUsuarios()
  }, [fetchUsuarios])

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

  const handleDeleteUsuario = async () => {
    if (!usuarioToDelete) return

    setDeletingId(usuarioToDelete.id)
    setDeleteDialogOpen(false)
    try {
      await AuthService.deleteUsuario(usuarioToDelete.id)
      setUsuarios((previous) => previous.filter((entry) => entry.id !== usuarioToDelete.id))
      toast({
        title: "Usuario eliminado",
        description: `${usuarioToDelete.nombre} ha sido eliminado permanentemente del sistema.`,
      })
    } catch (error) {
      console.error("Error al eliminar usuario", error)
      toast({
        title: "No se pudo eliminar",
        description: "Intenta de nuevo en unos segundos.",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
      setUsuarioToDelete(null)
    }
  }

  const openDeleteDialog = (usuario: Usuario) => {
    setUsuarioToDelete(usuario)
    setDeleteDialogOpen(true)
  }

  const handleDeactivateAll = async () => {
    setDeactivateAllDialogOpen(false)
    setDeactivatingAll(true)
    try {
      const count = await AuthService.deactivateAllNonOwners()
      await fetchUsuarios(false)
      toast({
        title: "Cuentas desactivadas",
        description: `Se desactivaron ${count} cuenta(s) exitosamente.`,
      })
    } catch (error) {
      console.error("Error al desactivar cuentas", error)
      toast({
        title: "No se pudo completar",
        description: "Intenta de nuevo en unos segundos.",
        variant: "destructive",
      })
    } finally {
      setDeactivatingAll(false)
    }
  }

  const handleSaveSleepSchedule = async () => {
    setSavingSleepSchedule(true)
    try {
      const tiendaId = await getCurrentTiendaId()
      const { error } = await supabase
        .from('tiendas')
        .update({
          sleep_schedule_enabled: sleepScheduleEnabled,
          sleep_schedule_time: sleepScheduleTime,
          wake_schedule_time: wakeScheduleTime,
        })
        .eq('id', tiendaId)

      if (error) throw error

      toast({
        title: "Configuración guardada",
        description: sleepScheduleEnabled
          ? `Horario de sueño: ${sleepScheduleTime} - ${wakeScheduleTime}`
          : "La desactivación automática ha sido deshabilitada.",
      })
      setSleepScheduleDialogOpen(false)
    } catch (error) {
      console.error('Error saving sleep schedule', error)
      toast({
        title: "No se pudo guardar",
        description: "Intenta de nuevo en unos segundos.",
        variant: "destructive",
      })
    } finally {
      setSavingSleepSchedule(false)
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

  const isCurrentUserOwner = currentUser?.id === owner?.id

  return (
    <>
      <AdminSectionLayout
        title="Usuarios"
        description="Gestiona los accesos del equipo, asigna roles y controla el estado de cada cuenta."
        icon={<Users className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isCurrentUserOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeactivateAllDialogOpen(true)}
                disabled={deactivatingAll || loading}
              >
                {deactivatingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Moon className="mr-2 h-4 w-4" />
                )}
                Dormir
              </Button>
            )}
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
                            {(() => {
                              const isOwner = usuario.id === owner?.id
                              const showEdit = isOwner ? isCurrentUserOwner : true
                              // Only owner can see actions (delete/deactivate) for other users
                              const showActions = isCurrentUserOwner && !isOwner

                              return (
                                <>
                                  {showEdit && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenEditor(usuario)}
                                    >
                                      Editar
                                    </Button>
                                  )}
                                  {showActions && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          disabled={updatingEstadoId === usuario.id || deletingId === usuario.id}
                                        >
                                          {(updatingEstadoId === usuario.id || deletingId === usuario.id) ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Trash2 className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => void handleToggleEstado(usuario)}
                                          disabled={updatingEstadoId === usuario.id}
                                        >
                                          {usuario.estado === "activo" ? "Desactivar" : "Activar"}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => openDeleteDialog(usuario)}
                                          disabled={deletingId === usuario.id}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          Eliminar definitivamente
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </>
                              )
                            })()}
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

      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar permanentemente a <strong>{usuarioToDelete?.nombre}</strong>? Esta acción no se puede deshacer y se eliminarán todos sus datos del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUsuario}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate All Dialog */}
      <AlertDialog open={deactivateAllDialogOpen} onOpenChange={setDeactivateAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar todas las cuentas?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Desactivar todas las cuentas excepto la del propietario? Los usuarios no podrán acceder hasta que los reactives manualmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <button
              type="button"
              onClick={() => {
                setDeactivateAllDialogOpen(false)
                setSleepScheduleDialogOpen(true)
              }}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Clock className="h-3.5 w-3.5" />
              O programa una hora de dormir
            </button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivateAll}>
              Aceptar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sleep Schedule Dialog */}
      <AlertDialog open={sleepScheduleDialogOpen} onOpenChange={setSleepScheduleDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Programar hora de dormir</AlertDialogTitle>
            <AlertDialogDescription>
              Configura el horario en el que las cuentas de empleados estarán desactivadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="sleep-enabled" className="text-sm font-medium">
                Activar horario de sueño
              </Label>
              <button
                id="sleep-enabled"
                type="button"
                role="switch"
                aria-checked={sleepScheduleEnabled}
                onClick={() => setSleepScheduleEnabled(!sleepScheduleEnabled)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  sleepScheduleEnabled ? "bg-primary" : "bg-input"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
                    sleepScheduleEnabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
            {sleepScheduleEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sleep-time" className="text-sm font-medium">
                    Hora de dormir
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="sleep-time"
                      type="time"
                      value={sleepScheduleTime}
                      onChange={(e) => setSleepScheduleTime(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wake-time" className="text-sm font-medium">
                    Hora de despertar
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="wake-time"
                      type="time"
                      value={wakeScheduleTime}
                      onChange={(e) => setWakeScheduleTime(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">
                    Los empleados no podrán acceder al sistema entre estas horas.
                  </p>
                </div>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingSleepSchedule}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveSleepSchedule} disabled={savingSleepSchedule}>
              {savingSleepSchedule ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
