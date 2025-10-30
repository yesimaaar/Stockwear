"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Camera, Package, Search, LogOut, CheckCircle, XCircle, AlertCircle, Loader2, X, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AuthService } from "@/lib/services/auth-service"
import { ReconocimientoService } from "@/lib/services/reconocimiento-service"
import { ProductoService } from "@/lib/services/producto-service"

export default function EmpleadoDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(AuthService.getCurrentUser())
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showDesktopModal, setShowDesktopModal] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [resultado, setResultado] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [imageUrl, setImageUrl] = useState("")

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser || currentUser.rol !== "empleado") {
      router.push("/login")
      return
    }
    setUser(currentUser)
    setLoading(false)

    // Iniciar cámara automáticamente al cargar el dashboard
    if (isMobile) {
      startCamera()
    }
  }, [router, isMobile])

  const handleLogout = () => {
    AuthService.logout()
    router.push("/login")
  }

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const results = ProductoService.search(searchQuery)
    setSearchResults(results)
  }

  const handleConfirmarProducto = (confirmar: boolean) => {
    if (confirmar) {
      setResultado({ ...resultado, nivelConfianza: "alto" })
    } else {
      setResultado(null)
      startCamera()
    }
  }

  const startCamera = async () => {
    try {
      setCameraError(null)
      setResultado(null)
      setShowDesktopModal(false)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
        }
        setCameraActive(true)
      }
    } catch (error) {
      console.error("Error al acceder a la cámara:", error)
      setCameraError("No se pudo acceder a la cámara. Verifica los permisos.")
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
    setCameraError(null)
  }

  const capturePhoto = async () => {
    if (!videoRef.current) return

    setScanning(true)

    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext("2d")

    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0)
      const imageData = canvas.toDataURL("image/jpeg")

      // No detener la cámara después de capturar
      const result = await ReconocimientoService.procesarImagen(imageData, user!.id)

      setResultado(result)
      setScanning(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setShowDesktopModal(false)

    const reader = new FileReader()
    reader.onload = async (event) => {
      const imageData = event.target?.result as string
      const result = await ReconocimientoService.procesarImagen(imageData, user!.id)
      setResultado(result)
      setScanning(false)
    }
    reader.readAsDataURL(file)
  }

  const handleUrlUpload = async () => {
    if (!imageUrl.trim()) return

    setScanning(true)
    setShowDesktopModal(false)

    // Simular procesamiento de URL
    setTimeout(async () => {
      const result = await ReconocimientoService.procesarImagen(imageUrl, user!.id)
      setResultado(result)
      setScanning(false)
      setImageUrl("")
    }, 1000)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  // Vista de cámara completa solo para móviles
  if (cameraActive && isMobile && !resultado) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />

        {/* Header overlay */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={stopCamera} className="text-white hover:bg-white/20">
              <X className="h-6 w-6" />
            </Button>
            <h1 className="text-lg font-semibold text-white">StockWear Lens</h1>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Clock className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Marco de enfoque estilo Google Lens */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="relative w-[80%] h-[60%]">
            {/* Esquina superior izquierda */}
            <div className="absolute top-0 left-0 w-16 h-16 border-l-4 border-t-4 border-white rounded-tl-2xl" />
            {/* Esquina superior derecha */}
            <div className="absolute top-0 right-0 w-16 h-16 border-r-4 border-t-4 border-white rounded-tr-2xl" />
            {/* Esquina inferior izquierda */}
            <div className="absolute bottom-0 left-0 w-16 h-16 border-l-4 border-b-4 border-white rounded-bl-2xl" />
            {/* Esquina inferior derecha */}
            <div className="absolute bottom-0 right-0 w-16 h-16 border-r-4 border-b-4 border-white rounded-br-2xl" />
          </div>
        </div>

        {/* Botones inferiores */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8 z-10">
          <div className="flex items-center justify-center gap-8">
            {/* Botón pequeño izquierdo (historial) */}
            <button className="h-14 w-14 rounded-full bg-gray-800/80 backdrop-blur-sm flex items-center justify-center">
              <Clock className="h-6 w-6 text-white" />
            </button>

            {/* Botón principal de captura */}
            <button
              onClick={capturePhoto}
              disabled={scanning}
              className="relative h-20 w-20 rounded-full bg-white shadow-2xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {scanning ? (
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              ) : (
                <Search className="h-10 w-10 text-primary" />
              )}
            </button>

            {/* Botón pequeño derecho (placeholder) */}
            <div className="h-14 w-14" />
          </div>

          {/* Botones de acción inferiores */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button className="px-6 py-3 rounded-full bg-gray-800/80 backdrop-blur-sm text-white font-medium flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search
            </button>
            <button className="px-6 py-3 rounded-full bg-gray-800/80 backdrop-blur-sm text-white font-medium flex items-center gap-2">
              <Package className="h-5 w-5" />
              Translate
            </button>
          </div>
        </div>

        {cameraError && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-20">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>{cameraError}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 p-2">
                <Image
                  src="/stockwear-icon.png"
                  alt="StockWear"
                  width={24}
                  height={24}
                  className="object-contain brightness-0 invert"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">StockWear</h1>
                <p className="text-sm text-muted-foreground">Portal de Empleado</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{user?.nombre}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-2">Consulta de Productos</h2>
          <p className="text-muted-foreground">Escanea un producto o busca manualmente para ver su disponibilidad</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Reconocimiento Visual
            </CardTitle>
            <CardDescription>Captura una foto del producto para identificarlo automáticamente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Vista de cámara en tiempo real integrada en el dashboard */}
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              {cameraActive ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

                  {/* Overlay de controles */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <div className="flex items-center gap-4 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3">
                      <Button variant="ghost" size="icon" onClick={stopCamera} className="text-white hover:bg-white/20">
                        <X className="h-5 w-5" />
                      </Button>

                      <Button
                        onClick={capturePhoto}
                        disabled={scanning}
                        size="lg"
                        className="rounded-full w-16 h-16 bg-white hover:bg-white/90 text-primary"
                      >
                        {scanning ? <Loader2 className="h-6 w-6 animate-spin" /> : <Search className="h-6 w-6" />}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Package className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Indicador de escaneo */}
                  {scanning && (
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium animate-pulse">
                      Procesando imagen...
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white">
                  <Camera className="h-16 w-16 mb-4 text-gray-400" />
                  <p className="text-lg mb-4">Cámara no activa</p>
                  <Button onClick={startCamera} className="bg-gray-900 hover:bg-gray-800">
                    <Camera className="mr-2 h-4 w-4" />
                    Activar Cámara
                  </Button>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-600/90 text-white p-4">
                  <div className="text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>{cameraError}</p>
                    <Button onClick={startCamera} className="mt-2 bg-white text-red-600 hover:bg-white/90">
                      Reintentar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {resultado && (
              <div className="mt-6 space-y-4">
                {resultado.success ? (
                  <>
                    <div className="flex items-center gap-2 text-gray-900">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">{resultado.message}</span>
                      {resultado.nivelConfianza === "medio" && (
                        <Badge variant="outline" className="ml-2">
                          Confirmación requerida
                        </Badge>
                      )}
                    </div>

                    {resultado.producto && (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex gap-4">
                            <img
                              src={resultado.producto.imagen || "/placeholder.svg"}
                              alt={resultado.producto.nombre}
                              className="h-32 w-32 rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <h3 className="text-xl font-bold mb-2">{resultado.producto.nombre}</h3>
                              <p className="text-sm text-muted-foreground mb-1">Código: {resultado.producto.codigo}</p>
                              <p className="text-sm text-muted-foreground mb-3">
                                Categoría: {resultado.producto.categoria}
                              </p>
                              <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-3xl font-bold text-primary">
                                  ${resultado.producto.precio.toLocaleString()}
                                </span>
                                {resultado.producto.descuento > 0 && (
                                  <Badge variant="destructive">{resultado.producto.descuento}% OFF</Badge>
                                )}
                              </div>

                              <div className="space-y-2">
                                <p className="font-medium">Disponibilidad por talla:</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {resultado.producto.stockPorTalla.map((s: any, i: number) => (
                                    <div key={i} className="flex justify-between text-sm p-2 bg-muted rounded">
                                      <span>Talla {s.talla}</span>
                                      <span className={s.cantidad > 0 ? "text-gray-900 font-medium" : "text-red-600"}>
                                        {s.cantidad > 0 ? `${s.cantidad} unidades` : "Sin stock"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {resultado.nivelConfianza === "medio" && (
                            <div className="mt-4 flex gap-2">
                              <Button
                                onClick={() => handleConfirmarProducto(true)}
                                className="flex-1"
                                variant="default"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Sí, es correcto
                              </Button>
                              <Button
                                onClick={() => handleConfirmarProducto(false)}
                                className="flex-1"
                                variant="outline"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                No, intentar de nuevo
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">{resultado.message}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Búsqueda Manual
            </CardTitle>
            <CardDescription>Busca productos por nombre o código</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar por nombre o código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((producto) => (
                  <Card key={producto.id}>
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <img
                          src={producto.imagen || "/placeholder.svg"}
                          alt={producto.nombre}
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-bold">{producto.nombre}</h4>
                          <p className="text-sm text-muted-foreground">
                            {producto.codigo} - {producto.categoria}
                          </p>
                          <p className="text-lg font-bold text-primary mt-1">${producto.precio.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">Stock total: {producto.stockTotal} unidades</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No se encontraron productos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Input oculto para subir archivos */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
    </div>
  )
}
