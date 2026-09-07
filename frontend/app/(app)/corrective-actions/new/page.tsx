'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { correctiveActionsApi } from '@/lib/api/corrective-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { ArrowLeft, Save } from 'lucide-react';
import type { CorrectiveActionCreate } from '@/types/api';

export default function NewCorrectiveActionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<CorrectiveActionCreate>({
    title: '',
    description: '',
    intervention_code: '',
    hierarchy_level: 'ADMINISTRATIVE',
    action_type: 'PROCEDURE_UPDATE',
    priority: 'MEDIUM',
    assigned_to: '',
    due_date: '',
    report_id: '',
  });

  const createMut = useMutation({
    mutationFn: () => correctiveActionsApi.create({
      ...form,
      report_id: form.report_id || undefined,
      assigned_to: form.assigned_to || undefined,
      due_date: form.due_date || undefined,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      toast.add({ title: 'Corrective action created', type: 'success' });
      router.push(`/corrective-actions/${data.id}`);
    },
    onError: () => toast.add({ title: 'Failed to create corrective action', type: 'error' }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.intervention_code) return;
    createMut.mutate();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/corrective-actions"
          className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">New Corrective Action</h1>
          <p className="text-sm text-muted-foreground">Create a new corrective action directly.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="intervention_code">Intervention Code *</Label>
              <Input
                id="intervention_code"
                value={form.intervention_code}
                onChange={(e) => setForm({ ...form, intervention_code: e.target.value })}
                placeholder="e.g., INT-1234"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report_id">Report ID (Optional)</Label>
              <Input
                id="report_id"
                value={form.report_id}
                onChange={(e) => setForm({ ...form, report_id: e.target.value })}
                placeholder="e.g., REP-1234"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Action title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detailed description of the corrective action"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hierarchy Level</Label>
              <Select value={form.hierarchy_level} onValueChange={(v) => setForm({ ...form, hierarchy_level: v as CorrectiveActionCreate['hierarchy_level'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ELIMINATION">Elimination</SelectItem>
                  <SelectItem value="SUBSTITUTION">Substitution</SelectItem>
                  <SelectItem value="ENGINEERING">Engineering</SelectItem>
                  <SelectItem value="ADMINISTRATIVE">Administrative</SelectItem>
                  <SelectItem value="PPE">PPE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select value={form.action_type} onValueChange={(v) => setForm({ ...form, action_type: v as CorrectiveActionCreate['action_type'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHYSICAL_MODIFICATION">Physical Modification</SelectItem>
                  <SelectItem value="PROCESS_CHANGE">Process Change</SelectItem>
                  <SelectItem value="PROCEDURE_UPDATE">Procedure Update</SelectItem>
                  <SelectItem value="TRAINING">Training</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="EQUIPMENT_REPLACEMENT">Equipment Replacement</SelectItem>
                  <SelectItem value="TOOLING_CHANGE">Tooling Change</SelectItem>
                  <SelectItem value="SIGNAGE_OR_WARNING">Signage / Warning</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as CorrectiveActionCreate['priority'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assign To</Label>
              <Input
                id="assigned_to"
                value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                placeholder="User email or name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" className="gap-2" disabled={createMut.isPending || !form.title || !form.description || !form.intervention_code}>
            <Save className="h-4 w-4" />
            {createMut.isPending ? 'Creating...' : 'Create Action'}
          </Button>
        </div>
      </form>
    </div>
  );
}
