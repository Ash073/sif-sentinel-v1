'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { interventionsApi } from '@/lib/api/interventions';
import { ErrorState, EmptyState, Skeleton } from '@/components/ui/states';
import { InterventionStatusBadge, PriorityBadge } from '@/components/ui/status-badges';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { AxiosError } from 'axios';
import type { ApiErrorBody, InterventionRead, InterventionReviewStatus } from '@/types/api';
import { ShieldCheck, CheckCircle, XCircle, Edit3, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { format } from 'date-fns';

interface ReviewDialogProps {
  intervention: InterventionRead | null;
  open: boolean;
  onClose: () => void;
}

function ReviewDialog({ intervention, open, onClose }: ReviewDialogProps) {
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<InterventionReviewStatus>('ACCEPTED');
  const [comments, setComments] = useState('');

  const mutation = useMutation({
    mutationFn: () => interventionsApi.review(intervention!.id, { decision, reviewer_comments: comments || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      toast.add({ title: 'Decision recorded', type: 'success' });
      onClose();
    },
    onError: (error: AxiosError<ApiErrorBody>) => {
      toast.add({ title: 'Failed', description: error.response?.data?.error?.message ?? 'Error', type: 'error' });
    },
  });

  if (!intervention) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Review Intervention</DialogTitle>
          <DialogDescription>{intervention.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 bg-muted/30 rounded-lg text-sm border border-border/50">
            <p className="text-foreground">{intervention.description}</p>
            <p className="text-muted-foreground mt-2 text-xs">{intervention.rationale}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="intervention_decision">Decision</Label>
            <Select value={decision} onValueChange={(v) => setDecision(v as InterventionReviewStatus)}>
              <SelectTrigger id="intervention_decision"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACCEPTED">✓ Accept</SelectItem>
                <SelectItem value="MODIFIED">✎ Modify</SelectItem>
                <SelectItem value="REJECTED">✗ Reject</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="intervention_comments">Comments</Label>
            <Textarea id="intervention_comments" value={comments} onChange={(e) => setComments(e.target.value)} rows={3} placeholder="Add notes..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : `Submit ${decision}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function InterventionsPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<InterventionRead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('');

  const summaryQ = useQuery({ queryKey: ['interventions', 'summary'], queryFn: interventionsApi.getSummary });
  const listQ = useQuery({
    queryKey: ['interventions', 'list', priorityFilter],
    queryFn: () => interventionsApi.list({ priority: priorityFilter || undefined }),
  });

  const canReview = user != null && ['ADMIN', 'HSE_MANAGER', 'REVIEWER'].includes(user.role);
  const summary = summaryQ.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Corrective Interventions
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Advisory intervention recommendations generated from the SIF analysis pipeline</p>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">Total</p>
            <p className="text-2xl font-bold">{summary.total}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">Critical</p>
            <p className="text-2xl font-bold text-destructive">{summary.critical}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">Pending Review</p>
            <p className="text-2xl font-bold text-warning">{summary.pending}</p>
          </div>
        </div>
      )}

      {/* Priority Filter */}
      <div className="glass-card p-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Priority:</span>
        {['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
          <Button key={p || 'all'} variant={priorityFilter === p ? 'default' : 'outline'} size="sm" onClick={() => setPriorityFilter(p)}>
            {p || 'All'}
          </Button>
        ))}
      </div>

      {/* List */}
      <div className="glass-card overflow-hidden">
        {listQ.isLoading && <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>}
        {listQ.isError && <ErrorState title="Could not load interventions" onRetry={listQ.refetch} />}
        {listQ.data?.length === 0 && <EmptyState title="No interventions found" description="No advisory intervention recommendations have been generated yet." icon={<ShieldCheck className="h-7 w-7" />} />}
        {listQ.data && listQ.data.length > 0 && listQ.data.map((intervention) => (
          <div key={intervention.id} className="border-b border-border/50 last:border-b-0 p-4 hover:bg-muted/10 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <PriorityBadge priority={intervention.priority} />
                  <InterventionStatusBadge status={intervention.review_status as InterventionReviewStatus} />
                  <span className="text-xs text-muted-foreground capitalize">{intervention.action_type.replace(/_/g, ' ')}</span>
                  {intervention.review_required && (
                    <span className="flex items-center gap-1 text-xs text-warning">
                      <AlertTriangle className="h-3 w-3" /> Review Required
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-sm text-foreground mb-1">{intervention.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{intervention.description}</p>
                {intervention.life_saving_rule && (
                  <p className="text-xs text-primary mt-1 font-medium">LSR: {intervention.life_saving_rule}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {(() => { try { return format(new Date(intervention.created_at), 'dd MMM yyyy HH:mm'); } catch { return intervention.created_at; } })()}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {canReview && (
                  <Button variant="outline" size="sm" onClick={() => { setSelected(intervention); setDialogOpen(true); }} className="gap-1.5">
                    {intervention.review_status === 'PENDING' ? <><CheckCircle className="h-3.5 w-3.5" />Review</> : <><Edit3 className="h-3.5 w-3.5" />Re-Review</>}
                  </Button>
                )}
              </div>
            </div>
            {intervention.reviewed_at && intervention.reviewer_comments && (
              <div className="mt-2 p-2 bg-muted/20 rounded text-xs text-muted-foreground border border-border/50">
                <XCircle className="inline h-3 w-3 mr-1" />Reviewer note: {intervention.reviewer_comments}
              </div>
            )}
          </div>
        ))}
      </div>

      <ReviewDialog intervention={selected} open={dialogOpen} onClose={() => { setDialogOpen(false); setSelected(null); }} />
    </div>
  );
}
