'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { reportsApi } from '@/lib/api/reports';
import { ErrorState, Skeleton } from '@/components/ui/states';
import {
  ReportStatusBadge, SIFLevelBadge, BarrierStatusBadge, RiskLevelBadge
} from '@/components/ui/status-badges';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/toast';
import {
  ArrowLeft, Play, Shield, AlertTriangle, BookOpen, BarChart3, CheckCircle, Info, Cpu
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { AnalysisResponse } from '@/types/api';
import { AxiosError } from 'axios';
import type { ApiErrorBody } from '@/types/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';

// ─── Evidence Section ─────────────────────────────────────────────

function EvidenceSection({ analysis }: { analysis: AnalysisResponse }) {
  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        Evidence — Why the Model Reached This Result
      </h3>

      {analysis.evidence_span && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-xs font-medium text-primary mb-1">Key Evidence Span</p>
          <p className="text-sm text-foreground italic">&ldquo;{analysis.evidence_span}&rdquo;</p>
        </div>
      )}

      {analysis.evidence_sentences.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Evidence Sentences</p>
          {analysis.evidence_sentences.map((s, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <span className="text-primary font-mono text-xs pt-0.5">{i + 1}.</span>
              <p className="text-foreground">{s}</p>
            </div>
          ))}
        </div>
      )}

      {analysis.evidence_terms.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Evidence Terms</p>
          <div className="flex flex-wrap gap-2">
            {analysis.evidence_terms.map((t, i) => (
              <span key={i} className="px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded text-xs font-mono">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Analysis Section ─────────────────────────────────────────────

function AnalysisSection({ analysis }: { analysis: AnalysisResponse }) {
  const isLlmAssisted = analysis.llm_used;

  return (
    <div className="space-y-4">
      {/* Safety Outcome Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Authoritative Safety Intelligence
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-md px-2 py-1">
            <CheckCircle className="h-3 w-3 text-success" />
            Deterministic — Backend Authoritative
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">SIF Level</p>
            <SIFLevelBadge level={analysis.sif_level} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">SIF Potential</p>
            <span className={cn(
              'text-sm font-semibold',
              analysis.sif_potential ? 'text-destructive' : 'text-success'
            )}>
              {analysis.sif_potential ? 'YES — SIF Potential Detected' : 'No SIF Potential'}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Barrier Status</p>
            <BarrierStatusBadge status={analysis.barrier_status} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Review Required</p>
            <span className={cn(
              'text-sm font-semibold',
              analysis.review_required ? 'text-warning' : 'text-success'
            )}>
              {analysis.review_required ? 'Yes' : 'No'}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-border/50">
          {analysis.activity && (
            <div>
              <p className="text-xs text-muted-foreground font-medium">Activity</p>
              <p className="text-sm text-foreground mt-0.5">{analysis.activity}</p>
            </div>
          )}
          {analysis.hazard && (
            <div>
              <p className="text-xs text-muted-foreground font-medium">Hazard</p>
              <p className="text-sm text-foreground mt-0.5">{analysis.hazard}</p>
            </div>
          )}
          {analysis.barrier && (
            <div>
              <p className="text-xs text-muted-foreground font-medium">Barrier / Control</p>
              <p className="text-sm text-foreground mt-0.5">{analysis.barrier}</p>
            </div>
          )}
          {analysis.life_saving_rule && (
            <div>
              <p className="text-xs text-muted-foreground font-medium">Life-Saving Rule</p>
              <p className="text-sm text-primary font-medium mt-0.5">{analysis.life_saving_rule}</p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground font-medium mb-2">Model Explanation</p>
          <p className="text-sm text-foreground leading-relaxed">{analysis.explanation}</p>
        </div>
      </div>

      {/* Confidence Metrics */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-primary" />
          Confidence & Model Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Model Probability</p>
            <p className="text-lg font-bold text-foreground mt-0.5">
              {(analysis.model_probability * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Overall Confidence</p>
            <p className="text-lg font-bold text-foreground mt-0.5">
              {(analysis.overall_confidence * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Rule Confidence</p>
            <p className="text-lg font-bold text-foreground mt-0.5">
              {(analysis.rule_confidence * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Model Version</p>
            <p className="text-sm font-mono text-muted-foreground mt-0.5">{analysis.model_version}</p>
          </div>
        </div>
      </div>

      {/* Risk */}
      {analysis.risk && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Risk Assessment
          </h3>
          <div className="flex items-center gap-6 mb-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Risk Score</p>
              <p className="text-2xl font-bold text-foreground">{analysis.risk.score}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Priority</p>
              <RiskLevelBadge level={analysis.risk.priority} />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Risk Components</p>
            {analysis.risk.components.map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg text-sm">
                <span className="font-semibold text-foreground min-w-24">{c.name}</span>
                <span className="text-warning font-bold w-8">{c.score}</span>
                <span className="text-muted-foreground">{c.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence */}
      <EvidenceSection analysis={analysis} />

      {/* LLM Reviewer Assistance — clearly labeled */}
      {(analysis.reviewer_summary || isLlmAssisted) && (
        <div className="glass-card p-6 border-l-4 border-l-blue-500/50">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="h-4 w-4 text-blue-400" />
            <h3 className="font-semibold text-foreground">Reviewer Assistance</h3>
            <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
              <Info className="h-3 w-3" />
              AI-Generated — Not Authoritative
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            The following is generated by the LLM reviewer assistance module. It is advisory only.
            All authoritative safety classifications are determined by the deterministic backend model above.
          </p>
          {analysis.reviewer_summary ? (
            <p className="text-sm text-foreground leading-relaxed">{analysis.reviewer_summary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">LLM reviewer assistance was attempted but no summary was generated.</p>
          )}
          {analysis.llm_provider && (
            <p className="text-xs text-muted-foreground mt-2">Provider: {analysis.llm_provider} · Model: {analysis.llm_model_used}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Report Detail Page ───────────────────────────────────────────

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const reportQ = useQuery({
    queryKey: ['reports', id],
    queryFn: () => reportsApi.get(id),
    enabled: !!id,
  });

  const analyzeMutation = useMutation({
    mutationFn: () => reportsApi.analyze(id),
    onSuccess: (data) => {
      setAnalysis(data);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.add({ title: 'Analysis complete', description: 'SIF analysis has been run and persisted.', type: 'success' });
    },
    onError: (error: AxiosError<ApiErrorBody>) => {
      const msg = error.response?.data?.error?.message ?? 'Failed to run analysis';
      toast.add({ title: 'Analysis failed', description: msg, type: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => reportsApi.delete(id),
    onSuccess: () => {
      toast.add({ title: 'Report deleted', type: 'success' });
      router.push('/reports');
    },
    onError: () => {
      toast.add({ title: 'Delete failed', type: 'error' });
    },
  });

  const report = reportQ.data;
  const canAnalyze = user && ['ADMIN', 'HSE_MANAGER', 'HSE_ANALYST', 'REVIEWER'].includes(user.role);
  const canDelete = user && ['ADMIN', 'HSE_MANAGER'].includes(user.role);

  if (reportQ.isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (reportQ.isError) return (
    <ErrorState
      title="Report not found"
      message="This report does not exist or you do not have permission to view it."
      onRetry={reportQ.refetch}
    />
  );

  if (!report) return null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground font-mono">{report.report_id}</h1>
            <p className="text-sm text-muted-foreground">{report.report_type.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ReportStatusBadge status={report.status} />
          {canAnalyze && (
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              className="gap-2"
              variant={report.status === 'NEW' ? 'default' : 'outline'}
            >
              <Play className="h-4 w-4" />
              {analyzeMutation.isPending ? 'Running...' : 'Run Analysis'}
            </Button>
          )}
          {canDelete && (
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>Delete</Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Report?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete report <strong>{report.report_id}</strong>. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Original Report */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Original Report
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Location</p>
            <p className="text-sm text-foreground">{report.location}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Department</p>
            <p className="text-sm text-foreground">{report.department}</p>
          </div>
          {report.activity && (
            <div>
              <p className="text-xs text-muted-foreground font-medium">Activity</p>
              <p className="text-sm text-foreground">{report.activity}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground font-medium">Source Type</p>
            <p className="text-sm text-foreground capitalize">{report.source_type.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Reported At</p>
            <p className="text-sm text-foreground">
              {(() => { try { return format(new Date(report.reported_at), 'dd MMM yyyy HH:mm'); } catch { return report.reported_at; } })()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Created</p>
            <p className="text-sm text-foreground">
              {(() => { try { return format(new Date(report.created_at), 'dd MMM yyyy HH:mm'); } catch { return report.created_at; } })()}
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-2">Report Narrative</p>
          <div className="p-4 bg-muted/20 rounded-lg text-sm text-foreground leading-relaxed whitespace-pre-wrap border border-border/50">
            {report.report_text}
          </div>
        </div>
      </div>

      {/* Analysis Result */}
      {(analysis || report.status !== 'NEW') && (
        <>
          {analysis ? (
            <AnalysisSection analysis={analysis} />
          ) : (
            <div className="glass-card p-6 flex items-center gap-3 text-muted-foreground">
              <Info className="h-5 w-5" />
              <p className="text-sm">
                This report has been analyzed (Status: <strong>{report.status}</strong>). 
                Run analysis again to view the latest result.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
