'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { reportsApi } from '@/lib/api/reports';
import { sitesApi } from '@/lib/api/sites';
import { ErrorState, TableSkeleton, EmptyState } from '@/components/ui/states';
import { ReportStatusBadge } from '@/components/ui/status-badges';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FilePlus, Search, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import type { ReportType, ReportStatus } from '@/types/api';
import { format } from 'date-fns';

const REPORT_TYPE_OPTIONS: { label: string; value: ReportType }[] = [
  { label: 'Unsafe Act', value: 'UNSAFE_ACT' },
  { label: 'Unsafe Condition', value: 'UNSAFE_CONDITION' },
  { label: 'Near Miss', value: 'NEAR_MISS' },
  { label: 'Incident', value: 'INCIDENT' },
];

const REPORT_STATUS_OPTIONS: { label: string; value: ReportStatus }[] = [
  { label: 'New', value: 'NEW' },
  { label: 'Analyzed', value: 'ANALYZED' },
  { label: 'Review Required', value: 'REVIEW_REQUIRED' },
  { label: 'Reviewed', value: 'REVIEWED' },
  { label: 'Closed', value: 'CLOSED' },
];

export default function ReportsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [reportType, setReportType] = useState<ReportType | ''>('');
  const [status, setStatus] = useState<ReportStatus | ''>('');
  const [siteId, setSiteId] = useState('');

  const sitesQ = useQuery({ queryKey: ['sites'], queryFn: sitesApi.list, staleTime: 5 * 60 * 1000 });

  const reportsQ = useQuery({
    queryKey: ['reports', 'list', { page, search: debouncedSearch, reportType, status, siteId }],
    queryFn: () => reportsApi.list({
      page,
      page_size: 20,
      search: debouncedSearch || undefined,
      report_type: reportType || undefined,
      status: status || undefined,
      site_id: siteId || undefined,
    }),
    placeholderData: (prev) => prev,
  });

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setDebouncedSearch(search);
      setPage(1);
    }
  };

  const totalPages = reportsQ.data ? Math.ceil(reportsQ.data.total / 20) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {reportsQ.data ? `${reportsQ.data.total} total reports` : 'Loading...'}
          </p>
        </div>
        <Link
          href="/reports/new"
          className="inline-flex items-center gap-2 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
        >
          <FilePlus className="h-4 w-4" />
          New Report
        </Link>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports... (press Enter)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9"
            aria-label="Search reports"
          />
        </div>
        <Select value={reportType || 'all'} onValueChange={(v) => { setReportType((v ?? 'all') === 'all' ? '' : (v ?? '') as ReportType); setPage(1); }}>
          <SelectTrigger className="w-[180px]" aria-label="Filter by type">
            <SelectValue placeholder="Report type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {REPORT_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status || 'all'} onValueChange={(v) => { setStatus((v ?? 'all') === 'all' ? '' : (v ?? '') as ReportStatus); setPage(1); }}>
          <SelectTrigger className="w-[180px]" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {REPORT_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={siteId || 'all'} onValueChange={(v) => { setSiteId((v ?? 'all') === 'all' ? '' : (v ?? '')); setPage(1); }}>
          <SelectTrigger className="w-[180px]" aria-label="Filter by site">
            <SelectValue placeholder="Site" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {(sitesQ.data ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {reportsQ.isLoading && (
          <div className="p-6">
            <TableSkeleton rows={6} cols={5} />
          </div>
        )}
        {reportsQ.isError && (
          <ErrorState
            title="Could not load reports"
            message="Please try again or check the backend connection."
            onRetry={reportsQ.refetch}
          />
        )}
        {reportsQ.data && reportsQ.data.items.length === 0 && (
          <EmptyState
            title="No reports found"
            description="Try adjusting your filters or submit a new safety report."
            icon={<FileText className="h-7 w-7" />}
            action={
              <Link href="/reports/new" className="inline-flex items-center gap-2 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/80 transition-colors">
                Submit Report
              </Link>
            }
          />
        )}
        {reportsQ.data && reportsQ.data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table" aria-label="Reports list">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Report ID</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reported At</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reportsQ.data.items.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-primary">{report.report_id}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">
                      {report.report_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <ReportStatusBadge status={report.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{report.department}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {(() => { try { return format(new Date(report.reported_at), 'dd MMM yyyy HH:mm'); } catch { return report.reported_at; } })()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/reports/${report.report_id}`}
                        className="inline-flex items-center h-7 px-2.5 rounded-lg text-xs font-medium border border-border hover:bg-muted/50 transition-colors text-foreground"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {reportsQ.data && reportsQ.data.total > 20 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages} ({reportsQ.data.total} reports)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
