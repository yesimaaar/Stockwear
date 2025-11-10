"use client"

import type React from "react"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import * as LucideIcons from "lucide-react"
const {
  Camera,
  Package,
  Search,
  LogOut,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  Clock,
  Sparkles,
  Gauge,
  Upload,
  Image: ImageIcon,
} = LucideIcons
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AuthService } from "@/lib/services/auth-service"
import { ReconocimientoService, type ReconocimientoResult } from "@/lib/services/reconocimiento-service"
import { ProductoService } from "@/lib/services/producto-service"
import type { Usuario } from "@/lib/types"
import { useShoeRecognizer } from "@/hooks/use-shoe-recognizer"
import { clampThreshold, getDefaultThreshold, persistThreshold } from "@/lib/config/recognition"

export default function EmpleadoDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const manualSearchRef = useRef<HTMLInputElement>(null)
  const cameraRequestedRef = useRef(false)
  const [resultado, setResultado] = useState<ReconocimientoResult | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([])
  const { computeEmbedding, loadingModel, error: recognizerError, resetError } = useShoeRecognizer()
  const [threshold, setThreshold] = useState(() => getDefaultThreshold())

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await AuthService.getCurrentUser()
      if (!currentUser || currentUser.rol !== "empleado") {
        router.push("/login")
        return
      }
      setUser(currentUser)
      setLoading(false)
    }

    void loadUser()
  }, [router])

  useEffect(() => {
    if (recognizerError) {
      setCameraError(recognizerError)
    }
  }, [recognizerError])

  useEffect(() => {
    if (!user || cameraRequestedRef.current || cameraActive) {
      return
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Tu navegador no soporta acceso a la cámara.")
      return
    }

    cameraRequestedRef.current = true
    void startCamera()
  }, [user, cameraActive])

  const loadRecommendations = useCallback(
    async (categoria?: string, excludeId?: number) => {
      if (!categoria) {
        setRecommendedProducts([])
        return
      }

      try {
        const related = await ProductoService.search(categoria)
        const filtered = related.filter((item: any) => item.id !== excludeId).slice(0, 4)
        setRecommendedProducts(filtered)
      } catch (error) {
        console.error("No fue posible cargar recomendaciones", error)
      }
    },
    []
  )

  useEffect(() => {
    if (!cameraActive) {
      return
    }

    const video = videoRef.current
    if (!video || !streamRef.current) {
      return
    }

    video.srcObject = streamRef.current
    const handleLoadedMetadata = () => {
      void video.play()
    }

    video.onloadedmetadata = handleLoadedMetadata

    return () => {
      if (video) {
        video.onloadedmetadata = null
      }
    }
  }, [cameraActive])

  const handleLogout = async () => {
    await AuthService.logout()
    router.push("/login")
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const results = await ProductoService.search(searchQuery)
    setSearchResults(results)
  }

  const clearManualSearch = () => {
    setSearchQuery("")
    setSearchResults([])
  }

  const handleThresholdChange = useCallback((values: number[]) => {
    const rawValue = values[0] ?? threshold
    const clamped = clampThreshold(rawValue)
    setThreshold(clamped)
  }, [threshold])

  const handleThresholdCommit = useCallback((values: number[]) => {
    const rawValue = values[0] ?? threshold
    const clamped = clampThreshold(rawValue)
    setThreshold(clamped)
    persistThreshold(clamped)
  }, [threshold])

  const handleConfirmarProducto = (confirmar: boolean) => {
    if (confirmar) {
      setResultado((prev: any) => (prev ? { ...prev, nivelConfianza: "alto" } : prev))
    } else {
      setResultado(null)
      void startCamera()
    }
  }

  useEffect(() => {
    if (resultado?.success && resultado.producto) {
      void loadRecommendations(resultado.producto.categoria, resultado.producto.id)
    }
  }, [resultado, loadRecommendations])

  useEffect(() => {
    if (searchResults.length > 0) {
      const reference = searchResults[0]
      void loadRecommendations(reference.categoria, reference.id)
    } else if (!resultado) {
      setRecommendedProducts([])
    }
  }, [searchResults, loadRecommendations, resultado])

  const startCamera = async () => {
    try {
      setCameraError(null)
      resetError()
      setResultado(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      streamRef.current = stream
      setCameraActive(true)
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
    if (!videoRef.current || !user) return

    setScanning(true)

    try {
      const canvas = document.createElement("canvas")
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        throw new Error("No se pudo acceder al contexto del canvas")
      }

      ctx.drawImage(videoRef.current, 0, 0)

      const embedding = await computeEmbedding(canvas)
      const result = await ReconocimientoService.procesarEmbedding({
        embedding,
        empleadoId: user.id,
        umbral: threshold,
      })

      setResultado(result)
    } catch (error) {
      console.error("Error al procesar la captura", error)
      setCameraError("No se pudo identificar el producto. Inténtalo nuevamente.")
    } finally {
      setScanning(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)

    try {
      let imageSource: ImageBitmap | HTMLImageElement
      if (typeof window !== "undefined" && "createImageBitmap" in window) {
        imageSource = await createImageBitmap(file)
      } else {
        imageSource = await new Promise<HTMLImageElement>((resolve, reject) => {
          // use the global Image constructor to avoid collision with the imported Next.js Image component
          const img = new window.Image()
          img.onload = () => resolve(img)
          img.onerror = (e: Event | string) => reject(e)
          img.src = URL.createObjectURL(file)
        })
      }

      const embedding = await computeEmbedding(imageSource)

      if (imageSource instanceof ImageBitmap) {
        imageSource.close()
      } else if (imageSource instanceof HTMLImageElement) {
        URL.revokeObjectURL(imageSource.src)
      }

      const result = await ReconocimientoService.procesarEmbedding({
        embedding,
        empleadoId: user?.id ?? null,
        umbral: threshold,
      })

      setResultado(result)
    } catch (error) {
      console.error("Error al procesar la imagen cargada", error)
      setCameraError("No se pudo utilizar la imagen seleccionada para el reconocimiento.")
    } finally {
      setScanning(false)
    }
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
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/80" />

        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="px-4 pt-6">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <Button
                variant="ghost"
                size="icon"
                onClick={stopCamera}
                className="rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">StockWear</p>
                <p className="text-base font-semibold text-white">Lens</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <Clock className="h-4 w-4" />
                <span>{Math.round(threshold * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-[65%] w-[78%] max-w-sm">
                <div className="absolute inset-0 rounded-[36px] border border-white/15" />
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium uppercase tracking-[0.4em] text-white/70">
                  Enfoca el producto
                </div>
                <div className="absolute inset-x-6 inset-y-6 rounded-[28px] border-transparent">
                  <div className="absolute -top-1 left-0 h-8 w-8 border-l-2 border-t-2 border-white" />
                  <div className="absolute -top-1 right-0 h-8 w-8 border-r-2 border-t-2 border-white" />
                  <div className="absolute -bottom-1 left-0 h-8 w-8 border-b-2 border-l-2 border-white" />
                  <div className="absolute -bottom-1 right-0 h-8 w-8 border-b-2 border-r-2 border-white" />
                </div>
              </div>
            </div>

            {scanning && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/60 px-4 py-1 text-xs font-medium uppercase tracking-wide text-white">
                Analizando…
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 rounded-2xl border border-destructive/30 bg-destructive/90 p-4 text-sm text-destructive-foreground shadow-2xl">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <div>
                    <p className="font-semibold">No se pudo identificar el producto</p>
                    <p className="text-destructive-foreground/80">{cameraError}</p>
                  </div>
                </div>
                <Button
                  onClick={startCamera}
                  variant="secondary"
                  className="mt-3 w-full rounded-full bg-white text-destructive hover:bg-white/90"
                >
                  Reintentar
                </Button>
              </div>
            )}
          </div>

          <div className="px-4 pb-8">
            <div className="rounded-3xl border border-white/10 bg-black/60 p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20"
                >
                  <Clock className="h-5 w-5" />
                </Button>

                <button
                  onClick={capturePhoto}
                  disabled={scanning || loadingModel}
                  className="relative flex h-20 w-20 items-center justify-center rounded-full border-8 border-white/20 bg-white text-primary shadow-xl transition-transform duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-80"
                  aria-label="Capturar imagen"
                >
                  <span className="absolute inset-2 rounded-full bg-primary/10" />
                  {scanning ? (
                    <Loader2 className="relative h-8 w-8 animate-spin" />
                  ) : loadingModel ? (
                    <Loader2 className="relative h-8 w-8 animate-spin text-secondary" />
                  ) : (
                    <Search className="relative h-7 w-7" />
                  )}
                </button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20"
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Button
                  variant="outline"
                  className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20"
                  onClick={() => manualSearchRef.current?.focus()}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Buscar manualmente
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Subir imagen
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="relative overflow-hidden bg-gradient-to-b from-gray-950 via-gray-900 to-background pb-10 pt-12 text-white">
          <div className="absolute inset-x-0 top-0 h-24 bg-primary/30 blur-3xl opacity-40" />
          <div className="relative flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                <Image
                  src="/stockwear-icon.png"
                  alt="StockWear"
                  width={28}
                  height={28}
                  className="object-contain brightness-0 invert"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-white/70">Panel empleado</p>
                <p className="text-lg font-semibold leading-tight">Hola, {user?.nombre?.split(" ")?.[0] ?? "Equipo"}</p>
                <p className="text-xs text-white/60">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>

          <div className="relative mx-4 mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="text-xs uppercase text-white/60">Umbral actual</p>
                <p className="text-2xl font-semibold">{Math.round(threshold * 100)}%</p>
              </div>
              <Badge variant="secondary" className="bg-white/10 text-white">
                {loadingModel ? "Cargando" : "Listo"}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-white/70">
              Ajusta la sensibilidad del reconocimiento en configuración rápida.
            </p>
          </div>
        </header>

        <main className="relative -mt-6 flex-1 space-y-6 px-4 pb-24">
          <Card className="border-none bg-card/95 shadow-xl">
            <CardContent className="grid grid-cols-2 gap-3 p-4">
              <Button
                onClick={startCamera}
                disabled={cameraActive && !resultado}
                className="h-24 flex-col items-start justify-between rounded-2xl bg-primary text-left text-primary-foreground"
              >
                <Camera className="h-6 w-6" />
                <span className="text-sm font-medium">Escanear ahora</span>
                <span className="text-xs text-primary-foreground/80">Usa la cámara para identificar</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                className="h-24 flex-col items-start justify-between rounded-2xl bg-secondary/80 text-left"
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm font-medium">Subir imagen</span>
                <span className="text-xs text-muted-foreground">Galería o archivos</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => manualSearchRef.current?.focus()}
                className="col-span-2 h-16 justify-between rounded-2xl border-dashed"
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground">Buscar manualmente</span>
                  <span className="text-xs text-muted-foreground">Nombre, código o categoría</span>
                </div>
                <Search className="h-5 w-5 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none bg-card shadow-md">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Sensibilidad del reconocimiento</p>
                  <p className="text-xs text-muted-foreground">
                    Ajusta el umbral para mejorar coincidencias.
                  </p>
                </div>
                <Badge variant="outline">{Math.round(threshold * 100)}%</Badge>
              </div>
              <Slider
                value={[threshold]}
                min={0.5}
                max={0.99}
                step={0.01}
                onValueChange={handleThresholdChange}
                onValueCommit={handleThresholdCommit}
              />
              {loadingModel && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Preparando modelo de reconocimiento…</span>
                </div>
              )}
            </CardContent>
          </Card>

          {cameraActive && (
            <Card className="overflow-hidden border-none">
              <CardContent className="p-0">
                <div className="relative aspect-video bg-black">
                  <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-full bg-black/60 text-white hover:bg-black/80"
                      onClick={stopCamera}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                    <Button
                      onClick={capturePhoto}
                      disabled={scanning || loadingModel}
                      className="h-14 w-14 rounded-full bg-white text-primary hover:bg-white/90"
                    >
                      {scanning ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : loadingModel ? (
                        <Loader2 className="h-5 w-5 animate-spin text-secondary" />
                      ) : (
                        <Search className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                  {scanning && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                      Analizando…
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {cameraError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Problema con la cámara</AlertTitle>
              <AlertDescription>{cameraError}</AlertDescription>
            </Alert>
          )}

          {resultado && (
            <Card className="border-none bg-card shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {resultado.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  {resultado.message}
                </CardTitle>
                <CardDescription>
                  {resultado.success
                    ? `Similitud ${Math.round(resultado.similitud * 100)}% · Umbral ${Math.round(
                        resultado.umbral * 100,
                      )}%`
                    : "No encontramos una coincidencia exacta."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {resultado.success && resultado.producto ? (
                  <>
                    <div className="flex gap-4">
                      <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                        <Image
                          src={resultado.producto.imagen || "/placeholder.svg"}
                          alt={resultado.producto.nombre}
                          fill
                          sizes="112px"
                          className="object-cover"
                        />
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="text-base font-semibold text-foreground">{resultado.producto.nombre}</p>
                        <p className="text-muted-foreground">{resultado.producto.codigo}</p>
                        <p className="text-muted-foreground capitalize">{resultado.producto.categoria}</p>
                        <p className="text-2xl font-bold text-primary">
                          ${resultado.producto.precio.toLocaleString()}
                        </p>
                        {resultado.producto.descuento > 0 && (
                          <Badge variant="destructive" className="w-fit">
                            {resultado.producto.descuento}% OFF
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Disponibilidad por talla</p>
                      <div className="grid grid-cols-2 gap-2">
                        {resultado.producto.stockPorTalla.map((s: any, i: number) => (
                          <div key={i} className="rounded-xl bg-muted p-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Talla {s.talla}</span>
                              <span className={s.cantidad > 0 ? "text-foreground" : "text-destructive"}>
                                {s.cantidad > 0 ? `${s.cantidad} uds` : "Sin stock"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {resultado.nivelConfianza === "medio" && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button onClick={() => handleConfirmarProducto(true)} variant="default">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Confirmar producto
                        </Button>
                        <Button onClick={() => handleConfirmarProducto(false)} variant="outline">
                          <XCircle className="mr-2 h-4 w-4" />
                          Volver a escanear
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>Intenta nuevamente con otro ángulo o usa la búsqueda manual.</p>
                    {resultado?.coincidencias?.length ? (
                      <div className="space-y-1 rounded-xl border border-dashed border-muted-foreground/40 p-3">
                        {resultado.coincidencias.map((item) => (
                          <div key={item.productoId} className="flex justify-between text-xs">
                            <span>{item.nombre}</span>
                            <span>{Math.round(item.similitud * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-none bg-card shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Búsqueda manual</CardTitle>
              <CardDescription>Encuentra productos por nombre o código</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Input
                  ref={manualSearchRef}
                  id="mobile-search"
                  placeholder="Buscar producto…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pr-10"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearManualSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button onClick={handleSearch} className="w-full">
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  {searchResults.map((producto) => (
                    <Card key={producto.id} className="border border-border/70">
                      <CardContent className="flex gap-3 p-3">
                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                          <Image
                            src={producto.imagen || "/placeholder.svg"}
                            alt={producto.nombre}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold text-foreground">{producto.nombre}</p>
                          <p className="text-muted-foreground">{producto.codigo}</p>
                          <p className="text-muted-foreground capitalize">{producto.categoria}</p>
                          <p className="text-base font-bold text-primary">
                            ${producto.precio.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Stock: {producto.stockTotal} unidades</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  No se encontraron coincidencias
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none bg-card shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5" />
                Recomendaciones
              </CardTitle>
              <CardDescription>Productos relacionados a tus búsquedas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendedProducts.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {recommendedProducts.map((producto) => (
                    <div
                      key={producto.id}
                      className="min-w-[180px] flex-1 rounded-2xl border border-border/60 bg-background p-3"
                    >
                      <div className="relative mb-3 h-28 overflow-hidden rounded-xl">
                        <Image
                          src={producto.imagen || "/placeholder.svg"}
                          alt={producto.nombre}
                          fill
                          sizes="180px"
                          className="object-cover"
                        />
                      </div>
                      <p className="text-sm font-semibold text-foreground line-clamp-2">{producto.nombre}</p>
                      <p className="text-xs text-muted-foreground capitalize">{producto.categoria}</p>
                      <p className="mt-2 text-sm font-bold text-primary">
                        ${Number(producto.precio || 0).toLocaleString()}
                      </p>
                      <Button
                        variant="link"
                        className="px-0 text-xs"
                        onClick={() => setSearchResults([producto])}
                      >
                        Ver disponibilidad
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Escanea o busca un producto para activar sugerencias personalizadas.
                </p>
              )}
            </CardContent>
          </Card>
        </main>

        <footer className="fixed inset-x-0 bottom-0 border-t border-border/60 bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center justify-between px-6 py-3">
            <Button
              variant="ghost"
              className="flex-1 justify-center"
              onClick={() => manualSearchRef.current?.focus()}
            >
              <Search className="mr-2 h-5 w-5" />
              Buscar
            </Button>
            <Button
              variant="default"
              className="mx-2 flex-1 justify-center rounded-full"
              onClick={startCamera}
              disabled={cameraActive && !resultado}
            >
              <Camera className="mr-2 h-5 w-5" />
              Escanear
            </Button>
            <Button
              variant="ghost"
              className="flex-1 justify-center"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-5 w-5" />
              Subir
            </Button>
          </div>
        </footer>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
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

      <main className="mx-auto w-full px-4 py-8 lg:px-8 xl:px-12">
        <div className="flex flex-col gap-8 xl:flex-row">
          <div className="flex-1 space-y-8">
            <div className="text-center xl:text-left">
              <h2 className="mb-2 text-3xl font-bold text-foreground">Consulta de Productos</h2>
              <p className="text-muted-foreground">
                Escanea un producto o busca manualmente para ver su disponibilidad
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Reconocimiento Visual
                </CardTitle>
                <CardDescription>Captura una foto del producto para identificarlo automáticamente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <Gauge className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Umbral de similitud</p>
                        <p className="text-xs text-muted-foreground">
                          Ajusta la sensibilidad del reconocimiento. Valor actual: {(threshold * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex w-full max-w-md flex-col gap-2">
                      <Slider
                        value={[threshold]}
                        min={0.5}
                        max={0.99}
                        step={0.01}
                        onValueChange={handleThresholdChange}
                        onValueCommit={handleThresholdCommit}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0.50</span>
                        <span>0.75</span>
                        <span>0.99</span>
                      </div>
                    </div>
                  </div>
                  {loadingModel && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Cargando modelo de reconocimiento, esto puede tardar unos segundos…</span>
                    </div>
                  )}
                </div>

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
                        disabled={scanning || loadingModel}
                        size="lg"
                        className="rounded-full w-16 h-16 bg-white hover:bg-white/90 text-primary"
                      >
                        {scanning ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : loadingModel ? (
                          <Loader2 className="h-6 w-6 animate-spin text-secondary" />
                        ) : (
                          <Search className="h-6 w-6" />
                        )}
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

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span>Similitud {Math.round(resultado.similitud * 100)}%</span>
                      </div>
                      <Badge variant="secondary">Umbral {Math.round(resultado.umbral * 100)}%</Badge>
                      <Badge variant="secondary" className="capitalize">
                        Confianza {resultado.nivelConfianza}
                      </Badge>
                    </div>

                    {resultado.producto && (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex gap-4">
                            <div className="relative h-32 w-32 overflow-hidden rounded-lg">
                              <Image
                                src={resultado.producto.imagen || "/placeholder.svg"}
                                alt={resultado.producto.nombre}
                                fill
                                sizes="128px"
                                loading="lazy"
                                className="object-cover"
                              />
                            </div>
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
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">{resultado.message}</span>
                    </div>
                    {resultado.coincidencias && resultado.coincidencias.length > 0 && (
                      <div className="rounded-lg border border-dashed border-muted-foreground/40 p-4">
                        <p className="text-sm font-medium text-foreground mb-2">Coincidencias más cercanas</p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {resultado.coincidencias.map((item) => (
                            <li key={item.productoId} className="flex justify-between">
                              <span>{item.nombre}</span>
                              <span>{Math.round(item.similitud * 100)}%</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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
              <div className="relative flex-1">
                <Input
                  ref={manualSearchRef}
                  placeholder="Buscar por nombre o código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pr-11"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearManualSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
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
                        <div className="relative h-20 w-20 overflow-hidden rounded-lg">
                          <Image
                            src={producto.imagen || "/placeholder.svg"}
                            alt={producto.nombre}
                            fill
                            sizes="80px"
                            loading="lazy"
                            className="object-cover"
                          />
                        </div>
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
          </div>

          <aside className="xl:w-[360px] space-y-6">
            <Card className="xl:sticky xl:top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5" />
                  Recomendaciones según tu búsqueda
                </CardTitle>
                <CardDescription>Productos relacionados para sugerir al cliente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recommendedProducts.length > 0 ? (
                  recommendedProducts.map((producto) => (
                    <div
                      key={producto.id}
                      className="flex gap-3 rounded-xl border border-border/60 p-3 transition hover:border-primary/40 hover:shadow-sm"
                    >
                      <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={producto.imagen || "/placeholder.svg"}
                          alt={producto.nombre}
                          fill
                          sizes="64px"
                          loading="lazy"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{producto.nombre}</p>
                        <p className="text-xs text-muted-foreground">{producto.categoria}</p>
                        <p className="mt-1 text-sm font-medium text-primary">
                          ${Number(producto.precio || 0).toLocaleString()}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 px-0 text-xs"
                          onClick={() => setSearchResults([producto])}
                        >
                          Ver disponibilidad
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aún no hay recomendaciones. Escanea un producto o realiza una búsqueda para ver sugerencias similares.
                  </p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      {/* Input oculto para subir archivos */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
    </div>
  )
}
