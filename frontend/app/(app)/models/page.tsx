'use client';

import { useQuery } from '@tanstack/react-query';
import { modelsApi } from '@/lib/api/models';
import { ErrorState, Skeleton, EmptyState } from '@/components/ui/states';
import { Cpu, CheckCircle, BarChart2, Activity, AlertTriangle } from 'lucide-react';
import type { ModelMetadata } from '@/types/api';
import { format } from 'date-fns';

function MetricRow({ label, value }: { label: string; value: unknown }) {
  const display = typeof value === 'number'
    ? (value < 1 && value > 0 ? `${(value * 100).toFixed(2)}%` : value.toFixed(4))
    : String(value ?? '—');
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground capitalize">{label.replace(/_/g, ' ')}</span>
      <span className="text-sm font-semibold text-foreground tabular-nums">{display}</span>
    </div>
  );
}

function ModelCard({ model }: { model: ModelMetadata }) {
  const metricsQ = useQuery({
    queryKey: ['models', model.model_name, 'metrics'],
    queryFn: () => modelsApi.getMetrics(model.model_name),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <div className="p-5 border-b border-border bg-muted/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Cpu className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-foreground text-lg">{model.model_name}</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground">v{model.model_version}</span>
              {model.model_type && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
                  {String(model.model_type)}
                </span>
              )}
              {model.created_at && (
                <span className="text-xs text-muted-foreground">
                  {(() => { try { return format(new Date(model.created_at), 'dd MMM yyyy'); } catch { return model.created_at; } })()}
                </span>
              )}
            </div>
          </div>
        </div>
        {model.description && (
          <p className="mt-3 text-sm text-muted-foreground">{String(model.description)}</p>
        )}
      </div>

      {/* Metrics */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Evaluation Metrics</h3>
        </div>
        {metricsQ.isLoading && <Skeleton className="h-24 w-full" />}
        {metricsQ.isError && (
          <p className="text-sm text-muted-foreground">Metrics unavailable.</p>
        )}
        {metricsQ.data && Object.keys(metricsQ.data).length === 0 && (
          <p className="text-sm text-muted-foreground">No metrics stored for this model version.</p>
        )}
        {metricsQ.data && Object.keys(metricsQ.data).length > 0 && (
          <div className="divide-y divide-border/50">
            {Object.entries(metricsQ.data).map(([k, v]) => (
              <MetricRow key={k} label={k} value={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackPanel() {
  const feedbackQ = useQuery({
    queryKey: ['models', 'feedback'],
    queryFn: modelsApi.getFeedback,
    staleTime: 5 * 60 * 1000,
  });

  const perfQ = useQuery({
    queryKey: ['models', 'performance'],
    queryFn: modelsApi.getPerformance,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <div className="p-5 border-b border-border bg-muted/20 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Human Review Feedback</h3>
        </div>
        <div className="p-5">
          {feedbackQ.isLoading && <Skeleton className="h-24 w-full" />}
          {feedbackQ.isError && <p className="text-sm text-muted-foreground">Feedback data unavailable.</p>}
          {feedbackQ.data && (
            <div className="divide-y divide-border/50">
              {Object.entries(feedbackQ.data).map(([k, v]) => (
                <MetricRow key={k} label={k} value={v} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <div className="p-5 border-b border-border bg-muted/20 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Offline Performance</h3>
        </div>
        <div className="p-5">
          {perfQ.isLoading && <Skeleton className="h-24 w-full" />}
          {perfQ.isError && <p className="text-sm text-muted-foreground">Performance data unavailable.</p>}
          {perfQ.data && (
            <div className="divide-y divide-border/50">
              {Object.entries(perfQ.data).map(([k, v]) => (
                <MetricRow key={k} label={k} value={v} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ModelsPage() {
  const modelsQ = useQuery({
    queryKey: ['models'],
    queryFn: modelsApi.list,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">ML Model Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Active model metadata, evaluation metrics, and human-review feedback
        </p>
      </div>

      {modelsQ.isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </div>
        </div>
      )}

      {modelsQ.isError && (
        <ErrorState
          title="Could not load models"
          message="Requires HSE_ANALYST, HSE_MANAGER, or ADMIN role."
          onRetry={modelsQ.refetch}
        />
      )}

      {modelsQ.data && modelsQ.data.length === 0 && (
        <EmptyState
          title="No models registered"
          description="No analysis models are currently loaded."
          icon={<Cpu className="h-7 w-7" />}
        />
      )}

      {modelsQ.data && modelsQ.data.length > 0 && (
        <>
          <div className="space-y-4">
            {modelsQ.data.map((model) => (
              <ModelCard key={model.model_name} model={model} />
            ))}
          </div>
          <FeedbackPanel />
        </>
      )}

      <div className="flex items-start gap-2 p-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800/30 dark:bg-blue-900/10">
        <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Model probability</strong> is a raw classifier output. <strong>Overall confidence</strong> incorporates
          additional factors including evidence quality and barrier assessment. <strong>Risk score</strong> is a
          deterministic composite from the risk engine. These are distinct values and must not be interpreted interchangeably.
        </p>
      </div>
    </div>
  );
}
