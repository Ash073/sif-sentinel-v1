'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { reportsApi } from '@/lib/api/reports';
import { ErrorState, EmptyState } from '@/components/ui/states';
import { ReportStatusBadge } from '@/components/ui/status-badges';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FilePlus, Search, ChevronLeft, ChevronRight, FileText, ChevronRightIcon } from 'lucide-react';
import type { ReportStatus, SIFLevel, ReportRead } from '@/types/api';
import { format } from 'date-fns';

// Custom Debounce Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const REPORT_STATUS_OPTIONS: { label: string; value: ReportStatus }[] = [
  { label: 'New', value: 'NEW' },
  { label: 'Analyzed', value: 'ANALYZED' },
  { label: 'Reviewed', value: 'REVIEWED' },
];

const SIF_LEVEL_OPTIONS: { label: string; value: SIFLevel }[] = [
  { label: 'HIGH', value: 'HIGH' },
  { label: 'MEDIUM', value: 'MEDIUM' },
  { label: 'LOW', value: 'LOW' },
  { label: 'NON-SIF', value: 'NON_SIF' },
];

// Helper to safely render SIF Level Badges
function SifBadge({ level }: { level?: string | null }) {
  if (!level) return <span className="text-slate-500 text-xs">—</span>;
  const l = level.toUpperCase();
  if (l === 'HIGH' || l === 'CRITICAL') {
    return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30 tracking-wider">HIGH</span>;
  }
  if (l === 'MEDIUM') {
    return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 tracking-wider">MEDIUM</span>;
  }
  if (l === 'LOW') {
    return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 tracking-wider">LOW</span>;
  }
  return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-slate-800 text-slate-400 border border-slate-700 tracking-wider">NON-SIF</span>;
}

// Table Skeleton
function TableSkeleton() {
  return (
    <div className="animate-pulse flex flex-col space-y-4 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 bg-slate-800/50 rounded-lg w-full" />
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  
  // States
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  
  const [sifLevel, setSifLevel] = useState<SIFLevel | ''>('');
  const [status, setStatus] = useState<ReportStatus | ''>('');

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, sifLevel, status]);

  const reportsQ = useQuery({
    queryKey: ['reports', 'list', { page, search: debouncedSearch, sifLevel, status }],
    queryFn: () => reportsApi.list({
      page,
      page_size: 20,
      search: debouncedSearch || undefined,
      sif_level: sifLevel || undefined,
      status: status || undefined,
    }),
    placeholderData: (prev) => prev,
  });

  const totalPages = reportsQ.data ? Math.ceil(reportsQ.data.total / 20) : 1;

  return (
    <div className="space-y-6 flex flex-col h-full pb-10">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-400" />
            Safety Observation Ledger
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enterprise data grid for querying structured and unstructured safety reports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/reports/new"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold transition-all shadow-lg shadow-blue-900/20"
          >
            <FilePlus className="h-4 w-4" />
            New Entry
          </Link>
        </div>
      </div>

      {/* Enterprise Filter Bar */}
      <div className="bg-slate-900/60 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        
        {/* Search */}
        <div className="relative flex-1 w-full max-w-md">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${searchTerm !== debouncedSearch ? 'text-blue-400 animate-pulse' : 'text-slate-500'}`} />
          <Input
            placeholder="Search incident descriptions, locations, or IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-slate-950/50 border-white/10 text-sm focus-visible:ring-blue-500 rounded-xl w-full"
            aria-label="Search reports"
          />
          {searchTerm !== debouncedSearch && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
            </div>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={sifLevel || 'ALL'} onValueChange={(v) => setSifLevel(v === 'ALL' ? '' : v as SIFLevel)}>
            <SelectTrigger className="w-[160px] h-10 bg-slate-950/50 border-white/10 rounded-xl text-sm">
              <SelectValue placeholder="SIF Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Risk Levels</SelectItem>
              {SIF_LEVEL_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status || 'ALL'} onValueChange={(v) => setStatus(v === 'ALL' ? '' : v as ReportStatus)}>
            <SelectTrigger className="w-[160px] h-10 bg-slate-950/50 border-white/10 rounded-xl text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {REPORT_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Grid */}
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex-1 flex flex-col">
        {reportsQ.isLoading || (searchTerm !== debouncedSearch) ? (
          <TableSkeleton />
        ) : reportsQ.isError ? (
          <ErrorState
            title="Could not load reports"
            message="Please try again or check the backend connection."
            onRetry={reportsQ.refetch}
          />
        ) : reportsQ.data?.items.length === 0 ? (
          <EmptyState
            title="No reports match your filters"
            description="Try broadening your search criteria."
            icon={<FileText className="h-7 w-7" />}
          />
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse" role="grid">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/40">
                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">Report ID</th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">Date Reported</th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">Hazard Category</th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">SIF Level</th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap text-center">Status</th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reportsQ.data?.items.map((r: any) => (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/reports/${r.report_id}`)}
                    className="group hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-mono text-[13px] font-medium text-blue-400 group-hover:text-blue-300 transition-colors">
                        {r.report_id}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 max-w-[200px] truncate">
                        {r.location}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-slate-300 whitespace-nowrap">
                      {(() => { try { return format(new Date(r.reported_at), 'MMM dd, yyyy'); } catch { return r.reported_at; } })()}
                      <div className="text-[11px] text-slate-500 mt-0.5">{(() => { try { return format(new Date(r.reported_at), 'HH:mm'); } catch { return ''; } })()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[13px] font-medium text-slate-200 capitalize">
                        {r.hazard_category || r.report_type?.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <SifBadge level={r.sif_level} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ReportStatusBadge status={r.status} />
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 group-hover:text-blue-400 transition-colors">
                      <div className="flex justify-end w-full">
                        <ChevronRightIcon className="w-5 h-5" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination Footer */}
        {reportsQ.data && reportsQ.data.total > 0 && (
          <div className="p-4 border-t border-white/5 bg-slate-950/20 flex items-center justify-between text-sm text-slate-400">
            <span>
              Showing <strong className="text-white">{(page - 1) * 20 + 1}</strong> to <strong className="text-white">{Math.min(page * 20, reportsQ.data.total)}</strong> of <strong className="text-white">{reportsQ.data.total}</strong> entries
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-slate-900 border-white/10 hover:bg-slate-800"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-slate-900 border-white/10 hover:bg-slate-800"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
