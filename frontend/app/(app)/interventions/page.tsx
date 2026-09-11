'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { interventionsApi } from '@/lib/api/interventions';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { AxiosError } from 'axios';
import type { ApiErrorBody, InterventionRead, InterventionReviewStatus } from '@/types/api';
import { ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle, ArrowRight, PlayCircle } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';

export default function InterventionsKanbanPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const summaryQ = useQuery({ queryKey: ['interventions', 'summary'], queryFn: interventionsApi.getSummary });
  const listQ = useQuery({
    queryKey: ['interventions', 'list'],
    queryFn: () => interventionsApi.list(),
  });

  const canReview = user != null && ['ADMIN', 'HSE_MANAGER', 'REVIEWER'].includes(user.role);

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: InterventionReviewStatus }) => 
      interventionsApi.review(id, { decision }),
    onMutate: async ({ id, decision }) => {
      // Optimistic UI update
      await queryClient.cancelQueries({ queryKey: ['interventions', 'list'] });
      const previousInterventions = queryClient.getQueryData<InterventionRead[]>(['interventions', 'list']);
      
      if (previousInterventions) {
        queryClient.setQueryData<InterventionRead[]>(['interventions', 'list'], old => 
          old ? old.map(i => i.id === id ? { ...i, review_status: decision } : i) : []
        );
      }
      return { previousInterventions };
    },
    onError: (err: AxiosError<ApiErrorBody>, newTodo, context) => {
      if (context?.previousInterventions) {
        queryClient.setQueryData(['interventions', 'list'], context.previousInterventions);
      }
      toast.add({ title: 'Failed to update', type: 'error' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions', 'summary'] });
    },
  });

  const handleAction = (intervention: InterventionRead, decision: InterventionReviewStatus) => {
    if (!canReview) return;
    reviewMutation.mutate({ id: intervention.id, decision });
    if (decision === 'ACCEPTED') toast.add({ title: 'Moved to In Progress', type: 'success' });
    if (decision === 'REJECTED') toast.add({ title: 'Moved to Closed', type: 'default' });
    if (decision === 'MODIFIED') toast.add({ title: 'Action Modified', type: 'success' });
  };

  const pending = listQ.data?.filter(i => i.review_status === 'PENDING') || [];
  const inProgress = listQ.data?.filter(i => i.review_status === 'ACCEPTED' || i.review_status === 'MODIFIED') || [];
  const closed = listQ.data?.filter(i => i.review_status === 'REJECTED') || [];

  const KanbanColumn = ({ 
    title, 
    items, 
    colorClass, 
    borderGlow,
    emptyText,
    icon: Icon 
  }: { 
    title: string; 
    items: InterventionRead[]; 
    colorClass: string; 
    borderGlow: string;
    emptyText: string;
    icon: React.ElementType;
  }) => (
    <div className={`flex flex-col h-full bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden shadow-lg ${borderGlow}`}>
      <div className={`p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/20`}>
        <h3 className={`font-semibold text-[13px] flex items-center gap-2 uppercase tracking-widest ${colorClass}`}>
          <Icon className="w-4 h-4" /> {title}
        </h3>
        <span className="text-xs font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
        {listQ.isLoading && (
          <>
            <Skeleton className="h-32 w-full rounded-xl bg-slate-800/50" />
            <Skeleton className="h-32 w-full rounded-xl bg-slate-800/50" />
          </>
        )}
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              key={item.id}
              className="bg-slate-950/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors group relative"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {item.category.replace(/_/g, ' ')}
                </span>
                {item.priority === 'CRITICAL' || item.priority === 'HIGH' ? (
                  <span title="High Priority"><AlertTriangle className="w-4 h-4 text-red-500" /></span>
                ) : null}
              </div>
              <h4 className="font-semibold text-white text-sm mb-1.5 leading-snug">{item.title}</h4>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
              
              {/* Quick Actions Footer */}
              {item.review_status === 'PENDING' && canReview && (
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleAction(item, 'REJECTED')}
                    className="h-7 w-7 rounded-lg flex items-center justify-center bg-slate-800/50 hover:bg-red-500/20 hover:text-red-400 text-slate-500 transition-colors"
                    title="Reject"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleAction(item, 'ACCEPTED')}
                    className="h-7 px-2.5 rounded-lg flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors text-xs font-medium"
                    title="Approve & Start"
                  >
                    <PlayCircle className="w-3.5 h-3.5" /> Approve
                  </button>
                </div>
              )}

              {item.review_status === 'ACCEPTED' && canReview && (
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleAction(item, 'REJECTED')} // "Complete" mapped to REJECTED just to move it to closed for the hackathon UI demo
                    className="h-7 px-2.5 rounded-lg flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors text-xs font-medium"
                    title="Verify & Close"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {!listQ.isLoading && items.length === 0 && (
          <div className="h-32 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center text-xs text-slate-500 text-center px-4">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] space-y-6">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            Corrective Action Hub
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Linear-style task management for AI-generated intervention recommendations.
          </p>
        </div>
        
        {/* Simple Summary */}
        <div className="flex items-center gap-6 bg-slate-900/60 border border-white/5 px-6 py-3 rounded-2xl">
           <div className="flex flex-col items-center">
             <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">Critical</span>
             <span className="text-xl font-bold text-red-400 leading-none">{summaryQ.data?.critical ?? 0}</span>
           </div>
           <div className="w-px h-8 bg-white/10" />
           <div className="flex flex-col items-center">
             <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">Pending</span>
             <span className="text-xl font-bold text-amber-400 leading-none">{summaryQ.data?.pending ?? 0}</span>
           </div>
        </div>
      </div>

      {listQ.isError && (
        <ErrorState title="Could not load interventions" onRetry={listQ.refetch} />
      )}

      {/* Kanban Board */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0">
        
        <KanbanColumn 
          title="Action Required" 
          items={pending} 
          colorClass="text-amber-400"
          borderGlow="border-t-amber-500/50 shadow-[0_-2px_15px_-3px_rgba(245,158,11,0.15)]"
          emptyText="No pending interventions. You are all caught up."
          icon={Clock}
        />

        <KanbanColumn 
          title="In Progress" 
          items={inProgress} 
          colorClass="text-blue-400"
          borderGlow="border-t-blue-500/50 shadow-[0_-2px_15px_-3px_rgba(59,130,246,0.15)]"
          emptyText="No approved interventions currently in progress."
          icon={ArrowRight}
        />

        <KanbanColumn 
          title="Verified & Closed" 
          items={closed} 
          colorClass="text-emerald-400"
          borderGlow="border-t-emerald-500/50 shadow-[0_-2px_15px_-3px_rgba(16,185,129,0.15)]"
          emptyText="No recently closed interventions."
          icon={CheckCircle2}
        />

      </div>
    </div>
  );
}
