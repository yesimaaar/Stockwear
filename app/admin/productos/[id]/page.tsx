"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProductoService, type ProductoConStock } from "@/lib/services/producto-service"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

export default function ProductoDetallePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [producto, setProducto] = useState<ProductoConStock | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este producto?</AlertDialogTitle>
            <AlertDialogDescription>
              El producto se marcará como inactivo y dejará de aparecer en los listados activos. Puedes reactivarlo más adelante si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={async () => {
                if (!producto) return
                setDeleting(true)
                const exito = await ProductoService.delete(producto.id)
                setDeleting(false)
                if (!exito) {
                  toast({
                    title: "No se pudo eliminar",
                    description: "Ocurrió un error al intentar actualizar el estado del producto",
                    variant: "destructive"
                  })
                  return
                }
                toast({
                  title: "Producto actualizado",
                  description: `${producto.nombre} fue marcado como inactivo`
                })
                setConfirmOpen(false)
                router.push("/admin/productos")
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
