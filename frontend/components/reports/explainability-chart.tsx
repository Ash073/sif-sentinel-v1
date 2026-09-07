"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExplainabilityFactor } from "@/types/api";

interface ExplainabilityChartProps {
  factors: ExplainabilityFactor[];
}

export function ExplainabilityChart({ factors }: ExplainabilityChartProps) {
  const chartData = useMemo(() => {
    // Sort by absolute contribution to show most impactful factors first
    return [...factors]
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .map((factor) => ({
        ...factor,
        // Ensure negative values represent DECREASES and positive INCREASES
        value: factor.direction === "DECREASES" ? -Math.abs(factor.contribution) : Math.abs(factor.contribution),
      }));
  }, [factors]);

  if (!factors || factors.length === 0) {
    return null;
  }

  // We should split Risk Engine factors and ML factors into two distinct charts 
  // because their scales differ wildly (0-100 vs 0-5). 
  // But let's check if there's only one type.
  const hasRisk = chartData.some(f => f.source === "RISK_ENGINE");
  const hasModel = chartData.some(f => f.source === "MODEL" || f.source === "MODEL_TFIDF");

  const riskFactors = chartData.filter(f => f.source === "RISK_ENGINE");
  const modelFactors = chartData.filter(f => f.source === "MODEL" || f.source === "MODEL_TFIDF");

  return (
    <div className="space-y-6">
      {hasRisk && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Deterministic Risk Components</CardTitle>
            <CardDescription>
              Authoritative risk factors derived from the structured evidence and hazard assessment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={riskFactors}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-slate-200 shadow-md rounded-md">
                            <p className="font-semibold text-sm mb-1">{data.name}</p>
                            <p className="text-sm text-slate-600 mb-2">{data.evidence}</p>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${data.value > 0 ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground"}`}>
                                {data.value > 0 ? "+" : ""}{data.value} Risk Score
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {riskFactors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value > 0 ? "#ef4444" : "#10b981"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {hasModel && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Predictive Model Factors</CardTitle>
            <CardDescription>
              Linguistic features contributing to the model's SIF classification probability.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={modelFactors}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReferenceLine x={0} stroke="#cbd5e1" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-slate-200 shadow-md rounded-md">
                            <p className="font-semibold text-sm mb-1">{data.name}</p>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${data.value > 0 ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground"}`}>
                                Weight: {data.value > 0 ? "+" : ""}{data.value}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {modelFactors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value > 0 ? "#f97316" : "#3b82f6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
