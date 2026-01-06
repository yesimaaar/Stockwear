"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SalesPerformanceChartProps {
  className?: string
  data: Array<{ date: string; value: number; profit?: number }>
  formatter?: (value: number) => string
  title?: string
  description?: string
  timeRange: string
  onTimeRangeChange: (value: any) => void
  metric?: 'sales' | 'profit'
  onMetricChange?: (value: 'sales' | 'profit') => void
}

export function SalesPerformanceChart({
  className,
  data,
  formatter = (value) => `${value}`,
  title = "Rendimiento",
  description = "Resumen de actividad",
  timeRange,
  onTimeRangeChange,
  metric = 'sales',
  onMetricChange,
}: SalesPerformanceChartProps) {
  
  const ChartData = React.useMemo(() => {
    return data.map(item => ({
      ...item,
      displayValue: metric === 'profit' ? (item.profit ?? 0) : item.value
    }))
  }, [data, metric])

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
             {onMetricChange && (
               <div className="flex items-center rounded-lg border bg-background p-1">
                  <Button
                    variant={metric === 'sales' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onMetricChange('sales')}
                  >
                    Ventas
                  </Button>
                  <Button
                    variant={metric === 'profit' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onMetricChange('profit')}
                  >
                    Ganancias
                  </Button>
               </div>
             )}
            <Select value={timeRange} onValueChange={onTimeRangeChange}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Rango" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Últimas 24h</SelectItem>
                <SelectItem value="7d">Últimos 7 días</SelectItem>
                <SelectItem value="30d">Últimos 30 días</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => {
                  if (timeRange === "1d") {
                     return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' })
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => formatter(value as number)}
              />
              <Tooltip
                 content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                             <div className="flex flex-col">
                               <span className="text-[0.70rem] uppercase text-muted-foreground">
                                 {label && (timeRange === '1d' 
                                    ? new Date(label).toLocaleTimeString() 
                                    : new Date(label).toLocaleDateString())}
                               </span>
                               <span className="font-bold text-muted-foreground">
                                 {formatter(payload[0].value as number)}
                               </span>
                             </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                 }}
              />
              <Area
                type="monotone"
                dataKey="displayValue"
                stroke={metric === 'profit' ? "#10b981" : "var(--color-primary)"}
                fillOpacity={1}
                fill={metric === 'profit' ? "url(#fillProfit)" : "url(#fillSales)"}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
