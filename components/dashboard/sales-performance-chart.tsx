"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface SalesPerformanceChartProps {
  data: Array<{ date: string; value: number }>
  formatter: (value: number) => string
  title?: string
  description?: string
  className?: string
}

const chartConfig: ChartConfig = {
  ventas: {
    label: "Ventas",
    theme: {
      light: "rgba(15, 23, 42, 0.85)",
      dark: "rgba(255, 255, 255, 0.85)",
    },
  },
}

type TimeRange = "90d" | "30d" | "7d" | "1d"

const RANGE_LABEL: Record<TimeRange, string> = {
  "90d": "Últimos 3 meses",
  "30d": "Últimos 30 días",
  "7d": "Últimos 7 días",
  "1d": "Hoy",
}

const RANGE_TO_DAYS: Record<TimeRange, number> = {
  "90d": 90,
  "30d": 30,
  "7d": 7,
  "1d": 1,
}

export function SalesPerformanceChart({
  data,
  formatter,
  title = "Rendimiento de ventas",
  description = "Comparativa de ingresos en COP",
  className,
  timeRange = "90d",
  onTimeRangeChange,
}: SalesPerformanceChartProps & {
  timeRange?: TimeRange
  onTimeRangeChange?: (range: TimeRange) => void
}) {
  const isMobile = useIsMobile()

  React.useEffect(() => {
    if (isMobile && timeRange !== "7d" && onTimeRangeChange) {
      onTimeRangeChange("7d")
    }
  }, [isMobile, onTimeRangeChange, timeRange])

  const hasData = data.length > 0

  const handleTimeRangeChange = (value: string) => {
    if ((value === "90d" || value === "30d" || value === "7d" || value === "1d") && onTimeRangeChange) {
      onTimeRangeChange(value as TimeRange)
    }
  }

  return (
    <Card className={cn("@container/card", className)}>
      <CardHeader>
        <div>
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={handleTimeRangeChange}
            variant="outline"
            className="hidden space-x-1 @[768px]/card:flex"
          >
            <ToggleGroupItem value="90d">3 meses</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 días</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 días</ToggleGroupItem>
            <ToggleGroupItem value="1d">Hoy</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-40 @[768px]/card:hidden text-sm">
              <SelectValue placeholder="Selecciona un rango" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Últimos 3 meses
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Últimos 30 días
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Últimos 7 días
              </SelectItem>
              <SelectItem value="1d" className="rounded-lg">
                Hoy
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-ventas)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--color-ventas)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--chart-grid)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  if (value.includes("T")) {
                    return date.toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  }
                  return date.toLocaleDateString("es-CO", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <ChartTooltip
                cursor={false}
                defaultIndex={isMobile ? -1 : Math.min(data.length - 1, 8)}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(value) => {
                      const date = new Date(value as string)
                      if ((value as string).includes("T")) {
                        return date.toLocaleTimeString("es-CO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      }
                      return date.toLocaleDateString("es-CO", {
                        month: "short",
                        day: "numeric",
                      })
                    }}
                    formatter={(value) => <span className="font-medium">{formatter(Number(value))}</span>}
                  />
                }
              />
              <Area
                dataKey="value"
                type="monotone"
                fill="url(#fillVentas)"
                stroke="var(--color-ventas)"
                strokeOpacity={0.9}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed text-center text-sm text-muted-foreground">
            <p>No hay datos suficientes para {RANGE_LABEL[timeRange]?.toLowerCase() ?? "el rango seleccionado"}.</p>
            <p className="mt-1">Asegúrate de registrar ventas para visualizar la tendencia.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SalesPerformanceChart
