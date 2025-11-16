const GOOGLE_GEOCODING_API_BASE = "https://maps.googleapis.com/maps/api/geocode/json"
const DEFAULT_CITY_CONTEXT = "Valledupar, Cesar, Colombia"

export interface GeocodeResult {
  lat: number
  lng: number
  formattedAddress?: string
}

export class GeocodingService {
  private static get apiKey() {
    return process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  }

  private static ensureCityContext(address: string): string {
    const trimmed = address.trim()
    if (!trimmed) {
      return trimmed
    }

    const normalized = trimmed.toLowerCase()
    const alreadyHasContext = ["valledupar", "cesar", "colombia"].some((token) => normalized.includes(token))

    if (alreadyHasContext) {
      return trimmed
    }

    return `${trimmed}, ${DEFAULT_CITY_CONTEXT}`
  }

  static async geocode(address?: string | null): Promise<GeocodeResult | null> {
    const apiKey = this.apiKey
    if (!apiKey || !address) {
      return null
    }

    const addressWithContext = this.ensureCityContext(address)

    const url = new URL(GOOGLE_GEOCODING_API_BASE)
    url.searchParams.set("address", addressWithContext)
    url.searchParams.set("key", apiKey)

    try {
      const response = await fetch(url.toString())
      if (!response.ok) {
        console.error("Error en Google Geocoding API", response.statusText)
        return null
      }

      const data = (await response.json()) as {
        status: string
        results: Array<{ formatted_address?: string; geometry: { location: { lat: number; lng: number } } }>
      }

      if (!data.results?.length || data.status !== "OK") {
        console.warn("Geocoding sin resultados", data.status)
        return null
      }

      const result = data.results[0]
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
      }
    } catch (error) {
      console.error("No se pudo geocodificar la dirección", error)
      return null
    }
  }
}
