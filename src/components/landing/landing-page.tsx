"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Package,
  BarChart3,
  Smartphone,
  Users,
  Zap,
  ArrowRight,
  Check,
  Shield,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Camera,
    title: "Reconocimiento Visual",
    description: "Escanea productos con la cámara de tu celular. Nuestra IA identifica el modelo al instante.",
  },
  {
    icon: Package,
    title: "Control de Inventario",
    description: "Gestiona stock por tallas, colores y ubicaciones. Recibe alertas de stock bajo.",
  },
  {
    icon: BarChart3,
    title: "Reportes en Tiempo Real",
    description: "Visualiza ventas, movimientos y tendencias con dashboards interactivos.",
  },
  {
    icon: Smartphone,
    title: "Catálogo Digital",
    description: "Genera catálogos automáticos para compartir con tus clientes por WhatsApp.",
  },
  {
    icon: Users,
    title: "Multi-Tienda",
    description: "Administra múltiples sucursales desde una sola cuenta con roles y permisos.",
  },
  {
    icon: Zap,
    title: "Ventas Rápidas",
    description: "Procesa ventas en segundos. Control de caja y cortes diarios automatizados.",
  },
];

const steps = [
  {
    number: "1",
    title: "Crea tu cuenta",
    description: "Regístrate gratis en menos de 2 minutos con tu correo electrónico.",
  },
  {
    number: "2",
    title: "Configura tu tienda",
    description: "Agrega tus productos, tallas y empleados. Importa desde Excel si lo prefieres.",
  },
  {
    number: "3",
    title: "¡Empieza a vender!",
    description: "Usa tu celular para escanear productos y gestionar ventas al instante.",
  },
];

type BillingPeriod = "monthly" | "quarterly" | "yearly";

const billingPeriods = {
  monthly: { label: "Mensual", discount: 0, months: 1 },
  quarterly: { label: "Trimestral", discount: 10, months: 3 },
  yearly: { label: "Anual", discount: 25, months: 12 },
};

const plans = [
  {
    name: "Emprendedor",
    description: "Para tiendas pequeñas",
    monthlyPrice: 0,
    features: [
      "1 almacén",
      "Hasta 50 productos",
      "1 usuario",
      "Catálogo con anuncios",
      "Reportes básicos",
      "Historial 7 días",
    ],
    highlighted: false,
    isFree: true,
  },
  {
    name: "Profesional",
    description: "Para tiendas en crecimiento",
    monthlyPrice: 24900, // en centavos COP o tu moneda
    features: [
      "3 almacenes",
      "Hasta 500 productos",
      "5 usuarios",
      "Reconocimiento visual IA",
      "Catálogo sin anuncios",
      "Reportes avanzados",
      "Historial 90 días",
      "Exportar Excel/PDF",
    ],
    highlighted: true,
    isFree: false,
  },
  {
    name: "Business",
    description: "Para cadenas de tiendas",
    monthlyPrice: 62900, // en centavos COP o tu moneda
    features: [
      "Almacenes ilimitados",
      "Productos ilimitados",
      "15 usuarios",
      "IA ilimitada",
      "Catálogo personalizado",
      "Multi-tienda dashboard",
      "API acceso",
      "Soporte prioritario",
    ],
    highlighted: false,
    isFree: false,
  },
];

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(priceInCents);
}

function calculatePrice(monthlyPrice: number, period: BillingPeriod): number {
  const { discount, months } = billingPeriods[period];
  const totalBeforeDiscount = monthlyPrice * months;
  const discountAmount = totalBeforeDiscount * (discount / 100);
  return totalBeforeDiscount - discountAmount;
}

