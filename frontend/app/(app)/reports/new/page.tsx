'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { reportsApi } from '@/lib/api/reports';
import { sitesApi } from '@/lib/api/sites';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { AxiosError } from 'axios';
import type { ApiErrorBody, ReportType, SourceType } from '@/types/api';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

const REPORT_TYPE_OPTIONS: { label: string; value: ReportType }[] = [
  { label: 'Unsafe Act', value: 'UNSAFE_ACT' },
  { label: 'Unsafe Condition', value: 'UNSAFE_CONDITION' },
  { label: 'Near Miss', value: 'NEAR_MISS' },
  { label: 'Incident', value: 'INCIDENT' },
];

const SOURCE_TYPE_OPTIONS: { label: string; value: SourceType }[] = [
  { label: 'User Submitted', value: 'USER_SUBMITTED' },
  { label: 'Public', value: 'PUBLIC' },
  { label: 'Imported', value: 'IMPORTED' },
  { label: 'Synthetic', value: 'SYNTHETIC' },
];

interface FormErrors {
  report_type?: string;
  report_text?: string;
  site_id?: string;
  location?: string;
  department?: string;
  reported_at?: string;
  source_type?: string;
}

export default function NewReportPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const sitesQ = useQuery({ queryKey: ['sites'], queryFn: sitesApi.list, staleTime: 5 * 60 * 1000 });

  const [form, setForm] = useState({
    report_id: '',
    report_type: '' as ReportType | '',
    report_text: '',
    site_id: '',
    location: '',
    department: '',
    activity: '',
    reported_at: new Date().toISOString().slice(0, 16),
    source_type: 'USER_SUBMITTED' as SourceType,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const mutation = useMutation({
    mutationFn: () => reportsApi.create({
      report_id: form.report_id || undefined,
      report_type: form.report_type as ReportType,
      report_text: form.report_text,
      site_id: form.site_id,
      location: form.location,
      department: form.department,
      activity: form.activity || undefined,
      reported_at: new Date(form.reported_at).toISOString(),
      source_type: form.source_type,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.add({ title: 'Report created', description: `Report ${data.report_id} submitted successfully.`, type: 'success' });
      router.push(`/reports/${data.report_id}`);
    },
    onError: (error: AxiosError<ApiErrorBody>) => {
      const msg = error.response?.data?.error?.message ?? 'Failed to create report';
      toast.add({ title: 'Submission failed', description: msg, type: 'error' });
    },
  });

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.report_type) e.report_type = 'Report type is required';
    if (!form.report_text.trim()) e.report_text = 'Report narrative is required';
    if (!form.site_id) e.site_id = 'Site is required';
    if (!form.location.trim()) e.location = 'Location is required';
    if (!form.department.trim()) e.department = 'Department is required';
    if (!form.reported_at) e.reported_at = 'Reported date/time is required';
    if (!form.source_type) e.source_type = 'Source type is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) mutation.mutate();
  };

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/reports"
          className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Submit New Report</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Record a safety incident, near-miss, or unsafe condition</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="glass-card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Report Type */}
          <div className="space-y-1.5">
            <Label htmlFor="report_type">Report Type *</Label>
            <Select value={form.report_type} onValueChange={(v) => set('report_type')(v ?? '')}>
              <SelectTrigger id="report_type" aria-invalid={!!errors.report_type} aria-describedby="report_type_err">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.report_type && <p id="report_type_err" role="alert" className="text-xs text-destructive">{errors.report_type}</p>}
          </div>

          {/* Site */}
          <div className="space-y-1.5">
            <Label htmlFor="site_id">Site *</Label>
            <Select value={form.site_id} onValueChange={(v) => set('site_id')(v ?? '')}>
              <SelectTrigger id="site_id" aria-invalid={!!errors.site_id} aria-describedby="site_err">
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent>
                {sitesQ.isLoading && <SelectItem value="__loading__" disabled>Loading sites...</SelectItem>}
                {(sitesQ.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                ))}
                {sitesQ.data?.length === 0 && (
                  <SelectItem value="__none__" disabled>No sites available — create one first</SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.site_id && <p id="site_err" role="alert" className="text-xs text-destructive">{errors.site_id}</p>}
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={form.location}
              onChange={(e) => set('location')(e.target.value)}
              placeholder="e.g. Pump Station 3, North Wing"
              aria-invalid={!!errors.location}
              aria-describedby="location_err"
            />
            {errors.location && <p id="location_err" role="alert" className="text-xs text-destructive">{errors.location}</p>}
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <Label htmlFor="department">Department *</Label>
            <Input
              id="department"
              value={form.department}
              onChange={(e) => set('department')(e.target.value)}
              placeholder="e.g. Operations, Maintenance"
              aria-invalid={!!errors.department}
              aria-describedby="dept_err"
            />
            {errors.department && <p id="dept_err" role="alert" className="text-xs text-destructive">{errors.department}</p>}
          </div>

          {/* Activity */}
          <div className="space-y-1.5">
            <Label htmlFor="activity">Activity (optional)</Label>
            <Input
              id="activity"
              value={form.activity}
              onChange={(e) => set('activity')(e.target.value)}
              placeholder="e.g. Excavation, Confined Space Entry"
            />
          </div>

          {/* Source Type */}
          <div className="space-y-1.5">
            <Label htmlFor="source_type">Source Type *</Label>
            <Select value={form.source_type} onValueChange={(v) => set('source_type')(v ?? 'USER_SUBMITTED')}>
              <SelectTrigger id="source_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reported At */}
          <div className="space-y-1.5">
            <Label htmlFor="reported_at">Reported At *</Label>
            <Input
              id="reported_at"
              type="datetime-local"
              value={form.reported_at}
              onChange={(e) => set('reported_at')(e.target.value)}
              aria-invalid={!!errors.reported_at}
            />
            {errors.reported_at && <p role="alert" className="text-xs text-destructive">{errors.reported_at}</p>}
          </div>

          {/* Report ID (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="report_id">Custom Report ID (optional)</Label>
            <Input
              id="report_id"
              value={form.report_id}
              onChange={(e) => set('report_id')(e.target.value)}
              placeholder="Leave blank to auto-generate"
              className="font-mono"
            />
          </div>
        </div>

        {/* Narrative */}
        <div className="space-y-1.5">
          <Label htmlFor="report_text">Report Narrative *</Label>
          <p className="text-xs text-muted-foreground">
            Describe the incident, hazard, or unsafe condition in detail. The SIF analysis model will process this text.
          </p>
          <Textarea
            id="report_text"
            value={form.report_text}
            onChange={(e) => set('report_text')(e.target.value)}
            placeholder="Describe what happened, where, and the conditions involved..."
            rows={8}
            aria-invalid={!!errors.report_text}
            aria-describedby="text_err"
            className="resize-y font-sans text-sm"
          />
          <div className="flex justify-between">
            {errors.report_text && <p id="text_err" role="alert" className="text-xs text-destructive">{errors.report_text}</p>}
            <p className="text-xs text-muted-foreground ml-auto">{form.report_text.length} characters</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/reports" className="inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium border border-border hover:bg-muted/50 transition-colors text-foreground">Cancel</Link>
          <Button type="submit" disabled={mutation.isPending} className="gap-2">
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mutation.isPending ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </form>
    </div>
  );
}
