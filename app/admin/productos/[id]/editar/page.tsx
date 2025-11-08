"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as LucideIcons from "lucide-react";
const { ArrowLeft } = LucideIcons;

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ProductoService } from "@/lib/services/producto-service";
import type { Categoria } from "@/lib/types";

interface FormState {
  codigo: string;
  nombre: string;
  categoriaId: string;
  precio: string;
  descuento: string;
  proveedor: string;
  stockMinimo: string;
  descripcion: string;
  imagen: string;
  estado: "activo" | "inactivo";
}

export default function EditarProductoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [formData, setFormData] = useState<FormState | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productoId = useMemo(() => {
    const raw = params?.id;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [params]);

  useEffect(() => {
    let activo = true;

    const loadData = async () => {
      if (productoId == null) {
        setError("Identificador de producto inválido");
        setCargando(false);
        return;
      }

      try {
        const [producto, categoriasActivas] = await Promise.all([
          ProductoService.getById(productoId),
          ProductoService.getCategoriasActivas()
        ]);

        if (!activo) return;

        if (!producto) {
          setError("No se encontró el producto");
          setCargando(false);
          return;
        }

        setCategorias(categoriasActivas);
        setFormData({
          codigo: producto.codigo,
          nombre: producto.nombre,
          categoriaId: String(producto.categoriaId ?? ""),
          precio: String(producto.precio ?? ""),
          descuento: String(producto.descuento ?? 0),
          proveedor: producto.proveedor ?? "",
          stockMinimo: String(producto.stockMinimo ?? 0),
          descripcion: producto.descripcion ?? "",
          imagen: producto.imagen ?? "",
          estado: (producto.estado as "activo" | "inactivo") ?? "activo"
        });
      } catch (err) {
        console.error("Error cargando datos del producto", err);
        if (activo) {
          setError("No fue posible cargar la información del producto");
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    };

    void loadData();

    return () => {
      activo = false;
    };
  }, [productoId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData || productoId == null) return;

    const precio = Number(formData.precio);
    const descuento = formData.descuento ? Number(formData.descuento) : 0;
    const stockMinimo = Number(formData.stockMinimo);
  const categoriaId = Number(formData.categoriaId);

    if (Number.isNaN(precio) || precio <= 0) {
      toast({
        title: "Precio inválido",
        description: "Ingresa un precio mayor a cero",
        variant: "destructive"
      });
      return;
    }

    if (Number.isNaN(stockMinimo) || stockMinimo < 0) {
      toast({
        title: "Stock mínimo inválido",
        description: "El stock mínimo no puede ser negativo",
        variant: "destructive"
      });
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        codigo: formData.codigo.trim(),
        nombre: formData.nombre.trim(),
  categoriaId: Number.isNaN(categoriaId) || categoriaId === 0 ? undefined : categoriaId,
        descripcion: formData.descripcion.trim() || null,
        precio,
        descuento: Number.isNaN(descuento) ? 0 : descuento,
        proveedor: formData.proveedor.trim() || null,
        imagen: formData.imagen.trim() || null,
        stockMinimo,
        estado: formData.estado
      };

      const actualizado = await ProductoService.update(productoId, payload);

      if (!actualizado) {
        toast({
          title: "No se pudieron guardar los cambios",
          description: "Intenta nuevamente en unos segundos",
          variant: "destructive"
        });
        setGuardando(false);
        return;
      }

      toast({
        title: "Producto actualizado",
        description: `${actualizado.nombre} fue actualizado correctamente`
      });
      router.push(`/admin/productos/${productoId}`);
    } catch (err) {
      console.error("Error actualizando producto", err);
      toast({
        title: "Error inesperado",
        description: "Revisa la consola para más detalles",
        variant: "destructive"
      });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando información…</p>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted-foreground">{error ?? "No se pudo cargar el producto"}</p>
        <Button onClick={() => router.push("/admin/productos")}>Regresar al listado</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href={`/admin/productos/${productoId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Editar producto</h1>
              <p className="text-sm text-muted-foreground">Actualiza la información del inventario</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información básica</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(event) => setFormData({ ...formData, codigo: event.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(event) => setFormData({ ...formData, nombre: event.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  rows={3}
                  value={formData.descripcion}
                  onChange={(event) => setFormData({ ...formData, descripcion: event.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Categorización</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select
                    value={formData.categoriaId}
                    onValueChange={(value) => setFormData({ ...formData, categoriaId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria.id} value={String(categoria.id)}>
                          {categoria.nombre}
                        </SelectItem>
                      ))}
                      {categorias.length === 0 && <SelectItem value="" disabled>No hay categorías disponibles</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proveedor">Proveedor</Label>
                  <Input
                    id="proveedor"
                    value={formData.proveedor}
                    onChange={(event) => setFormData({ ...formData, proveedor: event.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value: "activo" | "inactivo") => setFormData({ ...formData, estado: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Precios y stock</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="precio">Precio (COP)</Label>
                <Input
                  id="precio"
                  type="number"
                  value={formData.precio}
                  onChange={(event) => setFormData({ ...formData, precio: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descuento">Descuento (%)</Label>
                <Input
                  id="descuento"
                  type="number"
                  value={formData.descuento}
                  onChange={(event) => setFormData({ ...formData, descuento: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stockMinimo">Stock mínimo</Label>
                <Input
                  id="stockMinimo"
                  type="number"
                  value={formData.stockMinimo}
                  onChange={(event) => setFormData({ ...formData, stockMinimo: event.target.value })}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Imagen del producto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="imagen">URL de imagen</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="imagen"
                  value={formData.imagen}
                  placeholder="https://"
                  onChange={(event) => setFormData({ ...formData, imagen: event.target.value })}
                />
                {formData.imagen && (
                  <div className="relative h-16 w-16 overflow-hidden rounded border">
                    <Image
                      src={formData.imagen}
                      alt="Previsualización"
                      fill
                      sizes="64px"
                      loading="lazy"
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href={`/admin/productos/${productoId}`}>
              <Button type="button" variant="outline" disabled={guardando}>
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={guardando || categorias.length === 0}>
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
