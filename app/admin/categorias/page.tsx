"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit, Plus, Tag, Trash2 } from "lucide-react";

import { AdminSectionLayout } from "@/components/admin-section-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InventarioService, type CategoriaResumen } from "@/lib/services/inventario-service";

const ESTADO_VARIANT: Record<string, "default" | "secondary"> = {
  activo: "default",
  inactivo: "secondary"
};

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<CategoriaResumen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await InventarioService.getCategoriasResumen();
        if (!canceled) {
          setCategorias(data);
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      canceled = true;
    };
  }, []);

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

  return (
    <AdminSectionLayout
      title="Categorías"
      description="Organización de productos"
      actions={
        <Button className="h-10 rounded-xl px-5">
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
          <section className="rounded-2xl border border-border/60 bg-background/80 p-4">
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Tag className="h-6 w-6 text-primary" />
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
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Edit className="mr-2 h-4 w-4" /> Editar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminSectionLayout>
  );
}
