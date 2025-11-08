"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Boxes, Edit, MapPin, Plus, Trash2, Warehouse } from "lucide-react";

import { AdminSectionLayout } from "@/components/admin-section-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  InventarioService,
  type AlmacenResumen,
  type AlmacenProductoDetalle
} from "@/lib/services/inventario-service";
import type { EstadoRegistro } from "@/lib/types";

const ESTADO_VARIANT: Record<string, "default" | "secondary"> = {
  activo: "default",
  inactivo: "secondary"
};

const almacenSchema = z.object({
  nombre: z
    .string({ required_error: "El nombre es obligatorio" })
    .trim()
    .min(2, "Usa al menos 2 caracteres")
    .max(100, "Máximo 100 caracteres"),
  direccion: z
    .string()
    .trim()
    .max(160, "Máximo 160 caracteres")
    .optional()
    .transform((value) => value ?? ""),
  tipo: z.enum(["principal", "sucursal"]),
  estado: z.enum(["activo", "inactivo"])
});

type AlmacenFormValues = z.infer<typeof almacenSchema>;

function getDefaultValues(): AlmacenFormValues {
  return {
    nombre: "",
    direccion: "",
    tipo: "principal",
    estado: "activo"
  };
}

export default function AlmacenesPage() {
  const { toast } = useToast();
  const [almacenes, setAlmacenes] = useState<AlmacenResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingAlmacen, setEditingAlmacen] = useState<AlmacenResumen | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [almacenToDelete, setAlmacenToDelete] = useState<AlmacenResumen | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detalleProductos, setDetalleProductos] = useState<AlmacenProductoDetalle[]>([]);
  const [detalleAlmacen, setDetalleAlmacen] = useState<AlmacenResumen | null>(null);

  const form = useForm<AlmacenFormValues>({
    resolver: zodResolver(almacenSchema),
    defaultValues: getDefaultValues()
  });

  const reloadAlmacenes = useCallback(async () => {
    try {
      const data = await InventarioService.getAlmacenesResumen();
      setAlmacenes(data);
      return true;
    } catch (error) {
      console.error("Error al recargar almacenes", error);
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
        const data = await InventarioService.getAlmacenesResumen();
        if (active) {
          setAlmacenes(data);
        }
      } catch (error) {
        if (active) {
          console.error("Error al cargar almacenes", error);
          toast({
            title: "No pudimos cargar los almacenes",
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
    const activos = almacenes.filter((item) => item.estado === "activo").length;
    const inactivos = almacenes.filter((item) => item.estado !== "activo").length;
    const stockTotal = almacenes.reduce((acc, item) => acc + item.stockTotal, 0);
    return { activos, inactivos, stockTotal };
  }, [almacenes]);

  const handleCreateClick = () => {
    setEditingAlmacen(null);
    form.reset(getDefaultValues());
    setFormOpen(true);
  };

  const handleEditClick = (almacen: AlmacenResumen) => {
    setEditingAlmacen(almacen);
    form.reset({
      nombre: almacen.nombre,
      direccion: almacen.direccion ?? "",
      tipo: almacen.tipo,
      estado: almacen.estado as EstadoRegistro
    });
    setFormOpen(true);
  };

  const handleSubmit = async (values: AlmacenFormValues) => {
    setIsSaving(true);
    const payload = {
      nombre: values.nombre.trim(),
      direccion: values.direccion.trim() ? values.direccion.trim() : null,
      tipo: values.tipo,
      estado: values.estado as EstadoRegistro
    };

    try {
      const isEditing = Boolean(editingAlmacen);
      const result = isEditing
        ? await InventarioService.updateAlmacen(editingAlmacen!.id, payload)
        : await InventarioService.createAlmacen(payload);

      toast({
        title: isEditing ? "Almacén actualizado" : "Almacén creado",
        description: `${result.nombre} se guardó correctamente.`
      });

      setFormOpen(false);
      setEditingAlmacen(null);
      form.reset(getDefaultValues());
      await reloadAlmacenes();
    } catch (error) {
      console.error("Error al guardar el almacén", error);
      toast({
        title: "No pudimos guardar el almacén",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteDialog = (almacen: AlmacenResumen) => {
    setAlmacenToDelete(almacen);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!almacenToDelete) {
      return;
    }

    if (almacenToDelete.stockTotal > 0) {
      toast({
        title: "No podemos eliminarlo",
        description: "Existen unidades en inventario. Transfiere o ajusta el stock antes de eliminarlo.",
        variant: "destructive"
      });
      return;
    }

    if (almacenToDelete.productosUnicos > 0) {
      toast({
        title: "Reasigna productos antes",
        description: "Hay productos vinculados a este almacén. Reasígnalos antes de eliminarlo.",
        variant: "destructive"
      });
      return;
    }

    setIsDeleting(true);
    try {
      await InventarioService.deleteAlmacen(almacenToDelete.id);
      toast({
        title: "Almacén eliminado",
        description: `${almacenToDelete.nombre} ya no aparece en el listado.`
      });
      setDeleteDialogOpen(false);
      setAlmacenToDelete(null);
      await reloadAlmacenes();
    } catch (error) {
      console.error("Error al eliminar el almacén", error);
      toast({
        title: "No pudimos eliminarlo",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openDetails = async (almacen: AlmacenResumen) => {
    setDetalleAlmacen(almacen);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = await InventarioService.getAlmacenProductos(almacen.id);
      setDetalleProductos(data);
    } catch (error) {
      console.error("Error al obtener productos del almacén", error);
      toast({
        title: "No pudimos cargar los detalles",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <AdminSectionLayout
        title="Almacenes"
        description="Puntos de venta y almacenamiento"
        actions={
          <Button className="h-10 rounded-xl px-5" onClick={handleCreateClick}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo almacén
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
                  <span className="text-muted-foreground">Total activos</span>
                  <span className="font-semibold text-foreground">{quickStats.activos}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Inactivos</span>
                  <span className="font-semibold text-foreground">{quickStats.inactivos}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Stock consolidado</span>
                  <span className="font-semibold text-foreground">{quickStats.stockTotal}</span>
                </p>
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">Atajos</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Crear transferencia</li>
                <li>• Exportar listado</li>
                <li>• Configurar zonas</li>
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
                  <div className="h-6 w-40 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : almacenes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No hay almacenes registrados.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {almacenes.map((almacen) => (
              <Card key={almacen.id} className="transition-all hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-primary">
                        <Warehouse className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{almacen.nombre}</h3>
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {almacen.direccion || "Sin dirección"}
                        </div>
                      </div>
                    </div>
                    <Badge variant={ESTADO_VARIANT[almacen.estado] ?? "default"}>
                      {almacen.estado.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo</p>
                      <p className="font-semibold capitalize">{almacen.tipo}</p>
                    </div>
                    <div className="text-right">
                      <p className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                        <Boxes className="h-4 w-4" /> Inventario total
                      </p>
                      <p className="text-2xl font-bold text-primary">{almacen.stockTotal}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Productos únicos: <span className="font-semibold text-foreground">{almacen.productosUnicos}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      type="button"
                      onClick={() => {
                        void openDetails(almacen);
                      }}
                    >
                      Ver detalles
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      type="button"
                      onClick={() => handleEditClick(almacen)}
                    >
                      <Edit className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => openDeleteDialog(almacen)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </AdminSectionLayout>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingAlmacen(null);
            form.reset(getDefaultValues());
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAlmacen ? "Editar almacén" : "Nuevo almacén"}</DialogTitle>
            <DialogDescription>
              {editingAlmacen
                ? "Actualiza la información del almacén seleccionado."
                : "Registra un nuevo punto de inventario."}
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
                      <Input placeholder="Bodega Central" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="direccion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Dirección completa del almacén" rows={3} {...field} />
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
                          <SelectItem value="principal">Principal</SelectItem>
                          <SelectItem value="sucursal">Sucursal</SelectItem>
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
                          <SelectItem value="activo">Activo</SelectItem>
                          <SelectItem value="inactivo">Inactivo</SelectItem>
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
                  {isSaving ? "Guardando..." : editingAlmacen ? "Guardar cambios" : "Crear almacén"}
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
            setAlmacenToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este almacén?</AlertDialogTitle>
            <AlertDialogDescription>
              {almacenToDelete?.stockTotal && almacenToDelete.stockTotal > 0
                ? "Consolidado con inventario. Ajusta o transfiere antes de eliminarlo."
                : "Esta acción no se puede deshacer."}
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

      <Sheet
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setDetalleAlmacen(null);
            setDetalleProductos([]);
            setDetailLoading(false);
          }
        }}
      >
        <SheetContent className="w-full max-w-3xl overflow-hidden">
          <SheetHeader>
            <SheetTitle>
              {detalleAlmacen ? `Inventario de ${detalleAlmacen.nombre}` : "Detalle del almacén"}
            </SheetTitle>
            <SheetDescription>
              {detalleAlmacen?.direccion ? detalleAlmacen.direccion : "Sin dirección registrada"}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {detalleAlmacen && (
              <div className="grid gap-4 rounded-xl border border-border bg-card/60 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <Badge variant={ESTADO_VARIANT[detalleAlmacen.estado] ?? "default"}>
                    {detalleAlmacen.estado.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-semibold capitalize">{detalleAlmacen.tipo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Inventario total</p>
                  <p className="text-lg font-semibold text-primary">{detalleAlmacen.stockTotal}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Productos únicos</p>
                  <p className="font-semibold">{detalleAlmacen.productosUnicos}</p>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border">
              <ScrollArea className="h-[360px]">
                {detailLoading ? (
                  <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
                    Cargando productos...
                  </div>
                ) : detalleProductos.length === 0 ? (
                  <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                    Este almacén no tiene inventario registrado.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {detalleProductos.map((producto) => (
                      <div key={producto.productoId} className="space-y-3 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{producto.productoNombre}</p>
                            <p className="text-xs text-muted-foreground">Código: {producto.codigo}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">Stock total</p>
                            <p className="font-semibold text-primary">{producto.stockTotal}</p>
                          </div>
                        </div>
                        {producto.categoria && (
                          <p className="text-xs text-muted-foreground">Categoría: {producto.categoria}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {producto.stockPorTalla.map((detalle, index) => (
                            <Badge key={`${producto.productoId}-${index}`} variant="outline">
                              {detalle.talla ? `Talla ${detalle.talla}` : "Sin talla"}: {detalle.cantidad}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
