import Link from "next/link"
import { Tag, Plus, ArrowLeft, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function CategoriasPage() {
  const categorias = [
    {
      id: 1,
      nombre: "Calzado Deportivo",
      descripcion: "Zapatillas y calzado para actividades deportivas",
      productos: 45,
      estado: "Activo",
    },
    {
      id: 2,
      nombre: "Ropa Deportiva",
      descripcion: "Camisetas, pantalones y ropa para entrenar",
      productos: 120,
      estado: "Activo",
    },
    {
      id: 3,
      nombre: "Accesorios",
      descripcion: "Gorras, medias, guantes y otros accesorios",
      productos: 78,
      estado: "Activo",
    },
    {
      id: 4,
      nombre: "Calzado Casual",
      descripcion: "Zapatillas y calzado para uso diario",
      productos: 32,
      estado: "Inactivo",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Tag className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Categorías</h1>
                  <p className="text-sm text-muted-foreground">Organización de productos</p>
                </div>
              </div>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Categoría
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categorias.map((categoria) => (
            <Card key={categoria.id} className="transition-all hover:shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Tag className="h-6 w-6 text-primary" />
                  </div>
                  <Badge variant={categoria.estado === "Activo" ? "default" : "secondary"}>{categoria.estado}</Badge>
                </div>
                <h3 className="mb-2 text-xl font-semibold">{categoria.nombre}</h3>
                <p className="mb-4 text-sm text-muted-foreground">{categoria.descripcion}</p>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Productos</span>
                  <span className="text-lg font-bold text-primary">{categoria.productos}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
