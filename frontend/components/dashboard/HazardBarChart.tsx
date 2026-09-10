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
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#6366f1', '#a855f7',
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl p-3 shadow-2xl text-xs">
      <p className="font-semibold text-white mb-1.5">{d.name}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Total Reports</span>
          <span className="text-white font-bold">{d.count}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">SIF Reports</span>
          <span className="text-orange-400 font-bold">{d.sif_count}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">SIF Density</span>
          <span className="text-red-400 font-bold">{(d.sif_density * 100).toFixed(1)}%</span>
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
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Flame className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-white">Top Hazards</h3>
          <p className="text-[11px] text-slate-500">By report frequency</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[220px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-400 rounded-full animate-spin" />
        </div>
      ) : !chartData.length ? (
        <div className="h-[220px] flex items-center justify-center">
          <span className="text-sm text-slate-500">No hazard data available.</span>
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
                stroke="rgba(255,255,255,0.04)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
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
