"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Edit, Plus, Tag, Trash2 } from "lucide-react";

import { AdminSectionLayout } from "@/components/domain/admin-section-layout";
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
import { useToast } from "@/hooks/use-toast";
import { InventarioService, type CategoriaResumen } from "@/features/movimientos/services/inventario-service";
import type { EstadoRegistro } from "@/lib/types";

const ESTADO_VARIANT: Record<string, "default" | "secondary"> = {
  activo: "default",
  inactivo: "secondary"
};

const categoriaSchema = z.object({
  nombre: z
    .string({ required_error: "El nombre es obligatorio" })
    .trim()
    .min(2, "Usa al menos 2 caracteres")
    .max(80, "Máximo 80 caracteres"),
  descripcion: z
    .string()
    .trim()
    .max(250, "Máximo 250 caracteres")
    .optional()
    .transform((value) => value ?? ""),
  estado: z.enum(["activo", "inactivo"])
});

type CategoriaFormValues = z.infer<typeof categoriaSchema>;

function getDefaultValues(): CategoriaFormValues {
  return {
    nombre: "",
    descripcion: "",
    estado: "activo"
  };
}

export default function CategoriasPage() {
  const { toast } = useToast();
  const [categorias, setCategorias] = useState<CategoriaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<CategoriaResumen | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoriaToDelete, setCategoriaToDelete] = useState<CategoriaResumen | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: getDefaultValues()
  });

  const reloadCategorias = useCallback(async () => {
    try {
      const data = await InventarioService.getCategoriasResumen();
      setCategorias(data);
      return true;
    } catch (error) {
      console.error("Error al recargar categorías", error);
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
        const data = await InventarioService.getCategoriasResumen();
        if (active) {
          setCategorias(data);
        }
      } catch (error) {
        if (active) {
          console.error("Error al cargar categorías", error);
          toast({
            title: "No pudimos cargar las categorías",
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
    const total = categorias.length;
    const activos = categorias.filter((item) => item.estado === "activo").length;
    const inactivos = total - activos;
    const productos = categorias.reduce((acc, item) => acc + item.productosActivos, 0);

    return {
      total,
      activos,
      inactivos,
      productos
    };
  }, [categorias]);

  const handleCreateClick = () => {
    setEditingCategoria(null);
    form.reset(getDefaultValues());
    setFormOpen(true);
  };

  const handleEditClick = (categoria: CategoriaResumen) => {
    setEditingCategoria(categoria);
    form.reset({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion ?? "",
      estado: categoria.estado as EstadoRegistro
    });
    setFormOpen(true);
  };

  const handleSubmit = async (values: CategoriaFormValues) => {
    setIsSaving(true);
    const payload = {
      nombre: values.nombre.trim(),
      descripcion: values.descripcion.trim() ? values.descripcion.trim() : null,
      estado: values.estado as EstadoRegistro
    };

    try {
      const isEditing = Boolean(editingCategoria);
      const result = isEditing
        ? await InventarioService.updateCategoria(editingCategoria!.id, payload)
        : await InventarioService.createCategoria(payload);

      toast({
        title: isEditing ? "Categoría actualizada" : "Categoría creada",
        description: `${result.nombre} se guardó correctamente.`
      });

      setFormOpen(false);
      setEditingCategoria(null);
      form.reset(getDefaultValues());
      await reloadCategorias();
    } catch (error) {
      console.error("Error al guardar la categoría", error);
      toast({
        title: "No pudimos guardar la categoría",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteDialog = (categoria: CategoriaResumen) => {
    setCategoriaToDelete(categoria);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!categoriaToDelete) {
      return;
    }

    if (categoriaToDelete.productosActivos > 0) {
      toast({
        title: "No podemos eliminarla",
        description: "Hay productos activos asociados a esta categoría. Reasígnalos antes de eliminarla.",
        variant: "destructive"
      });
      return;
    }

    setIsDeleting(true);
    try {
      await InventarioService.deleteCategoria(categoriaToDelete.id);
      toast({
        title: "Categoría eliminada",
        description: `${categoriaToDelete.nombre} ya no aparece en el catálogo.`
      });
      setDeleteDialogOpen(false);
      setCategoriaToDelete(null);
      await reloadCategorias();
    } catch (error) {
      console.error("Error al eliminar la categoría", error);
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
        title="Categorías"
        description="Organización de productos"
        actions={
          <Button className="h-10 rounded-xl px-5" onClick={handleCreateClick}>
            <Plus className="mr-2 h-4 w-4" /> Nueva categoría
          </Button>
        }
        sidebar={
          <div className="space-y-5">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resumen</h2>
              <div className="mt-3 space-y-3 text-sm">
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold text-foreground">{quickStats.total}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Activas</span>
                  <span className="font-semibold text-foreground">{quickStats.activos}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Inactivas</span>
                  <span className="font-semibold text-foreground">{quickStats.inactivos}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Productos asociados</span>
                  <span className="font-semibold text-foreground">{quickStats.productos}</span>
                </p>
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">Atajos</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Importar catálogos</li>
                <li>• Gestionar reglas de visibilidad</li>
                <li>• Ver categorías archivadas</li>
              </ul>
            </section>
          </div>
        }
      >
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 w-40 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : categorias.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No se encontraron categorías.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categorias.map((categoria) => (
              <Card key={categoria.id} className="transition-all hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-primary">
                      <Tag className="h-6 w-6" />
                    </div>
                    <Badge variant={ESTADO_VARIANT[categoria.estado] ?? "default"}>
                      {categoria.estado.toUpperCase()}
                    </Badge>
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{categoria.nombre}</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {categoria.descripcion ?? "Sin descripción"}
                  </p>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Productos activos</span>
                    <span className="text-lg font-bold text-primary">{categoria.productosActivos}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      type="button"
                      onClick={() => handleEditClick(categoria)}
                    >
                      <Edit className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => openDeleteDialog(categoria)}
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
            setEditingCategoria(null);
            form.reset(getDefaultValues());
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategoria ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            <DialogDescription>
              {editingCategoria
                ? "Actualiza la información de la categoría seleccionada."
                : "Registra una categoría para organizar tu catálogo."}
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
                      <Input placeholder="Ej. Calzado deportivo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe brevemente la categoría" rows={3} {...field} />
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
                  {isSaving ? "Guardando..." : editingCategoria ? "Guardar cambios" : "Crear categoría"}
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
            setCategoriaToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              {categoriaToDelete?.productosActivos
                ? "Hay productos activos asociados. Reasígnalos o desactívalos antes de eliminar la categoría."
                : "Esta acción no se puede deshacer y eliminará la categoría del catálogo."}
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
