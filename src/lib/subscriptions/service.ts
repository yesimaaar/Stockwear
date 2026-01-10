import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  type Subscription,
  type SubscriptionPlan,
  type BillingPeriod,
  type SubscriptionStatus,
  type SubscriptionUsage,
  type SubscriptionWithLimits,
  type PlanLimits,
  PLAN_LIMITS,
} from './types'

// ============================================================================
// GET SUBSCRIPTION
// ============================================================================

/**
 * Obtiene la suscripción de la tienda actual (desde cliente autenticado)
 */
export async function getMySubscription(): Promise<Subscription | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .single()
  
  if (error || !data) {
    return null
  }
  
  return mapSubscriptionFromDB(data)
}

/**
 * Obtiene la suscripción de una tienda específica (admin)
 */
export async function getSubscriptionByTiendaId(tiendaId: number): Promise<Subscription | null> {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('tienda_id', tiendaId)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return mapSubscriptionFromDB(data)
}

/**
 * Obtiene la suscripción con límites y uso actual
 */
export async function getSubscriptionWithLimits(tiendaId: number): Promise<SubscriptionWithLimits | null> {
  const subscription = await getSubscriptionByTiendaId(tiendaId)
  
  if (!subscription) {
    // Retornar plan free por defecto
    const defaultLimits = PLAN_LIMITS.free
    return {
      id: 0,
      tiendaId,
      plan: 'free',
      status: 'active',
      billingPeriod: 'monthly',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date().toISOString(),
      cancelAtPeriodEnd: false,
      aiSearchesThisMonth: 0,
      aiSearchesResetAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      limits: defaultLimits,
      usage: await getUsage(tiendaId),
    }
  }
  
  const limits = PLAN_LIMITS[subscription.plan]
  const usage = await getUsage(tiendaId)
  
  return {
    ...subscription,
    limits,
    usage,
  }
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

/**
 * Obtiene el uso actual de la tienda
 */
export async function getUsage(tiendaId: number): Promise<SubscriptionUsage> {
  // Contar productos activos
  const { count: productCount } = await supabaseAdmin
    .from('productos')
    .select('*', { count: 'exact', head: true })
    .eq('tienda_id', tiendaId)
    .eq('estado', 'activo')
  
  // Contar almacenes activos
  const { count: warehouseCount } = await supabaseAdmin
    .from('almacenes')
    .select('*', { count: 'exact', head: true })
    .eq('tienda_id', tiendaId)
    .eq('estado', 'activo')
  
  // Contar usuarios activos
  const { count: userCount } = await supabaseAdmin
    .from('usuarios')
    .select('*', { count: 'exact', head: true })
    .eq('tienda_id', tiendaId)
    .eq('estado', 'activo')
  
  // Obtener búsquedas IA del mes
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('ai_searches_this_month')
    .eq('tienda_id', tiendaId)
    .single()
  
  return {
    tiendaId,
    currentProducts: productCount || 0,
    currentWarehouses: warehouseCount || 0,
    currentUsers: userCount || 0,
    aiSearchesThisMonth: subscription?.ai_searches_this_month || 0,
  }
}

// ============================================================================
// LIMIT CHECKS
// ============================================================================

/**
 * Verifica si puede crear más productos
 */
export async function canCreateProduct(tiendaId: number): Promise<{ allowed: boolean; current: number; limit: number }> {
  const subscription = await getSubscriptionByTiendaId(tiendaId)
  const limits = PLAN_LIMITS[subscription?.plan || 'free']
  
  const { count } = await supabaseAdmin
    .from('productos')
    .select('*', { count: 'exact', head: true })
    .eq('tienda_id', tiendaId)
    .eq('estado', 'activo')
  
  const current = count || 0
  const limit = limits.maxProducts
  
  return {
    allowed: limit === -1 || current < limit,
    current,
    limit,
  }
}

/**
 * Verifica si puede crear más almacenes
 */
export async function canCreateWarehouse(tiendaId: number): Promise<{ allowed: boolean; current: number; limit: number }> {
  const subscription = await getSubscriptionByTiendaId(tiendaId)
  const limits = PLAN_LIMITS[subscription?.plan || 'free']
  
  const { count } = await supabaseAdmin
    .from('almacenes')
    .select('*', { count: 'exact', head: true })
    .eq('tienda_id', tiendaId)
    .eq('estado', 'activo')
  
  const current = count || 0
  const limit = limits.maxWarehouses
  
  return {
    allowed: limit === -1 || current < limit,
    current,
    limit,
  }
}

/**
 * Verifica si puede crear más usuarios
 */
export async function canCreateUser(tiendaId: number): Promise<{ allowed: boolean; current: number; limit: number }> {
  const subscription = await getSubscriptionByTiendaId(tiendaId)
  const limits = PLAN_LIMITS[subscription?.plan || 'free']
  
  const { count } = await supabaseAdmin
    .from('usuarios')
    .select('*', { count: 'exact', head: true })
    .eq('tienda_id', tiendaId)
    .eq('estado', 'activo')
  
  const current = count || 0
  const limit = limits.maxUsers
  
  return {
    allowed: limit === -1 || current < limit,
    current,
    limit,
  }
}

/**
 * Verifica si puede usar reconocimiento visual
 */
export async function canUseVisualRecognition(tiendaId: number): Promise<{ allowed: boolean; current: number; limit: number }> {
  const subscription = await getSubscriptionByTiendaId(tiendaId)
  const limits = PLAN_LIMITS[subscription?.plan || 'free']
  
  if (!limits.visualRecognition) {
    return { allowed: false, current: 0, limit: 0 }
  }
  
  const current = subscription?.aiSearchesThisMonth || 0
  const limit = limits.maxAiSearchesPerMonth
  
  return {
    allowed: limit === -1 || current < limit,
    current,
    limit,
  }
}

/**
 * Incrementa el contador de búsquedas IA
 */
export async function incrementAiSearches(tiendaId: number): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('increment_ai_searches', {
    p_tienda_id: tiendaId,
  })
  
  return !error && data === true
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Crea o actualiza una suscripción
 */
export async function upsertSubscription(
  tiendaId: number,
  plan: SubscriptionPlan,
  billingPeriod: BillingPeriod,
  paymentInfo?: {
    provider: 'mercadopago' | 'stripe'
    providerId: string
  }
): Promise<Subscription | null> {
  const now = new Date()
  const periodEnd = calculatePeriodEnd(now, billingPeriod)
  
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      tienda_id: tiendaId,
      plan,
      status: 'active',
      billing_period: billingPeriod,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      payment_provider: paymentInfo?.provider || null,
      payment_provider_id: paymentInfo?.providerId || null,
      updated_at: now.toISOString(),
    }, {
      onConflict: 'tienda_id',
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error upserting subscription:', error)
    return null
  }
  
  // Registrar en historial
  await logSubscriptionChange(tiendaId, data.id, 'upgraded', null, plan, null, billingPeriod)
  
  return mapSubscriptionFromDB(data)
}

