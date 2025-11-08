"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as LucideIcons from "lucide-react"
const { ArrowLeft } = LucideIcons
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ProductoService } from "@/lib/services/producto-service"
import type { Categoria } from "@/lib/types"

export default function NuevoProductoPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cargandoCategorias, setCargandoCategorias] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    categoriaId: "",
    precio: "",
    descuento: "0",
    proveedor: "",
    stockMinimo: "",
    descripcion: "",
    imagen: "",
  })

  useEffect(() => {
    let activo = true
    const cargarCategorias = async () => {
      try {
        const data = await ProductoService.getCategoriasActivas()
        if (activo) {
          setCategorias(data)
        }
      } catch (error) {
        console.error("Error cargando categorías", error)
        toast({
          title: "No se pudieron cargar las categorías",
          description: "Intenta recargar la página",
          variant: "destructive",
        })
      } finally {
        if (activo) {
          setCargandoCategorias(false)
        }
      }
    }

    void cargarCategorias()
    return () => {
      activo = false
    }
  }, [toast])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!formData.categoriaId) {
      toast({
        title: "Selecciona una categoría",
        description: "Todos los productos deben pertenecer a una categoría",
        variant: "destructive",
      })
      return
    }

    const precio = Number(formData.precio)
    const descuento = formData.descuento ? Number(formData.descuento) : 0
    const stockMinimo = Number(formData.stockMinimo)
    const categoriaId = Number(formData.categoriaId)

    if (Number.isNaN(precio) || precio <= 0) {
      toast({
        title: "Precio inválido",
        description: "Ingresa un precio mayor a cero",
        variant: "destructive",
      })
      return
    }

    if (Number.isNaN(stockMinimo) || stockMinimo < 0) {
      toast({
        title: "Stock mínimo inválido",
        description: "El stock mínimo no puede ser negativo",
        variant: "destructive",
      })
      return
    }

    setGuardando(true)
    try {
      const payload = {
        codigo: formData.codigo.trim(),
        nombre: formData.nombre.trim(),
        categoriaId,
        descripcion: formData.descripcion.trim() || null,
        precio,
        descuento: Number.isNaN(descuento) ? 0 : descuento,
        proveedor: formData.proveedor.trim() || null,
        imagen: formData.imagen.trim() || null,
        stockMinimo,
        estado: "activo" as const,
      }

      const nuevoProducto = await ProductoService.create(payload)

      if (!nuevoProducto) {
        toast({
          title: "No se pudo guardar",
          description: "Supabase devolvió un error al intentar crear el producto",
          variant: "destructive",
        })
        setGuardando(false)
        return
      }

      toast({
        title: "Producto registrado",
        description: `${nuevoProducto.nombre} se añadió al inventario`,
      })
      router.push("/admin/productos")
    } catch (error) {
      console.error("Error creando producto", error)
      toast({
        title: "Error inesperado",
        description: "Revisa la consola para más detalles",
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/productos">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Nuevo Producto</h1>
              <p className="text-sm text-muted-foreground">Registrar producto en inventario</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código del Producto</Label>
                    <Input
                      id="codigo"
                      placeholder="ZAP-001"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Producto</Label>
                    <Input
                      id="nombre"
                      placeholder="Nike Air Max 270"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    placeholder="Descripción detallada del producto..."
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
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
                    <Label htmlFor="categoria">Categoría</Label>
                    <Select
                      value={formData.categoriaId}
                      onValueChange={(value) => setFormData({ ...formData, categoriaId: value })}
                      disabled={cargandoCategorias}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={cargandoCategorias ? "Cargando categorías..." : "Seleccionar categoría"} />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((categoria) => (
                          <SelectItem key={categoria.id} value={String(categoria.id)}>
                            {categoria.nombre}
                          </SelectItem>
                        ))}
                        {!cargandoCategorias && categorias.length === 0 && (
                          <SelectItem value="" disabled>
                            No hay categorías activas disponibles
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {!cargandoCategorias && categorias.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Crea una categoría en el panel correspondiente antes de registrar productos.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proveedor">Proveedor</Label>
                    <Input
                      id="proveedor"
                      placeholder="Nike, Adidas, Puma..."
                      value={formData.proveedor}
                      onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Precios y Stock</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="precio">Precio (COP)</Label>
                    <Input
                      id="precio"
                      type="number"
                      placeholder="450000"
                      value={formData.precio}
                      onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descuento">Descuento (%)</Label>
                    <Input
                      id="descuento"
                      type="number"
                      placeholder="0"
                      value={formData.descuento}
                      onChange={(e) => setFormData({ ...formData, descuento: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stockMinimo">Stock Mínimo</Label>
                    <Input
                      id="stockMinimo"
                      type="number"
                      placeholder="10"
                      value={formData.stockMinimo}
                      onChange={(e) => setFormData({ ...formData, stockMinimo: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Imagen del Producto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="imagen">URL de imagen (opcional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="imagen"
                      placeholder="https://..."
                      value={formData.imagen}
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
                  <p className="text-xs text-muted-foreground">
                    Sube la imagen a tu almacenamiento preferido y pega aquí la URL pública.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Link href="/admin/productos">
                <Button variant="outline" type="button" disabled={guardando}>
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={guardando || (!cargandoCategorias && categorias.length === 0)}
              >
                {guardando ? "Guardando..." : "Guardar Producto"}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
