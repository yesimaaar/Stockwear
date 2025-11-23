"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DollarSign, TrendingUp, Boxes } from "lucide-react"
import { GastoService } from "@/features/movimientos/services/gasto-service"
import type { Gasto } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { getCurrentTiendaId } from "@/features/auth/services/tenant-service"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type { DateRange } from "react-day-picker"

interface GastosTabProps {
  dateRange: DateRange | undefined
}

export function GastosTab({ dateRange }: GastosTabProps) {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const { toast } = useToast()
  const [metrics, setMetrics] = useState({
    total: 0,
    count: 0,
    average: 0
  })

  const fetchGastos = async () => {
    try {
      const tiendaId = await getCurrentTiendaId()
      if (!tiendaId) return

      const data = await GastoService.getAll({
        startDate: dateRange?.from,
        endDate: dateRange?.to
      })
      setGastos(data)

      // Calculate metrics
      const total = data.reduce((acc, curr) => acc + curr.monto, 0)
      const count = data.length
      const average = count > 0 ? total / count : 0
      setMetrics({ total, count, average })

    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los gastos",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchGastos()
  }, [dateRange])

  const currencyFormatter = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  // Prepare chart data
  const chartData = gastos.reduce((acc: any[], curr) => {
    const date = format(new Date(curr.fechaGasto), 'yyyy-MM-dd')
    const existing = acc.find(item => item.date === date)
    if (existing) {
      existing.value += curr.monto
    } else {
      acc.push({ date, value: curr.monto })
    }
    return acc
  }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencyFormatter.format(metrics.total)}</div>
            <p className="text-xs text-muted-foreground">
              Total de gastos registrados
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Registrados</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.count}</div>
            <p className="text-xs text-muted-foreground">
              Número de movimientos
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencyFormatter.format(metrics.average)}</div>
            <p className="text-xs text-muted-foreground">
              Promedio por gasto
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Historial de Gastos</CardTitle>
          <CardDescription>
            Visualiza los gastos acumulados por fecha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ChartContainer config={{ gastos: { label: "Gastos", color: "hsl(var(--destructive))" } }} className="h-[300px] w-full">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => {
                    const date = new Date(value as string)
                    return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" })
                  }}
                  className="text-xs"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => currencyFormatter.format(value as number).replace(/\u00a0/g, " ")}
                  className="text-xs"
                />
                <ChartTooltip
                  content={({ content, ...contentProps }) => (
                    <ChartTooltipContent
                      {...contentProps}
                      labelFormatter={(label) => {
                        return new Date(label as string).toLocaleDateString("es-CO", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })
                      }}
                      formatter={(value) => currencyFormatter.format(value as number)}
                    />
                  )}
                />
                <Bar dataKey="value" fill="var(--color-gastos)" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              No hay registros de gastos para el periodo seleccionado.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle de Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gastos.map((gasto) => (
                <TableRow key={gasto.id}>
                  <TableCell>
                    {format(new Date(gasto.fechaGasto), "dd/MM/yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>{gasto.descripcion}</TableCell>
                  <TableCell>{gasto.categoria}</TableCell>
                  <TableCell>{gasto.metodoPago}</TableCell>
                  <TableCell>{gasto.estado}</TableCell>
                  <TableCell className="text-right">
                    {currencyFormatter.format(gasto.monto)}
                  </TableCell>
                </TableRow>
              ))}
              {gastos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No hay gastos registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
