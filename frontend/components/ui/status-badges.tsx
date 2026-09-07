'use client';

import { cn } from '@/lib/utils';
import type { SIFLevel, BarrierStatus, ReportStatus, InterventionReviewStatus, ReviewDecision } from '@/types/api';

// ─── SIF Level Badge ──────────────────────────────────────────────

const SIF_LEVEL_CONFIG: Record<SIFLevel, { label: string; className: string }> = {
  NON_SIF: { label: 'Non-SIF', className: 'bg-muted/50 text-muted-foreground border-muted' },
  LOW: { label: 'SIF Low', className: 'bg-success/10 text-success border-success/30' },
  MEDIUM: { label: 'SIF Medium', className: 'bg-warning/10 text-warning border-warning/30' },
  HIGH: { label: 'SIF High', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  REVIEW: { label: 'Under Review', className: 'bg-primary/10 text-primary border-primary/30' },
};

export function SIFLevelBadge({ level }: { level: SIFLevel }) {
  const config = SIF_LEVEL_CONFIG[level] ?? SIF_LEVEL_CONFIG.REVIEW;
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border', config.className)}>
      {config.label}
    </span>
  );
}

// ─── Barrier Status Badge ─────────────────────────────────────────

const BARRIER_CONFIG: Record<BarrierStatus, { label: string; className: string }> = {
  EFFECTIVE: { label: 'Effective', className: 'bg-success/10 text-success border-success/30' },
  FAILED: { label: 'Failed', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  MISSING: { label: 'Missing', className: 'bg-warning/10 text-warning border-warning/30' },
  UNKNOWN: { label: 'Unknown', className: 'bg-muted/50 text-muted-foreground border-muted' },
};

export function BarrierStatusBadge({ status }: { status: BarrierStatus }) {
  const config = BARRIER_CONFIG[status] ?? BARRIER_CONFIG.UNKNOWN;
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border', config.className)}>
      {config.label}
    </span>
  );
}

// ─── Report Status Badge ──────────────────────────────────────────

const REPORT_STATUS_CONFIG: Record<ReportStatus, { label: string; className: string }> = {
  NEW: { label: 'New', className: 'bg-muted/50 text-muted-foreground border-muted' },
  ANALYZED: { label: 'Analyzed', className: 'bg-primary/10 text-primary border-primary/30' },
  REVIEW_REQUIRED: { label: 'Review Required', className: 'bg-warning/10 text-warning border-warning/30' },
  REVIEWED: { label: 'Reviewed', className: 'bg-success/10 text-success border-success/30' },
  CLOSED: { label: 'Closed', className: 'bg-muted/50 text-muted-foreground border-muted' },
};

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const config = REPORT_STATUS_CONFIG[status] ?? REPORT_STATUS_CONFIG.NEW;
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border', config.className)}>
      {config.label}
    </span>
  );
}

// ─── Review Decision Badge ────────────────────────────────────────

const REVIEW_DECISION_CONFIG: Record<ReviewDecision, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-warning/10 text-warning border-warning/30' },
  APPROVE: { label: 'Approved', className: 'bg-success/10 text-success border-success/30' },
  REJECT: { label: 'Rejected', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  MODIFY: { label: 'Modified', className: 'bg-primary/10 text-primary border-primary/30' },
};

export function ReviewDecisionBadge({ decision }: { decision: ReviewDecision }) {
  const config = REVIEW_DECISION_CONFIG[decision] ?? REVIEW_DECISION_CONFIG.PENDING;
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border', config.className)}>
      {config.label}
    </span>
  );
}

// ─── Intervention Review Status Badge ─────────────────────────────

const INTERVENTION_STATUS_CONFIG: Record<InterventionReviewStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-warning/10 text-warning border-warning/30' },
  ACCEPTED: { label: 'Accepted', className: 'bg-success/10 text-success border-success/30' },
  MODIFIED: { label: 'Modified', className: 'bg-primary/10 text-primary border-primary/30' },
  REJECTED: { label: 'Rejected', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export function InterventionStatusBadge({ status }: { status: InterventionReviewStatus }) {
  const config = INTERVENTION_STATUS_CONFIG[status] ?? INTERVENTION_STATUS_CONFIG.PENDING;
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border', config.className)}>
      {config.label}
    </span>
  );
}

// ─── Risk Level Badge ─────────────────────────────────────────────

const RISK_LEVEL_CONFIG: Record<string, { className: string }> = {
  HIGH: { className: 'bg-destructive/10 text-destructive border-destructive/30' },
  MEDIUM: { className: 'bg-warning/10 text-warning border-warning/30' },
  LOW: { className: 'bg-success/10 text-success border-success/30' },
  CRITICAL: { className: 'bg-destructive/20 text-destructive border-destructive/50' },
};

export function RiskLevelBadge({ level }: { level: string }) {
  const config = RISK_LEVEL_CONFIG[level?.toUpperCase()] ?? { className: 'bg-muted/50 text-muted-foreground border-muted' };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border', config.className)}>
      {level}
    </span>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { className: string }> = {
  CRITICAL: { className: 'bg-destructive/10 text-destructive border-destructive/30' },
  HIGH: { className: 'bg-warning/20 text-warning border-warning/30' },
  MEDIUM: { className: 'bg-primary/10 text-primary border-primary/30' },
  LOW: { className: 'bg-muted/50 text-muted-foreground border-muted' },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const config = PRIORITY_CONFIG[priority?.toUpperCase()] ?? { className: 'bg-muted/50 text-muted-foreground border-muted' };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border', config.className)}>
      {priority}
    </span>
  );
}
