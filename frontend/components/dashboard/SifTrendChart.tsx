'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';

type Window = '7d' | '30d' | '90d' | '1y';

const WINDOWS: { label: string; value: Window }[] = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: '1Y', value: '1y' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl p-3 shadow-2xl text-xs space-y-1.5">
      <p className="font-semibold text-slate-300 mb-2">
        {(() => { try { return format(parseISO(label), 'dd MMM yyyy'); } catch { return label; } })()}
      </p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5" style={{ color: p.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-bold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function SifTrendChart() {
  const [window, setWindow] = useState<Window>('30d');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-sif-trend', window],
    queryFn: () => dashboardApi.getSifTrend(window),
  });

  const formatted = (data ?? []).map((p) => ({
    ...p,
    dateLabel: (() => { try { return format(parseISO(p.date), 'MMM d'); } catch { return p.date; } })(),
  }));

  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-white">SIF Trend</h3>
            <p className="text-[11px] text-slate-500">Reports over time</p>
          </div>
        </div>
        {/* Window selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg border border-white/5">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              onClick={() => setWindow(w.value)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                window === w.value
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="h-[220px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
            <span className="text-xs text-slate-500">Loading trend data...</span>
          </div>
        </div>
      ) : !formatted.length ? (
        <div className="h-[220px] flex items-center justify-center">
          <span className="text-sm text-slate-500">No data for this period.</span>
        </div>
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formatted} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="sifGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }}
              />
              <Area
                type="monotone"
                dataKey="total_reports"
                name="Total Reports"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#totalGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="sif_reports"
                name="SIF Reports"
                stroke="#f97316"
                strokeWidth={2.5}
                fill="url(#sifGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
