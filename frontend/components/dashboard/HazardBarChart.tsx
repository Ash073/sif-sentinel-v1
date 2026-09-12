'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { Flame } from 'lucide-react';

const HAZARD_COLORS = [
  'var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)'
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-2xl text-xs">
      <p className="font-semibold text-foreground mb-1.5">{d.name}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Total Reports</span>
          <span className="text-foreground font-bold">{d.count}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">SIF Reports</span>
          <span className="text-warning font-bold">{d.sif_count}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">SIF Density</span>
          <span className="text-destructive font-bold">{(d.sif_density * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};

export function HazardBarChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-hazard-dist'],
    queryFn: dashboardApi.getHazardDistribution,
  });

  // Take top 8, sort by count
  const chartData = (data ?? [])
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((d) => ({ ...d, name: d.name.length > 28 ? d.name.slice(0, 26) + '…' : d.name }));

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <Flame className="w-4 h-4 text-destructive" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-foreground">Top Hazards</h3>
          <p className="text-[11px] text-muted-foreground">By report frequency</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[220px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin" />
        </div>
      ) : !chartData.length ? (
        <div className="h-[220px] flex items-center justify-center">
          <span className="text-sm text-muted-foreground">No hazard data available.</span>
        </div>
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-muted)' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                {chartData.map((_, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={HAZARD_COLORS[idx % HAZARD_COLORS.length]}
                    opacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
