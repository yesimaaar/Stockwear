"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { GoogleMap, InfoWindowF, MarkerF, useJsApiLoader } from "@react-google-maps/api"

import type { AlmacenResumen } from "@/lib/services/inventario-service"
import { getWarehouseCoordinate } from "@/lib/config/warehouse-locations"

export interface WarehouseMapProps {
  almacenes: AlmacenResumen[]
}

const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 23.6345, lng: -102.5528 }

export function WarehouseMap({ almacenes }: WarehouseMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const markers = useMemo(() => {
    return almacenes
      .map((almacen) => {
        const coords = getWarehouseCoordinate(almacen)
        if (!coords) {
          return null
        }
        return {
          id: almacen.id,
          nombre: almacen.nombre,
          direccion: almacen.direccion,
          stockTotal: almacen.stockTotal,
          productosUnicos: almacen.productosUnicos,
          position: { lat: coords.lat, lng: coords.lng } as google.maps.LatLngLiteral,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
  }, [almacenes])

  const center = useMemo(() => {
    if (markers.length === 0) {
      return DEFAULT_CENTER
    }
    return markers[0].position
  }, [markers])

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey ?? "",
    id: "warehouse-map-script",
  })

  const handleMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance)
  }, [])

  useEffect(() => {
    if (!map) return
    if (markers.length === 0) {
      map.setCenter(DEFAULT_CENTER)
      map.setZoom(4)
      return
    }

    if (markers.length === 1) {
      map.setCenter(markers[0].position)
      map.setZoom(13)
      return
    }

    const bounds = new google.maps.LatLngBounds()
    markers.forEach((marker) => bounds.extend(marker.position))
    map.fitBounds(bounds)
  }, [map, markers])

  if (!apiKey) {
    return (
      <div className="flex h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/30 text-center text-sm text-muted-foreground">
        <p>Agrega la variable <code className="rounded bg-muted px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> para habilitar el mapa.</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/30 text-center text-sm text-destructive">
        <p>No pudimos cargar Google Maps.</p>
        <p className="text-xs text-destructive/70">{loadError.message}</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[420px] flex-col items-center justify-center rounded-3xl border border-border bg-card text-sm text-muted-foreground">
        Cargando mapa…
      </div>
    )
  }

  if (markers.length === 0) {
    return (
      <div className="flex h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/30 text-center text-sm text-muted-foreground">
        <p>Aún no hay coordenadas guardadas para los almacenes.</p>
        <p className="mt-1">Edita la dirección para que se geocodifique automáticamente o añade una entrada manual en <code className="rounded bg-muted px-1">lib/config/warehouse-locations.ts</code>.</p>
      </div>
    )
  }

  return (
    <div className="h-[420px] overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <GoogleMap
        mapContainerClassName="h-full w-full"
        center={center}
        zoom={markers.length === 1 ? 13 : 6}
        onLoad={handleMapLoad}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
        }}
      >
        {markers.map((marker) => (
          <MarkerF key={marker.id} position={marker.position} title={marker.nombre}>
            <InfoWindowF position={marker.position}>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{marker.nombre}</p>
                {marker.direccion ? <p className="text-muted-foreground">{marker.direccion}</p> : null}
                <p>
                  Stock consolidado: <span className="font-semibold">{marker.stockTotal}</span>
                </p>
                <p>
                  Productos únicos: <span className="font-semibold">{marker.productosUnicos}</span>
                </p>
              </div>
            </InfoWindowF>
          </MarkerF>
        ))}
      </GoogleMap>
    </div>
  )
}
