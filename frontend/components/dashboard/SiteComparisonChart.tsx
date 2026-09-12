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
import { MapPin } from 'lucide-react';

const getRiskColor = (sifDensity: number): string => {
  if (sifDensity >= 0.5) return 'var(--color-destructive)';
  if (sifDensity >= 0.3) return 'var(--color-warning)';
  if (sifDensity >= 0.15) return 'var(--color-chart-3)';
  return 'var(--color-success)';
};

const getRiskLabel = (sifDensity: number): string => {
  if (sifDensity >= 0.5) return 'CRITICAL';
  if (sifDensity >= 0.3) return 'HIGH';
  if (sifDensity >= 0.15) return 'MEDIUM';
  return 'LOW';
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const riskColor = getRiskColor(d.sif_density);
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-2xl text-xs min-w-[160px]">
      <p className="font-semibold text-foreground mb-2 truncate">{d.name}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Reports</span>
          <span className="text-foreground font-bold">{d.count}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">SIF Reports</span>
          <span className="font-bold" style={{ color: riskColor }}>{d.sif_count}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">SIF Rate</span>
          <span className="font-bold" style={{ color: riskColor }}>
            {(d.sif_density * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-border mt-1">
          <span className="text-muted-foreground">Risk Level</span>
          <span className="font-bold text-[10px] uppercase tracking-wide" style={{ color: riskColor }}>
            {getRiskLabel(d.sif_density)}
          </span>
        </div>
      </div>
    </div>
  );
};

export function SiteComparisonChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-site-comparison'],
    queryFn: dashboardApi.getSiteComparison,
  });

  const chartData = (data ?? [])
    .slice()
    .sort((a, b) => b.sif_density - a.sif_density)
    .slice(0, 8)
    .map((d) => ({
      ...d,
      name: d.name.length > 16 ? d.name.slice(0, 14) + '…' : d.name,
      sif_pct: Math.round(d.sif_density * 100),
    }));

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-chart-5/10 border border-chart-5/20 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-chart-5" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">Site Risk Comparison</h3>
            <p className="text-[11px] text-muted-foreground">SIF density by location</p>
          </div>
        </div>
        {/* Risk legend */}
        <div className="hidden sm:flex items-center gap-3 text-[10px]">
          {[
            { label: 'CRITICAL', color: 'var(--color-destructive)' },
            { label: 'HIGH', color: 'var(--color-warning)' },
            { label: 'MEDIUM', color: 'var(--color-chart-3)' },
            { label: 'LOW', color: 'var(--color-success)' },
          ].map((r) => (
            <span key={r.label} className="flex items-center gap-1 text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
              {r.label}
            </span>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-[220px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-chart-5/30 border-t-chart-5 rounded-full animate-spin" />
        </div>
      ) : !chartData.length ? (
        <div className="h-[220px] flex items-center justify-center">
          <span className="text-sm text-muted-foreground">No site data available.</span>
        </div>
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                horizontal={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                unit="%"
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-muted)' }} />
              <Bar dataKey="sif_pct" radius={[4, 4, 0, 0]} barSize={28}>
                {chartData.map((d, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={getRiskColor(d.sif_density)}
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
