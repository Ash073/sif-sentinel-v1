'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports';
import { dashboardApi } from '@/lib/api/dashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
  ArrowUpRight, ArrowDownRight, FilePlus, Download, 
  Search, Filter, Activity, ShieldAlert, CheckCircle2, ListTodo,
  ShieldCheck, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getSummary,
  });

  const { data: reportsData } = useQuery({
    queryKey: ['reports', 1, 10],
    queryFn: () => reportsApi.list({ page: 1, page_size: 10 }),
  });

  // Mock chart data matching the orange/black stacked layout from Finexy
  const chartData = [
    { month: 'Jan', total: 40, sif: 24 },
    { month: 'Feb', total: 30, sif: 13 },
    { month: 'Mar', total: 20, sif: 38 },
    { month: 'Apr', total: 27, sif: 19 },
    { month: 'May', total: 18, sif: 28 },
    { month: 'Jun', total: 23, sif: 18 },
    { month: 'Jul', total: 34, sif: 23 },
    { month: 'Aug', total: 20, sif: 15 },
  ];

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Header Area */}
      <div>
        <h1 className="text-[28px] font-medium text-slate-900 tracking-tight">Good morning, {user?.full_name?.split(' ')[0] || 'User'}</h1>
        <p className="text-[13px] text-slate-500 font-medium">Stay on top of your safety reports, monitor risk, and track precursors.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* =========================================
            LEFT COLUMN (3/12)
        ========================================= */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Main Metric Card (Like Total Balance) */}
          <div className="bg-white border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] rounded-[24px] p-6 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[13px] text-slate-500 font-medium">Total Reports Processed</span>
              <div className="flex items-center gap-1 bg-slate-50 rounded-full px-2 py-1 border border-slate-100">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-[10px] font-medium text-slate-600">LIVE</span>
              </div>
            </div>
            
            <div className="text-[40px] font-medium text-slate-900 tracking-tight leading-none mb-2">
              {stats?.total_reports.toLocaleString() || '12,450'}
            </div>
            
            <div className="flex items-center gap-2 mb-8">
              <div className="flex items-center text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                <ArrowUpRight className="w-3 h-3 mr-0.5" /> 12%
              </div>
              <span className="text-[12px] text-slate-400">than last month</span>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/reports/new" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-10 rounded-full flex items-center justify-center gap-2 text-[13px] font-medium transition-colors shadow-sm">
                <FilePlus className="w-4 h-4" /> New Report
              </Link>
              <button className="flex-1 bg-muted hover:bg-muted/80 border border-border text-foreground h-10 rounded-full flex items-center justify-center gap-2 text-[13px] font-medium transition-colors">
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
          </div>

          <div className="bg-card border border-border shadow-sm rounded-[24px] p-6">
             <div className="text-[14px] font-semibold text-foreground mb-6">Critical Interventions</div>
             <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden mb-2 relative">
                <div className="absolute top-0 left-0 h-full bg-orange-600 rounded-full" style={{ width: '35%' }}></div>
             </div>
             <div className="flex justify-between items-center text-[12px]">
               <span className="text-muted-foreground font-medium"><span className="text-foreground font-bold">35</span> active out of</span>
               <span className="text-muted-foreground font-medium">100 capacity</span>
             </div>
          </div>

          <div className="bg-card border border-border shadow-sm rounded-[24px] p-6 relative">
             <div className="flex justify-between items-center mb-6">
                <span className="text-[14px] font-semibold text-foreground">System Modules</span>
                <span className="text-[12px] text-primary font-medium cursor-pointer hover:underline">+ Add module</span>
             </div>
             
             <div className="relative h-[160px]">
                <div className="absolute top-0 left-0 w-[85%] h-[140px] bg-foreground rounded-[20px] p-5 flex flex-col justify-between text-background shadow-lg z-10 overflow-hidden">
                   <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                   <div className="flex items-center gap-2">
                     <ShieldCheck className="w-4 h-4" />
                     <span className="text-[11px] font-medium bg-white/20 px-2 py-0.5 rounded-full">NLP Engine</span>
                   </div>
                   <div>
                     <div className="text-[10px] text-slate-400 font-medium tracking-widest uppercase mb-1">Status</div>
                     <div className="text-[16px] font-semibold tracking-wide">ONLINE & ACTIVE</div>
                   </div>
                </div>

                <div className="absolute bottom-0 right-0 w-[80%] h-[130px] bg-orange-600 rounded-[20px] p-4 flex flex-col justify-between text-white shadow-xl z-20 overflow-hidden">
                   <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/20 rounded-full blur-md"></div>
                   <div className="flex justify-end">
                     <span className="text-[10px] font-medium bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">Risk Model</span>
                   </div>
                   <div>
                     <div className="text-[10px] text-orange-100 font-medium tracking-widest uppercase mb-1">Version</div>
                     <div className="text-[14px] font-semibold tracking-wide">v2.4.1</div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-9 flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-9 gap-6">
            <div className="lg:col-span-4 grid grid-cols-2 gap-4">
              <div className="bg-orange-600 rounded-[24px] p-5 text-white flex flex-col justify-between shadow-md">
                <div className="flex justify-between items-start">
                  <span className="text-[13px] font-medium text-orange-100">High SIF Potential</span>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <ShieldAlert className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div>
                  <div className="text-[28px] font-semibold tracking-tight mb-1">{stats?.total_sif_reports || '124'}</div>
                  <div className="flex items-center text-[11px] font-bold text-white bg-white/20 w-max px-1.5 py-0.5 rounded">
                    <ArrowUpRight className="w-3 h-3 mr-0.5" /> 8% This month
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-[24px] p-5 text-foreground flex flex-col justify-between shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-[13px] font-medium text-muted-foreground">Pending Reviews</span>
                  <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                    <ListTodo className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <div className="text-[28px] font-semibold tracking-tight mb-1">45</div>
                  <div className="flex items-center text-[11px] font-bold text-rose-600 bg-rose-500/10 w-max px-1.5 py-0.5 rounded">
                    <ArrowDownRight className="w-3 h-3 mr-0.5" /> 3% This month
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-[24px] p-5 text-foreground flex flex-col justify-between shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-[13px] font-medium text-muted-foreground">Active Precursors</span>
                  <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <div className="text-[28px] font-semibold tracking-tight mb-1">312</div>
                  <div className="flex items-center text-[11px] font-bold text-emerald-600 bg-emerald-500/10 w-max px-1.5 py-0.5 rounded">
                    <ArrowUpRight className="w-3 h-3 mr-0.5" /> 12% This month
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-[24px] p-5 text-foreground flex flex-col justify-between shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-[13px] font-medium text-muted-foreground">LSR Violations</span>
                  <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <div className="text-[28px] font-semibold tracking-tight mb-1">89</div>
                  <div className="flex items-center text-[11px] font-bold text-emerald-600 bg-emerald-500/10 w-max px-1.5 py-0.5 rounded">
                    <ArrowUpRight className="w-3 h-3 mr-0.5" /> 4% This month
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-card border border-border rounded-[24px] p-6 shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-[16px] font-semibold text-foreground">Safety Signal Volume</h3>
                  <p className="text-[12px] text-muted-foreground mt-1">Total reports vs High SIF Potential reports</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded bg-orange-500"></div>
                    <span className="text-[11px] font-medium text-muted-foreground">Total</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded bg-foreground"></div>
                    <span className="text-[11px] font-medium text-muted-foreground">SIF</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barGap={0} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                      tickFormatter={(val) => `${val}k`}
                    />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    />
                    <Bar dataKey="total" stackId="a" fill="#f97316" radius={[12, 12, 0, 0]} />
                    <Bar dataKey="sif" stackId="a" fill="hsl(var(--foreground))" radius={[0, 0, 12, 12]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-card border border-border rounded-[24px] p-6 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[16px] font-semibold text-foreground">Recent Reports</h3>
              <div className="flex gap-3">
                <div className="relative group">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 group-hover:text-foreground transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search" 
                    className="h-9 w-48 pl-9 pr-4 rounded-full border border-border text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-input"
                  />
                </div>
                <button className="h-9 px-4 rounded-full border border-border text-[12px] font-medium text-muted-foreground flex items-center gap-2 hover:bg-muted">
                  Filter <Filter className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 px-4 text-[12px] font-medium text-muted-foreground">Report ID</th>
                    <th className="py-3 px-4 text-[12px] font-medium text-muted-foreground">Title</th>
                    <th className="py-3 px-4 text-[12px] font-medium text-muted-foreground">SIF Potential</th>
                    <th className="py-3 px-4 text-[12px] font-medium text-muted-foreground">Status</th>
                    <th className="py-3 px-4 text-[12px] font-medium text-muted-foreground text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsData?.items?.slice(0, 5).map((report, idx) => (
                    <tr key={report.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-4 px-4 text-[13px] text-muted-foreground font-mono">
                        {report.id.slice(0, 8)}
                      </td>
                      <td className="py-4 px-4 text-[13px] font-medium text-foreground flex items-center gap-2">
                        {report.report_text.substring(0, 40)}...
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center text-[12px] font-medium ${
                          report.status !== 'NEW' ? 'text-orange-600' : 'text-muted-foreground'
                        }`}>
                          {report.status !== 'NEW' ? 'HIGH' : 'LOW'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Validated
                        </span>
                      </td>
                      <td className="py-4 px-4 text-[12px] text-muted-foreground text-right">
                        {new Date(report.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))}
                  {(!reportsData || reportsData.items.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground text-[13px]">
                        No recent reports found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
