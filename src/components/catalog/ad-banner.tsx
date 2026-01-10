// AdSense Banner - Comentado temporalmente hasta que AdSense sea aprobado

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AdBanner(_props?: { adSlot?: string; dismissible?: boolean }) {
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

interface AdBannerProps {
  adSlot?: string
  dismissible?: boolean
}

export function AdBanner({ 
  adSlot = "0987654321",
  dismissible = true
}: AdBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const adRef = useRef<HTMLModElement>(null)

  useEffect(() => {
    if (adRef.current && typeof window !== "undefined") {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (err) {
        console.error("AdSense error:", err)
      }
    }
  }, [])

  if (isDismissed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-4">
      <div className="relative mx-auto max-w-4xl px-4">
        {dismissible && (
          <button onClick={() => setIsDismissed(true)} className="absolute -top-2 right-6 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md">
            <X className="h-4 w-4 text-gray-600" />
          </button>
        )}
        <div className="overflow-hidden rounded-xl bg-white shadow-lg">
          <ins ref={adRef} className="adsbygoogle" style={{ display: "block", minHeight: "90px" }} data-ad-client="ca-pub-6938402595009129" data-ad-slot={adSlot} data-ad-format="horizontal" data-full-width-responsive="true" />
        </div>
      </div>
    </div>
  )
}
*/
