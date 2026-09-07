'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { precursorsApi } from '@/lib/api/precursors';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { PriorityBadge, RiskLevelBadge } from '@/components/ui/status-badges';
import Link from 'next/link';
import { ArrowLeft, Activity, AlertTriangle, TrendingUp, Building2, Users, FileText, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function PrecursorDetailPage() {
  const { id } = useParams<{ id: string }>();

  const detailQ = useQuery({
    queryKey: ['precursors', id],
    queryFn: () => precursorsApi.get(id),
    enabled: !!id,
  });

  const graphQ = useQuery({
    queryKey: ['precursors', id, 'graph'],
    queryFn: () => precursorsApi.getGraph(id),
    enabled: !!id,
  });

  const p = detailQ.data;

  if (detailQ.isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }
  if (detailQ.isError) {
    return <ErrorState title="Precursor not found" onRetry={detailQ.refetch} />;
  }
  if (!p) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link
          href="/precursors"
          className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Precursor Detail</h1>
          <p className="text-sm text-muted-foreground">{p.activity} — {p.hazard}</p>
        </div>
      </div>

      {/* Overview */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <PriorityBadge priority={p.priority} />
          <RiskLevelBadge level={p.priority} />
          {p.trend === 'INCREASING' && (
            <span className="flex items-center gap-1 text-xs text-warning font-medium border border-warning/30 bg-warning/10 rounded-md px-2 py-0.5">
              <TrendingUp className="h-3 w-3" />Increasing Trend
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Risk Score</p>
            <p className="text-2xl font-bold text-foreground">{p.risk_score.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Occurrences</p>
            <p className="text-2xl font-bold text-foreground">{p.occurrence_count}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">SIF Events</p>
            <p className={cn('text-2xl font-bold', p.sif_count > 0 ? 'text-destructive' : 'text-success')}>
              {p.sif_count}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">SIF Density</p>
            <p className="text-2xl font-bold text-foreground">{(p.sif_density * 100).toFixed(1)}%</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-border/50">
          <div>
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Activity className="h-3 w-3" />Activity</p>
            <p className="text-sm text-foreground font-medium mt-0.5">{p.activity}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Hazard</p>
            <p className="text-sm text-foreground mt-0.5">{p.hazard}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Barrier</p>
            <p className="text-sm text-foreground mt-0.5">{p.barrier}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Failure Type</p>
            <p className="text-sm text-foreground mt-0.5">{p.failure_type}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">First Seen</p>
            <p className="text-sm text-foreground mt-0.5">
              {p.first_seen ? (() => { try { return format(new Date(p.first_seen), 'dd MMM yyyy'); } catch { return p.first_seen; } })() : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Last Seen</p>
            <p className="text-sm text-foreground mt-0.5">
              {p.last_seen ? (() => { try { return format(new Date(p.last_seen), 'dd MMM yyyy'); } catch { return p.last_seen; } })() : '—'}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground font-medium mb-1">Why It Matters</p>
          <p className="text-sm text-foreground leading-relaxed">{p.why_it_matters}</p>
        </div>
      </div>

      {/* Sites + Departments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6">
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-primary" />
            Affected Sites ({p.site_count})
          </h2>
          <div className="flex flex-wrap gap-2">
            {p.sites.map((site) => (
              <span key={site} className="px-2.5 py-1 rounded-md text-xs border border-border bg-muted/30 text-foreground">
                {site}
              </span>
            ))}
            {p.sites.length === 0 && <span className="text-sm text-muted-foreground">No site data</span>}
          </div>
        </div>
        <div className="glass-card p-6">
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            Affected Departments ({p.department_count})
          </h2>
          <div className="flex flex-wrap gap-2">
            {p.departments.map((dept) => (
              <span key={dept} className="px-2.5 py-1 rounded-md text-xs border border-border bg-muted/30 text-foreground">
                {dept}
              </span>
            ))}
            {p.departments.length === 0 && <span className="text-sm text-muted-foreground">No department data</span>}
          </div>
        </div>
      </div>

      {/* Graph Representation */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <Share2 className="h-4 w-4 text-primary" />
          Relationship Graph
        </h2>
        
        {graphQ.isLoading && <div className="p-4 text-sm text-muted-foreground">Loading graph...</div>}
        {graphQ.isError && <div className="p-4 text-sm text-destructive">Failed to load graph</div>}
        
        {graphQ.data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted/20 border border-border/50 rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Nodes ({graphQ.data.nodes.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {graphQ.data.nodes.map(n => (
                    <div key={n.id} className="text-xs px-2 py-1 bg-background border border-border rounded shadow-sm">
                      <span className="font-semibold text-muted-foreground mr-1 capitalize">{n.type.toLowerCase()}:</span>
                      {n.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-muted/20 border border-border/50 rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Edges ({graphQ.data.edges.length})</h3>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-2">
                  {graphQ.data.edges.map((e, i) => {
                    const sourceNode = graphQ.data.nodes.find(n => n.id === e.source);
                    const targetNode = graphQ.data.nodes.find(n => n.id === e.target);
                    return (
                      <div key={i} className="text-xs flex items-center gap-1.5 text-muted-foreground">
                        <span className="font-medium text-foreground truncate max-w-[100px]">{sourceNode?.label || e.source}</span>
                        <span className="shrink-0 text-orange-500/80">→</span>
                        <span className="italic">{e.label}</span>
                        <span className="shrink-0 text-orange-500/80">→</span>
                        <span className="font-medium text-foreground truncate max-w-[100px]">{targetNode?.label || e.target}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded border border-border">
              Visual graph rendering requires a library like React Flow. This is a text representation of the precursor&apos;s connection to activities, hazards, barriers, and sites.
            </div>
          </div>
        )}
      </div>

      {/* Representative Reports */}
      {p.representative_reports.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-primary" />
            Representative Reports
          </h2>
          <div className="space-y-2">
            {p.representative_reports.map((rep) => (
              <div key={rep.report_id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/50 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-primary">{rep.report_id}</span>
                  <span className="text-muted-foreground">{rep.site_name}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{rep.department}</span>
                </div>
                <div className="flex items-center gap-3">
                  {rep.sif_level && (
                    <span className="text-xs text-warning font-medium">{rep.sif_level}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {(() => { try { return format(new Date(rep.reported_at), 'dd MMM yyyy'); } catch { return rep.reported_at; } })()}
                  </span>
                  <Link
                    href={`/reports/${rep.report_id}`}
                    className="inline-flex items-center h-7 px-2.5 rounded-lg text-xs font-medium border border-border hover:bg-muted/50 transition-colors text-foreground"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
