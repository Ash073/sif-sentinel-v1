'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { reviewsApi } from '@/lib/api/reviews';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/components/providers/AuthProvider';
import { ReviewDecisionBadge, SIFBadge, BarrierStatusBadge } from '@/components/ui/status-badges';
import { ArrowLeft, CheckSquare, AlertTriangle, Shield } from 'lucide-react';
import type { ReviewDecision, SIFLevel, BarrierStatus } from '@/types/api';
import { AxiosError } from 'axios';
import type { ApiErrorBody } from '@/types/api';
import { format } from 'date-fns';

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [decision, setDecision] = useState<ReviewDecision>('APPROVE');
  const [comment, setComment] = useState('');
  const [correctedSifLevel, setCorrectedSifLevel] = useState<SIFLevel | ''>('');
  const [correctedActivity, setCorrectedActivity] = useState('');
  const [correctedHazard, setCorrectedHazard] = useState('');
  const [correctedBarrier, setCorrectedBarrier] = useState('');
  const [correctedBarrierStatus, setCorrectedBarrierStatus] = useState<BarrierStatus | ''>('');
  const [correctedBarrierFailure, setCorrectedBarrierFailure] = useState('');
  const [correctedLSR, setCorrectedLSR] = useState('');

  const reviewQ = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => reviewsApi.get(id),
    enabled: !!id,
  });

  const decideMutation = useMutation({
    mutationFn: () => reviewsApi.decide(id, {
      decision,
      reviewer_comment: comment || undefined,
      corrected_sif_level: (decision === 'MODIFY' && correctedSifLevel) ? correctedSifLevel : undefined,
      corrected_activity: (decision === 'MODIFY' && correctedActivity) ? correctedActivity : undefined,
      corrected_hazard: (decision === 'MODIFY' && correctedHazard) ? correctedHazard : undefined,
      corrected_barrier: (decision === 'MODIFY' && correctedBarrier) ? correctedBarrier : undefined,
      corrected_barrier_status: (decision === 'MODIFY' && correctedBarrierStatus) ? correctedBarrierStatus : undefined,
      corrected_barrier_failure: (decision === 'MODIFY' && correctedBarrierFailure) ? correctedBarrierFailure : undefined,
      corrected_life_saving_rule: (decision === 'MODIFY' && correctedLSR) ? correctedLSR : undefined,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.add({ title: 'Decision recorded', description: `${data.decision} on ${data.report_id}`, type: 'success' });
    },
    onError: (err: AxiosError<ApiErrorBody>) => {
      const msg = err.response?.data?.error?.message ?? 'Decision failed';
      if (err.response?.status === 409) {
        toast.add({ title: 'Conflict', description: 'A decision was already made. Refreshing...', type: 'error' });
        queryClient.invalidateQueries({ queryKey: ['reviews', id] });
      } else {
        toast.add({ title: 'Decision failed', description: msg, type: 'error' });
      }
    },
  });

  const canDecide = user && ['ADMIN', 'HSE_MANAGER', 'REVIEWER'].includes(user.role);
  const review = reviewQ.data;
  const isFinalized = review?.decision !== 'PENDING';

  if (reviewQ.isLoading) return (
    <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full rounded-xl" /></div>
  );
  if (reviewQ.isError) return <ErrorState title="Review not found" onRetry={reviewQ.refetch} />;
  if (!review) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/reviews" className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground shrink-0 mt-0.5">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground font-mono">{review.report_id}</h1>
            <ReviewDecisionBadge decision={review.decision} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Human Review Record</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: report info + analysis */}
        <div className="lg:col-span-2 space-y-5">
          {/* Report narrative */}
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <div className="px-5 py-3 border-b border-border bg-muted/20">
              <h2 className="font-semibold text-sm text-foreground">Report Narrative</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-foreground leading-relaxed">{review.report_text}</p>
            </div>
          </div>

          {/* AI Analysis */}
          {(review.explanation || review.evidence_span || review.overall_confidence != null) && (
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <div className="px-5 py-3 border-b border-border bg-amber-50 dark:bg-amber-900/10 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h2 className="font-semibold text-sm text-foreground">AI Analysis — Human Review Required</h2>
              </div>
              <div className="px-5 py-4 space-y-4">
                <p className="text-xs text-muted-foreground italic">
                  The following is AI-generated analysis. It must be validated by a qualified HSE professional before operational use.
                </p>
                {review.overall_confidence != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Overall Confidence:</span>
                    <span className="text-sm font-bold">{(review.overall_confidence * 100).toFixed(0)}%</span>
                  </div>
                )}
                {review.explanation && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Explanation</p>
                    <p className="text-sm text-foreground leading-relaxed">{review.explanation}</p>
                  </div>
                )}
                {review.evidence_span && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Key Evidence</p>
                    <blockquote className="border-l-2 border-primary pl-3 text-sm italic text-muted-foreground">
                      &ldquo;{review.evidence_span}&rdquo;
                    </blockquote>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Corrections (if MODIFY) */}
          {isFinalized && review.decision === 'MODIFY' && (
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">Reviewer Corrections</h2>
              </div>
              <div className="px-5 py-4 space-y-2">
                {review.corrected_sif_level && <div className="flex gap-2 text-sm"><span className="text-muted-foreground">SIF Level:</span><SIFBadge level={review.corrected_sif_level} /></div>}
                {review.corrected_activity && <div className="flex gap-2 text-sm"><span className="text-muted-foreground">Activity:</span><span className="font-medium">{review.corrected_activity}</span></div>}
                {review.corrected_hazard && <div className="flex gap-2 text-sm"><span className="text-muted-foreground">Hazard:</span><span className="font-medium">{review.corrected_hazard}</span></div>}
                {review.corrected_barrier && <div className="flex gap-2 text-sm"><span className="text-muted-foreground">Barrier:</span><span className="font-medium">{review.corrected_barrier}</span></div>}
                {review.corrected_barrier_status && <div className="flex gap-2 text-sm"><span className="text-muted-foreground">Barrier Status:</span><BarrierStatusBadge status={review.corrected_barrier_status} /></div>}
                {review.corrected_barrier_failure && <div className="flex gap-2 text-sm"><span className="text-muted-foreground">Barrier Failure:</span><span className="font-medium">{review.corrected_barrier_failure}</span></div>}
                {review.corrected_life_saving_rule && <div className="flex gap-2 text-sm"><span className="text-muted-foreground">LSR:</span><span className="font-mono text-xs font-medium">{review.corrected_life_saving_rule}</span></div>}
                {review.reviewer_comment && <div className="pt-2 border-t border-border/50"><p className="text-xs text-muted-foreground mb-1">Reviewer Comment</p><p className="text-sm">{review.reviewer_comment}</p></div>}
                {review.reviewed_at && <p className="text-xs text-muted-foreground">Reviewed {(() => { try { return format(new Date(review.reviewed_at), 'dd MMM yyyy HH:mm'); } catch { return review.reviewed_at; } })()}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Right: decision panel */}
        <div>
          {!isFinalized && canDecide ? (
            <div className="border border-border rounded-xl overflow-hidden bg-card sticky top-4">
              <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">Submit Decision</h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="decision_select">Decision *</Label>
                  <Select value={decision} onValueChange={(v) => setDecision((v ?? 'APPROVE') as ReviewDecision)}>
                    <SelectTrigger id="decision_select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APPROVE">✓ Approve</SelectItem>
                      <SelectItem value="REJECT">✗ Reject</SelectItem>
                      <SelectItem value="MODIFY">✎ Modify with Corrections</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {decision === 'MODIFY' && (
                  <div className="space-y-3 p-3 border border-border rounded-lg bg-muted/10">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Corrections (leave blank to keep AI value)</p>
                    <div className="space-y-1.5">
                      <Label htmlFor="corr_sif">SIF Level</Label>
                      <Select value={correctedSifLevel || 'none'} onValueChange={(v) => setCorrectedSifLevel(v === 'none' ? '' : v as SIFLevel)}>
                        <SelectTrigger id="corr_sif"><SelectValue placeholder="Unchanged" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unchanged</SelectItem>
                          <SelectItem value="NON_SIF">Non-SIF</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="corr_activity">Activity</Label>
                      <Input id="corr_activity" value={correctedActivity} onChange={e => setCorrectedActivity(e.target.value)} placeholder="e.g. Hot Work" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="corr_hazard">Hazard</Label>
                      <Input id="corr_hazard" value={correctedHazard} onChange={e => setCorrectedHazard(e.target.value)} placeholder="e.g. Fire / Explosion" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="corr_barrier">Barrier</Label>
                      <Input id="corr_barrier" value={correctedBarrier} onChange={e => setCorrectedBarrier(e.target.value)} placeholder="e.g. Permit to Work" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="corr_bs">Barrier Status</Label>
                      <Select value={correctedBarrierStatus || 'none'} onValueChange={(v) => setCorrectedBarrierStatus(v === 'none' ? '' : v as BarrierStatus)}>
                        <SelectTrigger id="corr_bs"><SelectValue placeholder="Unchanged" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unchanged</SelectItem>
                          <SelectItem value="EFFECTIVE">Effective</SelectItem>
                          <SelectItem value="FAILED">Failed</SelectItem>
                          <SelectItem value="MISSING">Missing</SelectItem>
                          <SelectItem value="UNKNOWN">Unknown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="corr_lsr">Life-Saving Rule</Label>
                      <Input id="corr_lsr" value={correctedLSR} onChange={e => setCorrectedLSR(e.target.value)} placeholder="e.g. LSR-01" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="corr_bf">Barrier Failure</Label>
                      <Input id="corr_bf" value={correctedBarrierFailure} onChange={e => setCorrectedBarrierFailure(e.target.value)} placeholder="Describe failure mode" />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="reviewer_comment">Comment</Label>
                  <Textarea id="reviewer_comment" value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Add optional reviewer notes..." />
                </div>

                <Button
                  className="w-full"
                  variant={decision === 'REJECT' ? 'destructive' : 'default'}
                  onClick={() => decideMutation.mutate()}
                  disabled={decideMutation.isPending}
                >
                  {decideMutation.isPending ? 'Saving...' : `Submit ${decision}`}
                </Button>
              </div>
            </div>
          ) : isFinalized ? (
            <div className="border border-border rounded-xl overflow-hidden bg-card p-4 text-center">
              <ReviewDecisionBadge decision={review.decision} />
              <p className="text-sm text-muted-foreground mt-2">Decision finalized</p>
              {review.reviewed_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  {(() => { try { return format(new Date(review.reviewed_at), 'dd MMM yyyy HH:mm'); } catch { return review.reviewed_at; } })()}
                </p>
              )}
            </div>
          ) : (
            <div className="border border-border rounded-xl p-4 text-center text-sm text-muted-foreground">
              Your role ({user?.role}) cannot submit decisions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
