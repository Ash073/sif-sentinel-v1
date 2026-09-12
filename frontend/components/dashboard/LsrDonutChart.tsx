'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { ShieldCheck } from 'lucide-react';

const LSR_COLORS = [
  'var(--color-warning)', 'var(--color-destructive)', 'var(--color-chart-3)', 'var(--color-chart-5)',
  'var(--color-chart-1)', 'var(--color-primary)', 'var(--color-chart-4)', 'var(--color-chart-2)',
  'var(--color-success)', 'var(--color-accent)',
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-2xl text-xs">
      <p className="font-semibold text-foreground mb-1.5 max-w-[180px] leading-tight">{d.name}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Violations</span>
          <span className="text-foreground font-bold">{d.count}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">SIF Violations</span>
          <span className="text-warning font-bold">{d.sif_count}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Share</span>
          <span className="text-primary font-bold">{d.percentage?.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.06) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="var(--color-foreground)" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function LsrDonutChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-lsr-dist'],
    queryFn: dashboardApi.getLsrDistribution,
  });

  const chartData = (data ?? []).slice().sort((a, b) => b.count - a.count).slice(0, 10);
  const total = chartData.reduce((sum, d) => sum + d.count, 0);
  const sifTotal = chartData.reduce((sum, d) => sum + d.sif_count, 0);

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-warning" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-foreground">LSR Violations</h3>
          <p className="text-[11px] text-muted-foreground">Life-Saving Rule distribution</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[220px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-warning/30 border-t-warning rounded-full animate-spin" />
        </div>
      ) : !chartData.length ? (
        <div className="h-[220px] flex items-center justify-center">
          <span className="text-sm text-muted-foreground">No LSR violation data available.</span>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {/* Donut */}
          <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="count"
                  paddingAngle={2}
                  labelLine={false}
                  label={renderCustomLabel}
                  strokeWidth={0}
                >
                  {chartData.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={LSR_COLORS[idx % LSR_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[20px] font-bold text-foreground leading-none">{total}</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wide mt-0.5">violations</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-1.5 overflow-hidden">
            {chartData.slice(0, 6).map((d, idx) => (
              <div key={d.name} className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: LSR_COLORS[idx % LSR_COLORS.length] }}
                />
                <span className="text-[11px] text-muted-foreground truncate flex-1">{d.name}</span>
                <span className="text-[11px] font-semibold text-muted-foreground shrink-0">{d.count}</span>
              </div>
            ))}
            {chartData.length > 6 && (
              <p className="text-[10px] text-muted-foreground pl-4">
                +{chartData.length - 6} more rules
              </p>
            )}
            <div className="pt-1.5 mt-1.5 border-t border-border flex justify-between">
              <span className="text-[11px] text-muted-foreground">SIF-linked</span>
              <span className="text-[11px] font-bold text-warning">{sifTotal} violations</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
