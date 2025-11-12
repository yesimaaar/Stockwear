"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import * as LucideIcons from "lucide-react"
const { ArrowLeft, Edit, Trash2 } = LucideIcons
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ProductoService, type ProductoConStock } from "@/lib/services/producto-service"
import { cn } from "@/lib/utils"
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
import { useToast } from "@/hooks/use-toast"

type DeleteMode = "inactive" | "hard"

export default function ProductoDetallePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [producto, setProducto] = useState<ProductoConStock | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteMode, setDeleteMode] = useState<DeleteMode>("inactive")
  const { toast } = useToast()

  useEffect(() => {
    const idParam = params?.id
    if (!idParam) {
      setError("Identificador no válido")
      setLoading(false)
      return
    }

    const productoId = Number(idParam)
    if (Number.isNaN(productoId)) {
      setError("Identificador no válido")
      setLoading(false)
      return
    }

    let canceled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await ProductoService.getById(productoId)
        if (!canceled) {
          if (!data) {
            setError("Producto no encontrado")
          }
          setProducto(data)
        }
      } finally {
        if (!canceled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      canceled = true
    }
  }, [params])

  const stockBajo = useMemo(() => {
    if (!producto) return 0
    return producto.stockPorTalla.filter((detalle) => detalle.cantidad < producto.stockMinimo).length
  }, [producto])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando información del producto…</p>
      </div>
    )
  }

  if (error || !producto) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted-foreground">{error ?? "Producto no encontrado"}</p>
        <Button onClick={() => router.push("/admin/productos")}>Regresar al listado</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/productos">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Detalle del Producto</h1>
                <p className="text-sm text-muted-foreground">Código {producto.codigo}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/admin/productos/${producto.id}/editar`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <Button variant="destructive" onClick={() => setConfirmOpen(true)} disabled={deleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                {deleting ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información del Producto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-6 aspect-square w-full overflow-hidden rounded-lg">
                <Image
                  src={producto.imagen || "/placeholder.svg"}
                  alt={producto.nombre}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  loading="lazy"
                  className="object-cover"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold">{producto.nombre}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={producto.estado === "activo" ? "default" : "secondary"}>
                      {producto.estado.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{producto.categoria}</Badge>
                  </div>
                  {producto.descripcion && (
                    <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">
                      {producto.descripcion}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <p className="font-semibold text-foreground">Proveedor</p>
                    <p>{producto.proveedor || "No especificado"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Stock mínimo</p>
                    <p>{producto.stockMinimo} unidades</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Stock total</p>
                    <p>{producto.stockTotal} unidades</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Ubicaciones bajo mínimo</p>
                    <p>{stockBajo}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalles Comerciales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Precio</p>
                    <p className="text-xl font-bold text-primary">${producto.precio.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Descuento</p>
                    <p className="font-semibold">{producto.descuento}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estado</p>
                    <p className="font-semibold">{producto.estado}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Creado</p>
                    <p className="font-semibold">
                      {new Date(producto.createdAt).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stock por Almacén y Talla</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {producto.stockPorTalla.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No hay unidades registradas para este producto.
                    </p>
                  )}
                  {producto.stockPorTalla.map((item, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{item.almacen}</p>
                        <p className="text-sm text-muted-foreground">Talla {item.talla}</p>
                      </div>
                      <Badge variant={item.cantidad < producto.stockMinimo ? "destructive" : "default"}>
                        {item.cantidad} unidades
                      </Badge>
                    </div>
                  ))}
                </div>
                <Link href="/admin/productos">
                  <Button variant="outline" className="mt-4 w-full bg-transparent">
                    Volver al listado
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) {
            setDeleting(false)
            setDeleteMode("inactive")
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Define si deseas marcarlo como inactivo para conservar su historial o eliminarlo definitivamente junto con
              su stock y referencias. Esta decisión no se puede deshacer en el modo definitivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <RadioGroup
            value={deleteMode}
            onValueChange={(value) => setDeleteMode(value === "hard" ? "hard" : "inactive")}
            className="space-y-2"
          >
            <label
              htmlFor="detail-delete-inactive"
              className={cn(
                "flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 text-left transition hover:bg-muted/50",
                deleteMode === "inactive" ? "ring-2 ring-primary" : undefined,
              )}
            >
              <RadioGroupItem id="detail-delete-inactive" value="inactive" className="mt-1" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Marcar como inactivo</p>
                <p className="text-xs text-muted-foreground">
                  El producto dejará de mostrarse en listados activos, pero podrás reactivarlo cuando lo necesites.
                </p>
              </div>
            </label>
            <label
              htmlFor="detail-delete-hard"
              className={cn(
                "flex items-start gap-3 rounded-lg border border-destructive/60 bg-destructive/10 p-3 text-left transition hover:bg-destructive/20",
                deleteMode === "hard" ? "ring-2 ring-destructive" : undefined,
              )}
            >
              <RadioGroupItem id="detail-delete-hard" value="hard" className="mt-1" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Eliminar definitivamente</p>
                <p className="text-xs text-muted-foreground">
                  Se eliminará el producto, su stock y las imágenes de referencia asociadas. No podrás revertir esta
                  acción.
                </p>
              </div>
            </label>
          </RadioGroup>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                deleteMode === "hard"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
              disabled={deleting}
              onClick={async () => {
                if (!producto) return
                setDeleting(true)
                const exito = await ProductoService.delete(producto.id, { mode: deleteMode })
                setDeleting(false)
                if (!exito) {
                  toast({
                    title: "No se pudo eliminar",
                    description:
                      deleteMode === "hard"
                        ? "No fue posible eliminar el producto de manera definitiva."
                        : "Ocurrió un error al intentar actualizar el estado del producto",
                    variant: "destructive",
                  })
                  return
                }
                toast({
                  title: deleteMode === "hard" ? "Producto eliminado" : "Producto actualizado",
                  description:
                    deleteMode === "hard"
                      ? `${producto.nombre} se eliminó definitivamente del inventario.`
                      : `${producto.nombre} fue marcado como inactivo`,
                })
                setConfirmOpen(false)
                router.push("/admin/productos")
              }}
            >
              {deleting
                ? "Procesando…"
                : deleteMode === "hard"
                  ? "Eliminar definitivamente"
                  : "Marcar como inactivo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
