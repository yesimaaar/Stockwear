'use server'

import { createClient } from '@/lib/supabase/server'
import {
  getSubscriptionByTiendaId,
  getSubscriptionWithLimits,
  canCreateProduct,
  canCreateWarehouse,
  canCreateUser,
  canUseVisualRecognition,
  incrementAiSearches,
  changePlan,
  cancelSubscription,
  reactivateSubscription,
} from '@/lib/subscriptions/service'
import {
  type SubscriptionPlan,
  type BillingPeriod,
  type SubscriptionWithLimits,
  PLAN_LIMITS,
  getPlanDisplayName,
} from '@/lib/subscriptions'

// ============================================================================
// GET CURRENT SUBSCRIPTION
// ============================================================================

export async function getCurrentSubscription(): Promise<{
  success: boolean
  subscription?: SubscriptionWithLimits
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }
    
    // Obtener tienda_id del usuario
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('tienda_id')
      .or(`id.eq.${user.id},auth_uid.eq.${user.id}`)
      .single()
    
    if (!usuario?.tienda_id) {
      return { success: false, error: 'Usuario sin tienda asignada' }
    }
    
    const subscription = await getSubscriptionWithLimits(usuario.tienda_id)
    
    return { success: true, subscription: subscription || undefined }
  } catch (error) {
    console.error('Error getting subscription:', error)
    return { success: false, error: 'Error interno' }
  }
}

// ============================================================================
// LIMIT CHECKS (para usar antes de crear recursos)
// ============================================================================

export async function checkCanCreateProduct(): Promise<{
  allowed: boolean
  current: number
  limit: number
  planName: string
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { allowed: false, current: 0, limit: 0, planName: 'free', error: 'No autenticado' }
    }
    
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('tienda_id')
      .or(`id.eq.${user.id},auth_uid.eq.${user.id}`)
      .single()
    
    if (!usuario?.tienda_id) {
      return { allowed: false, current: 0, limit: 0, planName: 'free', error: 'Sin tienda' }
    }
    
    const result = await canCreateProduct(usuario.tienda_id)
    const subscription = await getSubscriptionByTiendaId(usuario.tienda_id)
    const planName = getPlanDisplayName(subscription?.plan || 'free')
    
    return { ...result, planName }
  } catch {
    return { allowed: false, current: 0, limit: 0, planName: 'free', error: 'Error interno' }
  }
}

export async function checkCanCreateWarehouse(): Promise<{
  allowed: boolean
  current: number
  limit: number
  planName: string
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { allowed: false, current: 0, limit: 0, planName: 'free', error: 'No autenticado' }
    }
    
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('tienda_id')
      .or(`id.eq.${user.id},auth_uid.eq.${user.id}`)
      .single()
    
    if (!usuario?.tienda_id) {
      return { allowed: false, current: 0, limit: 0, planName: 'free', error: 'Sin tienda' }
    }
    
    const result = await canCreateWarehouse(usuario.tienda_id)
    const subscription = await getSubscriptionByTiendaId(usuario.tienda_id)
    const planName = getPlanDisplayName(subscription?.plan || 'free')
    
    return { ...result, planName }
  } catch {
    return { allowed: false, current: 0, limit: 0, planName: 'free', error: 'Error interno' }
  }
}

export async function checkCanCreateUser(): Promise<{
  allowed: boolean
  current: number
  limit: number
  planName: string
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { allowed: false, current: 0, limit: 0, planName: 'free', error: 'No autenticado' }
    }
    
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('tienda_id')
      .or(`id.eq.${user.id},auth_uid.eq.${user.id}`)
      .single()
    
    if (!usuario?.tienda_id) {
      return { allowed: false, current: 0, limit: 0, planName: 'free', error: 'Sin tienda' }
    }
    
    const result = await canCreateUser(usuario.tienda_id)
    const subscription = await getSubscriptionByTiendaId(usuario.tienda_id)
    const planName = getPlanDisplayName(subscription?.plan || 'free')
    
    return { ...result, planName }
  } catch {
    return { allowed: false, current: 0, limit: 0, planName: 'free', error: 'Error interno' }
  }
}

