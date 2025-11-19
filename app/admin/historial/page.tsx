"use client"

import type { ComponentType } from "react"
import { useEffect, useMemo, useState } from "react"
import * as LucideIcons from "lucide-react"
const {
  Download,
  Filter,
  History,
  LogIn,
  LogOut,
  RefreshCw,
  ShoppingBag,
  Wrench
} = LucideIcons

import { AdminSectionLayout } from "@/components/admin-section-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { InventarioService, type MovimientoDetallado } from "@/lib/services/inventario-service"

const BADGE_VARIANT: Record<MovimientoDetallado["tipo"], "default" | "secondary" | "destructive"> = {
  entrada: "default",
  salida: "destructive",
  venta: "secondary",
  ajuste: "secondary"
}

const TIPO_LABEL: Record<MovimientoDetallado["tipo"], string> = {
  entrada: "Entradas",
  salida: "Salidas",
  venta: "Ventas",
  ajuste: "Ajustes"
}

const TIPO_ICON: Record<MovimientoDetallado["tipo"], ComponentType<{ className?: string }>> = {
  entrada: LogIn,
  salida: LogOut,
  venta: ShoppingBag,
  ajuste: Wrench
}

const MOVIMIENTO_FORMATTER = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short"
})

const TIPO_ORDEN: Array<MovimientoDetallado["tipo"]> = ["entrada", "salida", "venta", "ajuste"]

type TipoFilter = MovimientoDetallado["tipo"] | "todos"

