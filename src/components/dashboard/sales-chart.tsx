'use client';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartTooltipContentProps } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface SalesChartProps {
  data: Array<{ date: string; value: number }>;
  formatter: (value: number) => string;
}

export function SalesChart({ data, formatter }: SalesChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Aún no se registran ventas para este periodo.
      </div>
    );
  }

  return (
    <ChartContainer
      config={{
        value: {
          label: 'Ventas',
          color: 'hsl(var(--primary))',
        },
      }}
      className="h-[300px]"
    >
      <AreaChart data={data}>
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
          tickFormatter={(value) => `${Math.round((value as number) / 1000)}k`}
          className="text-xs"
        />
        <ChartTooltip
          content={(contentProps) => {
            if (!contentProps) {
              return null;
            }

            const { allowEscapeViewBox: _allowEscapeViewBox, ...tooltipProps } =
              contentProps as ChartTooltipContentProps & {
                allowEscapeViewBox?: unknown;
              };

            return (
              <ChartTooltipContent
                {...tooltipProps}
                formatter={(value) => formatter(value as number)}
              />
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#colorValue)"
        />
      </AreaChart>
    </ChartContainer>
  );
}

export default SalesChart;
