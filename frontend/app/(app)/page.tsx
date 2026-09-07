'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  FileText, ShieldAlert, AlertTriangle, Clock, Activity, Building2, TrendingUp
} from 'lucide-react';
import { dashboardApi } from '@/lib/api/dashboard';
import { ErrorState, CardSkeleton, Skeleton } from '@/components/ui/states';
import { format } from 'date-fns';

// ─── Types for the custom tooltip ────────────────────────────────

interface TooltipPayload {
  name: string;
  value: number | string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

// ─── KPI Card ─────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color?: 'default' | 'destructive' | 'warning' | 'success' | 'primary';
  loading?: boolean;
}

function KpiCard({ label, value, sub, icon: Icon, color = 'default', loading }: KpiCardProps) {
  const colorMap = {
    default: 'text-foreground',
    destructive: 'text-destructive',
    warning: 'text-warning',
    success: 'text-success',
    primary: 'text-primary',
  };
  const iconBgMap = {
    default: 'bg-muted/50 border-border',
    destructive: 'bg-destructive/10 border-destructive/20',
    warning: 'bg-warning/10 border-warning/20',
    success: 'bg-success/10 border-success/20',
    primary: 'bg-primary/10 border-primary/20',
  };

  if (loading) return <CardSkeleton />;

  return (
    <div className="glass-card p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${iconBgMap[color]}`}>
          <Icon className={`h-4 w-4 ${colorMap[color]}`} />
        </div>
      </div>
      <span className={`text-3xl font-bold ${colorMap[color]}`}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-xl p-3 text-sm">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

const CHART_COLORS = ['#e25c22', '#22c55e', '#f59e0b', '#ef4444', '#60a5fa'];

// ─── Dashboard Page ───────────────────────────────────────────────

export default function DashboardPage() {
  const summaryQ = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: dashboardApi.getSummary,
  });

  const trendQ = useQuery({
    queryKey: ['dashboard', 'sif-trend', '30d'],
    queryFn: () => dashboardApi.getSifTrend('30d'),
  });

  const lsrQ = useQuery({
    queryKey: ['dashboard', 'lsr-distribution'],
    queryFn: dashboardApi.getLsrDistribution,
  });

  const activityQ = useQuery({
    queryKey: ['dashboard', 'activity-distribution'],
    queryFn: dashboardApi.getActivityDistribution,
  });

  const barrierQ = useQuery({
    queryKey: ['dashboard', 'barrier-failures', '30d'],
    queryFn: () => dashboardApi.getBarrierFailures('30d'),
  });

  const siteQ = useQuery({
    queryKey: ['dashboard', 'site-comparison'],
    queryFn: dashboardApi.getSiteComparison,
  });

  const s = summaryQ.data;

  const trendData = (trendQ.data ?? []).map((p) => ({
    ...p,
    date: (() => { try { return format(new Date(p.date), 'MMM d'); } catch { return p.date; } })(),
  }));

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Safety Intelligence Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Organization-wide safety signal overview — data from backend analytics</p>
      </div>

      {summaryQ.isError && (
        <ErrorState
          title="Dashboard unavailable"
          message="Could not load dashboard summary. Check that the backend is running."
          onRetry={summaryQ.refetch}
        />
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Reports"
          value={s?.total_reports ?? '—'}
          icon={FileText}
          loading={summaryQ.isLoading}
          color="default"
        />
        <KpiCard
          label="SIF Reports"
          value={s?.total_sif_reports ?? '—'}
          sub={s ? `${(s.sif_rate * 100).toFixed(1)}% SIF rate` : undefined}
          icon={ShieldAlert}
          color="warning"
          loading={summaryQ.isLoading}
        />
        <KpiCard
          label="High Risk Reports"
          value={s?.high_risk_reports ?? '—'}
          sub={s ? `${(s.high_risk_rate * 100).toFixed(1)}% of total` : undefined}
          icon={AlertTriangle}
          color="destructive"
          loading={summaryQ.isLoading}
        />
        <KpiCard
          label="Pending Review"
          value={s?.review_required ?? '—'}
          icon={Clock}
          color="primary"
          loading={summaryQ.isLoading}
        />
        <KpiCard
          label="Active Precursors"
          value={s?.active_precursors ?? '—'}
          icon={Activity}
          color="warning"
          loading={summaryQ.isLoading}
        />
        <KpiCard
          label="Sites Monitored"
          value={s?.sites_monitored ?? '—'}
          icon={Building2}
          loading={summaryQ.isLoading}
        />
      </div>

      {/* SIF Trend Chart */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-foreground">SIF Signal Trend — Last 30 Days</h2>
            <p className="text-xs text-muted-foreground">Daily SIF-classified reports vs total reports</p>
          </div>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </div>
        {trendQ.isLoading && <Skeleton className="h-72 w-full" />}
        {trendQ.isError && <ErrorState title="Trend unavailable" onRetry={trendQ.refetch} className="py-8" />}
        {trendQ.data && trendData.length === 0 && (
          <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
            No trend data available yet. Submit reports to begin tracking.
          </div>
        )}
        {trendQ.data && trendData.length > 0 && (
          <ResponsiveContainer width="100%" height={288}>
            <AreaChart data={trendData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="sifGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e25c22" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#e25c22" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="total_reports" name="Total Reports" stroke="#60a5fa" fill="url(#totalGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="sif_reports" name="SIF Reports" stroke="#e25c22" fill="url(#sifGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* LSR + Activity Distribution Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* LSR Distribution */}
        <div className="glass-card p-6">
          <h2 className="font-semibold text-foreground mb-1">Life-Saving Rule Distribution</h2>
          <p className="text-xs text-muted-foreground mb-4">Reports classified by LSR trigger</p>
          {lsrQ.isLoading && <Skeleton className="h-64 w-full" />}
          {lsrQ.isError && <ErrorState title="LSR data unavailable" onRetry={lsrQ.refetch} className="py-6" />}
          {lsrQ.data && lsrQ.data.length === 0 && (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No LSR data yet.</div>
          )}
          {lsrQ.data && lsrQ.data.length > 0 && (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={lsrQ.data.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} width={120} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Reports" fill="#e25c22" radius={[0, 4, 4, 0]} />
                <Bar dataKey="sif_count" name="SIF Reports" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Activity Distribution Pie */}
        <div className="glass-card p-6">
          <h2 className="font-semibold text-foreground mb-1">Activity Distribution</h2>
          <p className="text-xs text-muted-foreground mb-4">Report distribution by activity category</p>
          {activityQ.isLoading && <Skeleton className="h-64 w-full" />}
          {activityQ.isError && <ErrorState title="Activity data unavailable" onRetry={activityQ.refetch} className="py-6" />}
          {activityQ.data && activityQ.data.length === 0 && (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No activity data yet.</div>
          )}
          {activityQ.data && activityQ.data.length > 0 && (
            <ResponsiveContainer width="100%" height={256}>
              <PieChart>
                <Pie
                  data={activityQ.data.slice(0, 6)}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {activityQ.data.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Barrier Failures + Site Comparison */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Barrier Failures Trend */}
        <div className="glass-card p-6">
          <h2 className="font-semibold text-foreground mb-1">Barrier Failure Signals — 30 Days</h2>
          <p className="text-xs text-muted-foreground mb-4">Daily count of detected barrier failures</p>
          {barrierQ.isLoading && <Skeleton className="h-56 w-full" />}
          {barrierQ.isError && <ErrorState title="Barrier data unavailable" onRetry={barrierQ.refetch} className="py-6" />}
          {barrierQ.data && barrierQ.data.length === 0 && (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No barrier failure data yet.</div>
          )}
          {barrierQ.data && barrierQ.data.length > 0 && (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={barrierQ.data.map((p) => ({
                ...p,
                date: (() => { try { return format(new Date(p.date), 'MMM d'); } catch { return p.date; } })(),
              }))} margin={{ left: -16, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="failed_count" name="Barrier Failures" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Site Comparison */}
        <div className="glass-card p-6">
          <h2 className="font-semibold text-foreground mb-1">Site Comparison</h2>
          <p className="text-xs text-muted-foreground mb-4">Report and SIF signal count by site</p>
          {siteQ.isLoading && <Skeleton className="h-56 w-full" />}
          {siteQ.isError && <ErrorState title="Site data unavailable" onRetry={siteQ.refetch} className="py-6" />}
          {siteQ.data && siteQ.data.length === 0 && (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No site data yet.</div>
          )}
          {siteQ.data && siteQ.data.length > 0 && (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={siteQ.data.slice(0, 8)} margin={{ left: -16, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="count" name="Reports" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sif_count" name="SIF" fill="#e25c22" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