export default function LandingPageClient() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  useEffect(() => {
    setMounted(true);
  }, []);

  const logoSrc = resolvedTheme === "dark" ? "/stockwear-icon-white.png" : "/stockwear-icon.png";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            {mounted && <Image src={logoSrc} alt="StockWear" width={36} height={36} />}
            <span className="text-xl font-bold">StockWear</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-muted-foreground transition hover:text-foreground">Funciones</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground transition hover:text-foreground">Cómo funciona</a>
            <a href="#pricing" className="text-sm text-muted-foreground transition hover:text-foreground">Precios</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-accent">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
              <Link href="/register">Registrarse</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(118,131,173,0.15),_transparent_50%)]" />
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-4 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Sparkles className="h-4 w-4" />
              Potenciado con Inteligencia Artificial
            </div>
            <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Gestiona tu inventario de calzado con
              <span className="bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent dark:from-slate-300 dark:to-slate-100"> visión inteligente</span>
            </h1>
            <p className="mb-10 text-lg text-muted-foreground md:text-xl">
              StockWear es el sistema de gestión de inventario diseñado para tiendas de calzado. 
              Escanea productos con tu cámara, controla stock en tiempo real y genera catálogos para tus clientes.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-full bg-slate-900 px-8 text-base font-semibold hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
                <Link href="/register">
                  Comenzar gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-border px-8 text-base font-semibold text-foreground hover:bg-accent">
                <Link href="/login">
                  Ya tengo cuenta
                </Link>
              </Button>
            </div>
          </div>
          
          {/* Hero Image/Preview */}
          <div className="relative mx-auto mt-16 max-w-5xl">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-slate-500/20 to-slate-700/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              <div className="flex h-8 items-center gap-2 border-b border-border bg-muted/50 px-4">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <div className="aspect-[16/9] bg-gradient-to-br from-muted to-background p-8">
                <div className="grid h-full gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-border bg-card/50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Package className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                      <span className="text-sm font-medium">Inventario</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full rounded bg-muted" />
                      <div className="h-3 w-3/4 rounded bg-muted" />
                      <div className="h-3 w-1/2 rounded bg-muted" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card/50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Camera className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                      <span className="text-sm font-medium">Reconocimiento</span>
                    </div>
                    <div className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-border">
                      <Camera className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card/50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-emerald-500" />
                      <span className="text-sm font-medium">Ventas</span>
                    </div>
                    <div className="flex h-24 items-end gap-1">
                      {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-emerald-500/50 to-emerald-400/80" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Todo lo que necesitas para tu tienda</h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Herramientas diseñadas específicamente para tiendas de calzado y ropa deportiva.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="group rounded-2xl border border-border bg-card p-6 transition hover:border-slate-400 hover:bg-accent dark:hover:border-slate-600">
                <div className="mb-4 inline-flex rounded-xl bg-slate-900/10 p-3 text-slate-700 dark:bg-slate-100/10 dark:text-slate-300">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-border bg-muted/50 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Empieza en 3 simples pasos</h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Configura tu tienda en minutos y comienza a gestionar tu inventario de forma inteligente.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {index < steps.length - 1 && (
                  <div className="absolute left-1/2 top-12 hidden h-0.5 w-full bg-gradient-to-r from-slate-400/50 to-transparent dark:from-slate-600/50 md:block" />
                )}
                <div className="relative rounded-2xl border border-border bg-card p-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                    {step.number}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Planes para cada etapa de tu negocio</h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Elige el plan que mejor se adapte a tu operación. Ahorra más con planes trimestrales o anuales.
            </p>
            
            {/* Billing Period Toggle */}
            <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-border bg-muted p-1">
              {(Object.keys(billingPeriods) as BillingPeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setBillingPeriod(period)}
                  className={`relative rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    billingPeriod === period
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {billingPeriods[period].label}
                  {billingPeriods[period].discount > 0 && (
                    <span className={`ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                      billingPeriod === period
                        ? "bg-emerald-500 text-white"
                        : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    }`}>
                      -{billingPeriods[period].discount}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const totalPrice = plan.isFree ? 0 : calculatePrice(plan.monthlyPrice, billingPeriod);
              const originalPrice = plan.monthlyPrice * billingPeriods[billingPeriod].months;
              const hasDiscount = billingPeriods[billingPeriod].discount > 0 && !plan.isFree;
              
              return (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl border p-6 ${
                    plan.highlighted
                      ? "border-slate-400 bg-gradient-to-b from-slate-200/50 to-transparent dark:border-slate-600 dark:from-slate-800/50"
                      : "border-border bg-card"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                      Más popular
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="mb-6">
                    {plan.isFree ? (
                      <span className="text-4xl font-bold">Gratis</span>
                    ) : (
                      <div className="space-y-1">
                        {hasDiscount && (
                          <div className="text-sm text-muted-foreground line-through">
                            {formatPrice(originalPrice)}
                          </div>
                        )}
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold">{formatPrice(totalPrice)}</span>
                          <span className="text-muted-foreground">
                            /{billingPeriods[billingPeriod].months === 1 ? "mes" : billingPeriods[billingPeriod].months + " meses"}
                          </span>
                        </div>
                        {hasDiscount && (
                          <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            Ahorras {formatPrice(originalPrice - totalPrice)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <ul className="mb-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className={`w-full rounded-full ${
                      plan.highlighted
                        ? "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                        : "bg-muted hover:bg-accent"
                    }`}
                  >
                    <Link href="/register">
                      {plan.isFree ? "Comenzar gratis" : "Elegir plan"}
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
          
          {/* Enterprise CTA */}
          <div className="mt-12 rounded-2xl border border-border bg-gradient-to-r from-slate-100 to-slate-50 p-8 text-center dark:from-slate-900 dark:to-slate-800">
            <h3 className="mb-2 text-xl font-bold">¿Tienes una franquicia o distribuidora?</h3>
            <p className="mb-4 text-muted-foreground">
              Contáctanos para un plan Enterprise con usuarios ilimitados, white-label y soporte dedicado.
            </p>
            <Button variant="outline" className="rounded-full">
              Contactar ventas
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-gradient-to-b from-muted to-background py-24">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="mx-auto max-w-2xl">
            <Shield className="mx-auto mb-6 h-12 w-12 text-slate-700 dark:text-slate-300" />
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">¿Listo para modernizar tu tienda?</h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Únete a StockWear y descubre cómo la tecnología puede simplificar la gestión de tu inventario.
            </p>
            <Button asChild size="lg" className="h-12 rounded-full bg-slate-900 px-8 text-base font-semibold hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
              <Link href="/register">
                Crear cuenta gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              {mounted && <Image src={logoSrc} alt="StockWear" width={32} height={32} />}
              <span className="font-semibold">StockWear</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="transition hover:text-foreground">Funciones</a>
              <a href="#how-it-works" className="transition hover:text-foreground">Cómo funciona</a>
              <a href="#pricing" className="transition hover:text-foreground">Precios</a>
            </nav>
            <p className="text-sm text-muted-foreground">© 2025 StockWear. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
