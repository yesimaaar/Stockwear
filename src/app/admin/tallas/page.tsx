"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Ruler, Plus, Edit, Trash2 } from "lucide-react";

import { AdminSectionLayout } from "@/components/domain/admin-section-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { InventarioService } from "@/features/movimientos/services/inventario-service";
import type { Talla, EstadoRegistro } from "@/lib/types";

const ESTADO_VARIANT: Record<string, "default" | "secondary"> = {
  activo: "default",
  inactivo: "secondary"
};

const tallaSchema = z.object({
  nombre: z
    .string({ required_error: "El nombre es obligatorio" })
    .trim()
    .min(1, "Ingrese al menos un carácter")
    .max(12, "Máximo 12 caracteres"),
  tipo: z.enum(["numerico", "alfanumerico"]),
  estado: z.enum(["activo", "inactivo"])
});

type TallaFormValues = z.infer<typeof tallaSchema>;

function getDefaultValues(): TallaFormValues {
  return {
    nombre: "",
    tipo: "numerico",
    estado: "activo"
  };
}

export default function TallasPage() {
  const { toast } = useToast();
  const [tallas, setTallas] = useState<Talla[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTalla, setEditingTalla] = useState<Talla | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tallaToDelete, setTallaToDelete] = useState<Talla | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<TallaFormValues>({
    resolver: zodResolver(tallaSchema),
    defaultValues: getDefaultValues()
  });

  const reloadTallas = useCallback(async () => {
    try {
      const data = await InventarioService.getTallas();
      setTallas(data);
      return true;
    } catch (error) {
      console.error("Error al recargar tallas", error);
      toast({
        title: "No se actualizó el listado",
        description: "Refresca la página para ver los últimos cambios.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const data = await InventarioService.getTallas();
        if (active) {
          setTallas(data);
        }
      } catch (error) {
        if (active) {
          console.error("Error al cargar tallas", error);
          toast({
            title: "No pudimos cargar las tallas",
            description: "Revisa tu conexión e inténtalo nuevamente.",
            variant: "destructive"
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [toast]);

  const quickStats = useMemo(() => {
    const total = tallas.length;
    const activas = tallas.filter((talla) => talla.estado === "activo").length;
    const numericas = tallas.filter((talla) => talla.tipo === "numerico").length;
    const alfanumericas = total - numericas;

    return {
      total,
      activas,
      alfanumericas,
      numericas
    };
  }, [tallas]);

  const tallasPorTipo = useMemo(() => {
    return {
      numerico: tallas.filter((talla) => talla.tipo === "numerico"),
      alfanumerico: tallas.filter((talla) => talla.tipo === "alfanumerico")
    } satisfies Record<Talla["tipo"], Talla[]>;
  }, [tallas]);

  const handleCreateClick = () => {
    setEditingTalla(null);
    form.reset(getDefaultValues());
    setFormOpen(true);
  };

  const handleEditClick = (talla: Talla) => {
    setEditingTalla(talla);
    form.reset({
      nombre: talla.nombre,
      tipo: talla.tipo,
      estado: talla.estado as EstadoRegistro
    });
    setFormOpen(true);
  };

  const handleSubmit = async (values: TallaFormValues) => {
    setIsSaving(true);
    const payload = {
      nombre: values.nombre.trim().toUpperCase(),
      tipo: values.tipo,
      estado: values.estado as EstadoRegistro
    };

    try {
      const isEditing = Boolean(editingTalla);
      const result = isEditing
        ? await InventarioService.updateTalla(editingTalla!.id, payload)
        : await InventarioService.createTalla(payload);

      toast({
        title: isEditing ? "Talla actualizada" : "Talla creada",
        description: `${result.nombre} se guardó correctamente.`
      });

      setFormOpen(false);
      setEditingTalla(null);
      form.reset(getDefaultValues());
      await reloadTallas();
    } catch (error) {
      console.error("Error al guardar la talla", error);
      toast({
        title: "No pudimos guardar la talla",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteDialog = (talla: Talla) => {
    setTallaToDelete(talla);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!tallaToDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await InventarioService.deleteTalla(tallaToDelete.id);
      toast({
        title: "Talla eliminada",
        description: `${tallaToDelete.nombre} ya no aparece en el listado.`
      });
      setDeleteDialogOpen(false);
      setTallaToDelete(null);
      await reloadTallas();
    } catch (error) {
      console.error("Error al eliminar la talla", error);
      toast({
        title: "No pudimos eliminarla",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <AdminSectionLayout
  title="Tallas"
  description="Gestión de tallas disponibles"
  icon={<Ruler className="h-5 w-5" />}
        actions={
          <Button className="h-10 rounded-xl px-5" onClick={handleCreateClick}>
            <Plus className="mr-2 h-4 w-4" /> Nueva talla
          </Button>
        }
        sidebar={
          <div className="space-y-5">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Resumen
              </h2>
              <div className="mt-3 space-y-3 text-sm">
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total registradas</span>
                  <span className="font-semibold text-foreground">{quickStats.total}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Activas</span>
                  <span className="font-semibold text-foreground">{quickStats.activas}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Numéricas</span>
                  <span className="font-semibold text-foreground">{quickStats.numericas}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Alfanuméricas</span>
                  <span className="font-semibold text-foreground">{quickStats.alfanumericas}</span>
                </p>
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">Guías rápidas</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Importar tabla de tallas</li>
                <li>• Configurar tablas de conversión</li>
                <li>• Vincular tallas a categorías</li>
              </ul>
            </section>
          </div>
        }
      >
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 w-32 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tallas.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No hay tallas registradas todavía.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(["numerico", "alfanumerico"] as const).map((tipo) => {
              const listado = tallasPorTipo[tipo];
              return (
                <Card key={tipo} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                      <span>{tipo === "numerico" ? "Tallas numéricas" : "Tallas alfanuméricas"}</span>
                      <Badge variant="outline">{listado.length}</Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {tipo === "numerico"
                        ? "Ideal para calzado y prendas con numeración"
                        : "Perfectas para prendas con etiquetas S, M, L, etc."}
                    </p>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {listado.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No hay tallas {tipo === "numerico" ? "numéricas" : "alfanuméricas"} registradas.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {listado.map((talla) => (
                          <div
                            key={talla.id}
                            className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-lg font-semibold uppercase text-foreground">{talla.nombre}</p>
                              <Badge variant={ESTADO_VARIANT[talla.estado] ?? "default"} className="mt-1">
                                {talla.estado.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                className="bg-transparent"
                                onClick={() => handleEditClick(talla)}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                className="border-destructive text-destructive hover:bg-destructive/10"
                                onClick={() => openDeleteDialog(talla)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </AdminSectionLayout>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingTalla(null);
            form.reset(getDefaultValues());
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTalla ? "Editar talla" : "Nueva talla"}</DialogTitle>
            <DialogDescription>
              {editingTalla
                ? "Actualiza la información de la talla seleccionada."
                : "Registra una talla para el catálogo de productos."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. 38, XL, 32" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="numerico">Numérico</SelectItem>
                          <SelectItem value="alfanumerico">Alfanumérico</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="activo">Activa</SelectItem>
                          <SelectItem value="inactivo">Inactiva</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Guardando..." : editingTalla ? "Guardar cambios" : "Crear talla"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setTallaToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta talla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Si la talla se usa en stock existente, asegúrate de actualizarlo antes de
              eliminarla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive"
              disabled={isDeleting}
              onClick={() => {
                void handleDelete();
              }}
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
