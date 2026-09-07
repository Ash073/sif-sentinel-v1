'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { correctiveActionsApi } from '@/lib/api/corrective-actions';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/components/providers/AuthProvider';
import { ArrowLeft, ClipboardList, CheckCircle, XCircle, Play, RotateCcw, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  PENDING_VERIFICATION: 'bg-orange-100 text-orange-700',
  VERIFIED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="py-2.5 border-b border-border/50 last:border-0 flex justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value || '—'}</span>
    </div>
  );
}

export default function CorrectiveActionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [decisionNotes, setDecisionNotes] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');

  const actionQ = useQuery({
    queryKey: ['corrective-actions', id],
    queryFn: () => correctiveActionsApi.get(id),
    enabled: !!id,
  });

  const auditQ = useQuery({
    queryKey: ['corrective-actions', id, 'audit'],
    queryFn: () => correctiveActionsApi.getAudit(id),
    enabled: !!id,
    staleTime: 60 * 1000,
  });

  const makeMutation = (fn: (notes?: string) => Promise<unknown>, label: string) =>
    useMutation({
      mutationFn: () => fn(decisionNotes),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
        toast.add({ title: `${label} recorded`, type: 'success' });
        setDecisionNotes('');
      },
      onError: () => toast.add({ title: `Failed: ${label}`, type: 'error' }),
    });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const submitMut = useMutation({
    mutationFn: () => correctiveActionsApi.submit(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['corrective-actions'] }); toast.add({ title: 'Submitted for approval', type: 'success' }); },
    onError: () => toast.add({ title: 'Submit failed', type: 'error' }),
  });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const approveMut = makeMutation((notes) => correctiveActionsApi.approve(id, { notes }), 'Approval');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const rejectMut = makeMutation((notes) => correctiveActionsApi.reject(id, { reason: notes }), 'Rejection');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const startMut = useMutation({
    mutationFn: () => correctiveActionsApi.start(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['corrective-actions'] }); toast.add({ title: 'Action started', type: 'success' }); },
    onError: () => toast.add({ title: 'Start failed', type: 'error' }),
  });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const requestVerifyMut = useMutation({
    mutationFn: () => correctiveActionsApi.requestVerification(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['corrective-actions'] }); toast.add({ title: 'Verification requested', type: 'success' }); },
    onError: () => toast.add({ title: 'Request failed', type: 'error' }),
  });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const verifyMut = useMutation({
    mutationFn: () => correctiveActionsApi.verify(id, { verification_notes: verificationNotes, effective: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      toast.add({ title: 'Action verified', type: 'success' });
      setVerificationNotes('');
    },
    onError: () => toast.add({ title: 'Verification failed', type: 'error' }),
  });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const closeMut = makeMutation((notes) => correctiveActionsApi.close(id, { notes }), 'Closure');

  if (actionQ.isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
  if (actionQ.isError) return <ErrorState title="Action not found" onRetry={actionQ.refetch} />;

  const action = actionQ.data;
  if (!action) return null;

  const isAdmin = user && ['ADMIN', 'HSE_MANAGER'].includes(user.role);
  const isAnalyst = user && ['ADMIN', 'HSE_MANAGER', 'HSE_ANALYST'].includes(user.role);

  const canSubmit = action.status === 'DRAFT' && isAnalyst;
  const canApprove = action.status === 'PENDING_APPROVAL' && isAdmin;
  const canStart = action.status === 'APPROVED' && isAnalyst;
  const canRequestVerify = action.status === 'IN_PROGRESS' && isAnalyst;
  const canVerify = action.status === 'PENDING_VERIFICATION' && isAdmin;
  const canClose = action.status === 'VERIFIED' && isAdmin;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/corrective-actions" className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground shrink-0 mt-0.5">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{action.title}</h1>
            <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold', STATUS_COLORS[action.status] ?? 'bg-gray-100 text-gray-700')}>
              {action.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">{action.intervention_code}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Action Details</h2>
            </div>
            <div className="px-5 py-2">
              <InfoRow label="Description" value={action.description} />
              <InfoRow label="Hierarchy Level" value={action.hierarchy_level} />
              <InfoRow label="Action Type" value={action.action_type} />
              <InfoRow label="Priority" value={action.priority} />
              <InfoRow label="Assigned To" value={action.assigned_to} />
              <InfoRow label="Due Date" value={action.due_date ? (() => { try { return format(new Date(action.due_date), 'dd MMM yyyy'); } catch { return action.due_date; } })() : null} />
              <InfoRow label="Created" value={(() => { try { return format(new Date(action.created_at), 'dd MMM yyyy HH:mm'); } catch { return action.created_at; } })()} />
              {action.rejection_reason && <InfoRow label="Rejection Reason" value={action.rejection_reason} />}
              {action.cancellation_reason && <InfoRow label="Cancellation Reason" value={action.cancellation_reason} />}
              {action.verification_notes && <InfoRow label="Verification Notes" value={action.verification_notes} />}
            </div>
          </div>

          {/* Audit trail */}
          {auditQ.data && auditQ.data.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <div className="px-5 py-3 border-b border-border bg-muted/20">
                <h2 className="font-semibold text-sm">Audit Trail</h2>
              </div>
              <div className="divide-y divide-border/50">
                {auditQ.data.map((entry, i) => (
                  <div key={i} className="px-5 py-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{String((entry as Record<string, unknown>).action ?? '—')}</span>
                      <span className="text-xs text-muted-foreground">
                        {(entry as Record<string, unknown>).timestamp ? (() => { try { return format(new Date(String((entry as Record<string, unknown>).timestamp)), 'dd MMM HH:mm'); } catch { return String((entry as Record<string, unknown>).timestamp); } })() : '—'}
                      </span>
                    </div>
                    {(entry as Record<string, unknown>).notes && <p className="text-xs text-muted-foreground mt-0.5">{String((entry as Record<string, unknown>).notes)}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions panel */}
        <div className="space-y-4">
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <div className="px-4 py-3 border-b border-border bg-muted/20">
              <h2 className="font-semibold text-sm">Workflow Actions</h2>
            </div>
            <div className="p-4 space-y-3">
              {canSubmit && (
                <Button className="w-full gap-2" onClick={() => submitMut.mutate()} disabled={submitMut.isPending}>
                  <CheckCircle className="h-4 w-4" />
                  {submitMut.isPending ? 'Submitting...' : 'Submit for Approval'}
                </Button>
              )}

              {(canApprove || canVerify || canClose) && (
                <div className="space-y-2">
                  <Label htmlFor="decision_notes">Notes</Label>
                  <Textarea
                    id="decision_notes"
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    placeholder="Optional notes..."
                    rows={3}
                  />
                </div>
              )}

              {canApprove && (
                <div className="flex gap-2">
                  <Button className="flex-1 gap-2" onClick={() => approveMut.mutate()} disabled={approveMut.isPending}>
                    <CheckCircle className="h-4 w-4" /> Approve
                  </Button>
                  <Button variant="destructive" className="flex-1 gap-2" onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending}>
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>
              )}

              {canStart && (
                <Button className="w-full gap-2" onClick={() => startMut.mutate()} disabled={startMut.isPending}>
                  <Play className="h-4 w-4" /> {startMut.isPending ? 'Starting...' : 'Start Implementation'}
                </Button>
              )}

              {canRequestVerify && (
                <Button className="w-full gap-2" variant="outline" onClick={() => requestVerifyMut.mutate()} disabled={requestVerifyMut.isPending}>
                  <RotateCcw className="h-4 w-4" /> {requestVerifyMut.isPending ? 'Requesting...' : 'Request Verification'}
                </Button>
              )}

              {canVerify && (
                <div className="space-y-2">
                  <Label htmlFor="verify_notes">Verification Notes *</Label>
                  <Textarea
                    id="verify_notes"
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder="Describe verification outcome..."
                    rows={3}
                  />
                  <Button
                    className="w-full gap-2"
                    onClick={() => verifyMut.mutate()}
                    disabled={verifyMut.isPending || verificationNotes.trim().length < 3}
                  >
                    <CheckCircle className="h-4 w-4" /> {verifyMut.isPending ? 'Verifying...' : 'Verify Effective'}
                  </Button>
                </div>
              )}

              {canClose && (
                <Button className="w-full gap-2" variant="outline" onClick={() => closeMut.mutate()} disabled={closeMut.isPending}>
                  <Lock className="h-4 w-4" /> {closeMut.isPending ? 'Closing...' : 'Close Action'}
                </Button>
              )}

              {!canSubmit && !canApprove && !canStart && !canRequestVerify && !canVerify && !canClose && (
                <p className="text-xs text-muted-foreground text-center py-2">No actions available at this stage.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
