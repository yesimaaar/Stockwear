"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Download, Upload, FileSpreadsheet, Loader2, FileDown } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { ProductoService } from "@/features/productos/services/producto-service"
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
        supabase.from('productos').select('*, categoria:categorias(nombre)')
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
        const data = productos.data.map(p => ({
          Codigo: p.codigo,
          Nombre: p.nombre,
          Categoria: (p.categoria as any)?.nombre || '',
          Precio: p.precio,
          Costo: p.precio_base,
          Descuento: p.descuento,
          StockMinimo: p.stockMinimo,
          Descripcion: p.descripcion,
          Proveedor: p.proveedor,
          Estado: p.estado
        }))
        const ws = XLSX.utils.json_to_sheet(data)
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
        Precio: 100,
        Costo: 80,
        Descuento: 0,
        StockMinimo: 5,
        Descripcion: "Descripcion del producto",
        Proveedor: "Proveedor Ejemplo",
        Estado: "activo"
      }])
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
          if (existing) {
            const { error } = await supabase.from('almacenes').update({
              direccion: row.Direccion,
              tipo: row.Tipo || 'sucursal',
              abreviatura: row.Abreviatura || row.Nombre.substring(0, 3).toUpperCase(),
              estado: row.Estado || 'activo'
            }).eq('id', existing.id)
            opError = error
          } else {
            const { error } = await supabase.from('almacenes').insert({
              tienda_id: tiendaId,
              nombre: row.Nombre,
              direccion: row.Direccion,
              tipo: row.Tipo || 'sucursal',
              abreviatura: row.Abreviatura || row.Nombre.substring(0, 3).toUpperCase(),
              estado: row.Estado || 'activo'
            })
            opError = error
          }
          
          if (opError) console.error('Error importing almacen:', row.Nombre, JSON.stringify(opError))
        }
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
          
          if (existing) {
            const { error } = await supabase.from('tallas').update({
              tipo: row.Tipo || 'alfanumerico',
              estado: row.Estado || 'activo'
            }).eq('id', existing.id)
            opError = error
          } else {
            const { error } = await supabase.from('tallas').insert({
              tienda_id: tiendaId,
              nombre: row.Nombre.toString(),
              tipo: row.Tipo || 'alfanumerico',
              estado: row.Estado || 'activo'
            })
            opError = error
          }
          
          if (opError) console.error('Error importing talla:', row.Nombre, JSON.stringify(opError))
        }
      }

      // 4. Import Productos
      if (productosData.length > 0) {
        for (const row of productosData as any[]) {
          if (!row.Codigo || !row.Nombre) continue
          
          const catId = row.Categoria ? categoriaMap.get(row.Categoria) : null
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
              } else {
                  const { data: newCat, error: catError } = await supabase.from('categorias').insert({
                      tienda_id: tiendaId,
                      nombre: row.Categoria,
                      estado: 'activo'
                  }).select().single()
                  
                  if (catError) console.error('Error creating implicit category:', row.Categoria, JSON.stringify(catError))
                  if (newCat) categoriaMap.set(newCat.nombre, newCat.id)
              }
          }

          const { data: existingProd } = await supabase
            .from('productos')
            .select('id')
            .eq('tienda_id', tiendaId)
            .eq('codigo', row.Codigo.toString())
            .maybeSingle()

          let opError
          if (existingProd) {
             const { error } = await supabase.from('productos').update({
                nombre: row.Nombre,
                categoriaId: categoriaMap.get(row.Categoria) || null,
                precio: Number(row.Precio) || 0,
                precio_base: Number(row.Costo) || 0,
                descuento: Number(row.Descuento) || 0,
                stockMinimo: Number(row.StockMinimo) || 5,
                descripcion: row.Descripcion,
                proveedor: row.Proveedor,
                estado: row.Estado || 'activo'
             }).eq('id', existingProd.id)
             opError = error
          } else {
             const { error } = await supabase.from('productos').insert({
                tienda_id: tiendaId,
                codigo: row.Codigo.toString(),
                nombre: row.Nombre,
                categoriaId: categoriaMap.get(row.Categoria) || null,
                precio: Number(row.Precio) || 0,
                precio_base: Number(row.Costo) || 0,
                descuento: Number(row.Descuento) || 0,
                stockMinimo: Number(row.StockMinimo) || 5,
                descripcion: row.Descripcion,
                proveedor: row.Proveedor,
                estado: row.Estado || 'activo'
             })
             opError = error
          }
          
          if (opError) console.error('Error importing producto:', row.Codigo, JSON.stringify(opError))
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
