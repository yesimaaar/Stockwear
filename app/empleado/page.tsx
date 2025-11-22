"use client"

import type React from "react"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useTheme } from "next-themes"
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
  Sun,
  Moon,
  RefreshCw,
} = LucideIcons
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { AuthService } from "@/lib/services/auth-service"
import { ReconocimientoService, type ReconocimientoResult } from "@/lib/services/reconocimiento-service"
import { ProductoService, type ProductoConStock } from "@/lib/services/producto-service"
import type { Usuario } from "@/lib/types"
import { useShoeRecognizer } from "@/hooks/use-shoe-recognizer"
import { clampThreshold, getDefaultThreshold, persistThreshold } from "@/lib/config/recognition"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

export default function EmpleadoDashboard() {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [captureCountdown, setCaptureCountdown] = useState<number | null>(null)
  const [timerDuration, setTimerDuration] = useState<0 | 3 | 5>(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const manualSearchRef = useRef<HTMLInputElement>(null)
  const cameraRequestedRef = useRef(false)
  const countdownIntervalRef = useRef<number | null>(null)
  const [resultado, setResultado] = useState<ReconocimientoResult | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ProductoConStock[]>([])
  const [recommendedProducts, setRecommendedProducts] = useState<ProductoConStock[]>([])
  const { computeEmbedding, loadingModel, error: recognizerError, resetError } = useShoeRecognizer()
  const [threshold, setThreshold] = useState(() => getDefaultThreshold())
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null)
  const [salesSummary, setSalesSummary] = useState({
    totalVentas: 0,
    montoTotal: 0,
    ultimaVenta: null as string | null,
    loading: false,
    error: null as string | null,
  })
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment")
  const isDarkMode = resolvedTheme === "dark"
  const userInitial = user?.nombre?.charAt(0)?.toUpperCase() ?? "U"

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }),
    []
  )
  const dateTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }),
    []
  )

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
    if (!user || cameraRequestedRef.current || cameraActive || cameraLoading) {
      return
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Tu navegador no soporta acceso a la cámara.")
      return
    }

    cameraRequestedRef.current = true
    void startCamera()
  }, [user, cameraActive, cameraLoading])

  const loadRecommendations = useCallback(
    async (categoria?: string, excludeId?: number) => {
      if (!categoria) {
        setRecommendedProducts([])
        return
      }

      try {
        const related = await ProductoService.search(categoria)
        const filtered = related.filter((item) => item.id !== excludeId).slice(0, 4)
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

  const handleThemeToggle = () => {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark"
    setTheme(nextTheme)
  }

  const renderUserMenu = (variant: "mobile" | "desktop" = "mobile") => {
    const triggerClasses =
      variant === "mobile"
        ? "h-12 w-12 rounded-2xl border border-white/15 bg-white/10 text-white hover:bg-white/20"
        : "h-10 w-10 rounded-full border border-border bg-background text-foreground hover:bg-muted"

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={cn("transition", triggerClasses)}>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-sm font-medium uppercase">{userInitial}</AvatarFallback>
            </Avatar>
            <span className="sr-only">Abrir menú de usuario</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="space-y-1">
              <p className="text-sm font-semibold leading-none text-foreground">{user?.nombre ?? "Empleado"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2"
            onSelect={(event) => {
              event.preventDefault()
              handleThemeToggle()
            }}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive"
            onSelect={(event) => {
              event.preventDefault()
              void handleLogout()
            }}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
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
      setResultado((prev) => (prev ? { ...prev, nivelConfianza: "alto" } : prev))
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

  useEffect(() => {
    if (expandedProductId === null) {
      return
    }
    const stillVisible = searchResults.some((producto) => producto.id === expandedProductId)
    if (!stillVisible) {
      setExpandedProductId(null)
    }
  }, [searchResults, expandedProductId])

  useEffect(() => {
    if (!user) {
      return
    }

    let cancelled = false

    const loadSalesSummary = async () => {
      setSalesSummary((prev) => ({ ...prev, loading: true, error: null }))
      try {
        const { data, error } = await supabase
          .from("ventas")
          .select("id,total,createdAt,usuarioId")
          .eq("usuarioId", user.id)
          .order("createdAt", { ascending: false })
          .limit(25)

        if (error) {
          throw error
        }

        if (cancelled) {
          return
        }

        const lista = data ?? []
        const totalVentas = lista.length
        const montoTotal = lista.reduce((acc, venta) => acc + Number(venta.total ?? 0), 0)
        const ultimaVenta = lista[0]?.createdAt ?? null

        setSalesSummary({
          totalVentas,
          montoTotal,
          ultimaVenta,
          loading: false,
          error: null,
        })
      } catch (error) {
        console.error("Error cargando ventas del empleado", error)
        if (!cancelled) {
          setSalesSummary((prev) => ({ ...prev, loading: false, error: "No pudimos obtener tus ventas" }))
        }
      }
    }

    void loadSalesSummary()

    return () => {
      cancelled = true
    }
  }, [user])

  const startCamera = async (facing: "environment" | "user" = cameraFacingMode) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Tu navegador no permite usar la cámara.")
      return
    }

    try {
      setCameraLoading(true)
      setCameraError(null)
      resetError()
      setResultado(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
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
      setCameraFacingMode(facing)
    } catch (error) {
      console.error("Error al acceder a la cámara:", error)
      setCameraError("No se pudo acceder a la cámara. Verifica los permisos.")
    } finally {
      setCameraLoading(false)
    }
  }

  const toggleCameraFacing = () => {
    const nextMode = cameraFacingMode === "environment" ? "user" : "environment"
    void startCamera(nextMode)
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    setCaptureCountdown(null)
    setCameraActive(false)
    setCameraError(null)
    setCameraLoading(false)
  }

  const HiddenFileInput = () => (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      onChange={handleFileUpload}
      className="sr-only"
      tabIndex={-1}
    />
  )

  const toggleProductAvailability = (productId: number) => {
    setExpandedProductId((current) => (current === productId ? null : productId))
  }

  const showProductDetail = (producto: ProductoConStock | null, origin: "search" | "recommendation" = "search") => {
    if (!producto) {
      return
    }

    setResultado({
      success: true,
      similitud: 1,
      umbral: threshold,
      nivelConfianza: "alto",
      producto,
      message:
        origin === "search" ? "Resultado de búsqueda manual" : "Producto sugerido similar basado en tu búsqueda",
    })
    stopCamera()
  }

  const capturePhoto = async () => {
    if (!videoRef.current || !user || scanning) return

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
        tiendaId: user.tiendaId,
      })

      setResultado(result)
      stopCamera()
    } catch (error) {
      console.error("Error al procesar la captura", error)
      setCameraError("No se pudo identificar el producto. Inténtalo nuevamente.")
    } finally {
      setScanning(false)
    }
  }

  const handleTimerToggle = () => {
    setTimerDuration((current) => {
      if (current === 0) return 3
      if (current === 3) return 5
      return 0
    })
  }

  const handleCaptureRequest = async () => {
    if (scanning || loadingModel || captureCountdown !== null) {
      return
    }

    if (timerDuration <= 0) {
      await capturePhoto()
      return
    }

    try {
      await new Promise<void>((resolve) => {
        let remaining = timerDuration
        setCaptureCountdown(remaining)
        countdownIntervalRef.current = window.setInterval(() => {
          remaining -= 1
          if (remaining <= 0) {
            if (countdownIntervalRef.current !== null) {
              window.clearInterval(countdownIntervalRef.current)
              countdownIntervalRef.current = null
            }
            setCaptureCountdown(0)
            resolve()
            return
          }
          setCaptureCountdown(remaining)
        }, 1000)
      })

      await capturePhoto()
    } finally {
      if (countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
      setCaptureCountdown(null)
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
        tiendaId: user?.tiendaId,
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
        <HiddenFileInput />
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

            {captureCountdown !== null && captureCountdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full border border-white/30 bg-black/70 px-10 py-6 text-4xl font-semibold text-white shadow-2xl">
                  {captureCountdown}
                </div>
              </div>
            )}

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
                  onClick={() => void startCamera()}
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
              <div className="mb-3 flex justify-center">
                <Button
                  type="button"
                  onClick={handleTimerToggle}
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
                >
                  <Clock className="h-4 w-4" />
                  <span>{timerDuration === 0 ? "Temporizador apagado" : `Temporizador ${timerDuration}s`}</span>
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="flex h-14 w-14 flex-col items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="Cambiar cámara"
                  disabled={cameraLoading}
                >
                  <RefreshCw className="h-5 w-5" />
                  <span className="text-[10px] font-semibold tracking-wide">
                    {cameraFacingMode === "environment" ? "Trasera" : "Frontal"}
                  </span>
                </Button>

                <button
                  onClick={() => void handleCaptureRequest()}
                  disabled={scanning || loadingModel || captureCountdown !== null}
                  className="relative flex h-24 w-24 items-center justify-center rounded-full border-[10px] border-white/20 bg-white text-primary shadow-xl transition-transform duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-80"
                  aria-label="Capturar imagen"
                >
                  <span className="absolute inset-3 rounded-full bg-primary/10" />
                  {scanning ? (
                    <Loader2 className="relative h-8 w-8 animate-spin" />
                  ) : loadingModel ? (
                    <Loader2 className="relative h-8 w-8 animate-spin text-secondary" />
                  ) : (
                    <Search className="relative h-7 w-7" />
                  )}
                </button>

                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                >
                  <ImageIcon className="h-5 w-5" />
                  <span className="sr-only">Subir imagen desde galería</span>
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
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-primary/40 blur-3xl opacity-60" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_rgba(15,15,15,0)_60%)] opacity-70" />
          <div className="relative mx-4 rounded-3xl border border-white/10 bg-black/40 px-4 py-3 shadow-[0_15px_45px_rgba(0,0,0,0.45)] backdrop-blur">
            <div className="flex items-center justify-between">
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
              </div>
            </div>
              {renderUserMenu("mobile")}
            </div>
          </div>

          <div className="relative mx-4 mt-4 space-y-3 rounded-2xl border border-white/15 bg-white/10 p-4 text-white shadow-lg backdrop-blur">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-xs uppercase text-white/60">Umbral actual</p>
                  <p className="text-2xl font-semibold">{Math.round(threshold * 100)}%</p>
                </div>
                <Badge variant="secondary" className="bg-white/10 text-white">
                  {loadingModel ? "Cargando" : "Listo"}
                </Badge>
              </div>
              <p className="text-xs text-white/70">
                Ajusta la sensibilidad del reconocimiento para controlar el equilibrio entre precisión y velocidad.
              </p>
              <div className="space-y-2">
                <Slider
                  value={[threshold]}
                  min={0.5}
                  max={0.99}
                  step={0.01}
                  onValueChange={handleThresholdChange}
                  onValueCommit={handleThresholdCommit}
                  className="[&_[role=slider]]:bg-white"
                  aria-label="Sensibilidad del reconocimiento"
                />
                <div className="flex justify-between text-[11px] uppercase tracking-[0.2em] text-white/50">
                  <span>Preciso</span>
                  <span>Balanceado</span>
                  <span>Sensible</span>
                </div>
              </div>
              {loadingModel && (
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Preparando modelo de reconocimiento…</span>
                </div>
              )}
            </div>

          <div className="mx-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  ref={manualSearchRef}
                  id="mobile-search-top"
                  placeholder="Buscar por nombre, código o categoría"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-12 rounded-2xl border border-white/40 bg-white/95 pl-4 pr-10 text-gray-900 placeholder:text-gray-500 shadow-inner focus-visible:ring-2 focus-visible:ring-primary/40"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearManualSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Limpiar búsqueda</span>
                  </Button>
                )}
              </div>
              <Button
                type="button"
                onClick={handleSearch}
                className="h-12 rounded-2xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
              >
                <Search className="h-4 w-4" />
                <span className="sr-only">Buscar</span>
              </Button>
              <Button
                type="button"
                onClick={() => void startCamera()}
                disabled={(cameraActive && !resultado) || cameraLoading}
                className="h-12 rounded-2xl border border-white/30 bg-white/15 text-white shadow-lg hover:bg-white/25 disabled:opacity-60"
              >
                {cameraLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                <span className="sr-only">Abrir cámara</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="relative -mt-6 flex-1 space-y-6 px-4 pb-24">
          {searchResults.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-border/60 bg-card/80 p-4">
              <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                <span>Resultados de la búsqueda</span>
                <span className="text-xs text-muted-foreground">{searchResults.length}</span>
              </div>
              {searchResults.map((producto) => (
                <div key={producto.id} className="space-y-3 rounded-2xl border border-border/60 bg-background/90 p-3">
                  <div className="flex gap-3">
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={producto.imagen || "/placeholder.svg"}
                        alt={producto.nombre}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between text-sm">
                      <div>
                        <p className="font-semibold text-foreground">{producto.nombre}</p>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{producto.codigo}</p>
                        <p className="text-xs capitalize text-muted-foreground">{producto.categoria}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-primary">
                          ${Number(producto.precio || 0).toLocaleString()}
                        </span>
                        <Button
                          size="sm"
                          variant={expandedProductId === producto.id ? "default" : "secondary"}
                          onClick={() => toggleProductAvailability(producto.id)}
                          className="rounded-full"
                        >
                          {expandedProductId === producto.id ? "Ocultar" : "Ver disponibilidad"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {expandedProductId === producto.id && (
                    <div className="space-y-3 rounded-2xl border border-dashed border-border/60 bg-background/70 p-3 text-xs">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Tallas y stock</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {producto.stockPorTalla?.length ? (
                            producto.stockPorTalla.map((stock, index) => (
                              <div key={`${producto.id}-stock-${index}`} className="rounded-xl bg-card/80 p-2">
                                <div className="flex items-center justify-between text-foreground">
                                  <span className="font-semibold">Talla {stock.talla || "-"}</span>
                                  <span className={stock.cantidad > 0 ? "text-primary" : "text-destructive"}>
                                    {stock.cantidad > 0 ? `${stock.cantidad} uds` : "Sin stock"}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">{stock.almacen || "Almacén"}</p>
                              </div>
                            ))
                          ) : (
                            <p className="col-span-2 text-center text-muted-foreground">Sin datos de inventario</p>
                          )}
                        </div>
                      </div>
                      {producto.stockPorTalla?.length ? (
                        <div className="rounded-2xl bg-card/60 p-3">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Totales por almacén</p>
                          <div className="mt-2 space-y-1">
                            {Object.entries(
                              producto.stockPorTalla.reduce<Record<string, number>>((acc, stock) => {
                                const key = stock.almacen || "General"
                                acc[key] = (acc[key] || 0) + (stock.cantidad ?? 0)
                                return acc
                              }, {})
                            ).map(([almacen, total]) => (
                              <div key={`${producto.id}-${almacen}`} className="flex items-center justify-between">
                                <span className="font-medium text-foreground">{almacen}</span>
                                <span className="text-muted-foreground">{total} unidades</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {searchQuery && searchResults.length === 0 && (
            <Alert className="border-dashed border-border/60 bg-card/60 text-foreground">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No encontramos coincidencias para "{searchQuery}". Intenta otra búsqueda.</AlertDescription>
            </Alert>
          )}

          <Card className="border-none bg-card/95 shadow-md">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Tus ventas</p>
                    <p className="text-3xl font-semibold text-foreground">
                      {salesSummary.loading ? "—" : salesSummary.totalVentas}
                    </p>
                    <p className="text-xs text-muted-foreground">Registros asociados a tu usuario</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Monto total</p>
                  <p className="text-2xl font-semibold text-primary">
                    {salesSummary.loading ? "…" : currencyFormatter.format(salesSummary.montoTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Última venta:
                    {salesSummary.ultimaVenta
                      ? ` ${dateTimeFormatter.format(new Date(salesSummary.ultimaVenta))}`
                      : " sin registros"}
                  </p>
                </div>
              </div>
              {salesSummary.error && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {salesSummary.error}
                </div>
              )}
            </CardContent>
          </Card>

          {cameraActive && !resultado && (
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
                      onClick={() => void handleCaptureRequest()}
                      disabled={scanning || loadingModel || captureCountdown !== null}
                      className="h-16 w-16 rounded-full bg-white text-primary hover:bg-white/90"
                    >
                      {scanning ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : loadingModel ? (
                        <Loader2 className="h-5 w-5 animate-spin text-secondary" />
                      ) : (
                        <Search className="h-5 w-5" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-full bg-black/60 text-white hover:bg-black/80"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-5 w-5" />
                    </Button>
                  </div>
                  {scanning && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                      Analizando…
                    </div>
                  )}
                  {captureCountdown !== null && captureCountdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full border border-white/40 bg-black/70 px-8 py-4 text-3xl font-semibold text-white">
                        {captureCountdown}
                      </div>
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
                        {resultado.producto.stockPorTalla.map((s, i) => (
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
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5" />
                Productos similares
              </CardTitle>
              <CardDescription>Basados en tu última búsqueda o escaneo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendedProducts.length > 0 ? (
                <div className="space-y-3">
                  {recommendedProducts.map((producto) => (
                    <div
                      key={producto.id}
                      className="flex gap-3 rounded-2xl border border-border/60 bg-background/90 p-3"
                    >
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl">
                        <Image
                          src={producto.imagen || "/placeholder.svg"}
                          alt={producto.nombre}
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-between text-sm">
                        <div>
                          <p className="font-semibold text-foreground line-clamp-2">{producto.nombre}</p>
                          <p className="text-xs uppercase tracking-widest text-muted-foreground">
                            {producto.codigo}
                          </p>
                          <p className="text-xs capitalize text-muted-foreground">{producto.categoria}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold text-primary">
                            ${Number(producto.precio || 0).toLocaleString()}
                          </span>
                          <Button
                            size="sm"
                            className="rounded-full"
                            variant="secondary"
                            onClick={() => showProductDetail(producto, "recommendation")}
                          >
                            Ver detalle
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : resultado?.coincidencias?.length ? (
                <div className="space-y-2 text-sm">
                  {resultado.coincidencias.map((coincidencia) => (
                    <div
                      key={coincidencia.productoId}
                      className="flex items-center justify-between rounded-xl border border-border/50 bg-background/70 px-3 py-2"
                    >
                      <span className="font-medium text-foreground">{coincidencia.nombre}</span>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(coincidencia.similitud * 100)}% similitud
                      </span>
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

        <HiddenFileInput />
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
              {renderUserMenu("desktop")}
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

                  {captureCountdown !== null && captureCountdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full border border-white/40 bg-black/70 px-10 py-6 text-4xl font-semibold text-white">
                        {captureCountdown}
                      </div>
                    </div>
                  )}

                  {/* Overlay de controles */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <div className="flex items-center gap-4 rounded-full bg-black/60 px-6 py-4 backdrop-blur">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={stopCamera}
                        className="h-12 w-12 rounded-full text-white hover:bg-white/20"
                      >
                        <X className="h-5 w-5" />
                      </Button>

                      <Button
                        type="button"
                        onClick={() => void handleCaptureRequest()}
                        disabled={scanning || loadingModel || captureCountdown !== null}
                        className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-primary hover:bg-white/90"
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
                        type="button"
                        variant="ghost"
                        className="flex h-12 w-12 items-center justify-center rounded-full text-white hover:bg-white/20"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Package className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Indicador de escaneo */}
                  {scanning && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow">
                      Procesando imagen...
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-white">
                  <Camera className="mb-4 h-16 w-16 text-gray-400" />
                  <p className="mb-4 text-lg">Cámara no activa</p>
                  <Button
                    onClick={() => void startCamera()}
                    disabled={cameraLoading}
                    className="bg-gray-900 hover:bg-gray-800 disabled:opacity-70"
                  >
                    {cameraLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                    {cameraLoading ? "Abriendo cámara" : "Activar cámara"}
                  </Button>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-600/90 text-white p-4">
                  <div className="text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>{cameraError}</p>
                    <Button onClick={() => void startCamera()} className="mt-2 bg-white text-red-600 hover:bg-white/90">
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
                                  {resultado.producto.stockPorTalla.map((s, i) => (
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
      <HiddenFileInput />
    </div>
  )
}
