'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports';
import { dashboardApi } from '@/lib/api/dashboard';
import { precursorsApi } from '@/lib/api/precursors';
import { interventionsApi } from '@/lib/api/interventions';
import { riskApi } from '@/lib/api/risk';
import { useAuth } from '@/components/providers/AuthProvider';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertTriangle, ShieldAlert, ListTodo, ShieldCheck,
  Activity, Brain, TrendingUp, CheckSquare, FilePlus,
  RefreshCw, BarChart3, Download, DatabaseZap
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { SifTrendChart } from '@/components/dashboard/SifTrendChart';
import { HazardBarChart } from '@/components/dashboard/HazardBarChart';
import { LsrDonutChart } from '@/components/dashboard/LsrDonutChart';
import { SiteComparisonChart } from '@/components/dashboard/SiteComparisonChart';
import { DatasetUploadDialog } from '@/components/reports/dataset-upload-dialog';
import { format } from 'date-fns';

// ─── Animated KPI Card ─────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    startRef.current = null;
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return count;
}

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'red' | 'amber' | 'blue' | 'emerald';
  href?: string;
  suffix?: string;
  delay?: number;
}

const COLOR_MAP = {
  red:     { bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400',     glow: 'shadow-red-500/10' },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   glow: 'shadow-amber-500/10' },
  blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400',    glow: 'shadow-blue-500/10' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
};

function KpiCard({ label, value, icon, color, href, suffix, delay = 0 }: KpiCardProps) {
  const animated = useCountUp(value);
  const c = COLOR_MAP[color];
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={`bg-slate-900/60 border ${c.border} rounded-2xl p-5 flex flex-col gap-3 shadow-lg ${c.glow} relative overflow-hidden group ${href ? 'cursor-pointer' : ''}`}
    >
      <div className={`absolute -top-4 -right-4 w-20 h-20 ${c.bg} rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />
      <div className="flex items-center justify-between relative z-10">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <span className={`text-[36px] font-bold leading-none ${c.text} tabular-nums`}>
          {animated.toLocaleString()}{suffix}
        </span>
      </div>
    </motion.div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ─── Main Dashboard Page ───────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  
  // RBAC Definitions
  const isManagerOrAdmin = user && ['ADMIN', 'HSE_MANAGER'].includes(user.role);
  const isReviewer = user?.role === 'REVIEWER';
  const isViewer = user?.role === 'VIEWER';
  const isAnalyst = user?.role === 'HSE_ANALYST';

  const canUpload = isManagerOrAdmin;
  const canExport = isManagerOrAdmin;
  const canCreateReport = !isViewer;
  const canSeeActionCenter = !isViewer;

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getSummary,
  });

  const { data: intSummary } = useQuery({
    queryKey: ['interventions-summary'],
    queryFn: interventionsApi.getSummary,
  });

  const { data: precursors } = useQuery({
    queryKey: ['precursors-top'],
    queryFn: () => precursorsApi.list({ limit: 5, sort: 'risk_score' }),
  });

  const { data: recentReports } = useQuery({
    queryKey: ['reports', 'recent'],
    queryFn: () => reportsApi.list({ page: 1, page_size: 5 }),
  });

  const { data: barrierHealth } = useQuery({
    queryKey: ['dashboard-barrier-health'],
    queryFn: () => riskApi.getBarriers({ limit: 5 }),
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // UI Component Blocks for Reordering
  const ActionCenterWidget = (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl p-5 relative overflow-hidden h-full shadow-2xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
      <h3 className="text-[14px] font-semibold text-white mb-4 flex items-center gap-2 relative z-10">
        <Activity className="w-4 h-4 text-emerald-400" /> Action Center
      </h3>
      <div className="grid grid-cols-1 gap-2 relative z-10">
        <Link
          href="/reviews"
          className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-emerald-500/20 transition-colors group"
        >
          <span className="text-[12px] text-slate-300 group-hover:text-white transition-colors">Pending Reviews</span>
          <span className="text-[16px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">{stats?.review_required ?? 0}</span>
        </Link>
        <Link
          href="/reports?risk=high"
          className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
        >
          <span className="text-[12px] text-slate-300 group-hover:text-white transition-colors">High-Risk Reports</span>
          <span className="text-[16px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md">{stats?.high_risk_reports ?? 0}</span>
        </Link>
        <Link
          href="/interventions"
          className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
        >
          <span className="text-[12px] text-slate-300 group-hover:text-white transition-colors">Open Interventions</span>
          <span className="text-[16px] font-bold text-white bg-slate-700/50 px-2 py-0.5 rounded-md">{intSummary?.pending ?? 0}</span>
        </Link>
      </div>
    </div>
  );

  const ChartsRow1 = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-4"
    >
      <div className="lg:col-span-2">
        <SifTrendChart />
      </div>
      <LsrDonutChart />
    </motion.div>
  );

  const ChartsRow2 = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-4"
    >
      <HazardBarChart />
      <SiteComparisonChart />
    </motion.div>
  );

  const DataTablesWidget = (
    <div className="flex flex-col gap-4">
      {/* Precursor Intelligence */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-[14px] font-semibold text-white flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            Precursor Intelligence
          </h3>
          <Link href="/precursors" className="text-[12px] text-slate-500 hover:text-emerald-400 transition-colors flex items-center gap-1">
            View all <span className="text-slate-600">→</span>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/30">
                <th className="px-5 py-2.5 text-[11px] font-medium text-slate-500 uppercase tracking-wide">Activity &amp; Hazard</th>
                <th className="px-5 py-2.5 text-[11px] font-medium text-slate-500 uppercase tracking-wide">Barrier Failure</th>
                <th className="px-5 py-2.5 text-[11px] font-medium text-slate-500 uppercase tracking-wide text-right">Trend</th>
              </tr>
            </thead>
            <tbody>
              {precursors?.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-200">{p.activity}</div>
                    <div className="text-[12px] text-slate-500">{p.hazard}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-400">{p.barrier}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                      p.trend === 'INCREASING'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                    }`}>
                      {p.trend === 'INCREASING' ? '▲' : '▼'} {p.trend}
                    </span>
                  </td>
                </tr>
              ))}
              {!precursors?.length && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-sm text-slate-600">
                    No active precursors detected.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-[14px] font-semibold text-white">Recent Reports</h3>
          <Link href="/reports" className="text-[12px] text-slate-500 hover:text-emerald-400 transition-colors">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/30">
                <th className="px-5 py-2.5 text-[11px] font-medium text-slate-500 uppercase tracking-wide">Report ID</th>
                <th className="px-5 py-2.5 text-[11px] font-medium text-slate-500 uppercase tracking-wide">Location</th>
                <th className="px-5 py-2.5 text-[11px] font-medium text-slate-500 uppercase tracking-wide">Type</th>
                <th className="px-5 py-2.5 text-[11px] font-medium text-slate-500 uppercase tracking-wide text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentReports?.items?.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      href={`/reports/${r.report_id}`}
                      className="font-mono text-[12px] text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
                    >
                      {r.report_id}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-300">{r.location}</td>
                  <td className="px-5 py-3 text-slate-400 capitalize">{r.report_type.replace(/_/g, ' ')}</td>
                  <td className="px-5 py-3 text-[12px] text-slate-500 text-right">
                    {(() => { try { return format(new Date(r.reported_at), 'dd MMM yyyy'); } catch { return r.reported_at; } })()}
                  </td>
                </tr>
              ))}
              {!recentReports?.items?.length && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-600">No recent reports.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const QuickStatsWidget = (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
      <h3 className="text-[14px] font-semibold text-white mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-blue-400" /> Risk Overview
      </h3>
      <div className="space-y-2.5">
        {[
          { label: 'Total Reports', value: (stats?.total_reports ?? 0).toLocaleString() },
          { label: 'Monitored Sites', value: stats?.sites_monitored ?? 0 },
          { label: 'Active Precursors', value: stats?.active_precursors ?? 0 },
          {
            label: 'System SIF Rate',
            value: stats ? `${(stats.sif_rate * 100).toFixed(1)}%` : '–',
            highlight: stats ? stats.sif_rate > 0.3 : false,
          },
          {
            label: 'High Risk Rate',
            value: stats ? `${(stats.high_risk_rate * 100).toFixed(1)}%` : '–',
            highlight: stats ? stats.high_risk_rate > 0.15 : false,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/50 border border-white/5"
          >
            <span className="text-[12px] text-slate-400">{item.label}</span>
            <span className={`text-[13px] font-bold ${(item as any).highlight ? 'text-red-400' : 'text-white'}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const BarrierHealthWidget = (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
      <h3 className="text-[14px] font-semibold text-white mb-4 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400" /> Barrier Health
      </h3>
      <div className="space-y-3.5">
        {(barrierHealth as any[])?.slice(0, 5).map((b: any, i: number) => {
          const pct = Math.min(100, Math.round((b.failed_count / Math.max(b.total_occurrences, 1)) * 100));
          return (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-slate-300 truncate pr-2 flex-1">{b.barrier}</span>
                <span className="text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded shrink-0">
                  {b.failed_count} fails
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: pct > 60 ? '#ef4444' : pct > 30 ? '#f97316' : '#eab308',
                  }}
                />
              </div>
            </div>
          );
        })}
        {!(barrierHealth as any[])?.length && (
          <p className="text-[13px] text-slate-600 text-center py-3">No barrier data.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="text-[22px] font-bold text-white tracking-tight"
          >
            {greeting()}, {user?.full_name?.split(' ')[0] || 'User'}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-[13px] text-slate-500 mt-0.5"
          >
            SIF Sentinel Command Center &mdash; {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex items-center gap-2 flex-wrap"
        >
          <button
            onClick={() => refetchStats()}
            className="h-9 w-9 rounded-xl border border-white/10 bg-slate-900/60 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isManagerOrAdmin && (
            <AlertDialog>
              <AlertDialogTrigger 
                className="h-9 w-9 rounded-xl border border-red-500/20 bg-slate-900/60 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
                title="Reset Database"
              >
                <DatabaseZap className="w-4 h-4" />
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-400">Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    This action cannot be undone. This will permanently delete the entire dataset, 
                    including all reports, precursors, analyses, and corrective actions from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-800 text-white border-white/10 hover:bg-slate-700 hover:text-white">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={async () => {
                      try {
                        await dashboardApi.resetDashboard();
                        window.location.reload();
                      } catch (e) {
                        console.error("Failed to reset dashboard:", e);
                      }
                    }}
                  >
                    Yes, reset everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {canExport && (
            <button
              onClick={async () => {
                const blob = await dashboardApi.exportCsv();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'sif-export.csv'; a.click();
                URL.revokeObjectURL(url);
              }}
              className="h-9 px-3 rounded-xl border border-white/10 bg-slate-900/60 flex items-center gap-2 text-[12px] font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          )}

          {canUpload && <DatasetUploadDialog />}

          {canCreateReport && (
            <Link
              href="/reports/new"
              className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[13px] font-semibold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
            >
              <FilePlus className="w-4 h-4" /> New Report
            </Link>
          )}

          {(isManagerOrAdmin || isReviewer) && (
            <Link
              href="/reviews"
              className="h-9 px-4 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-800 text-[13px] font-medium text-slate-300 flex items-center gap-2 transition-all"
            >
              <CheckSquare className="w-4 h-4" /> Reviews
              {stats?.review_required ? (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {stats.review_required > 9 ? '9+' : stats.review_required}
                </span>
              ) : null}
            </Link>
          )}
        </motion.div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="SIF Potential"
          value={stats?.total_sif_reports ?? 0}
          icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
          color="amber"
          href={isViewer ? undefined : "/reports?sif=true"}
          delay={0}
        />
        <KpiCard
          label="High / Critical Risk"
          value={stats?.high_risk_reports ?? 0}
          icon={<ShieldAlert className="w-4 h-4 text-red-400" />}
          color="red"
          href={isViewer ? undefined : "/reports?risk=high"}
          delay={0.08}
        />
        <KpiCard
          label="Pending Reviews"
          value={stats?.review_required ?? 0}
          icon={<ListTodo className="w-4 h-4 text-blue-400" />}
          color="blue"
          href={isViewer ? undefined : "/reviews"}
          delay={0.16}
        />
        <KpiCard
          label="Active Interventions"
          value={intSummary?.pending ?? 0}
          icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
          color="emerald"
          href={isViewer ? undefined : "/interventions"}
          delay={0.24}
        />
      </div>

      {/* ── Dynamic Layout based on Role ────────────────────────────── */}
      
      {isReviewer ? (
        // REVIEWER LAYOUT: Prioritize Action Center at the top
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            <div className="lg:col-span-1 h-full">
              {ActionCenterWidget}
            </div>
            <div className="lg:col-span-2">
              <SifTrendChart />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            <div className="lg:col-span-1 flex flex-col gap-4">
              {QuickStatsWidget}
              {BarrierHealthWidget}
            </div>
            <div className="lg:col-span-2">
              {DataTablesWidget}
            </div>
          </motion.div>
          {ChartsRow2}
        </>
      ) : (
        // STANDARD LAYOUT (Admin, Manager, Analyst, Viewer)
        <>
          {ChartsRow1}
          {ChartsRow2}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            <div className="lg:col-span-2">
              {DataTablesWidget}
            </div>
            <div className="flex flex-col gap-4">
              {QuickStatsWidget}
              {BarrierHealthWidget}
              {canSeeActionCenter && ActionCenterWidget}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
