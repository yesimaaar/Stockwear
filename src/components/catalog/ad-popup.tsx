/*"use client"

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

interface AdPopupProps {
  adSlot?: string // Tu slot de anuncio de AdSense
  delay?: number // Delay en ms antes de mostrar
}

export function AdPopup({ 
  adSlot = "1234567890", // Reemplazar con tu slot real
  delay = 1000 
}: AdPopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasBeenClosed, setHasBeenClosed] = useState(false)
  const adRef = useRef<HTMLModElement>(null)

  useEffect(() => {
    // Check if user has already closed the ad in this session
    const adClosed = sessionStorage.getItem("catalog_ad_closed")
    if (adClosed) {
      setHasBeenClosed(true)
      return
    }

    // Show popup after delay
    const timer = setTimeout(() => {
      setIsOpen(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  // Initialize AdSense when popup opens
  useEffect(() => {
    if (isOpen && adRef.current && typeof window !== "undefined") {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (err) {
        console.error("AdSense error:", err)
      }
    }
  }, [isOpen])

  const handleClose = () => {
    setIsOpen(false)
    setHasBeenClosed(true)
    sessionStorage.setItem("catalog_ad_closed", "true")
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!isOpen || hasBeenClosed) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-md w-full mx-4 animate-in zoom-in-95 fade-in duration-300">
        { "Close button" }
        <button
          onClick={handleClose}
          className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg transition-transform hover:scale-110 dark:bg-gray-800"
          aria-label="Cerrar anuncio"
        >
          <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>

        { "Ad content" }
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800 p-2">
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client="ca-pub-6938402595009129"
            data-ad-slot={adSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
          <p className="text-xs text-center text-muted-foreground mt-2">Publicidad</p>
        </div>
      </div>
    </div>
  )
}
*/