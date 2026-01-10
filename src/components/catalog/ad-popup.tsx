// AdSense Popup - Comentado temporalmente hasta que AdSense sea aprobado

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AdPopup(_props?: { adSlot?: string; delay?: number }) {
  return null
}

/*
CÓDIGO ORIGINAL - DESCOMENTAR CUANDO ADSENSE SEA APROBADO:

"use client"

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

interface AdPopupProps {
  adSlot?: string
  delay?: number
}

export function AdPopup({ 
  adSlot = "1234567890",
  delay = 1000 
}: AdPopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasBeenClosed, setHasBeenClosed] = useState(false)
  const adRef = useRef<HTMLModElement>(null)

  useEffect(() => {
    const adClosed = sessionStorage.getItem("catalog_ad_closed")
    if (adClosed) {
      setHasBeenClosed(true)
      return
    }
    const timer = setTimeout(() => setIsOpen(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

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

  if (!isOpen || hasBeenClosed) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="relative max-w-md w-full mx-4">
        <button onClick={handleClose} className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg">
          <X className="h-5 w-5 text-gray-600" />
        </button>
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl p-2">
          <ins ref={adRef} className="adsbygoogle" style={{ display: "block" }} data-ad-client="ca-pub-6938402595009129" data-ad-slot={adSlot} data-ad-format="auto" data-full-width-responsive="true" />
        </div>
      </div>
    </div>
  )
}
*/
