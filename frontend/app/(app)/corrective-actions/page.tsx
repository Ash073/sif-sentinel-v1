'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { correctiveActionsApi } from '@/lib/api/corrective-actions';
import { ErrorState, TableSkeleton, EmptyState } from '@/components/ui/states';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/components/providers/AuthProvider';
import { ClipboardList, Plus } from 'lucide-react';
import type { CorrectiveActionRead, CorrectiveActionStatus } from '@/types/api';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700 border-amber-200',
  APPROVED: 'bg-blue-100 text-blue-700 border-blue-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
  IN_PROGRESS: 'bg-purple-100 text-purple-700 border-purple-200',
  PENDING_VERIFICATION: 'bg-orange-100 text-orange-700 border-orange-200',
  VERIFIED: 'bg-green-100 text-green-700 border-green-200',
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700 border-gray-200')}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function ActionRow({ action }: { action: CorrectiveActionRead }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManage = user && ['ADMIN', 'HSE_MANAGER'].includes(user.role);

  const approveMutation = useMutation({
    mutationFn: () => correctiveActionsApi.approve(action.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      toast.add({ title: 'Action approved', type: 'success' });
    },
    onError: () => toast.add({ title: 'Failed to approve', type: 'error' }),
  });

  const rejectMutation = useMutation({
    mutationFn: () => correctiveActionsApi.reject(action.id, { reason: 'Rejected from list view' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      toast.add({ title: 'Action rejected', type: 'success' });
    },
    onError: () => toast.add({ title: 'Failed to reject', type: 'error' }),
  });

  return (
    <tr className="border-b border-border/50 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-foreground">{action.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 font-mono">{action.intervention_code}</p>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{action.hierarchy_level}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{action.priority}</td>
      <td className="px-4 py-3"><StatusBadge status={action.status} /></td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {action.due_date ? (() => { try { return format(new Date(action.due_date), 'dd MMM yyyy'); } catch { return action.due_date; } })() : '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <Link href={`/corrective-actions/${action.id}`} className="inline-flex items-center h-7 px-2.5 rounded text-xs font-medium border border-border hover:bg-muted/50 transition-colors text-foreground">
            View
          </Link>
          {canManage && action.status === 'PENDING_APPROVAL' && (
            <>
              <Button size="sm" className="h-7 px-2.5 text-xs" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
                Approve
              </Button>
              <Button size="sm" variant="destructive" className="h-7 px-2.5 text-xs" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}>
                Reject
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function CorrectiveActionsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<CorrectiveActionStatus | 'ALL'>('ALL');

  const actionsQ = useQuery({
    queryKey: ['corrective-actions', 'list', { statusFilter }],
    queryFn: () => correctiveActionsApi.list({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    }),
    placeholderData: (prev) => prev,
    staleTime: 60 * 1000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Corrective Actions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {actionsQ.data ? `${actionsQ.data.length} total actions` : 'Loading...'}
          </p>
        </div>
        {user && ['ADMIN', 'HSE_MANAGER', 'HSE_ANALYST'].includes(user.role) && (
          <Link
            href="/corrective-actions/new"
            className="inline-flex items-center gap-2 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Action
          </Link>
        )}
      </div>

      <div className="border border-border rounded-xl p-4 bg-card flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Status:</span>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter((v ?? 'ALL') as typeof statusFilter); }}>
          <SelectTrigger className="w-[200px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'VERIFIED', 'CLOSED', 'CANCELLED'] as const).map(s => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-card">
        {actionsQ.isLoading && <div className="p-6"><TableSkeleton rows={5} cols={6} /></div>}
        {actionsQ.isError && <ErrorState title="Could not load corrective actions" onRetry={actionsQ.refetch} />}
        {actionsQ.data && actionsQ.data.length === 0 && (
          <EmptyState
            title="No corrective actions"
            description="No corrective actions match the current filter."
            icon={<ClipboardList className="h-7 w-7" />}
          />
        )}
        {actionsQ.data && actionsQ.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Corrective actions list">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title / Code</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Hierarchy</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priority</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Due Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {actionsQ.data.map((action) => (
                  <ActionRow key={action.id} action={action} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


    </div>
  );
}
