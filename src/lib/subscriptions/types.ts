// ============================================================================
// SUBSCRIPTION TYPES & CONSTANTS
// Sistema de suscripciones para StockWear
// ============================================================================

export type SubscriptionPlan = 'free' | 'professional' | 'business'
export type BillingPeriod = 'monthly' | 'quarterly' | 'yearly'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'

// Precios en COP (pesos colombianos)
export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  free: 0,
  professional: 24900,
  business: 74900,
}

// Descuentos por período
export const BILLING_DISCOUNTS: Record<BillingPeriod, number> = {
  monthly: 0,
  quarterly: 10, // 10% descuento
  yearly: 25,    // 25% descuento
}

// Meses por período
export const BILLING_MONTHS: Record<BillingPeriod, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
}

// ============================================================================
// PLAN LIMITS - Límites por plan
// ============================================================================
export interface PlanLimits {
  maxProducts: number
  maxWarehouses: number
  maxUsers: number
  maxAiSearchesPerMonth: number
  catalogAds: boolean
  visualRecognition: boolean
  advancedReports: boolean
  exportExcelPdf: boolean
  historyDays: number
  multiStore: boolean
  apiAccess: boolean
  customCatalog: boolean
  prioritySupport: boolean
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    maxProducts: 50,
    maxWarehouses: 1,
    maxUsers: 1,
    maxAiSearchesPerMonth: 0,
    catalogAds: true,
    visualRecognition: false,
    advancedReports: false,
    exportExcelPdf: false,
    historyDays: 7,
    multiStore: false,
    apiAccess: false,
    customCatalog: false,
    prioritySupport: false,
  },
  professional: {
    maxProducts: 500,
    maxWarehouses: 3,
    maxUsers: 5,
    maxAiSearchesPerMonth: 100,
    catalogAds: false,
    visualRecognition: true,
    advancedReports: true,
    exportExcelPdf: true,
    historyDays: 90,
    multiStore: false,
    apiAccess: false,
    customCatalog: false,
    prioritySupport: false,
  },
  business: {
    maxProducts: -1, // ilimitado
    maxWarehouses: -1, // ilimitado
    maxUsers: 15,
    maxAiSearchesPerMonth: -1, // ilimitado
    catalogAds: false,
    visualRecognition: true,
    advancedReports: true,
    exportExcelPdf: true,
    historyDays: 365,
    multiStore: true,
    apiAccess: true,
    customCatalog: true,
    prioritySupport: true,
  },
}

// ============================================================================
// SUBSCRIPTION INTERFACES
// ============================================================================
export interface Subscription {
  id: number
  tiendaId: number
  plan: SubscriptionPlan
  status: SubscriptionStatus
  billingPeriod: BillingPeriod
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  trialEndsAt?: string | null
  // Contadores de uso
  aiSearchesThisMonth: number
  aiSearchesResetAt: string
  // Pagos
  paymentProvider?: 'mercadopago' | 'stripe' | null
  paymentProviderId?: string | null
  // Metadatos
  createdAt: string
  updatedAt: string
}

export interface SubscriptionUsage {
  tiendaId: number
  currentProducts: number
  currentWarehouses: number
  currentUsers: number
  aiSearchesThisMonth: number
}

export interface SubscriptionWithLimits extends Subscription {
  limits: PlanLimits
  usage: SubscriptionUsage
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calcula el precio total para un período de facturación
 */
export function calculateTotalPrice(plan: SubscriptionPlan, period: BillingPeriod): number {
  const monthlyPrice = PLAN_PRICES[plan]
  const months = BILLING_MONTHS[period]
  const discount = BILLING_DISCOUNTS[period]
  
  const totalBeforeDiscount = monthlyPrice * months
  const discountAmount = totalBeforeDiscount * (discount / 100)
  
  return totalBeforeDiscount - discountAmount
}

/**
 * Calcula el ahorro por período
 */
export function calculateSavings(plan: SubscriptionPlan, period: BillingPeriod): number {
  const monthlyPrice = PLAN_PRICES[plan]
  const months = BILLING_MONTHS[period]
  const discount = BILLING_DISCOUNTS[period]
  
  return monthlyPrice * months * (discount / 100)
}

/**
 * Formatea precio en COP
 */
export function formatPriceCOP(price: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * Verifica si un límite es ilimitado (-1)
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1
}

/**
 * Obtiene el nombre legible del plan
 */
export function getPlanDisplayName(plan: SubscriptionPlan): string {
  const names: Record<SubscriptionPlan, string> = {
    free: 'Emprendedor',
    professional: 'Profesional',
    business: 'Business',
  }
  return names[plan]
}

/**
 * Obtiene el nombre legible del período
 */
export function getBillingPeriodDisplayName(period: BillingPeriod): string {
  const names: Record<BillingPeriod, string> = {
    monthly: 'Mensual',
    quarterly: 'Trimestral',
    yearly: 'Anual',
  }
  return names[period]
}
