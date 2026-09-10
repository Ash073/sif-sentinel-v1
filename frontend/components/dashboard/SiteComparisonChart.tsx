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
  if (sifDensity >= 0.5) return '#ef4444';
  if (sifDensity >= 0.3) return '#f97316';
  if (sifDensity >= 0.15) return '#eab308';
  return '#22c55e';
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
    <div className="bg-slate-900 border border-white/10 rounded-xl p-3 shadow-2xl text-xs min-w-[160px]">
      <p className="font-semibold text-white mb-2 truncate">{d.name}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Reports</span>
          <span className="text-white font-bold">{d.count}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">SIF Reports</span>
          <span className="font-bold" style={{ color: riskColor }}>{d.sif_count}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">SIF Rate</span>
          <span className="font-bold" style={{ color: riskColor }}>
            {(d.sif_density * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-white/5 mt-1">
          <span className="text-slate-400">Risk Level</span>
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
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-white">Site Risk Comparison</h3>
            <p className="text-[11px] text-slate-500">SIF density by location</p>
          </div>
        </div>
        {/* Risk legend */}
        <div className="hidden sm:flex items-center gap-3 text-[10px]">
          {[
            { label: 'CRITICAL', color: '#ef4444' },
            { label: 'HIGH', color: '#f97316' },
            { label: 'MEDIUM', color: '#eab308' },
            { label: 'LOW', color: '#22c55e' },
          ].map((r) => (
            <span key={r.label} className="flex items-center gap-1 text-slate-500">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
              {r.label}
            </span>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-[220px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
        </div>
      ) : !chartData.length ? (
        <div className="h-[220px] flex items-center justify-center">
          <span className="text-sm text-slate-500">No site data available.</span>
        </div>
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                horizontal={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                unit="%"
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
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
