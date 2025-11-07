"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, MapPin, Plus, Warehouse } from "lucide-react";

import { AdminSectionLayout } from "@/components/admin-section-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InventarioService, type AlmacenResumen } from "@/lib/services/inventario-service";

const ESTADO_VARIANT: Record<string, "default" | "secondary"> = {
  activo: "default",
  inactivo: "secondary"
};

export default function AlmacenesPage() {
  const [almacenes, setAlmacenes] = useState<AlmacenResumen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await InventarioService.getAlmacenesResumen();
        if (!canceled) {
          setAlmacenes(data);
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
    const activos = almacenes.filter((item) => item.estado === "activo").length;
    const inactivos = almacenes.filter((item) => item.estado !== "activo").length;
    const stockTotal = almacenes.reduce((acc, item) => acc + item.stockTotal, 0);
    return { activos, inactivos, stockTotal };
  }, [almacenes]);

  return (
    <AdminSectionLayout
      title="Almacenes"
      description="Puntos de venta y almacenamiento"
      actions={
        <Button className="h-10 rounded-xl px-5">
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
                <Button variant="outline" className="mt-4 w-full bg-transparent">
                  Ver detalles
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminSectionLayout>
  );
}
