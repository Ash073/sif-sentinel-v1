'use client';

import { useQuery } from '@tanstack/react-query';
import { modelsApi } from '@/lib/api/models';
import { ErrorState, Skeleton, EmptyState } from '@/components/ui/states';
import { Cpu, CheckCircle, Activity, AlertTriangle, ShieldX } from 'lucide-react';
import type { ModelMetadata } from '@/types/api';
import { format } from 'date-fns';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell
} from 'recharts';

function FnrGauge({ fnr }: { fnr: number }) {
  // Safe bounded FNR (0 to 1)
  const safeFnr = Math.max(0, Math.min(1, fnr));
  const percentage = (safeFnr * 100).toFixed(1);
  const isDanger = safeFnr > 0.05; // > 5% false negative is bad in safety

  // SVG Arc calculation
  const radius = 60;
  const circumference = Math.PI * radius; // Half circle
  const strokeDashoffset = circumference - (safeFnr * circumference);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-[140px] h-[70px] overflow-hidden">
        {/* Background Arc */}
        <svg className="absolute top-0 left-0 w-full h-[140px]" viewBox="0 0 140 140">
          <path
            d="M 10 70 A 60 60 0 0 1 130 70"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            className="text-slate-800"
          />
        </svg>
        {/* Foreground Arc */}
        <svg className="absolute top-0 left-0 w-full h-[140px]" viewBox="0 0 140 140">
          <path
            d="M 10 70 A 60 60 0 0 1 130 70"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            className={isDanger ? 'text-red-500' : 'text-emerald-500'}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
      </div>
      <div className="flex flex-col items-center mt-2">
        <span className={`text-2xl font-bold ${isDanger ? 'text-red-400' : 'text-emerald-400'}`}>
          {percentage}%
        </span>
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mt-1">
          False Negative Rate
        </span>
      </div>
    </div>
  );
}

