"use client"

import { useEffect, useState } from "react"
import { Crown, Zap, Check, AlertCircle, TrendingUp, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { getCurrentSubscription } from "@/app/actions/subscription-actions"
import {
  type SubscriptionWithLimits,
  type SubscriptionPlan,
  type BillingPeriod,
  PLAN_LIMITS,
  PLAN_PRICES,
  BILLING_DISCOUNTS,
  BILLING_MONTHS,
  formatPriceCOP,
  calculateTotalPrice,
  calculateSavings,
  getPlanDisplayName,
  getBillingPeriodDisplayName,
  isUnlimited,
} from "@/lib/subscriptions"

const planIcons: Record<SubscriptionPlan, React.ReactNode> = {
  free: <Zap className="h-5 w-5" />,
  professional: <TrendingUp className="h-5 w-5" />,
  business: <Crown className="h-5 w-5" />,
}

const planColors: Record<SubscriptionPlan, string> = {
  free: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  professional: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  business: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  canceled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  past_due: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  trialing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  paused: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
}

const statusLabels: Record<string, string> = {
  active: "Activo",
  canceled: "Cancelado",
  past_due: "Pago pendiente",
  trialing: "Prueba",
  paused: "Pausado",
}

export function SubscriptionCard() {
  const [subscription, setSubscription] = useState<SubscriptionWithLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)

  useEffect(() => {
    loadSubscription()
  }, [])

  async function loadSubscription() {
    setLoading(true)
    const result = await getCurrentSubscription()
    if (result.success && result.subscription) {
      setSubscription(result.subscription)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Información del Plan</CardTitle>
          <CardDescription>Cargando...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const plan = subscription?.plan || "free"
  const limits = subscription?.limits || PLAN_LIMITS.free
  const usage = subscription?.usage || { currentProducts: 0, currentWarehouses: 0, currentUsers: 0, aiSearchesThisMonth: 0, tiendaId: 0 }

  const periodEnd = subscription?.currentPeriodEnd 
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("es-CO", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      })
    : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tu Suscripción</CardTitle>
            <CardDescription>Gestiona tu plan y límites de uso</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={loadSubscription}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan actual */}
        <div className="p-4 border rounded-lg bg-gradient-to-r from-card to-muted/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${planColors[plan]}`}>
                {planIcons[plan]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xl">{getPlanDisplayName(plan)}</span>
                  <Badge className={statusColors[subscription?.status || "active"]}>
                    {statusLabels[subscription?.status || "active"]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan === "free" ? "Plan gratuito" : `${getBillingPeriodDisplayName(subscription?.billingPeriod || "monthly")}`}
                </p>
              </div>
            </div>
            <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Cambiar plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Cambiar tu plan</DialogTitle>
                  <DialogDescription>
                    Elige el plan que mejor se adapte a tu negocio
                  </DialogDescription>
                </DialogHeader>
                <ChangePlanGrid currentPlan={plan} onSuccess={() => {
                  setUpgradeDialogOpen(false)
                  loadSubscription()
                }} />
              </DialogContent>
            </Dialog>
          </div>
          
          {periodEnd && plan !== "free" && (
            <div className="text-sm text-muted-foreground">
              {subscription?.cancelAtPeriodEnd ? (
                <span className="text-orange-600 dark:text-orange-400">
                  Se cancelará el {periodEnd}
                </span>
              ) : (
                <span>Próxima renovación: {periodEnd}</span>
              )}
            </div>
          )}
        </div>

        {/* Uso actual */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Uso actual</Label>
          
          <UsageBar
            label="Productos"
            current={usage.currentProducts}
            limit={limits.maxProducts}
          />
          
          <UsageBar
            label="Almacenes"
            current={usage.currentWarehouses}
            limit={limits.maxWarehouses}
          />
          
          <UsageBar
            label="Usuarios"
            current={usage.currentUsers}
            limit={limits.maxUsers}
          />
          
          {limits.visualRecognition && (
            <UsageBar
              label="Búsquedas IA este mes"
              current={usage.aiSearchesThisMonth}
              limit={limits.maxAiSearchesPerMonth}
            />
          )}
        </div>

        {/* Características del plan */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Características incluidas</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FeatureItem enabled={true} label="Catálogo público" />
            <FeatureItem enabled={!limits.catalogAds} label="Sin anuncios en catálogo" />
            <FeatureItem enabled={limits.visualRecognition} label="Reconocimiento visual IA" />
            <FeatureItem enabled={limits.advancedReports} label="Reportes avanzados" />
            <FeatureItem enabled={limits.exportExcelPdf} label="Exportar Excel/PDF" />
            <FeatureItem enabled={limits.multiStore} label="Multi-tienda" />
            <FeatureItem enabled={limits.apiAccess} label="Acceso API" />
            <FeatureItem enabled={limits.prioritySupport} label="Soporte prioritario" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function UsageBar({ label, current, limit }: { label: string; current: number; limit: number }) {
  const isUnlimitedValue = isUnlimited(limit)
  const percentage = isUnlimitedValue ? 0 : Math.min((current / limit) * 100, 100)
  const isNearLimit = !isUnlimitedValue && percentage >= 80
  const isAtLimit = !isUnlimitedValue && current >= limit

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-medium ${isAtLimit ? "text-red-600 dark:text-red-400" : isNearLimit ? "text-orange-600 dark:text-orange-400" : ""}`}>
          {current} / {isUnlimitedValue ? "∞" : limit}
        </span>
      </div>
      {!isUnlimitedValue && (
        <Progress 
          value={percentage} 
          className={`h-2 ${isAtLimit ? "[&>div]:bg-red-500" : isNearLimit ? "[&>div]:bg-orange-500" : ""}`}
        />
      )}
      {isUnlimitedValue && (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-emerald-500/30 to-emerald-500/10" />
        </div>
      )}
    </div>
  )
}

function FeatureItem({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${!enabled ? "text-muted-foreground" : ""}`}>
      {enabled ? (
        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
      ) : (
        <AlertCircle className="h-4 w-4 text-muted-foreground/50" />
      )}
      <span className={!enabled ? "line-through" : ""}>{label}</span>
    </div>
  )
}

// ============================================================================
// CHANGE PLAN GRID
// ============================================================================

interface ChangePlanGridProps {
  currentPlan: SubscriptionPlan
  onSuccess: () => void
}

function ChangePlanGrid({ currentPlan, onSuccess }: ChangePlanGridProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>("monthly")
  const [loading, setLoading] = useState(false)
  const [confirmDowngrade, setConfirmDowngrade] = useState<SubscriptionPlan | null>(null)
  
  const plans: { plan: SubscriptionPlan; name: string; description: string }[] = [
    { plan: "free", name: "Emprendedor", description: "Para tiendas pequeñas" },
    { plan: "professional", name: "Profesional", description: "Para tiendas en crecimiento" },
    { plan: "business", name: "Business", description: "Para cadenas de tiendas" },
  ]

  const planOrder: Record<SubscriptionPlan, number> = { free: 0, professional: 1, business: 2 }
  
  async function handleChangePlan(plan: SubscriptionPlan) {
    // Si es downgrade, pedir confirmación
    if (planOrder[plan] < planOrder[currentPlan]) {
      setConfirmDowngrade(plan)
      return
    }
    await executePlanChange(plan)
  }
  
  async function executePlanChange(plan: SubscriptionPlan) {
    setLoading(true)
    setConfirmDowngrade(null)
    try {
      const { upgradeSubscription } = await import("@/app/actions/subscription-actions")
      const result = await upgradeSubscription(plan, selectedPeriod)
      
      if (result.success) {
        onSuccess()
      } else {
        alert(result.error || "Error al actualizar el plan")
      }
    } catch (error) {
      console.error(error)
      alert("Error al procesar la solicitud")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted p-1">
          {(["monthly", "quarterly", "yearly"] as BillingPeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`relative rounded-full px-4 py-2 text-sm font-medium transition-all ${
                selectedPeriod === period
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {getBillingPeriodDisplayName(period)}
              {BILLING_DISCOUNTS[period] > 0 && (
                <span className={`ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  selectedPeriod === period
                    ? "bg-emerald-500 text-white"
                    : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                }`}>
                  -{BILLING_DISCOUNTS[period]}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Confirmación de downgrade */}
      {confirmDowngrade && (
        <div className="rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-900/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-orange-800 dark:text-orange-200">
                ¿Estás seguro de cambiar a un plan inferior?
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                Perderás acceso a algunas funciones. Si excedes los límites del nuevo plan, no podrás crear más recursos.
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => setConfirmDowngrade(null)}>
                  Cancelar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => executePlanChange(confirmDowngrade)} disabled={loading}>
                  {loading ? "Procesando..." : "Confirmar cambio"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map(({ plan, name, description }) => {
          const totalPrice = plan === "free" ? 0 : calculateTotalPrice(plan, selectedPeriod)
          const savings = plan === "free" ? 0 : calculateSavings(plan, selectedPeriod)
          const limits = PLAN_LIMITS[plan]
          const isCurrentPlan = currentPlan === plan
          const isDowngrade = planOrder[plan] < planOrder[currentPlan]
          const isUpgrade = planOrder[plan] > planOrder[currentPlan]

          return (
            <div
              key={plan}
              className={`relative rounded-xl border p-5 ${
                isCurrentPlan
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : plan === "business" 
                    ? "border-amber-400 bg-gradient-to-b from-amber-50/50 to-transparent dark:border-amber-600 dark:from-amber-900/20" 
                    : plan === "professional"
                      ? "border-blue-300 bg-gradient-to-b from-blue-50/50 to-transparent dark:border-blue-600 dark:from-blue-900/20"
                      : "border-border bg-card"
              }`}
            >
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Plan actual
                </div>
              )}
              {!isCurrentPlan && plan === "professional" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white">
                  Más popular
                </div>
              )}
              {!isCurrentPlan && plan === "business" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
                  Más completo
                </div>
              )}
              
              <div className="mb-4 mt-2">
                <h3 className="text-lg font-bold">{name}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              
              <div className="mb-4">
                {plan === "free" ? (
                  <span className="text-3xl font-bold">Gratis</span>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{formatPriceCOP(totalPrice)}</span>
                      <span className="text-muted-foreground text-sm">
                        /{BILLING_MONTHS[selectedPeriod] === 1 ? "mes" : `${BILLING_MONTHS[selectedPeriod]} meses`}
                      </span>
                    </div>
                    {savings > 0 && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        Ahorras {formatPriceCOP(savings)}
                      </p>
                    )}
                  </>
                )}
              </div>

              <ul className="mb-4 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  {isUnlimited(limits.maxProducts) ? "Productos ilimitados" : `Hasta ${limits.maxProducts} productos`}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  {isUnlimited(limits.maxWarehouses) ? "Almacenes ilimitados" : `${limits.maxWarehouses} ${limits.maxWarehouses === 1 ? "almacén" : "almacenes"}`}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  {limits.maxUsers} {limits.maxUsers === 1 ? "usuario" : "usuarios"}
                </li>
                <li className="flex items-center gap-2">
                  {limits.visualRecognition ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      {isUnlimited(limits.maxAiSearchesPerMonth) ? "IA ilimitada" : `${limits.maxAiSearchesPerMonth} búsquedas IA/mes`}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Sin reconocimiento IA</span>
                    </>
                  )}
                </li>
              </ul>

              <Button
                className="w-full"
                variant={isCurrentPlan ? "secondary" : isUpgrade ? "default" : "outline"}
                disabled={isCurrentPlan || loading}
                onClick={() => handleChangePlan(plan)}
              >
                {isCurrentPlan 
                  ? "Plan actual" 
                  : loading 
                    ? "Procesando..." 
                    : isDowngrade 
                      ? "Cambiar a este plan" 
                      : "Elegir plan"
                }
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
