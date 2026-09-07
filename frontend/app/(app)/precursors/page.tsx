'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { precursorsApi } from '@/lib/api/precursors';
import { ErrorState, EmptyState, Skeleton } from '@/components/ui/states';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from '@/components/ui/toast';
import { PriorityBadge, RiskLevelBadge } from '@/components/ui/status-badges';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Activity, TrendingUp, Search, ArrowRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function PrecursorsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');

  const rebuildMut = useMutation({
    mutationFn: () => precursorsApi.rebuild(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['precursors'] });
      toast.add({ title: 'Rebuild initiated', description: 'Precursor patterns are being re-analyzed.', type: 'success' });
    },
    onError: () => toast.add({ title: 'Rebuild failed', type: 'error' }),
  });

  const precursorsQ = useQuery({
    queryKey: ['precursors', 'list'],
    queryFn: () => precursorsApi.list({ limit: 100, sort: 'risk_score' }),
  });

  const filtered = (precursorsQ.data ?? []).filter((p) => {
    const matchesSearch = !search || 
      p.activity.toLowerCase().includes(search.toLowerCase()) || 
      p.hazard.toLowerCase().includes(search.toLowerCase()) ||
      p.barrier.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = !priority || p.priority.toUpperCase() === priority.toUpperCase();
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Precursor Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Recurring hazard patterns ranked by risk score — leading indicators of Serious Injury and Fatality events
          </p>
        </div>
        {user && ['ADMIN', 'HSE_ANALYST'].includes(user.role) && (
          <Button 
            onClick={() => rebuildMut.mutate()} 
            disabled={rebuildMut.isPending}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", rebuildMut.isPending && "animate-spin")} />
            {rebuildMut.isPending ? 'Rebuilding...' : 'Rebuild Patterns'}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by activity, hazard, or barrier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
            <Button
              key={p || 'all'}
              variant={priority === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPriority(p)}
            >
              {p || 'All'}
            </Button>
          ))}
        </div>
      </div>

      {/* Results */}
      {precursorsQ.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      )}

      {precursorsQ.isError && (
        <ErrorState title="Could not load precursors" onRetry={precursorsQ.refetch} />
      )}

      {precursorsQ.data && filtered.length === 0 && (
        <EmptyState
          title="No precursor patterns found"
          description="No recurring hazard patterns match your filters, or no patterns have been detected yet."
          icon={<Activity className="h-7 w-7" />}
        />
      )}

      {filtered.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{filtered.length} pattern{filtered.length !== 1 ? 's' : ''} found</p>
          {filtered.map((p) => (
            <div
              key={p.id}
              className="glass-card p-5 cursor-pointer hover:bg-muted/10 transition-colors"
              onClick={() => router.push(`/precursors/${p.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && router.push(`/precursors/${p.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <PriorityBadge priority={p.priority} />
                    <span className="text-xs text-muted-foreground">Risk Score: <strong className="text-foreground">{p.risk_score.toFixed(0)}</strong></span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{p.occurrence_count} occurrences</span>
                    {p.sif_count > 0 && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="flex items-center gap-1 text-xs text-destructive font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          {p.sif_count} SIF
                        </span>
                      </>
                    )}
                    {p.trend === 'INCREASING' && (
                      <span className="flex items-center gap-1 text-xs text-warning font-medium">
                        <TrendingUp className="h-3 w-3" /> Increasing
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Activity</p>
                      <p className="text-sm text-foreground font-medium truncate">{p.activity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Hazard</p>
                      <p className="text-sm text-foreground truncate">{p.hazard}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Barrier</p>
                      <p className="text-sm text-foreground truncate">{p.barrier}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.why_it_matters}</p>
                  {p.last_seen && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Last seen: {(() => { try { return format(new Date(p.last_seen), 'dd MMM yyyy'); } catch { return p.last_seen; } })()}
                      {' '}· Across {p.site_count} site{p.site_count !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <RiskLevelBadge level={p.priority} />
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
