'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { rulesApi } from '@/lib/api/rules';
import { ErrorState, Skeleton, EmptyState } from '@/components/ui/states';
import { ShieldCheck, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LifeSavingRule, LSRAnalytics } from '@/types/api';

function RuleAnalyticsPanel({ rule }: { rule: LifeSavingRule }) {
  const analyticsQ = useQuery({
    queryKey: ['rules', rule.code, 'analytics'],
    queryFn: () => rulesApi.getAnalytics(rule.code),
    staleTime: 5 * 60 * 1000,
  });

  if (analyticsQ.isLoading) return <div className="p-4"><Skeleton className="h-20 w-full" /></div>;
  if (analyticsQ.isError) return <p className="p-4 text-sm text-muted-foreground">Analytics unavailable for this rule.</p>;

  const a = analyticsQ.data as LSRAnalytics | undefined;
  if (!a) return null;

  return (
    <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-border/50 bg-muted/10">
      {([
        { label: 'Total Violations', value: a.total_violations ?? '—' },
        { label: 'SIF Violations', value: a.sif_violations ?? '—' },
        { label: 'Violation Rate', value: a.violation_rate != null ? `${(Number(a.violation_rate) * 100).toFixed(1)}%` : '—' },
      ] as { label: string; value: string | number }[]).map(({ label, value }) => (
        <div key={label}>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground mt-0.5">{String(value)}</p>
        </div>
      ))}
      {/* Any additional fields returned by backend */}
      {Object.entries(a)
        .filter(([k]) => !['code', 'name', 'total_violations', 'sif_violations', 'violation_rate'].includes(k))
        .slice(0, 4)
        .map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{String(v)}</p>
          </div>
        ))}
    </div>
  );
}

export default function LifeSavingRulesPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const rulesQ = useQuery({
    queryKey: ['rules'],
    queryFn: rulesApi.list,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Life-Saving Rules</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          IOGP-derived mandatory safety rules with violation analytics
        </p>
      </div>

      {rulesQ.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {rulesQ.isError && (
        <ErrorState
          title="Could not load life-saving rules"
          message="Please check backend connectivity."
          onRetry={rulesQ.refetch}
        />
      )}

      {rulesQ.data && rulesQ.data.length === 0 && (
        <EmptyState
          title="No rules configured"
          description="No Life-Saving Rules have been loaded into the system."
          icon={<ShieldCheck className="h-7 w-7" />}
        />
      )}

      {rulesQ.data && rulesQ.data.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{rulesQ.data.length} rules active</p>
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {rulesQ.data.map((rule) => {
              const isOpen = expanded === rule.code;
              return (
                <div key={rule.code} className="bg-card">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : rule.code)}
                    className={cn(
                      'w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors',
                      isOpen && 'bg-primary/5'
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">{rule.code}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{rule.name}</p>
                    </div>
                    <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', isOpen && 'rotate-90')} />
                  </button>
                  {isOpen && <RuleAnalyticsPanel rule={rule} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-900/10">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Life-Saving Rules are sourced from IOGP standards. Violation counts reflect AI-identified occurrences
          from analyzed reports and are subject to human review. Do not use these figures as the sole basis for regulatory compliance decisions.
        </p>
      </div>
    </div>
  );
}