/**
 * Cancela una suscripción al final del período
 */
export async function cancelSubscription(tiendaId: number): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('tienda_id', tiendaId)
  
  if (error) {
    console.error('Error canceling subscription:', error)
    return false
  }
  
  return true
}

/**
 * Reactiva una suscripción cancelada
 */
export async function reactivateSubscription(tiendaId: number): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      cancel_at_period_end: false,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('tienda_id', tiendaId)
  
  return !error
}

/**
 * Cambia el plan de suscripción
 */
export async function changePlan(
  tiendaId: number,
  newPlan: SubscriptionPlan,
  newBillingPeriod: BillingPeriod
): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
  const currentSub = await getSubscriptionByTiendaId(tiendaId)
  
  if (!currentSub) {
    return { success: false, error: 'No subscription found' }
  }
  
  // Verificar que no sea downgrade que exceda límites actuales
  const usage = await getUsage(tiendaId)
  const newLimits = PLAN_LIMITS[newPlan]
  
  if (newLimits.maxProducts !== -1 && usage.currentProducts > newLimits.maxProducts) {
    return { 
      success: false, 
      error: `Tienes ${usage.currentProducts} productos pero el plan ${newPlan} solo permite ${newLimits.maxProducts}. Reduce tus productos antes de cambiar.` 
    }
  }
  
  if (newLimits.maxWarehouses !== -1 && usage.currentWarehouses > newLimits.maxWarehouses) {
    return { 
      success: false, 
      error: `Tienes ${usage.currentWarehouses} almacenes pero el plan ${newPlan} solo permite ${newLimits.maxWarehouses}. Reduce tus almacenes antes de cambiar.` 
    }
  }
  
  if (newLimits.maxUsers !== -1 && usage.currentUsers > newLimits.maxUsers) {
    return { 
      success: false, 
      error: `Tienes ${usage.currentUsers} usuarios pero el plan ${newPlan} solo permite ${newLimits.maxUsers}. Reduce tus usuarios antes de cambiar.` 
    }
  }
  
  const subscription = await upsertSubscription(tiendaId, newPlan, newBillingPeriod)
  
  if (!subscription) {
    return { success: false, error: 'Error updating subscription' }
  }
  
  return { success: true, subscription }
}

// ============================================================================
// HELPERS
// ============================================================================

function calculatePeriodEnd(startDate: Date, period: BillingPeriod): Date {
  const end = new Date(startDate)
  
  switch (period) {
    case 'monthly':
      end.setMonth(end.getMonth() + 1)
      break
    case 'quarterly':
      end.setMonth(end.getMonth() + 3)
      break
    case 'yearly':
      end.setFullYear(end.getFullYear() + 1)
      break
  }
  
  return end
}

async function logSubscriptionChange(
  tiendaId: number,
  subscriptionId: number,
  action: string,
  previousPlan: string | null,
  newPlan: string | null,
  previousPeriod: string | null,
  newPeriod: string | null,
  amount?: number
) {
  await supabaseAdmin.from('subscription_history').insert({
    subscription_id: subscriptionId,
    tienda_id: tiendaId,
    action,
    previous_plan: previousPlan,
    new_plan: newPlan,
    previous_period: previousPeriod,
    new_period: newPeriod,
    amount,
    currency: 'COP',
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSubscriptionFromDB(data: any): Subscription {
  return {
    id: data.id,
    tiendaId: data.tienda_id,
    plan: data.plan as SubscriptionPlan,
    status: data.status as SubscriptionStatus,
    billingPeriod: data.billing_period as BillingPeriod,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    trialEndsAt: data.trial_ends_at,
    aiSearchesThisMonth: data.ai_searches_this_month,
    aiSearchesResetAt: data.ai_searches_reset_at,
    paymentProvider: data.payment_provider,
    paymentProviderId: data.payment_provider_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

// ============================================================================
// FEATURE FLAGS (basados en plan)
// ============================================================================

export function getFeatureFlags(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan]
}

export function hasFeature(plan: SubscriptionPlan, feature: keyof PlanLimits): boolean {
  const limits = PLAN_LIMITS[plan]
  const value = limits[feature]
  
  if (typeof value === 'boolean') {
    return value
  }
  
  if (typeof value === 'number') {
    return value !== 0
  }
  
  return false
}
