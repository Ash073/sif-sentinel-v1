'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports';
import { dashboardApi } from '@/lib/api/dashboard';
import { precursorsApi } from '@/lib/api/precursors';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
  ArrowUpRight, ArrowDownRight, FilePlus, Download, 
  Search, Filter, Activity, ListTodo, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { PrecursorGraph } from '@/components/dashboard/PrecursorGraph';

export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedPrecursorId, setSelectedPrecursorId] = useState<string | null>(null);

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getSummary,
  });

  const { data: sifTrendData } = useQuery({
    queryKey: ['dashboard-sif-trend'],
    queryFn: () => dashboardApi.getSifTrend('30d'),
  });

  const { data: precursors, isLoading: precursorsLoading } = useQuery({
    queryKey: ['precursors-top'],
    queryFn: () => precursorsApi.list({ limit: 5, sort: 'risk_score' }),
  });

  // Default to the first precursor if none is selected and data is available
  const activePrecursorId = selectedPrecursorId || (precursors?.[0]?.id) || null;

  const { data: graphData, isLoading: graphLoading } = useQuery({
    queryKey: ['precursor-graph', activePrecursorId],
    queryFn: () => activePrecursorId ? precursorsApi.getGraph(activePrecursorId) : Promise.reject('No ID'),
    enabled: !!activePrecursorId,
  });

  // Formatting chart data
  const volumeChartData = sifTrendData?.map(pt => ({
    date: new Date(pt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    total: pt.total_reports,
    sif: pt.sif_reports
  })) || [];

  const rateChartData = sifTrendData?.map(pt => ({
    date: new Date(pt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    rate: Number((pt.sif_rate * 100).toFixed(1))
  })) || [];

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Header Area */}
      <div>
        <h1 className="text-[28px] font-medium text-slate-900 tracking-tight">Good morning, {user?.full_name?.split(' ')[0] || 'User'}</h1>
        <p className="text-[13px] text-slate-500 font-medium">Stay on top of your safety reports, monitor risk, and track precursors.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* =========================================
            LEFT COLUMN (3/12)
        ========================================= */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          <div className="bg-white border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] rounded-[24px] p-6 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[13px] text-slate-500 font-medium">Total Reports</span>
              <div className="flex items-center gap-1 bg-slate-50 rounded-full px-2 py-1 border border-slate-100">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-[10px] font-medium text-slate-600">LIVE</span>
              </div>
            </div>
            <div className="text-[40px] font-medium text-slate-900 tracking-tight leading-none mb-2">
              {stats?.total_reports.toLocaleString() || '--'}
            </div>
            <div className="flex items-center gap-2 mb-8">
              <div className="flex items-center text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                SIF Rate: {stats ? (stats.sif_rate * 100).toFixed(1) : '--'}%
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/reports/new" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-10 rounded-full flex items-center justify-center gap-2 text-[13px] font-medium transition-colors shadow-sm">
                <FilePlus className="w-4 h-4" /> New Report
              </Link>
            </div>
          </div>

          <div className="bg-card border border-border rounded-[24px] p-5 text-foreground flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[13px] font-medium text-muted-foreground">Pending Reviews</span>
              <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                <ListTodo className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div>
              <div className="text-[28px] font-semibold tracking-tight mb-1">{stats?.review_required || 0}</div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-[24px] p-5 text-foreground flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[13px] font-medium text-muted-foreground">Active Precursors</span>
              <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                <Activity className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div>
              <div className="text-[28px] font-semibold tracking-tight mb-1">{stats?.active_precursors || 0}</div>
            </div>
          </div>

        </div>

        {/* =========================================
            RIGHT COLUMN (9/12)
        ========================================= */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Bar Chart (Volume) */}
            <div className="bg-card border border-border rounded-[24px] p-6 shadow-sm flex flex-col h-[300px]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-[16px] font-semibold text-foreground">Safety Signal Volume (30d)</h3>
                  <p className="text-[12px] text-muted-foreground mt-1">Total vs High SIF Potential</p>
                </div>
              </div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barGap={0} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="total" stackId="a" fill="#f97316" radius={[12, 12, 0, 0]} />
                    <Bar dataKey="sif" stackId="a" fill="hsl(var(--foreground))" radius={[0, 0, 12, 12]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Line Chart (SIF Rate) */}
            <div className="bg-card border border-border rounded-[24px] p-6 shadow-sm flex flex-col h-[300px]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-[16px] font-semibold text-foreground">SIF Rate Trend (30d)</h3>
                  <p className="text-[12px] text-muted-foreground mt-1">Percentage of reports with SIF Potential</p>
                </div>
              </div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rateChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => `${val}%`} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} formatter={(value: any) => [`${value}%`, 'SIF Rate']} />
                    <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Precursor Graph */}
          <div>
            <div className="flex justify-between items-end mb-4 px-2">
              <div>
                <h3 className="text-[18px] font-semibold text-slate-900 tracking-tight">Active Precursor Chain</h3>
                <p className="text-[13px] text-slate-500">Visualizing the anatomy of the selected precursor pattern.</p>
              </div>
              {activePrecursorId && (
                 <Link href={`/copilot?precursor=${activePrecursorId}`} className="text-[13px] font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors">
                   Analyze with Copilot
                 </Link>
              )}
            </div>
            <PrecursorGraph data={graphData} isLoading={graphLoading} />
          </div>

          {/* Precursors Table */}
          <div className="bg-card border border-border rounded-[24px] p-6 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[16px] font-semibold text-foreground">Top Precursor Patterns</h3>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 px-4 text-[12px] font-medium text-muted-foreground">Activity & Hazard</th>
                    <th className="py-3 px-4 text-[12px] font-medium text-muted-foreground">Failed Barrier</th>
                    <th className="py-3 px-4 text-[12px] font-medium text-muted-foreground text-center">Risk Score</th>
                    <th className="py-3 px-4 text-[12px] font-medium text-muted-foreground text-center">Occurrences</th>
                    <th className="py-3 px-4 text-[12px] font-medium text-muted-foreground text-right">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {precursors?.map((precursor) => (
                    <tr 
                      key={precursor.id} 
                      className={`border-b border-border hover:bg-muted/50 transition-colors cursor-pointer ${activePrecursorId === precursor.id ? 'bg-slate-50' : ''}`}
                      onClick={() => setSelectedPrecursorId(precursor.id)}
                    >
                      <td className="py-4 px-4 text-[13px] font-medium text-foreground">
                        <div className="flex flex-col">
                          <span>{precursor.activity}</span>
                          <span className="text-slate-500 font-normal">{precursor.hazard}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[13px] text-slate-700">
                        {precursor.barrier}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center text-[12px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                          {precursor.risk_score.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-[13px] font-medium text-slate-700">
                        {precursor.occurrence_count}
                      </td>
                      <td className="py-4 px-4 text-[12px] font-medium text-right">
                        <span className={`uppercase tracking-wide ${
                          precursor.trend === 'INCREASING' ? 'text-red-600' : 
                          precursor.trend === 'DECREASING' ? 'text-emerald-600' : 'text-slate-500'
                        }`}>
                          {precursor.trend}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!precursors || precursors.length === 0) && !precursorsLoading && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground text-[13px]">
                        No precursor patterns identified yet.
                      </td>
                    </tr>
                  )}
                  {precursorsLoading && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground text-[13px]">
                        Loading precursor patterns...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
