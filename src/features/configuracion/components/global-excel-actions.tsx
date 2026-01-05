"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Download, Upload, FileSpreadsheet, Loader2, FileDown } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { ProductoService } from "@/features/productos/services/producto-service"
import { InventarioService } from "@/features/movimientos/services/inventario-service"
import { revalidateSystem } from "@/app/actions/system-actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export function GlobalExcelActions() {
  const { toast } = useToast()
  const router = useRouter()
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

  const [selectedModules, setSelectedModules] = useState({
    almacenes: true,
    categorias: true,
    tallas: true,
    productos: true
  })

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) throw new Error("No session")

      const [almacenes, categorias, tallas, productos] = await Promise.all([
        supabase.from('almacenes').select('*'),
        supabase.from('categorias').select('*'),
        supabase.from('tallas').select('*'),
        supabase.from('productos').select(`
          *,
          categoria:categorias(nombre),
          stock:stock(
            cantidad,
            talla:tallas(nombre),
            almacen:almacenes(nombre)
          )
        `)
      ])

      const wb = XLSX.utils.book_new()

      // 1. Almacenes
      if (almacenes.data) {
        const data = almacenes.data.map(a => ({
          Nombre: a.nombre,
          Direccion: a.direccion,
          Tipo: a.tipo,
          Abreviatura: a.abreviatura,
          Estado: a.estado
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        XLSX.utils.book_append_sheet(wb, ws, "Almacenes")
      }

      // 2. Categorias
      if (categorias.data) {
        const data = categorias.data.map(c => ({
          Nombre: c.nombre,
          Descripcion: c.descripcion,
          Estado: c.estado
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        XLSX.utils.book_append_sheet(wb, ws, "Categorias")
      }

      // 3. Tallas
      if (tallas.data) {
        const data = tallas.data.map(t => ({
          Nombre: t.nombre,
          Tipo: t.tipo,
          Estado: t.estado
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        XLSX.utils.book_append_sheet(wb, ws, "Tallas")
      }

      // 4. Productos
      if (productos.data) {
        const data = productos.data.map(p => {
          // Logic similar to excel-actions.tsx
          const stockPorTallaMap = new Map<string, number>()
          const almacenesSet = new Set<string>()

          const stock = (p.stock as any[]) || []
          stock.forEach((item: any) => {
            const tallaNombre = item.talla?.nombre
            const almacenNombre = item.almacen?.nombre
            const cantidad = item.cantidad

            if (tallaNombre && tallaNombre !== 'none') {
              const current = stockPorTallaMap.get(tallaNombre) || 0
              stockPorTallaMap.set(tallaNombre, current + cantidad)
            }
            if (almacenNombre) {
              almacenesSet.add(almacenNombre)
            }
          })

          const detalleStock = Array.from(stockPorTallaMap.entries())
            .map(([talla, cant]) => `${talla} (${cant})`)
            .join(", ")

          const almacenesStr = Array.from(almacenesSet).join(", ")

          return {
            Codigo: p.codigo,
            Nombre: p.nombre,
            Categoria: (p.categoria as any)?.nombre || '',
            Color: p.color || "",
            Precio: p.precio,
            Costo: p.precio_base,
            Descuento: p.descuento,
            StockMinimo: p.stockMinimo,
            Descripcion: p.descripcion,
            Proveedor: p.proveedor,
            StockTotal: (stock as any[]).reduce((sum, s) => sum + (s.cantidad || 0), 0),
            CantidadTallas: stockPorTallaMap.size,
            Almacen: almacenesStr,
            Talla: detalleStock,
            Estado: p.estado
          }
        })
        const ws = XLSX.utils.json_to_sheet(data)

        // Auto-width columns
        const max_width = data.reduce((w, r) => Math.max(w, (r.Nombre || '').length), 10)
        ws['!cols'] = [
          { wch: 15 }, // Codigo
          { wch: max_width }, // Nombre
          { wch: 20 }, // Categoria
          { wch: 15 }, // Color
          { wch: 12 }, // Precio
          { wch: 12 }, // Costo
          { wch: 10 }, // Descuento
          { wch: 12 }, // StockMinimo
          { wch: 30 }, // Descripcion
          { wch: 20 }, // Proveedor
          { wch: 12 }, // StockTotal
          { wch: 15 }, // CantidadTallas
          { wch: 20 }, // Almacen
          { wch: 30 }, // Talla
          { wch: 10 }, // Estado
        ]

        XLSX.utils.book_append_sheet(wb, ws, "Productos")
      }

      XLSX.writeFile(wb, `Configuracion_Sistema_${new Date().toISOString().split('T')[0]}.xlsx`)

      toast({
        title: "Exportación exitosa",
        description: "Se han exportado todos los datos del sistema."
      })
    } catch (error) {
      console.error("Error exportando excel", error)
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el archivo de Excel.",
        variant: "destructive"
      })
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new()

    if (selectedModules.almacenes) {
      const ws = XLSX.utils.json_to_sheet([{
        Nombre: "Ejemplo Almacen",
        Direccion: "Calle 123",
        Tipo: "sucursal",
        Abreviatura: "ALM",
        Estado: "activo"
      }])
      XLSX.utils.book_append_sheet(wb, ws, "Almacenes")
    }

    if (selectedModules.categorias) {
      const ws = XLSX.utils.json_to_sheet([{
        Nombre: "Ejemplo Categoria",
        Descripcion: "Descripcion opcional",
        Estado: "activo"
      }])
      XLSX.utils.book_append_sheet(wb, ws, "Categorias")
    }

    if (selectedModules.tallas) {
      const ws = XLSX.utils.json_to_sheet([{
        Nombre: "M",
        Tipo: "alfanumerico",
        Estado: "activo"
      }])
      XLSX.utils.book_append_sheet(wb, ws, "Tallas")
    }

    if (selectedModules.productos) {
      const ws = XLSX.utils.json_to_sheet([{
        Codigo: "PROD001",
        Nombre: "Producto Ejemplo",
        Categoria: "Ejemplo Categoria",
        Color: "Negro",
        Precio: 100,
        Costo: 80,
        Descuento: 0,
        StockMinimo: 5,
        Descripcion: "Descripcion del producto",
        Proveedor: "Proveedor Ejemplo",
        StockTotal: 15, // Info
        CantidadTallas: 2, // Info
        Almacen: "Principal",
        Talla: "38 (10), 40 (5)",
        Estado: "activo"
      }])

      ws['!cols'] = [
        { wch: 15 }, // Codigo
        { wch: 25 }, // Nombre
        { wch: 20 }, // Categoria
        { wch: 15 }, // Color
        { wch: 10 }, // Precio
        { wch: 10 }, // Costo
        { wch: 10 }, // Descuento
        { wch: 12 }, // StockMinimo
        { wch: 25 }, // Descripcion
        { wch: 20 }, // Proveedor
        { wch: 12 }, // StockTotal
        { wch: 15 }, // CantidadTallas
        { wch: 20 }, // Almacen
        { wch: 30 }, // Talla
        { wch: 10 }, // Estado
      ]

      XLSX.utils.book_append_sheet(wb, ws, "Productos")
    }

    XLSX.writeFile(wb, `Plantilla_Importacion_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("No session")

      const { data: userProfile } = await supabase
        .from('usuarios')
        .select('tienda_id')
        .eq('auth_uid', session.user.id)
        .single()

      if (!userProfile) throw new Error("No se pudo obtener la tienda del usuario")
      const tiendaId = userProfile.tienda_id

      const processSheet = (name: string) => {
        const ws = wb.Sheets[name]
        return ws ? XLSX.utils.sheet_to_json(ws) : []
      }

      const almacenesData = processSheet("Almacenes")
      const categoriasData = processSheet("Categorias")
      const tallasData = processSheet("Tallas")
      const productosData = processSheet("Productos")

      // 1. Import Almacenes
      const almacenMap = new Map<string, number>()
      if (almacenesData.length > 0) {
        for (const row of almacenesData as any[]) {
          if (!row.Nombre) continue

          const { data: existing } = await supabase
            .from('almacenes')
            .select('id')
            .eq('tienda_id', tiendaId)
            .eq('nombre', row.Nombre)
            .maybeSingle()

          let opError
          let currentId = existing?.id

          if (existing) {
            const { error } = await supabase.from('almacenes').update({
              direccion: row.Direccion,
              tipo: row.Tipo || 'sucursal',
              abreviatura: row.Abreviatura || row.Nombre.substring(0, 3).toUpperCase(),
              estado: row.Estado || 'activo'
            }).eq('id', existing.id)
            opError = error
          } else {
            const { data: newAlm, error } = await supabase.from('almacenes').insert({
              tienda_id: tiendaId,
              nombre: row.Nombre,
              direccion: row.Direccion,
              tipo: row.Tipo || 'sucursal',
              abreviatura: row.Abreviatura || row.Nombre.substring(0, 3).toUpperCase(),
              estado: row.Estado || 'activo'
            }).select('id').single()
            opError = error
            currentId = newAlm?.id
          }

          if (currentId) almacenMap.set(row.Nombre.toLowerCase(), currentId)
          if (opError) console.error('Error importing almacen:', row.Nombre, JSON.stringify(opError))
        }
      }

      // Load all almacenes if map is incomplete (e.g. if we didn't import them but they exist)
      if (almacenMap.size === 0) {
        const { data: allAlm } = await supabase.from('almacenes').select('id, nombre').eq('tienda_id', tiendaId)
        allAlm?.forEach(a => almacenMap.set(a.nombre.toLowerCase(), a.id))
      }

      // 2. Import Categorias
      const categoriaMap = new Map<string, number>()
      if (categoriasData.length > 0) {
        for (const row of categoriasData as any[]) {
          if (!row.Nombre) continue

          const { data: existing } = await supabase
            .from('categorias')
            .select('id, nombre')
            .eq('tienda_id', tiendaId)
            .eq('nombre', row.Nombre)
            .maybeSingle()

          let catId = null
          let opError

          if (existing) {
            const { error } = await supabase.from('categorias').update({
              descripcion: row.Descripcion,
              estado: row.Estado || 'activo'
            }).eq('id', existing.id)
            opError = error
            catId = existing.id
          } else {
            const { data: newCat, error } = await supabase.from('categorias').insert({
              tienda_id: tiendaId,
              nombre: row.Nombre,
              descripcion: row.Descripcion,
              estado: row.Estado || 'activo'
            }).select('id, nombre').single()
            opError = error
            if (newCat) catId = newCat.id
          }

          if (opError) console.error('Error importing categoria:', row.Nombre, JSON.stringify(opError))
          if (catId) categoriaMap.set(row.Nombre, catId)
        }
      }

      // Refresh category map
      const { data: allCats } = await supabase.from('categorias').select('id, nombre').eq('tienda_id', tiendaId)
      allCats?.forEach(c => categoriaMap.set(c.nombre, c.id))

      // 3. Import Tallas
      const tallaMap = new Map<string, number>()
      if (tallasData.length > 0) {
        for (const row of tallasData as any[]) {
          if (!row.Nombre) continue

          // Manual upsert strategy to avoid constraint issues
          const { data: existing } = await supabase
            .from('tallas')
            .select('id')
            .eq('tienda_id', tiendaId)
            .eq('nombre', row.Nombre.toString())
            .maybeSingle()

          let opError
          let tallaId = existing?.id

          if (existing) {
            const { error } = await supabase.from('tallas').update({
              tipo: row.Tipo || 'alfanumerico',
              estado: row.Estado || 'activo'
            }).eq('id', existing.id)
            opError = error
          } else {
            const { data: newTalla, error } = await supabase.from('tallas').insert({
              tienda_id: tiendaId,
              nombre: row.Nombre.toString(),
              tipo: row.Tipo || 'alfanumerico',
              estado: row.Estado || 'activo'
            }).select('id').single()
            opError = error
            tallaId = newTalla?.id
          }

          if (tallaId) tallaMap.set(row.Nombre.toString().toLowerCase(), tallaId)
          if (opError) console.error('Error importing talla:', row.Nombre, JSON.stringify(opError))
        }
      }

      // Refresh tallas map
      const { data: allTallas } = await supabase.from('tallas').select('id, nombre').eq('tienda_id', tiendaId)
      allTallas?.forEach(t => tallaMap.set(t.nombre.toLowerCase(), t.id))

      // 4. Import Productos
      if (productosData.length > 0) {
        for (const row of productosData as any[]) {
          if (!row.Codigo || !row.Nombre) continue

          let catId = row.Categoria ? categoriaMap.get(row.Categoria) : null

          // Try case insensitive match if failed
          if (!catId && row.Categoria) {
            const found = Array.from(categoriaMap.entries()).find(([name, _]) => name.toLowerCase() === row.Categoria.toLowerCase())
            if (found) catId = found[1]
          }

          if (row.Categoria && !catId) {
            // Try to find existing category first to avoid duplicates if map missed it
            const { data: existingCat } = await supabase
              .from('categorias')
              .select('id')
              .eq('tienda_id', tiendaId)
              .eq('nombre', row.Categoria)
              .maybeSingle()

            if (existingCat) {
              categoriaMap.set(row.Categoria, existingCat.id)
              catId = existingCat.id
            } else {
              const { data: newCat, error: catError } = await supabase.from('categorias').insert({
                tienda_id: tiendaId,
                nombre: row.Categoria,
                estado: 'activo'
              }).select().single()

              if (catError) console.error('Error creating implicit category:', row.Categoria, JSON.stringify(catError))
              if (newCat) {
                categoriaMap.set(newCat.nombre, newCat.id)
                catId = newCat.id
              }
            }
          }

          const { data: existingProd } = await supabase
            .from('productos')
            .select('id')
            .eq('tienda_id', tiendaId)
            .eq('codigo', row.Codigo.toString())
            .maybeSingle()

          let opError
          let prodId = existingProd?.id

          const productPayload = {
            nombre: row.Nombre,
            categoriaId: catId || null,
            precio: Number(row.Precio) || 0,
            precio_base: Number(row.Costo) || 0,
            descuento: Number(row.Descuento) || 0,
            stockMinimo: Number(row.StockMinimo) || 5,
            descripcion: row.Descripcion,
            proveedor: row.Proveedor,
            color: row.Color || null,
            estado: (String(row.Estado || "activo").toLowerCase() === "inactivo" ? "inactivo" : "activo"),
            tienda_id: tiendaId,
            codigo: row.Codigo.toString()
          }

          if (existingProd) {
            const { error } = await supabase.from('productos').update(productPayload).eq('id', existingProd.id)
            opError = error
          } else {
            const { data: newProd, error } = await supabase.from('productos').insert(productPayload).select('id').single()
            opError = error
            prodId = newProd?.id
          }

          if (opError) {
            console.error('Error importing producto:', row.Codigo, JSON.stringify(opError))
            continue
          }

          // Process Stock logic (TallaStr -> Stock entries)
          // Look for 'Talla' column first, then fallbacks
          const stockStr = String(row.Talla || row.StockInicial || row.DetalleTallas || "").trim()

          // Resolve Almacen for this row
          const almacenNombre = String(row.Almacen || "").trim()
          // Default to first available almacen if not specified or not found
          let almacenId = almacenNombre ? almacenMap.get(almacenNombre.toLowerCase()) : null

          if (!almacenId && almacenMap.size > 0) {
            // Get the first value from the map iterator
            almacenId = almacenMap.values().next().value
          }

          if (prodId && stockStr && almacenId) {
            const parts = stockStr.split(",").map((s: string) => s.trim())
            for (const part of parts) {
              const match = part.match(/^(.+?)\s*\((\d+)\)$/)
              if (match) {
                const tallaNombre = match[1].trim()
                const cantidad = parseInt(match[2], 10)
                const tallaId = tallaMap.get(tallaNombre.toLowerCase())

                if (tallaId && cantidad > 0) {
                  try {
                    await InventarioService.registrarEntrada({
                      productoId: prodId,
                      tallaId,
                      almacenId,
                      cantidad,
                      motivo: "Importación masiva"
                    })
                  } catch (err) {
                    console.error("Error registering stock for imported product", row.Codigo, err)
                  }
                }
              }
            }
          }
        }
      }

      // Invalidate caches and refresh UI
      ProductoService.invalidateCache()
      await revalidateSystem()
      router.refresh()

      toast({
        title: "Importación completada",
        description: "Se han procesado los datos correctamente. La página se actualizará."
      })

      e.target.value = ''
      setIsImportDialogOpen(false)

    } catch (error) {
      console.error("Error importando excel", error)
      toast({
        title: "Error al importar",
        description: "Ocurrió un error al procesar el archivo.",
        variant: "destructive"
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="outline"
        className="w-full"
        onClick={handleExport}
        disabled={exporting}
      >
        {exporting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Exportar Todo
      </Button>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            Importar Todo
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Importar Datos</DialogTitle>
            <DialogDescription>
              Selecciona los módulos que deseas importar y descarga la plantilla correspondiente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <h4 className="font-medium leading-none">Módulos a incluir</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mod-almacenes"
                    checked={selectedModules.almacenes}
                    onCheckedChange={(c) => setSelectedModules(prev => ({ ...prev, almacenes: !!c }))}
                  />
                  <Label htmlFor="mod-almacenes">Almacenes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mod-categorias"
                    checked={selectedModules.categorias}
                    onCheckedChange={(c) => setSelectedModules(prev => ({ ...prev, categorias: !!c }))}
                  />
                  <Label htmlFor="mod-categorias">Categorías</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mod-tallas"
                    checked={selectedModules.tallas}
                    onCheckedChange={(c) => setSelectedModules(prev => ({ ...prev, tallas: !!c }))}
                  />
                  <Label htmlFor="mod-tallas">Tallas</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mod-productos"
                    checked={selectedModules.productos}
                    onCheckedChange={(c) => setSelectedModules(prev => ({ ...prev, productos: !!c }))}
                  />
                  <Label htmlFor="mod-productos">Productos</Label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={handleDownloadTemplate} className="w-full">
                <FileDown className="mr-2 h-4 w-4" />
                Descargar Plantilla
              </Button>

              <div className="relative w-full">
                <Button
                  className="w-full"
                  disabled={importing}
                  onClick={() => document.getElementById('dialog-import-input')?.click()}
                >
                  {importing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Subir Plantilla y Procesar
                </Button>
                <input
                  id="dialog-import-input"
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={handleImport}
                  disabled={importing}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground text-center">
        Soporta múltiples hojas: Almacenes, Categorias, Tallas, Productos
      </p>
    </div>
  )
}
