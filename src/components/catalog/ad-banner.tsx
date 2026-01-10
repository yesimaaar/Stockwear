/* "use client"

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

interface AdBannerProps {
  adSlot?: string // Tu slot de anuncio de AdSense
  dismissible?: boolean
}

export function AdBanner({ 
  adSlot = "0987654321", // Reemplazar con tu slot real
  dismissible = true
}: AdBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const adRef = useRef<HTMLModElement>(null)

  // Initialize AdSense
  useEffect(() => {
    if (adRef.current && typeof window !== "undefined") {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({})
        setIsLoaded(true)
      } catch (err) {
        console.error("AdSense error:", err)
      }
    }
  }, [])

  if (isDismissed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/10 to-transparent pb-safe">
      <div className="relative mx-auto max-w-4xl px-4 pb-4">
        {"Dismiss button"}
        {dismissible && (
          <button
            onClick={() => setIsDismissed(true)}
            className="absolute -top-2 right-6 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform hover:scale-110 dark:bg-gray-800"
            aria-label="Cerrar banner"
          >
            <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        )}

        { "Banner content" }
        <div className="overflow-hidden rounded-xl bg-white shadow-lg dark:bg-gray-800">
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ display: "block", minHeight: "90px" }}
            data-ad-client="ca-pub-6938402595009129"
            data-ad-slot={adSlot}
            data-ad-format="horizontal"
            data-full-width-responsive="true"
          />
          {!isLoaded && (
            <div className="flex items-center justify-center h-[90px] bg-muted">
              <p className="text-sm text-muted-foreground">Cargando anuncio...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
*/