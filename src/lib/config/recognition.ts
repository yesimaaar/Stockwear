const ENV_THRESHOLD = Number.parseFloat(process.env.NEXT_PUBLIC_SHOE_SIMILARITY_THRESHOLD ?? '')

const DEFAULT_THRESHOLD = Number.isFinite(ENV_THRESHOLD) ? ENV_THRESHOLD : 0.82
const STORAGE_KEY = 'stockwear::shoe-recognition-threshold'

export function getSavedThreshold(): number | null {
  if (typeof window === 'undefined') {
    return null
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) return null
  const parsed = Number.parseFloat(stored)
  return Number.isFinite(parsed) ? parsed : null
}

export function persistThreshold(value: number) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, value.toString())
}

export function getDefaultThreshold(): number {
  const saved = getSavedThreshold()
  if (saved != null) {
    return saved
  }
  return DEFAULT_THRESHOLD
}

export function clampThreshold(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_THRESHOLD
  return Math.min(Math.max(value, 0), 1)
}

export const recognitionConfig = {
  storageKey: STORAGE_KEY,
  defaultThreshold: DEFAULT_THRESHOLD,
}
