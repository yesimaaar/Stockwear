"use client"

import React, { useRef, useState } from 'react'
import { getEmbedding, loadInventoryFromPublic, findClosestMatch, type InventoryItem } from '@/vision/matching'
import NextImage from 'next/image'

export default function ShoeMatcher() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ item: InventoryItem | null; distance: number } | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const handleFile = async (file?: File) => {
    if (!file) return
    setResult(null)
    setLoading(true)
      try {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)

      // Create an image element to ensure it's decoded
      const imgEl = document.createElement('img')
      imgEl.src = url
      await new Promise<void>((resolve, reject) => {
        imgEl.onload = () => resolve()
        imgEl.onerror = () => resolve()
      })

      const emb = await getEmbedding(imgEl as unknown as HTMLImageElement)
      const inventory = await loadInventoryFromPublic()
      const best = findClosestMatch(emb, inventory)
      if (best) {
        const matched = Array.isArray(best.item) ? null : (best.item as InventoryItem)
        setResult({ item: matched, distance: best.distance })
      } else {
        setResult({ item: null, distance: Infinity })
      }
    } catch (err) {
      console.error('Error processing image', err)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) void handleFile(f)
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="rounded-xl overflow-hidden bg-muted p-3 text-center">
        <p className="text-sm font-medium">Shoe Matcher</p>
        <p className="text-xs text-muted-foreground">Sube o toma una foto del zapato para buscar coincidencias en el inventario</p>
      </div>

      <div className="grid gap-2">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFileChange} className="hidden" />
        <div className="flex gap-2">
          <button className="flex-1 rounded-lg bg-primary px-4 py-2 text-white" onClick={() => fileRef.current?.click()} disabled={loading}>
            {loading ? 'Procesando…' : 'Subir / Tomar foto'}
          </button>
        </div>
      </div>

      {previewUrl && (
        <div className="relative h-56 w-full overflow-hidden rounded-lg">
          {/* Next Image needs a loader for external object URLs; show regular img instead */}
          <img src={previewUrl} alt="preview" className="h-full w-full object-cover" />
        </div>
      )}

      {result && (
        <div className="rounded-lg border p-3">
          {result.item ? (
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 relative overflow-hidden rounded">
                {result.item.image ? (
                  // result.item.image is expected to be a URL
                  <NextImage src={result.item.image} alt={result.item.name || ''} fill className="object-cover" />
                ) : (
                  <div className="h-full w-full bg-muted" />
                )}
              </div>
              <div>
                <p className="font-semibold">{result.item.name ?? result.item.id}</p>
                <p className="text-xs text-muted-foreground">Distancia: {result.distance.toFixed(3)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No se encontró ninguna coincidencia cercana.</p>
          )}
        </div>
      )}
    </div>
  )
}
