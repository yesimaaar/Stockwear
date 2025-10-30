"use client"

import { useState } from "react"
import { DollarSign, ShoppingCart, Users, Package, TrendingUp, TrendingDown, Target } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

const salesData = [
  { date: "22 Jul", value: 45000 },
  { date: "23 Jul", value: 52000 },
  { date: "24 Jul", value: 48000 },
  { date: "25 Jul", value: 61000 },
  { date: "26 Jul", value: 55000 },
  { date: "27 Jul", value: 67000 },
  { date: "28 Jul", value: 58000 },
  { date: "29 Jul", value: 72000 },
]

export default function AdminDashboard() {
  const [selectedMonth, setSelectedMonth] = useState("Jul 2023")

  const [dailyTarget, setDailyTarget] = useState(650)
  const [dailyProgress, setDailyProgress] = useState(450)
  const [monthlyTarget, setMonthlyTarget] = useState(14500)
  const [monthlyProgress, setMonthlyProgress] = useState(14500)
  const [yearlyTarget, setYearlyTarget] = useState(175000)
  const [yearlyProgress, setYearlyProgress] = useState(125000)

  const metrics = [
    {
      title: "Ingresos Totales",
      value: "$82,650",
      change: "+11%",
      trend: "up",
      icon: DollarSign,
      bgColor: "bg-gray-100",
      iconColor: "text-gray-700",
    },
    {
      title: "Pedidos Totales",
      value: "1645",
      change: "+11%",
      trend: "up",
      icon: ShoppingCart,
      bgColor: "bg-gray-100",
      iconColor: "text-gray-700",
    },
    {
      title: "Clientes Totales",
      value: "1,462",
      change: "-17%",
      trend: "down",
      icon: Users,
      bgColor: "bg-gray-100",
      iconColor: "text-gray-700",
    },
    {
      title: "Entregas Pendientes",
      value: "117",
      change: "+8%",
      trend: "up",
      icon: Package,
      bgColor: "bg-gray-100",
      iconColor: "text-gray-700",
    },
  ]

  const dailyPercentage = (dailyProgress / dailyTarget) * 100
  const monthlyPercentage = (monthlyProgress / monthlyTarget) * 100
  const yearlyPercentage = (yearlyProgress / yearlyTarget) * 100

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-foreground">Resumen General</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title} className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardDescription className="text-xs text-muted-foreground">Últimos 30 días</CardDescription>
                <CardTitle className="text-sm font-medium text-muted-foreground mt-1">{metric.title}</CardTitle>
              </div>
              <div className={`rounded-full p-2 ${metric.bgColor}`}>
                <metric.icon className={`h-5 w-5 ${metric.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="text-3xl font-bold">{metric.value}</div>
                <div className="flex items-center gap-1">
                  {metric.trend === "up" ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${metric.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                    {metric.change}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">Análisis de Ventas</CardTitle>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option>Jul 2023</option>
                <option>Ago 2023</option>
                <option>Sep 2023</option>
              </select>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Ingresos</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xl font-bold">23,262.00</p>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                    +0.05% ↑
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gastos</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xl font-bold">11,135.00</p>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                    +0.03% ↑
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Balance</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xl font-bold">48,135.00</p>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                    +0.05% ↑
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: {
                  label: "Ventas",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `${value / 1000}k`}
                  className="text-xs"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Objetivo de Ventas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-6">
            {/* Diagrama circular segmentado en 3 partes */}
            <div className="relative h-56 w-56">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 200 200">
                {/* Objetivo Anual - Segmento exterior */}
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  stroke="hsl(var(--muted))"
                  strokeWidth="20"
                  fill="none"
                  opacity="0.3"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  stroke="hsl(0, 0%, 60%)"
                  strokeWidth="20"
                  fill="none"
                  strokeDasharray={`${(yearlyPercentage / 100) * 534} 534`}
                  strokeLinecap="round"
                />

                {/* Objetivo Mensual - Segmento medio */}
                <circle
                  cx="100"
                  cy="100"
                  r="60"
                  stroke="hsl(var(--muted))"
                  strokeWidth="18"
                  fill="none"
                  opacity="0.3"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="60"
                  stroke="hsl(0, 0%, 40%)"
                  strokeWidth="18"
                  fill="none"
                  strokeDasharray={`${(monthlyPercentage / 100) * 377} 377`}
                  strokeLinecap="round"
                />

                {/* Objetivo Diario - Segmento interior */}
                <circle
                  cx="100"
                  cy="100"
                  r="37"
                  stroke="hsl(var(--muted))"
                  strokeWidth="16"
                  fill="none"
                  opacity="0.3"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="37"
                  stroke="hsl(0, 0%, 20%)"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${(dailyPercentage / 100) * 232} 232`}
                  strokeLinecap="round"
                />
              </svg>

              {/* Porcentaje central */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {Math.round((dailyPercentage + monthlyPercentage + yearlyPercentage) / 3)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Promedio</div>
                </div>
              </div>
            </div>

            {/* Leyenda de objetivos */}
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-800" />
                  <span className="text-sm text-muted-foreground">Objetivo Diario</span>
                </div>
                <div className="flex items-center gap-1">
                  {dailyPercentage >= 100 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-orange-600" />
                  )}
                  <span className="text-base font-bold">
                    {dailyProgress}/{dailyTarget}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-600" />
                  <span className="text-sm text-muted-foreground">Objetivo Mensual</span>
                </div>
                <div className="flex items-center gap-1">
                  {monthlyPercentage >= 100 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-orange-600" />
                  )}
                  <span className="text-base font-bold">
                    {monthlyProgress.toLocaleString()}/{monthlyTarget.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-400" />
                  <span className="text-sm text-muted-foreground">Objetivo Anual</span>
                </div>
                <div className="flex items-center gap-1">
                  {yearlyPercentage >= 100 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-orange-600" />
                  )}
                  <span className="text-base font-bold">
                    {yearlyProgress.toLocaleString()}/{yearlyTarget.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Configuración de Objetivos</CardTitle>
          </div>
          <CardDescription>Define y actualiza tus objetivos de ventas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Objetivo Diario */}
            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-800" />
                <h3 className="font-semibold">Objetivo Diario</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily-target">Meta</Label>
                <Input
                  id="daily-target"
                  type="number"
                  value={dailyTarget}
                  onChange={(e) => setDailyTarget(Number(e.target.value))}
                  placeholder="Ej: 650"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily-progress">Progreso Actual</Label>
                <Input
                  id="daily-progress"
                  type="number"
                  value={dailyProgress}
                  onChange={(e) => setDailyProgress(Number(e.target.value))}
                  placeholder="Ej: 450"
                />
              </div>
              <div className="pt-2">
                <div className="text-sm text-muted-foreground">Porcentaje</div>
                <div className="text-2xl font-bold">{Math.round(dailyPercentage)}%</div>
              </div>
            </div>

            {/* Objetivo Mensual */}
            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-600" />
                <h3 className="font-semibold">Objetivo Mensual</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly-target">Meta</Label>
                <Input
                  id="monthly-target"
                  type="number"
                  value={monthlyTarget}
                  onChange={(e) => setMonthlyTarget(Number(e.target.value))}
                  placeholder="Ej: 14500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly-progress">Progreso Actual</Label>
                <Input
                  id="monthly-progress"
                  type="number"
                  value={monthlyProgress}
                  onChange={(e) => setMonthlyProgress(Number(e.target.value))}
                  placeholder="Ej: 14500"
                />
              </div>
              <div className="pt-2">
                <div className="text-sm text-muted-foreground">Porcentaje</div>
                <div className="text-2xl font-bold">{Math.round(monthlyPercentage)}%</div>
              </div>
            </div>

            {/* Objetivo Anual */}
            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-400" />
                <h3 className="font-semibold">Objetivo Anual</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearly-target">Meta</Label>
                <Input
                  id="yearly-target"
                  type="number"
                  value={yearlyTarget}
                  onChange={(e) => setYearlyTarget(Number(e.target.value))}
                  placeholder="Ej: 175000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearly-progress">Progreso Actual</Label>
                <Input
                  id="yearly-progress"
                  type="number"
                  value={yearlyProgress}
                  onChange={(e) => setYearlyProgress(Number(e.target.value))}
                  placeholder="Ej: 125000"
                />
              </div>
              <div className="pt-2">
                <div className="text-sm text-muted-foreground">Porcentaje</div>
                <div className="text-2xl font-bold">{Math.round(yearlyPercentage)}%</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button size="lg">Guardar Objetivos</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
