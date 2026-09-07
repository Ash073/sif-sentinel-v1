'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { riskApi } from '@/lib/api/risk';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { RiskLevelBadge } from '@/components/ui/status-badges';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Shield, Building2, Activity, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type RiskTab = 'sites' | 'activities' | 'hazards' | 'barriers';

const RISK_COLOR: Record<string, string> = {
  HIGH: '#ef4444',
  CRITICAL: '#dc2626',
  MEDIUM: '#f59e0b',
  LOW: '#22c55e',
};

// ─── Expandable Row ───────────────────────────────────────────────

interface RiskRowProps {
  name: string;
  riskScore: number;
  riskLevel: string;
  explanation: string;
  sifCount: number;
  reportCount: number;
  extra?: React.ReactNode;
}

function RiskRow({ name, riskScore, riskLevel, explanation, sifCount, reportCount, extra }: RiskRowProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-b border-border/50 last:border-b-0">
      <div
        className="flex items-center justify-between px-4 py-3 hover:bg-muted/10 cursor-pointer transition-colors"
        onClick={() => setExpanded((e) => !e)}
        role="button"
        aria-expanded={expanded}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded((ex) => !ex)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-medium text-sm text-foreground truncate">{name}</span>
          {sifCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-destructive font-medium">
              <AlertTriangle className="h-3 w-3" />{sifCount} SIF
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="text-xs text-muted-foreground">{reportCount} reports</span>
          <span className="text-sm font-bold text-foreground">{riskScore.toFixed(1)}</span>
          <RiskLevelBadge level={riskLevel} />
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 bg-muted/10 space-y-2">
          <p className="text-sm text-muted-foreground leading-relaxed">{explanation}</p>
          {extra}
        </div>
      )}
    </div>
  );
}

export default function RiskPage() {
  const [tab, setTab] = useState<RiskTab>('sites');

  const sitesQ = useQuery({ queryKey: ['risk', 'sites'], queryFn: () => riskApi.getSites({ limit: 30 }), enabled: tab === 'sites' });
  const activitiesQ = useQuery({ queryKey: ['risk', 'activities'], queryFn: () => riskApi.getActivities({ limit: 30 }), enabled: tab === 'activities' });
  const hazardsQ = useQuery({ queryKey: ['risk', 'hazards'], queryFn: () => riskApi.getHazards({ limit: 30 }), enabled: tab === 'hazards' });
  const barriersQ = useQuery({ queryKey: ['risk', 'barriers'], queryFn: () => riskApi.getBarriers({ limit: 30 }), enabled: tab === 'barriers' });

  const TABS = [
    { id: 'sites' as RiskTab, label: 'Sites', icon: Building2 },
    { id: 'activities' as RiskTab, label: 'Activities', icon: Activity },
    { id: 'hazards' as RiskTab, label: 'Hazards', icon: AlertTriangle },
    { id: 'barriers' as RiskTab, label: 'Barriers', icon: Shield },
  ];

  // Resolve current data
  const isLoading = tab === 'sites' ? sitesQ.isLoading : tab === 'activities' ? activitiesQ.isLoading : tab === 'hazards' ? hazardsQ.isLoading : barriersQ.isLoading;
  const isError = tab === 'sites' ? sitesQ.isError : tab === 'activities' ? activitiesQ.isError : tab === 'hazards' ? hazardsQ.isError : barriersQ.isError;
  const refetch = tab === 'sites' ? sitesQ.refetch : tab === 'activities' ? activitiesQ.refetch : tab === 'hazards' ? hazardsQ.refetch : barriersQ.refetch;

  const chartData = tab === 'sites'
    ? (sitesQ.data ?? []).slice(0, 10).map((r) => ({ name: r.name.slice(0, 15), score: r.risk_score, level: r.risk_level }))
    : tab === 'activities'
    ? (activitiesQ.data ?? []).slice(0, 10).map((r) => ({ name: r.name.slice(0, 20), score: r.risk_score, level: r.risk_level }))
    : tab === 'hazards'
    ? (hazardsQ.data ?? []).slice(0, 10).map((r) => ({ name: r.name.slice(0, 20), score: r.risk_score, level: r.risk_level }))
    : (barriersQ.data ?? []).slice(0, 10).map((r) => ({ name: r.barrier.slice(0, 20), score: r.risk_score, level: r.risk_level }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Risk Intelligence
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Real-time risk ranking across sites, activities, hazards, and barrier controls — derived from actual analyzed report data
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant="ghost"
            onClick={() => setTab(id)}
            className={cn(
              'gap-2 rounded-b-none border-b-2 transition-colors',
              tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="font-semibold text-foreground mb-4">Risk Scores — Top {chartData.length}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => active && payload?.length ? (
                  <div className="bg-card border border-border rounded-lg shadow-xl p-3 text-sm">
                    <p className="font-medium">{label}</p>
                    <p className="text-primary">Score: <strong>{(payload[0]?.value as number)?.toFixed(1)}</strong></p>
                  </div>
                ) : null}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {chartData.map((item, i) => (
                  <Cell key={i} fill={RISK_COLOR[item.level?.toUpperCase()] ?? '#e25c22'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* List */}
      <div className="glass-card overflow-hidden">
        {isLoading && <div className="p-6 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
        {isError && <ErrorState title={`Could not load ${tab} risk data`} onRetry={refetch} />}

        {tab === 'sites' && !sitesQ.isLoading && (sitesQ.data ?? []).map((r) => (
          <RiskRow key={r.site_id} name={r.name} riskScore={r.risk_score} riskLevel={r.risk_level} explanation={r.explanation}
            sifCount={r.sif_count} reportCount={r.report_count}
            extra={
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div><p className="text-xs text-muted-foreground">Total Reports</p><p className="text-sm font-semibold">{r.total_reports}</p></div>
                <div><p className="text-xs text-muted-foreground">SIF Rate</p><p className="text-sm font-semibold">{(r.sif_rate * 100).toFixed(1)}%</p></div>
                <div><p className="text-xs text-muted-foreground">Active Precursors</p><p className="text-sm font-semibold">{r.active_precursor_patterns}</p></div>
              </div>
            }
          />
        ))}

        {tab === 'activities' && !activitiesQ.isLoading && (activitiesQ.data ?? []).map((r, i) => (
          <RiskRow key={i} name={r.name} riskScore={r.risk_score} riskLevel={r.risk_level} explanation={r.explanation}
            sifCount={r.sif_count} reportCount={r.report_count} />
        ))}

        {tab === 'hazards' && !hazardsQ.isLoading && (hazardsQ.data ?? []).map((r, i) => (
          <RiskRow key={i} name={r.name} riskScore={r.risk_score} riskLevel={r.risk_level} explanation={r.explanation}
            sifCount={r.sif_count} reportCount={r.report_count} />
        ))}

        {tab === 'barriers' && !barriersQ.isLoading && (barriersQ.data ?? []).map((b, i) => (
          <div key={i} className="border-b border-border/50 last:border-b-0 px-4 py-3 flex items-center justify-between hover:bg-muted/10 transition-colors">
            <div className="min-w-0">
              <p className="font-medium text-sm text-foreground truncate">{b.barrier}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {b.failed_count}/{b.total_occurrences} failures · {(b.failure_rate * 100).toFixed(1)}% failure rate · {b.associated_sif_count} SIF
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-3">
              <span className="text-sm font-bold text-foreground">{b.risk_score.toFixed(1)}</span>
              <RiskLevelBadge level={b.risk_level} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