export default function HistorialPage() {
  const { toast } = useToast()
  const [movimientos, setMovimientos] = useState<MovimientoDetallado[]>([])
  const [loading, setLoading] = useState(true)
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("todos")
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    let active = true

    const loadMovimientos = async () => {
      setLoading(true)
      try {
        const data = await InventarioService.getHistorialDetallado(60)
        if (active) {
          setMovimientos(data)
        }
      } catch (error) {
        if (active) {
          console.error("Error al cargar el historial", error)
          toast({
            title: "No pudimos cargar el historial",
            description: "Intenta nuevamente en unos segundos.",
            variant: "destructive"
          })
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadMovimientos()

    return () => {
      active = false
    }
  }, [toast])

  const filteredMovimientos = useMemo(() => {
    if (tipoFilter === "todos") {
      return movimientos
    }
    return movimientos.filter((mov) => mov.tipo === tipoFilter)
  }, [movimientos, tipoFilter])

  const resumen = useMemo(() => {
    const porTipo: Record<MovimientoDetallado["tipo"], { registros: number; unidades: number }> = {
      entrada: { registros: 0, unidades: 0 },
      salida: { registros: 0, unidades: 0 },
      venta: { registros: 0, unidades: 0 },
      ajuste: { registros: 0, unidades: 0 }
    }

    let unidadesTotales = 0
    let neto = 0

    movimientos.forEach((mov) => {
      const unidades = Math.abs(mov.cantidad)
      porTipo[mov.tipo].registros += 1
      porTipo[mov.tipo].unidades += unidades
      unidadesTotales += unidades
      neto += mov.cantidad
    })

    return {
      totalRegistros: movimientos.length,
      unidadesTotales,
      neto,
      porTipo,
      ultimaActualizacion: movimientos[0]?.createdAt ?? null
    }
  }, [movimientos])

  const ultimaActualizacion = useMemo(() => {
    if (!resumen.ultimaActualizacion) {
      return "Sin datos"
    }

    try {
      return MOVIMIENTO_FORMATTER.format(new Date(resumen.ultimaActualizacion))
    } catch (error) {
      console.error("Error al formatear la fecha de actualización", error)
      return "Sin datos"
    }
  }, [resumen.ultimaActualizacion])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const data = await InventarioService.getHistorialDetallado(60)
      setMovimientos(data)
      toast({
        title: "Historial actualizado",
        description: "Sincronizamos los últimos movimientos registrados.",
        duration: 3000
      })
    } catch (error) {
      console.error("Error al actualizar el historial", error)
      toast({
        title: "No pudimos actualizar",
        description: "Verifica tu conexión e inténtalo de nuevo.",
        variant: "destructive"
      })
    } finally {
      setIsRefreshing(false)
      setLoading(false)
    }
  }

  const emptyMessage = tipoFilter === "todos"
    ? "No se registran movimientos recientes."
    : "No encontramos movimientos para este filtro."

  return (
    <AdminSectionLayout
      title="Historial de movimientos"
      description="Trazabilidad completa del inventario en tiempo real"
      icon={<History className="h-5 w-5" />}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void handleRefresh()
            }}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Actualizando..." : "Actualizar"}
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </>
      }
      sidebar={
        <div className="space-y-6">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Resumen general
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Registros</span>
                <span className="font-semibold text-foreground">{resumen.totalRegistros}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Unidades movidas</span>
                <span className="font-semibold text-foreground">{resumen.unidadesTotales}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Balance neto</span>
                <span
                  className={`font-semibold ${resumen.neto >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {resumen.neto >= 0 ? "+" : ""}
                  {resumen.neto}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card/60 p-4">
            <h3 className="text-sm font-semibold text-foreground">Distribución por tipo</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {TIPO_ORDEN.map((tipo) => {
                const IconoLeyenda = TIPO_ICON[tipo]
                return (
                  <li key={tipo} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground/70">
                        {IconoLeyenda ? <IconoLeyenda className="h-4 w-4" /> : null}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{TIPO_LABEL[tipo]}</p>
                        <p className="text-xs text-muted-foreground">
                          {resumen.porTipo[tipo].unidades} unidades
                        </p>
                      </div>
                    </div>
                    <Badge variant={BADGE_VARIANT[tipo]}>{resumen.porTipo[tipo].registros}</Badge>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-card/40 p-4">
            <h3 className="text-sm font-semibold text-foreground">Última actualización</h3>
            <p className="mt-2 text-sm text-muted-foreground">{ultimaActualizacion}</p>
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                Entradas indican incremento de stock.
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
                Salidas y ventas reducen inventario disponible.
              </p>
            </div>
          </section>
        </div>
      }
    >
      <Card className="gap-0 border border-border/60 shadow-none">
        <CardHeader className="flex flex-col gap-4 border-b border-border/60 pb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">
                Movimientos recientes
              </CardTitle>
              <CardDescription>
                Filtra por tipo de movimiento para enfocar la revisión.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="hidden gap-2 sm:inline-flex" disabled>
              <Filter className="h-4 w-4" />
              Filtro avanzado
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs
            value={tipoFilter}
            onValueChange={(value) => {
              setTipoFilter(value as TipoFilter)
            }}
          >
            <TabsList className="bg-muted/60">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="entrada">Entradas</TabsTrigger>
              <TabsTrigger value="salida">Salidas</TabsTrigger>
              <TabsTrigger value="venta">Ventas</TabsTrigger>
              <TabsTrigger value="ajuste">Ajustes</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="gap-0 border border-border/50 bg-card/70">
              <CardContent className="flex flex-col gap-4 py-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-2xl bg-muted" />
                    <div className="space-y-2">
                      <div className="h-4 w-24 rounded bg-muted" />
                      <div className="h-3 w-36 rounded bg-muted/80" />
                    </div>
                  </div>
                  <div className="h-3 w-32 rounded bg-muted/60" />
                </div>
                <div className="flex gap-6">
                  <div className="h-5 w-24 rounded bg-muted" />
                  <div className="h-5 w-24 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMovimientos.length === 0 ? (
        <Card className="gap-0 border border-dashed border-border/60 bg-background/30">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMovimientos.map((movimiento) => {
            const Icono = TIPO_ICON[movimiento.tipo]
            const cantidad = movimiento.cantidad
            const isPositive = cantidad >= 0

            return (
              <Card key={movimiento.id} className="gap-0 border border-border/60 bg-card/80 shadow-sm">
                <CardContent className="flex flex-col gap-6 py-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex flex-1 items-start gap-4">
                      <span className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        {Icono ? <Icono className="h-5 w-5" /> : null}
                      </span>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <Badge variant={BADGE_VARIANT[movimiento.tipo]}>{TIPO_LABEL[movimiento.tipo]}</Badge>
                          <span className="text-muted-foreground">
                            {MOVIMIENTO_FORMATTER.format(new Date(movimiento.createdAt))}
                          </span>
                        </div>
                        <div>
                          <p className="text-base font-semibold text-foreground">
                            {movimiento.productoNombre}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Talla {movimiento.tallaNombre} • {movimiento.almacenNombre}
                          </p>
                        </div>
                        {movimiento.motivo ? (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Motivo:</span> {movimiento.motivo}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 text-right sm:flex-row sm:items-center sm:gap-8 sm:text-left lg:flex-col lg:items-end lg:text-right">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Cantidad
                        </p>
                        <p className={`text-2xl font-semibold ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                          {isPositive ? "+" : ""}
                          {cantidad}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Usuario
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {movimiento.usuarioNombre}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </AdminSectionLayout>
  )
}