export async function checkCanUseAI(): Promise<{
  allowed: boolean
  current: number
  limit: number
  planName: string
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { allowed: false, current: 0, limit: 0, planName: 'free', error: 'No autenticado' }
    }
    
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('tienda_id')
      .or(`id.eq.${user.id},auth_uid.eq.${user.id}`)
      .single()
    
    if (!usuario?.tienda_id) {
      return { allowed: false, current: 0, limit: 0, planName: 'free', error: 'Sin tienda' }
    }
    
    const result = await canUseVisualRecognition(usuario.tienda_id)
    const subscription = await getSubscriptionByTiendaId(usuario.tienda_id)
    const planName = getPlanDisplayName(subscription?.plan || 'free')
    
    return { ...result, planName }
  } catch {
    return { allowed: false, current: 0, limit: 0, planName: 'free', error: 'Error interno' }
  }
}

/**
 * Registra el uso de una búsqueda IA
 */
export async function recordAiSearchUsage(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }
    
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('tienda_id')
      .or(`id.eq.${user.id},auth_uid.eq.${user.id}`)
      .single()
    
    if (!usuario?.tienda_id) {
      return { success: false, error: 'Sin tienda' }
    }
    
    const success = await incrementAiSearches(usuario.tienda_id)
    
    return { success }
  } catch {
    return { success: false, error: 'Error interno' }
  }
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT ACTIONS
// ============================================================================

export async function upgradeSubscription(
  plan: SubscriptionPlan,
  billingPeriod: BillingPeriod
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }
    
    // Verificar que sea admin
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('tienda_id, rol')
      .or(`id.eq.${user.id},auth_uid.eq.${user.id}`)
      .single()
    
    if (!usuario?.tienda_id) {
      return { success: false, error: 'Sin tienda' }
    }
    
    if (usuario.rol !== 'admin') {
      return { success: false, error: 'Solo administradores pueden cambiar el plan' }
    }
    
    const result = await changePlan(usuario.tienda_id, plan, billingPeriod)
    
    return result
  } catch (error) {
    console.error('Error upgrading subscription:', error)
    return { success: false, error: 'Error interno' }
  }
}

export async function cancelMySubscription(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }
    
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('tienda_id, rol')
      .or(`id.eq.${user.id},auth_uid.eq.${user.id}`)
      .single()
    
    if (!usuario?.tienda_id) {
      return { success: false, error: 'Sin tienda' }
    }
    
    if (usuario.rol !== 'admin') {
      return { success: false, error: 'Solo administradores pueden cancelar el plan' }
    }
    
    const success = await cancelSubscription(usuario.tienda_id)
    
    return { success }
  } catch {
    return { success: false, error: 'Error interno' }
  }
}

export async function reactivateMySubscription(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'No autenticado' }
    }
    
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('tienda_id, rol')
      .or(`id.eq.${user.id},auth_uid.eq.${user.id}`)
      .single()
    
    if (!usuario?.tienda_id) {
      return { success: false, error: 'Sin tienda' }
    }
    
    if (usuario.rol !== 'admin') {
      return { success: false, error: 'Solo administradores pueden reactivar el plan' }
    }
    
    const success = await reactivateSubscription(usuario.tienda_id)
    
    return { success }
  } catch {
    return { success: false, error: 'Error interno' }
  }
}

// ============================================================================
// FEATURE FLAG CHECKS
// ============================================================================

export async function hasFeatureAccess(feature: keyof typeof PLAN_LIMITS.free): Promise<boolean> {
  try {
    const result = await getCurrentSubscription()
    
    if (!result.success || !result.subscription) {
      return PLAN_LIMITS.free[feature] as boolean
    }
    
    return result.subscription.limits[feature] as boolean
  } catch {
    return false
  }
}