function ModelCard({ model }: { model: ModelMetadata }) {
  const metricsQ = useQuery({
    queryKey: ['models', model.model_name, 'metrics'],
    queryFn: () => modelsApi.getMetrics(model.model_name),
    staleTime: 10 * 60 * 1000,
  });

  const data = metricsQ.data || {};
  const accuracy = (data.accuracy as number) || 0;
  const precision = (data.precision as number) || 0;
  const recall = (data.recall as number) || 0;
  const f1 = (data.f1_score as number) || 0;
  const fnr = (data.false_negative_rate as number) || (1 - recall); // Fallback if missing

  const radarData = [
    { metric: 'Accuracy', value: Math.round(accuracy * 100) },
    { metric: 'Precision', value: Math.round(precision * 100) },
    { metric: 'Recall', value: Math.round(recall * 100) },
    { metric: 'F1 Score', value: Math.round(f1 * 100) },
  ];

  return (
    <div className="border border-border/50 rounded-2xl overflow-hidden bg-slate-900/60 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="p-5 border-b border-white/5 bg-slate-950/30 flex justify-between items-start">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Cpu className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              {model.model_name}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                Active
              </span>
            </h2>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-xs font-mono text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded">
                v{model.model_version}
              </span>
              {model.model_type && (
                <span className="text-xs font-medium text-slate-400">
                  {String(model.model_type)}
                </span>
              )}
              {model.created_at && (
                <span className="text-xs text-slate-500 flex items-center gap-1 before:content-['•'] before:mr-1">
                  Deployed {(() => { try { return format(new Date(model.created_at), 'MMM dd, yyyy'); } catch { return model.created_at; } })()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Body */}
      <div className="p-6">
        {metricsQ.isLoading && <Skeleton className="h-64 w-full rounded-xl" />}
        {metricsQ.isError && <p className="text-sm text-slate-500">Metrics unavailable.</p>}
        {metricsQ.data && Object.keys(metricsQ.data).length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Core Metrics Radar */}
            <div className="flex flex-col items-center justify-center bg-slate-950/30 rounded-xl p-4 border border-white/5">
              <h3 className="text-[12px] font-semibold text-slate-400 uppercase tracking-widest w-full text-center mb-2">Performance Envelope</h3>
              <div className="w-full h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }}
                      itemStyle={{ color: '#34d399' }}
                    />
                    <Radar
                      name="Score (%)"
                      dataKey="value"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* FNR Gauge (Safety Critical) */}
            <div className="flex flex-col items-center justify-center bg-slate-950/30 rounded-xl p-4 border border-white/5 relative overflow-hidden">
              {fnr > 0.05 && <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />}
              <h3 className="text-[12px] font-semibold text-slate-400 uppercase tracking-widest w-full text-center mb-6">Safety Critical Metric</h3>
              <FnrGauge fnr={fnr} />
              <p className="text-[11px] text-slate-500 text-center mt-4 max-w-[200px]">
                Failure to predict a true SIF precursor. Must strictly remain below 5.0%.
              </p>
            </div>

            {/* Standard Bar Chart */}
            <div className="flex flex-col items-center justify-center bg-slate-950/30 rounded-xl p-4 border border-white/5">
               <h3 className="text-[12px] font-semibold text-slate-400 uppercase tracking-widest w-full text-center mb-4">Metric Distribution</h3>
               <div className="w-full h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={radarData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="metric" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={60} />
                    <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                      {radarData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.value > 85 ? '#10b981' : entry.value > 70 ? '#f59e0b' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackPanel() {
  const perfQ = useQuery({
    queryKey: ['models', 'performance'],
    queryFn: modelsApi.getPerformance,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-900/40 backdrop-blur-sm">
        <div className="p-5 border-b border-white/5 bg-slate-950/30 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-400" />
          <h3 className="font-semibold text-sm text-white">Offline Pipeline Telemetry</h3>
        </div>
        <div className="p-5">
          {perfQ.isLoading && <Skeleton className="h-24 w-full rounded-lg" />}
          {perfQ.isError && <p className="text-sm text-slate-500">Telemetry unavailable.</p>}
          {perfQ.data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(perfQ.data).map(([k, v]) => (
                <div key={k} className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest block mb-1">
                    {k.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xl font-bold text-white">
                    {typeof v === 'number' && v < 1 && v > 0 ? `${(v * 100).toFixed(2)}%` : String(v ?? '—')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ModelsPage() {
  const { user } = useAuth();
  
  // RBAC Protection
  if (user && !['ADMIN', 'HSE_ANALYST'].includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <ShieldX className="h-16 w-16 text-slate-600" />
        <h1 className="text-2xl font-bold text-white">Unauthorized Access</h1>
        <p className="text-slate-400">ML Ops Dashboard is restricted to Admin and HSE Analyst roles.</p>
      </div>
    );
  }

  const modelsQ = useQuery({
    queryKey: ['models'],
    queryFn: modelsApi.list,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
          <Cpu className="h-6 w-6 text-emerald-400" />
          ML Ops Command Center
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Live model inference telemetry, explainability engine health, and performance metrics.
        </p>
      </div>

      {modelsQ.isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
      )}

      {modelsQ.isError && (
        <ErrorState
          title="Could not load models"
          message="Failed to connect to the prediction engine."
          onRetry={modelsQ.refetch}
        />
      )}

      {modelsQ.data && modelsQ.data.length === 0 && (
        <EmptyState
          title="No models registered"
          description="No analysis models are currently loaded in the ML Ops registry."
          icon={<Cpu className="h-7 w-7" />}
        />
      )}

      {modelsQ.data && modelsQ.data.length > 0 && (
        <>
          <div className="space-y-6">
            {modelsQ.data.map((model) => (
              <ModelCard key={model.model_name} model={model} />
            ))}
          </div>
          <FeedbackPanel />
        </>
      )}

      <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
        <AlertTriangle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300/80 leading-relaxed">
          <strong className="text-blue-300">Metric Definitions:</strong> <strong>Accuracy</strong> measures overall correctness across all classes. <strong>Precision</strong> measures the accuracy of positive SIF predictions (minimizing false alarms). <strong>Recall</strong> measures the ability to find all actual SIFs. <strong>F1-Score</strong> is the harmonic mean of precision and recall.
        </p>
      </div>
    </div>
  );
}
