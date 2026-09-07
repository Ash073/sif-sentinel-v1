'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { reviewsApi } from '@/lib/api/reviews';
import {
  ReviewDecisionBadge
} from '@/components/ui/status-badges';
import { ErrorState, EmptyState, Skeleton } from '@/components/ui/states';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { AxiosError } from 'axios';
import type { ApiErrorBody, ReviewQueueItem, ReviewDecision, ReviewStatusFilter, SIFLevel, BarrierStatus } from '@/types/api';
import { CheckSquare, CheckCircle, XCircle, Edit3, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/components/providers/AuthProvider';

interface DecisionDialogProps {
  review: ReviewQueueItem | null;
  open: boolean;
  onClose: () => void;
}

function DecisionDialog({ review, open, onClose }: DecisionDialogProps) {
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<ReviewDecision>('APPROVE');
  const [comment, setComment] = useState('');
  const [correctedSifLevel, setCorrectedSifLevel] = useState<SIFLevel | ''>('');
  const [correctedBarrierStatus, setCorrectedBarrierStatus] = useState<BarrierStatus | ''>('');

  const mutation = useMutation({
    mutationFn: () =>
      reviewsApi.decide(review!.id, {
        decision,
        reviewer_comment: comment || undefined,
        corrected_sif_level: (decision === 'MODIFY' && correctedSifLevel) ? correctedSifLevel : undefined,
        corrected_barrier_status: (decision === 'MODIFY' && correctedBarrierStatus) ? correctedBarrierStatus : undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.add({ title: 'Decision recorded', description: `${data.decision} — ${data.report_id}`, type: 'success' });
      onClose();
    },
    onError: (error: AxiosError<ApiErrorBody>) => {
      toast.add({ title: 'Decision failed', description: error.response?.data?.error?.message ?? 'Failed', type: 'error' });
    },
  });

  if (!review) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Decision — {review.report_id}</DialogTitle>
          <DialogDescription>Submit your authoritative human review decision on this AI-generated safety analysis.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 bg-muted/30 rounded-lg text-sm border border-border/50">
            <p className="text-xs text-muted-foreground font-medium mb-2">Report Narrative</p>
            <p className="text-foreground leading-relaxed line-clamp-4">{review.report_text}</p>
          </div>
          {review.explanation && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
              <p className="text-xs text-primary font-medium mb-1">AI Explanation</p>
              <p className="text-foreground">{review.explanation}</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="review_decision">Decision *</Label>
            <Select value={decision} onValueChange={(v) => setDecision(v as ReviewDecision)}>
              <SelectTrigger id="review_decision"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVE">✓ Approve — AI analysis is correct</SelectItem>
                <SelectItem value="REJECT">✗ Reject — AI analysis is incorrect</SelectItem>
                <SelectItem value="MODIFY">✎ Modify — Partial correction needed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {decision === 'MODIFY' && (
            <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/10">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Corrections</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="corrected_sif_level">Corrected SIF Level</Label>
                  <Select value={correctedSifLevel || 'none'} onValueChange={(v) => setCorrectedSifLevel(v === 'none' ? '' : v as SIFLevel)}>
                    <SelectTrigger id="corrected_sif_level"><SelectValue placeholder="Leave unchanged" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Leave unchanged</SelectItem>
                      <SelectItem value="NON_SIF">Non-SIF</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="corrected_barrier">Corrected Barrier Status</Label>
                  <Select value={correctedBarrierStatus || 'none'} onValueChange={(v) => setCorrectedBarrierStatus(v === 'none' ? '' : v as BarrierStatus)}>
                    <SelectTrigger id="corrected_barrier"><SelectValue placeholder="Leave unchanged" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Leave unchanged</SelectItem>
                      <SelectItem value="EFFECTIVE">Effective</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                      <SelectItem value="MISSING">Missing</SelectItem>
                      <SelectItem value="UNKNOWN">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="reviewer_comment">Reviewer Comment</Label>
            <Textarea id="reviewer_comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Add notes..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} variant={decision === 'REJECT' ? 'destructive' : 'default'}>
            {mutation.isPending ? 'Saving...' : `Submit ${decision}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ReviewQueuePage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>('PENDING');
  const [selectedReview, setSelectedReview] = useState<ReviewQueueItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const reviewsQ = useQuery({
    queryKey: ['reviews', statusFilter],
    queryFn: () => reviewsApi.list({ page: 1, page_size: 50, status: statusFilter }),
  });

  const canDecide = user != null && ['ADMIN', 'HSE_MANAGER', 'REVIEWER'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Human Review Queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI-flagged reports awaiting expert validation</p>
        </div>
      </div>

      <div className="glass-card p-4 flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Status:</span>
        <div className="flex gap-2">
          {(['PENDING', 'REVIEWED', 'ALL'] as ReviewStatusFilter[]).map((s) => (
            <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}
              className="gap-1.5">
              {s === 'PENDING' && <Clock className="h-3.5 w-3.5" />}
              {s === 'REVIEWED' && <CheckCircle className="h-3.5 w-3.5" />}
              {s === 'ALL' && <XCircle className="h-3.5 w-3.5" />}
              {s}
            </Button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {reviewsQ.isLoading && <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>}
        {reviewsQ.isError && <ErrorState title="Could not load reviews" onRetry={reviewsQ.refetch} />}
        {reviewsQ.data?.length === 0 && <EmptyState title="No reviews found" description="Try a different status filter." icon={<CheckSquare className="h-7 w-7" />} />}
        {reviewsQ.data && reviewsQ.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Review queue">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Report ID</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Decision</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Confidence</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Narrative (preview)</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reviewed At</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {reviewsQ.data.map((review) => (
                  <tr key={review.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{review.report_id}</td>
                    <td className="px-4 py-3"><ReviewDecisionBadge decision={review.decision} /></td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {review.overall_confidence != null ? `${(review.overall_confidence * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 max-w-xs"><p className="text-sm text-foreground line-clamp-2">{review.report_text}</p></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {review.reviewed_at ? (() => { try { return format(new Date(review.reviewed_at), 'dd MMM yyyy HH:mm'); } catch { return review.reviewed_at; } })() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant={review.decision === 'PENDING' ? 'default' : 'outline'} size="sm"
                        onClick={() => { setSelectedReview(review); setDialogOpen(true); }}
                        disabled={!canDecide} className="gap-1.5">
                        {review.decision === 'PENDING' ? <><CheckSquare className="h-3.5 w-3.5" />Decide</> : <><Edit3 className="h-3.5 w-3.5" />View</>}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!canDecide && <p className="text-xs text-muted-foreground text-center">Your role (<strong>{user?.role}</strong>) is view-only. Only ADMIN, HSE_MANAGER, and REVIEWER can submit decisions.</p>}

      <DecisionDialog review={selectedReview} open={dialogOpen} onClose={() => { setDialogOpen(false); setSelectedReview(null); }} />
    </div>
  );
}
