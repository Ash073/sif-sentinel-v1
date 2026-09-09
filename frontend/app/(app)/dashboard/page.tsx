'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports';
import { dashboardApi } from '@/lib/api/dashboard';
import { precursorsApi } from '@/lib/api/precursors';
import { interventionsApi } from '@/lib/api/interventions';
import { riskApi } from '@/lib/api/risk';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
  FilePlus, Activity, ListTodo, AlertTriangle, 
  ShieldCheck, Brain, TrendingUp, CheckSquare, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  
  const isManager = user && ['ADMIN', 'HSE_MANAGER'].includes(user.role);
  const canCreateReport = user && ['ADMIN', 'HSE_MANAGER', 'HSE_ANALYST', 'REVIEWER'].includes(user.role);

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getSummary,
  });

  const { data: intSummary } = useQuery({
    queryKey: ['interventions-summary'],
    queryFn: interventionsApi.getSummary,
  });

  const { data: precursors } = useQuery({
    queryKey: ['precursors-top'],
    queryFn: () => precursorsApi.list({ limit: 4, sort: 'risk_score' }),
  });

  const { data: recentReports } = useQuery({
    queryKey: ['reports', 'recent'],
    queryFn: () => reportsApi.list({ page: 1, page_size: 5 }),
  });

  const { data: barrierHealth } = useQuery({
    queryKey: ['dashboard-barrier-health'],
    queryFn: () => riskApi.getBarriers({ limit: 5 }),
  });

  return (
    <div className="flex flex-col gap-6 pb-8 animate-in fade-in duration-300">
      {/* Header Area */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-[24px] font-semibold text-slate-900 tracking-tight">
            Good morning, {user?.full_name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">Safety intelligence at a glance.</p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-3">
          {canCreateReport && (
            <Link href="/reports/new" className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 rounded-full flex items-center justify-center gap-2 text-[13px] font-medium transition-colors shadow-sm">
              <FilePlus className="w-4 h-4" /> New Safety Report
            </Link>
          )}
          {isManager && (
            <Link href="/reviews" className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 h-9 px-4 rounded-full flex items-center justify-center gap-2 text-[13px] font-medium transition-colors shadow-sm">
              <CheckSquare className="w-4 h-4" /> Review Pending
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards (HSE_MANAGER focused) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">SIF-Potential</span>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-[28px] font-semibold text-slate-900 leading-none">
            {stats?.total_sif_reports || 0}
          </div>
        </div>

        <div className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[12px] font-medium text-red-600 uppercase tracking-wide">High/Critical Risk</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-[28px] font-semibold text-red-600 leading-none">
            {stats?.high_risk_reports || 0}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">Pending Reviews</span>
            <ListTodo className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-[28px] font-semibold text-slate-900 leading-none">
            {stats?.review_required || 0}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">Active Interventions</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-[28px] font-semibold text-slate-900 leading-none">
            {intSummary?.pending || 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Action Center */}
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <h2 className="text-[15px] font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Action Required
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link href="/reviews" className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl p-4 transition-colors">
                <div className="text-[20px] font-bold text-white mb-1">{stats?.review_required || 0}</div>
                <div className="text-[12px] text-slate-300">Pending Reviews</div>
              </Link>
              <Link href="/reports?risk=high" className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl p-4 transition-colors">
                <div className="text-[20px] font-bold text-red-400 mb-1">{stats?.high_risk_reports || 0}</div>
                <div className="text-[12px] text-slate-300">High-Risk Reports</div>
              </Link>
              <Link href="/interventions" className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl p-4 transition-colors">
                <div className="text-[20px] font-bold text-white mb-1">{intSummary?.pending || 0}</div>
                <div className="text-[12px] text-slate-300">Pending Interventions</div>
              </Link>
            </div>
          </div>

          {/* Precursor Intelligence */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-600" /> Precursor Intelligence
              </h3>
              <Link href="/precursors" className="text-[12px] font-medium text-blue-600 hover:text-blue-800">View all →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-2 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wide">Activity & Hazard</th>
                    <th className="py-2 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wide">Barrier Failure</th>
                    <th className="py-2 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wide text-right">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {precursors?.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                      <td className="py-3 px-3">
                        <div className="text-[13px] font-medium text-slate-900">{p.activity}</div>
                        <div className="text-[12px] text-slate-500">{p.hazard}</div>
                      </td>
                      <td className="py-3 px-3 text-[13px] text-slate-700">{p.barrier}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          p.trend === 'INCREASING' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {p.trend}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!precursors?.length && (
                    <tr><td colSpan={3} className="py-4 text-center text-sm text-slate-500">No active precursors detected.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Reports */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[15px] font-semibold text-slate-900">Recent Reports</h3>
              <Link href="/reports" className="text-[12px] font-medium text-blue-600 hover:text-blue-800">View all →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-2 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wide">ID</th>
                    <th className="py-2 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wide">Location</th>
                    <th className="py-2 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wide">Type</th>
                    <th className="py-2 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wide text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports?.items?.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                      <td className="py-3 px-3">
                        <Link href={`/reports/${r.report_id}`} className="text-[13px] font-medium text-blue-600 hover:underline">
                          {r.report_id}
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-[13px] text-slate-700">{r.location}</td>
                      <td className="py-3 px-3 text-[13px] text-slate-700">{r.report_type.replace('_', ' ')}</td>
                      <td className="py-3 px-3 text-[12px] text-slate-500 text-right">
                        {new Date(r.reported_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column (1/3 width) */}
        <div className="flex flex-col gap-6">
          
          {/* Barrier Health */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-[15px] font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Barrier Health
            </h3>
            <div className="space-y-4">
              {(barrierHealth as any[])?.slice(0, 5).map((b: any, i: number) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] font-medium text-slate-700 truncate pr-2">{b.barrier}</span>
                    <span className="text-[12px] font-bold text-red-600 bg-red-50 px-1.5 rounded">{b.failed_count} failures</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-red-500 h-full rounded-full" style={{ width: `${Math.min(100, (b.failed_count / 10) * 100)}%` }}></div>
                  </div>
                </div>
              ))}
              {!(barrierHealth as any[])?.length && (
                <p className="text-[13px] text-slate-500 text-center py-4">No barrier failure data available.</p>
              )}
            </div>
          </div>

          {/* Quick Stats / Risk Overview */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-[15px] font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" /> Risk Overview
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[13px] text-slate-600">Monitored Sites</span>
                <span className="text-[14px] font-semibold text-slate-900">{stats?.sites_monitored || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[13px] text-slate-600">System SIF Rate</span>
                <span className="text-[14px] font-semibold text-slate-900">
                  {stats ? (stats.sif_rate * 100).toFixed(1) : '--'}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[13px] text-slate-600">High Risk Rate</span>
                <span className="text-[14px] font-semibold text-red-600">
                  {stats ? (stats.high_risk_rate * 100).toFixed(1) : '--'}%
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
