"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Download, Upload, FileSpreadsheet, Loader2 } from "lucide-react"
import { ProductoService, type ProductoConStock } from "@/features/productos/services/producto-service"
import { InventarioService } from "@/features/movimientos/services/inventario-service"

interface ExcelActionsProps {
  onSuccess?: () => void
}

export function ExcelActions({ onSuccess }: ExcelActionsProps) {
  const { toast } = useToast()
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      const productos = await ProductoService.getAll({ force: true })
      
      const data = productos.map(p => {
        // Agrupar stock por talla
        const stockPorTallaMap = new Map<string, number>()
        p.stockPorTalla.forEach(item => {
          if (item.talla && item.talla !== 'none') {
            const current = stockPorTallaMap.get(item.talla) || 0
            stockPorTallaMap.set(item.talla, current + item.cantidad)
          }
        })

        const detalleStock = Array.from(stockPorTallaMap.entries())
          .map(([talla, cant]) => `${talla} (${cant})`)
          .join(", ")

        return {
          Codigo: p.codigo,
          Nombre: p.nombre,
          Categoria: p.categoria,
          Color: p.color || "",
          Precio: p.precio,
          Costo: p.precio_base || 0,
          Descuento: p.descuento || 0,
          StockMinimo: p.stockMinimo,
          Descripcion: p.descripcion || "",
          Proveedor: p.proveedor || "",
          StockTotal: p.stockTotal, // Informational only
          CantidadTallas: stockPorTallaMap.size,
          Talla: detalleStock
        }
      })

      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Productos")
      
      // Auto-width columns
      const max_width = data.reduce((w, r) => Math.max(w, r.Nombre.length), 10)
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
        { wch: 30 }, // Talla
      ]

      XLSX.writeFile(wb, `Inventario_Stockwear_${new Date().toISOString().split('T')[0]}.xlsx`)
      
      toast({
        title: "Exportación exitosa",
        description: `Se exportaron ${productos.length} productos.`
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
    const headers = [
      {
        Codigo: "EJEMPLO001",
        Nombre: "Camiseta Básica Negra",
        Categoria: "Camisetas",
        Color: "Negro",
        Precio: 45000,
        Costo: 25000,
        Descuento: 0,
        StockMinimo: 5,
        Descripcion: "Camiseta de algodón 100%",
        Proveedor: "Textiles SA",
        StockTotal: 23,
        CantidadTallas: 3,
        Almacen: "Principal",
        Talla: "38 (10), 40 (5), 42 (8)"
      }
    ]
    
    const ws = XLSX.utils.json_to_sheet(headers)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla")
    
    // Auto-width columns
    ws['!cols'] = [
      { wch: 15 }, // Codigo
      { wch: 25 }, // Nombre
      { wch: 15 }, // Categoria
      { wch: 15 }, // Color
      { wch: 10 }, // Precio
      { wch: 10 }, // Costo
      { wch: 10 }, // Descuento
      { wch: 12 }, // StockMinimo
      { wch: 25 }, // Descripcion
      { wch: 15 }, // Proveedor
      { wch: 12 }, // StockTotal
      { wch: 15 }, // CantidadTallas
      { wch: 15 }, // Almacen
      { wch: 30 }, // Talla
    ]

    XLSX.writeFile(wb, "Plantilla_Importacion_Productos.xlsx")
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws) as any[]

      if (data.length === 0) {
        throw new Error("El archivo está vacío")
      }

      // Load categories, tallas, almacenes
      const [categorias, tallas, almacenes] = await Promise.all([
        ProductoService.getCategoriasActivas(),
        InventarioService.getTallasActivas(),
        InventarioService.getAlmacenesActivos()
      ])
      
      const categoriaMap = new Map(categorias.map(c => [c.nombre.toLowerCase(), c.id]))
      const tallaMap = new Map(tallas.map(t => [t.nombre.toLowerCase(), t.id]))
      const almacenMap = new Map(almacenes.map(a => [a.nombre.toLowerCase(), a.id]))

      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      for (const row of data) {
        try {
          const codigo = String(row.Codigo || "").trim()
          const nombre = String(row.Nombre || "").trim()
          
          if (!codigo || !nombre) {
            errorCount++
            continue
          }

          // Find category ID
          const catName = String(row.Categoria || "").trim()
          let categoriaId = categoriaMap.get(catName.toLowerCase())

          if (!categoriaId) {
             const found = categorias.find(c => c.nombre.toLowerCase().includes(catName.toLowerCase()))
             if (found) {
                categoriaId = found.id
             } else if (categorias.length > 0) {
                throw new Error(`Categoría '${catName}' no encontrada`)
             } else {
                throw new Error("No hay categorías en el sistema")
             }
          }

          const payload = {
            codigo,
            nombre,
            categoriaId,
            precio: Number(row.Precio) || 0,
            precio_base: Number(row.Costo) || 0,
            descuento: Number(row.Descuento) || 0,
            stockMinimo: Number(row.StockMinimo) || 0,
            descripcion: String(row.Descripcion || ""),
            proveedor: String(row.Proveedor || ""),
            color: String(row.Color || "").trim() || null,
            imagen: null,
            estado: 'activo' as const
          }

          let nuevoId: number | null = null
          try {
            const creado = await ProductoService.create(payload)
            if (!creado) throw new Error("Error al crear producto")
            nuevoId = creado.id
            successCount++
          } catch (e: any) {
             if (e.message && e.message.includes("código del producto ya existe")) {
                errors.push(`${codigo}: Ya existe`)
                errorCount++
             } else {
                throw e
             }
          }

          // Process Stock if product created
          const stockStr = String(row.Talla || row.StockInicial || row.DetalleTallas || "").trim()
          if (nuevoId && stockStr) {
             const almacenNombre = String(row.Almacen || "").trim()
             let almacenId: number | null = null
             
             if (almacenNombre) {
                almacenId = almacenMap.get(almacenNombre.toLowerCase()) || null
             }
             
             if (!almacenId && almacenes.length > 0) {
                almacenId = almacenes[0].id
             }

             if (almacenId) {
                const parts = stockStr.split(",").map(s => s.trim())
                for (const part of parts) {
                   const match = part.match(/^(.+?)\s*\((\d+)\)$/)
                   if (match) {
                      const tallaNombre = match[1].trim()
                      const cantidad = parseInt(match[2], 10)
                      const tallaId = tallaMap.get(tallaNombre.toLowerCase())
                      
                      if (tallaId && cantidad > 0) {
                         try {
                            await InventarioService.registrarEntrada({
                               productoId: nuevoId,
                               tallaId,
                               almacenId,
                               cantidad,
                               motivo: "Importación inicial"
                            })
                         } catch (err) {
                            console.error("Error registering stock", err)
                         }
                      }
                   }
                }
             }
          }

        } catch (err: any) {
          console.error("Error importing row", row, err)
          errorCount++
          errors.push(`${row.Codigo || 'Fila desconocida'}: ${err.message}`)
        }
      }

      toast({
        title: "Importación completada",
        description: `Se crearon ${successCount} productos. ${errorCount} fallos.`,
        variant: errorCount > 0 ? "default" : "default"
      })

      if (errors.length > 0) {
         console.warn("Import errors:", errors)
         toast({
            title: "Detalles de errores",
            description: errors.slice(0, 3).join(", ") + (errors.length > 3 ? "..." : ""),
            variant: "destructive"
         })
      }

      setIsImportOpen(false)
      setFile(null)
      onSuccess?.()

    } catch (error: any) {
      console.error("Critical import error", error)
      toast({
        title: "Error crítico",
        description: error.message || "No se pudo procesar el archivo",
        variant: "destructive"
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExport} 
        disabled={exporting}
        className="h-9"
      >
        {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
        Exportar Excel
      </Button>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Upload className="mr-2 h-4 w-4" />
            Importar Excel
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Productos</DialogTitle>
            <DialogDescription>
              Carga un archivo Excel (.xlsx) con los productos. 
              Asegúrate de usar la plantilla correcta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-5 w-5" />
                <span>¿No tienes el formato?</span>
              </div>
              <Button variant="link" size="sm" onClick={handleDownloadTemplate}>
                Descargar Plantilla
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excel-file">Archivo Excel</Label>
              <Input 
                id="excel-file" 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancelar</Button>
            <Button onClick={handleImport} disabled={!file || importing}>
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Importar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
