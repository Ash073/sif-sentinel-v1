'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { reportsApi } from '@/lib/api/reports';
import { ErrorState, Skeleton } from '@/components/ui/states';
import {
  ReportStatusBadge, SIFLevelBadge, BarrierStatusBadge, RiskLevelBadge,
} from '@/components/ui/status-badges';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/toast';
import {
  ArrowLeft, Play, Shield, AlertTriangle, BookOpen, BarChart3,
  CheckCircle, Info, Cpu, Eye, EyeOff, ChevronDown, ChevronUp,
  Zap, Brain, GitBranch, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { AnalysisResponse } from '@/types/api';
import { AxiosError } from 'axios';
import type { ApiErrorBody } from '@/types/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';
import { ExplainabilityChart } from '@/components/reports/explainability-chart';
import { ShapTextHighlighter } from '@/components/reports/ShapTextHighlighter';
import { CausalChainFlow } from '@/components/reports/CausalChainFlow';
import { GeminiNarrativeCard } from '@/components/reports/GeminiNarrativeCard';
import { CounterfactualPanel } from '@/components/reports/CounterfactualPanel';

// ─── Collapsible Section Wrapper ─────────────────────────────────────────────

function CollapseSection({
  title, icon, badge, defaultOpen = true, children,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <span className="flex items-center gap-2 text-[14px] font-semibold text-white">
          {icon} {title} {badge}
        </span>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-500" />
          : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-white/5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">{children}</p>;
}
function Value({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-[13px] text-slate-200', className)}>{children}</p>;
}

// ─── Narrative + SHAP Section ────────────────────────────────────────────────

function NarrativeSection({
  reportText,
  analysis,
}: {
  reportText: string;
  analysis: AnalysisResponse | null;
}) {
  const [showHighlights, setShowHighlights] = useState(true);
  const hasHighlights = analysis && (
    (analysis.explainability_factors?.length ?? 0) > 0 ||
    (analysis.evidence_terms?.length ?? 0) > 0
  );

  return (
    <CollapseSection
      title="Incident Narrative"
      icon={<BookOpen className="w-4 h-4 text-emerald-400" />}
      badge={
        hasHighlights && (
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/25 text-orange-400 font-medium uppercase tracking-wide">
            XAI Active
          </span>
        )
      }
    >
      <div className="space-y-4 pt-2">
        {/* Toggle bar — only shown when analysis available */}
        {hasHighlights && (
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-slate-500">
              Hover over highlighted terms to see SHAP weights.
            </p>
            <button
              onClick={() => setShowHighlights((s) => !s)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-white transition-colors px-2.5 py-1 rounded-lg border border-white/10 hover:border-white/20 bg-slate-900"
            >
              {showHighlights
                ? <><EyeOff className="w-3.5 h-3.5" /> Plain text</>
                : <><Eye className="w-3.5 h-3.5" /> Show highlights</>}
            </button>
          </div>
        )}

        {/* Text rendering */}
        {showHighlights && analysis && hasHighlights ? (
          <ShapTextHighlighter
            text={reportText}
            factors={analysis.explainability_factors ?? []}
            evidenceTerms={analysis.evidence_terms ?? []}
            evidenceSpan={analysis.evidence_span}
          />
        ) : (
          <div className="p-5 bg-slate-950/60 rounded-xl border border-white/5 text-[14px] text-slate-300 leading-8 whitespace-pre-wrap font-mono">
            {reportText}
          </div>
        )}
      </div>
    </CollapseSection>
  );
}

// ─── Safety Intelligence Section ──────────────────────────────────────────────

function SafetyIntelligenceSection({ analysis }: { analysis: AnalysisResponse }) {
  return (
    <CollapseSection
      title="Safety Intelligence"
      icon={<Shield className="w-4 h-4 text-emerald-400" />}
      badge={
        <span className="ml-1 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
          <CheckCircle className="w-3 h-3" /> Deterministic
        </span>
      }
    >
      <div className="space-y-5 pt-2">
        {/* Top row — verdicts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'SIF Level',
              content: <SIFLevelBadge level={analysis.sif_level} />,
            },
            {
              label: 'SIF Potential',
              content: (
                <span className={cn('text-[13px] font-semibold', analysis.sif_potential ? 'text-red-400' : 'text-emerald-400')}>
                  {analysis.sif_potential ? '⚠ YES — SIF Detected' : '✓ None Detected'}
                </span>
              ),
            },
            {
              label: 'Barrier Status',
              content: <BarrierStatusBadge status={analysis.barrier_status} />,
            },
            {
              label: 'Review Required',
              content: (
                <span className={cn('text-[13px] font-semibold', analysis.review_required ? 'text-amber-400' : 'text-emerald-400')}>
                  {analysis.review_required ? 'Yes' : 'No'}
                </span>
              ),
            },
          ].map((item) => (
            <div key={item.label} className="bg-slate-950/50 border border-white/5 rounded-xl p-3 space-y-1.5">
              <Label>{item.label}</Label>
              {item.content}
            </div>
          ))}
        </div>

        {/* Causal chain row */}
        {(analysis.activity || analysis.hazard || analysis.barrier) && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <GitBranch className="w-3 h-3" /> Causal Chain
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {analysis.activity && (
                <>
                  <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[12px] font-medium">
                    🔧 {analysis.activity}
                  </span>
                  <span className="text-slate-700 text-[10px]">→</span>
                </>
              )}
              {analysis.hazard && (
                <>
                  <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[12px] font-medium">
                    ⚡ {analysis.hazard}
                  </span>
                  <span className="text-slate-700 text-[10px]">→</span>
                </>
              )}
              {analysis.barrier && (
                <>
                  <span className={cn(
                    'px-3 py-1.5 rounded-lg text-[12px] font-medium border',
                    analysis.barrier_status === 'FAILED'
                      ? 'bg-red-500/10 border-red-500/20 text-red-300'
                      : analysis.barrier_status === 'EFFECTIVE'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300',
                  )}>
                    🛡 {analysis.barrier}
                  </span>
                  <span className="text-slate-700 text-[10px]">→</span>
                </>
              )}
              <span className={cn(
                'px-3 py-1.5 rounded-lg text-[12px] font-bold border',
                analysis.sif_potential
                  ? 'bg-red-500/20 border-red-500/30 text-red-300'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
              )}>
                {analysis.sif_potential ? '💀 SIF Outcome' : '✓ Controlled'}
              </span>
            </div>
          </div>
        )}

        {/* Life-saving rule */}
        {analysis.life_saving_rule && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
            <Shield className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <Label>Life-Saving Rule Triggered</Label>
              <Value className="text-emerald-300 font-medium">{analysis.life_saving_rule}</Value>
            </div>
          </div>
        )}

        {/* Explanation */}
        <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5">
          <Label>Model Explanation</Label>
          <p className="text-[13px] text-slate-300 leading-relaxed">{analysis.explanation}</p>
        </div>
      </div>
    </CollapseSection>
  );
}

// ─── Confidence Metrics Section ───────────────────────────────────────────────

function ConfidenceSection({ analysis }: { analysis: AnalysisResponse }) {
  const metrics = [
    { label: 'Model Probability', value: (analysis.model_probability * 100).toFixed(1) + '%' },
    { label: 'Overall Confidence', value: (analysis.overall_confidence * 100).toFixed(1) + '%' },
    { label: 'Rule Confidence', value: (analysis.rule_confidence * 100).toFixed(1) + '%' },
    { label: 'Model Version', value: analysis.model_version, mono: true },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {metrics.map((m) => (
        <div key={m.label} className="bg-slate-900/60 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{m.label}</p>
          <p className={cn('text-[20px] font-bold text-white', m.mono && 'text-[13px] font-mono text-slate-400')}>
            {m.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Risk Assessment Section ──────────────────────────────────────────────────

function RiskSection({ analysis }: { analysis: AnalysisResponse }) {
  if (!analysis.risk) return null;
  const maxScore = Math.max(...analysis.risk.components.map((c) => c.score), 1);

  return (
    <CollapseSection
      title="Risk Assessment"
      icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
      badge={
        <span className="ml-1 text-[13px] font-bold text-amber-400 tabular-nums">
          {analysis.risk.score}
        </span>
      }
    >
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-4">
          <div>
            <Label>Risk Score</Label>
            <p className="text-[32px] font-bold text-white tabular-nums leading-none">{analysis.risk.score}</p>
          </div>
          <div>
            <Label>Priority</Label>
            <RiskLevelBadge level={analysis.risk.priority} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Risk Components</Label>
          {analysis.risk.components.map((c, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-slate-300 font-medium">{c.name}</span>
                <span className="font-bold text-amber-400 tabular-nums">{c.score}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: c.score / maxScore }}
                  transition={{ duration: 0.6, delay: i * 0.08 }}
                  className="h-full origin-left rounded-full bg-gradient-to-r from-amber-500 to-red-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">{c.reason}</p>
            </div>
          ))}
        </div>
      </div>
    </CollapseSection>
  );
}

// ─── Causal Chain Section ────────────────────────────────────────────────────

function CausalChainSection({ analysis }: { analysis: AnalysisResponse }) {
  const hasChain = !!(analysis.causal_chains?.length || analysis.safety_graph ||
    analysis.activity || analysis.hazard || analysis.barrier);
  if (!hasChain) return null;
  return (
    <CollapseSection
      title="Causal Chain — Forensic DAG"
      icon={<GitBranch className="w-4 h-4 text-teal-400" />}
      badge={
        <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 font-medium">
          React Flow
        </span>
      }
    >
      <div className="pt-2">
        <CausalChainFlow analysis={analysis} />
        {analysis.reasoning_summary && (
          <div className="mt-3 p-3 rounded-xl bg-slate-950/50 border border-white/5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Reasoning Summary</p>
            <p className="text-[12px] text-slate-400 leading-relaxed">{analysis.reasoning_summary}</p>
          </div>
        )}
      </div>
    </CollapseSection>
  );
}

// ─── SHAP Explainability Section ──────────────────────────────────────────────

function ExplainabilitySection({ analysis }: { analysis: AnalysisResponse }) {
  if (!analysis.explainability_factors?.length) return null;
  return (
    <CollapseSection
      title="SHAP Feature Importance"
      icon={<BarChart3 className="w-4 h-4 text-purple-400" />}
      badge={
        <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-medium">
          XAI
        </span>
      }
    >
      <div className="pt-2">
        <ExplainabilityChart factors={analysis.explainability_factors} />
      </div>
    </CollapseSection>
  );
}

// ─── Gemini Narrative Section ─────────────────────────────────────────────────

// GeminiSection is now replaced by the GeminiNarrativeCard component (imported above)
// Kept here as a no-op to avoid dead-code errors
function _GeminiSectionLegacy() { return null; }

// ─── Main Report Detail Page ──────────────────────────────────────────────────

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
    <div className="space-y-4 max-w-5xl">
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

  const activeAnalysis = analysis;
  const hasAnalysis = !!activeAnalysis;

  return (
    <div className="space-y-4 max-w-5xl">

      {/* ── Breadcrumb + Action Bar ─────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="w-8 h-8 rounded-lg border border-white/10 bg-slate-900/60 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-[18px] font-bold text-white font-mono tracking-tight">{report.report_id}</h1>
            <p className="text-[12px] text-slate-500 capitalize">{report.report_type.replace(/_/g, ' ')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ReportStatusBadge status={report.status} />

          {canAnalyze && (
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              variant={report.status === 'NEW' ? 'default' : 'outline'}
              className="h-8 gap-1.5 text-[12px]"
            >
              {analyzeMutation.isPending
                ? <><Zap className="h-3.5 w-3.5 animate-pulse" /> Analysing…</>
                : <><Play className="h-3.5 w-3.5" /> Run Analysis</>}
            </Button>
          )}

          {canDelete && (
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)} className="h-8 text-[12px]">
                Delete
              </Button>
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
                    {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* ── Report Metadata strip ───────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Location', value: report.location },
          { label: 'Department', value: report.department },
          { label: 'Source', value: report.source_type.replace(/_/g, ' ') },
          { label: 'Activity', value: report.activity || '—' },
          { label: 'Reported', value: (() => { try { return format(new Date(report.reported_at), 'dd MMM yyyy'); } catch { return report.reported_at; } })() },
          { label: 'Created', value: (() => { try { return format(new Date(report.created_at), 'dd MMM yyyy'); } catch { return report.created_at; } })() },
        ].map((item) => (
          <div key={item.label} className="bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2.5">
            <Label>{item.label}</Label>
            <Value className="capitalize">{item.value}</Value>
          </div>
        ))}
      </div>

      {/* ── Narrative + XAI ────────────────────────────────────── */}
      <NarrativeSection reportText={report.report_text} analysis={activeAnalysis} />

      {/* ── Analysis pending state ──────────────────────────────── */}
      {!hasAnalysis && report.status !== 'NEW' && (
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
          <Info className="h-4 w-4 text-slate-400 shrink-0" />
          <p className="text-[13px] text-slate-400">
            This report was previously analysed (Status: <strong className="text-slate-300">{report.status}</strong>). Run analysis again to load the latest result and activate the XAI highlights.
          </p>
        </div>
      )}

      {/* ── Full Analysis block ─────────────────────────────────── */}
      <AnimatePresence>
        {hasAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            {/* Confidence row — always visible at top */}
            <ConfidenceSection analysis={activeAnalysis!} />

            {/* Safety intelligence */}
            <SafetyIntelligenceSection analysis={activeAnalysis!} />

            {/* Causal chain DAG */}
            <CausalChainSection analysis={activeAnalysis!} />

            {/* Risk assessment */}
            <RiskSection analysis={activeAnalysis!} />

            {/* SHAP bar charts */}
            <ExplainabilitySection analysis={activeAnalysis!} />

            {/* Gemini AI narrative — full card with typewriter */}
            {(activeAnalysis!.llm_attempted || activeAnalysis!.narrative) && (
              <GeminiNarrativeCard analysis={activeAnalysis!} />
            )}

            {/* What-If counterfactual simulation */}
            <CounterfactualPanel analysis={activeAnalysis!} />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
