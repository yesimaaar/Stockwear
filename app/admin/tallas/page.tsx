import Link from "next/link"
import { Ruler, Plus, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function TallasPage() {
  const tallasNumericas = [
    { id: 1, nombre: "36", tipo: "Numérico", estado: "Activo" },
    { id: 2, nombre: "37", tipo: "Numérico", estado: "Activo" },
    { id: 3, nombre: "38", tipo: "Numérico", estado: "Activo" },
    { id: 4, nombre: "39", tipo: "Numérico", estado: "Activo" },
    { id: 5, nombre: "40", tipo: "Numérico", estado: "Activo" },
    { id: 6, nombre: "41", tipo: "Numérico", estado: "Activo" },
    { id: 7, nombre: "42", tipo: "Numérico", estado: "Activo" },
  ]

  const tallasAlfanumericas = [
    { id: 8, nombre: "XS", tipo: "Alfanumérico", estado: "Activo" },
    { id: 9, nombre: "S", tipo: "Alfanumérico", estado: "Activo" },
    { id: 10, nombre: "M", tipo: "Alfanumérico", estado: "Activo" },
    { id: 11, nombre: "L", tipo: "Alfanumérico", estado: "Activo" },
    { id: 12, nombre: "XL", tipo: "Alfanumérico", estado: "Activo" },
    { id: 13, nombre: "XXL", tipo: "Alfanumérico", estado: "Activo" },
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
                <Ruler className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Tallas</h1>
                  <p className="text-sm text-muted-foreground">Gestión de tallas disponibles</p>
                </div>
              </div>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Talla
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tallas Numéricas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {tallasNumericas.map((talla) => (
                  <div
                    key={talla.id}
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-primary bg-primary/5 p-4 transition-all hover:bg-primary/10"
                  >
                    <span className="text-2xl font-bold text-primary">{talla.nombre}</span>
                    <Badge variant="outline" className="mt-2">
                      {talla.estado}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tallas Alfanuméricas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {tallasAlfanumericas.map((talla) => (
                  <div
                    key={talla.id}
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-green-600 bg-green-50 p-4 transition-all hover:bg-green-100"
                  >
                    <span className="text-2xl font-bold text-green-600">{talla.nombre}</span>
                    <Badge variant="outline" className="mt-2">
                      {talla.estado}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
