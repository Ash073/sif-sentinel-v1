'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

const formSchema = z.object({
  report_type: z.enum(['UNSAFE_ACT', 'UNSAFE_CONDITION', 'NEAR_MISS', 'INCIDENT'], { message: 'Report type is required' }),
  site_id: z.string().min(1, 'Site is required'),
  location: z.string().min(1, 'Location is required'),
  department: z.string().min(1, 'Department is required'),
  activity: z.string().optional(),
  source_type: z.enum(['USER_SUBMITTED', 'PUBLIC', 'IMPORTED', 'SYNTHETIC'], { message: 'Source type is required' }),
  reported_at: z.string().min(1, 'Reported date/time is required'),
  report_id: z.string().optional(),
  report_text: z.string().min(10, 'Report narrative must be at least 10 characters'),
});

type FormData = z.infer<typeof formSchema>;

export default function NewReportPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [successData, setSuccessData] = useState<{ report_id: string } | null>(null);

  const sitesQ = useQuery({ queryKey: ['sites'], queryFn: sitesApi.list, staleTime: 5 * 60 * 1000 });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      report_type: undefined,
      site_id: '',
      location: '',
      department: '',
      activity: '',
      source_type: 'USER_SUBMITTED',
      reported_at: new Date().toISOString().slice(0, 16),
      report_id: '',
      report_text: '',
    }
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => reportsApi.create({
      report_id: data.report_id || undefined,
      report_type: data.report_type as ReportType,
      report_text: data.report_text,
      site_id: data.site_id,
      location: data.location,
      department: data.department,
      activity: data.activity || undefined,
      reported_at: new Date(data.reported_at).toISOString(),
      source_type: data.source_type as SourceType,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setSuccessData({ report_id: data.report_id });
      toast.add({ title: 'Report submitted', description: `Successfully created report ${data.report_id}`, type: 'success' });
    },
    onError: (error: AxiosError<ApiErrorBody>) => {
      const msg = error.response?.data?.error?.message ?? 'Failed to create report';
      toast.add({ title: 'Submission failed', description: msg, type: 'error' });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center space-y-6 bg-white p-12 rounded-3xl border border-slate-100 shadow-sm">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Report Submitted Successfully</h2>
        <p className="text-slate-500">Your report has been saved. The AI engine is currently analyzing it for SIF potential and extracting precursor patterns.</p>
        
        <div className="pt-8 flex gap-4 justify-center">
          <Button variant="outline" onClick={() => {
            reset();
            setSuccessData(null);
          }}>
            Submit Another
          </Button>
          <Button onClick={() => router.push(`/reports/${successData.report_id}`)}>
            View Report & Analysis
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Submit New Report</h1>
          <p className="text-sm text-slate-500 mt-0.5">Record a safety incident, near-miss, or unsafe condition</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="bg-white border border-slate-200 rounded-2xl p-8 space-y-8 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
          {/* Report Type */}
          <div className="space-y-2">
            <Label htmlFor="report_type">Report Type <span className="text-red-500">*</span></Label>
            <Select onValueChange={(v) => setValue('report_type', v as any)} defaultValue={watch('report_type')}>
              <SelectTrigger id="report_type" className={errors.report_type ? "border-red-500" : ""}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNSAFE_ACT">Unsafe Act</SelectItem>
                <SelectItem value="UNSAFE_CONDITION">Unsafe Condition</SelectItem>
                <SelectItem value="NEAR_MISS">Near Miss</SelectItem>
                <SelectItem value="INCIDENT">Incident</SelectItem>
              </SelectContent>
            </Select>
            {errors.report_type && <p className="text-[11px] font-medium text-red-500">{errors.report_type.message}</p>}
          </div>

          {/* Site */}
          <div className="space-y-2">
            <Label htmlFor="site_id">Site <span className="text-red-500">*</span></Label>
            <Select onValueChange={(v) => { if (v) setValue('site_id', v); }} defaultValue={watch('site_id') || ''}>
              <SelectTrigger id="site_id" className={errors.site_id ? "border-red-500" : ""}>
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent>
                {sitesQ.isLoading && <SelectItem value="__loading__" disabled>Loading sites...</SelectItem>}
                {(sitesQ.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                ))}
                {sitesQ.data?.length === 0 && (
                  <SelectItem value="__none__" disabled>No sites available</SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.site_id && <p className="text-[11px] font-medium text-red-500">{errors.site_id.message}</p>}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location <span className="text-red-500">*</span></Label>
            <Input id="location" {...register('location')} placeholder="e.g. Pump Station 3, North Wing" className={errors.location ? "border-red-500" : ""} />
            {errors.location && <p className="text-[11px] font-medium text-red-500">{errors.location.message}</p>}
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
            <Input id="department" {...register('department')} placeholder="e.g. Operations, Maintenance" className={errors.department ? "border-red-500" : ""} />
            {errors.department && <p className="text-[11px] font-medium text-red-500">{errors.department.message}</p>}
          </div>

          {/* Activity */}
          <div className="space-y-2">
            <Label htmlFor="activity">Activity <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input id="activity" {...register('activity')} placeholder="e.g. Excavation, Confined Space Entry" />
          </div>

          {/* Source Type */}
          <div className="space-y-2">
            <Label htmlFor="source_type">Source Type <span className="text-red-500">*</span></Label>
            <Select onValueChange={(v) => setValue('source_type', v as any)} defaultValue={watch('source_type')}>
              <SelectTrigger id="source_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER_SUBMITTED">User Submitted</SelectItem>
                <SelectItem value="PUBLIC">Public</SelectItem>
                <SelectItem value="IMPORTED">Imported</SelectItem>
                <SelectItem value="SYNTHETIC">Synthetic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reported At */}
          <div className="space-y-2">
            <Label htmlFor="reported_at">Reported At <span className="text-red-500">*</span></Label>
            <Input id="reported_at" type="datetime-local" {...register('reported_at')} className={errors.reported_at ? "border-red-500" : ""} />
            {errors.reported_at && <p className="text-[11px] font-medium text-red-500">{errors.reported_at.message}</p>}
          </div>

          {/* Report ID */}
          <div className="space-y-2">
            <Label htmlFor="report_id">Custom Report ID <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input id="report_id" {...register('report_id')} placeholder="Leave blank to auto-generate" className="font-mono" />
          </div>
        </div>

        {/* Narrative */}
        <div className="space-y-2 pt-4 border-t border-slate-100">
          <Label htmlFor="report_text" className="text-base">Report Narrative <span className="text-red-500">*</span></Label>
          <p className="text-xs text-slate-500 pb-2">Describe the incident, hazard, or unsafe condition in detail. The SIF analysis model will process this text.</p>
          <Textarea
            id="report_text"
            {...register('report_text')}
            placeholder="Describe what happened, where, and the conditions involved..."
            rows={8}
            className={`resize-y text-sm ${errors.report_text ? "border-red-500" : ""}`}
          />
          <div className="flex justify-between">
            {errors.report_text ? (
               <p className="text-[11px] font-medium text-red-500">{errors.report_text.message}</p>
            ) : <span />}
            <p className="text-[11px] font-medium text-slate-400">{watch('report_text')?.length || 0} characters</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <Link href="/reports">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={mutation.isPending} className="gap-2 px-8">
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mutation.isPending ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </form>
    </div>
  );
}
