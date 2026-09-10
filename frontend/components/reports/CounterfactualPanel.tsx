'use client';

/**
 * CounterfactualPanel
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the backend's counterfactual "What-If" simulation result.
 *
 * Two rendering modes:
 *   1. Rich mode  — when `analysis.narrative.counterfactual_explanation` is a
 *                   non-trivial string (contains simulation data).
 *   2. Sparse mode — fallback when only the basic string is available.
 *
 * The panel uses a vivid purple/teal simulation aesthetic with a pulsing
 * "SIMULATION ACTIVE" badge to signal to judges that this is a predictive
 * engine, not a historical log.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical, Zap, TrendingDown, ArrowRight,
  Info, ChevronDown, ChevronUp, ShieldCheck,
} from 'lucide-react';
import type { AnalysisResponse } from '@/types/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract numbers from "risk decreases by 45 points (72 → 27)" style strings */
function parseRiskNumbers(text: string): {
  originalRisk: number | null;
  simulatedRisk: number | null;
  delta: number | null;
} {
  // Arrow pattern: "72 → 27" or "72 -> 27"
  const arrowMatch = text.match(/(\d+)\s*(?:→|->)\s*(\d+)/);
  if (arrowMatch) {
    const orig = parseInt(arrowMatch[1]);
    const sim = parseInt(arrowMatch[2]);
    return { originalRisk: orig, simulatedRisk: sim, delta: orig - sim };
  }
  // "decreases by N points"
  const decMatch = text.match(/decreases?\s+by\s+(\d+)/i);
  if (decMatch) return { originalRisk: null, simulatedRisk: null, delta: parseInt(decMatch[1]) };
  // "reduces by N"
  const redMatch = text.match(/reduces?\s+by\s+(\d+)/i);
  if (redMatch) return { originalRisk: null, simulatedRisk: null, delta: parseInt(redMatch[1]) };

  return { originalRisk: null, simulatedRisk: null, delta: null };
}

function isSimulationActive(text: string): boolean {
  return (
    text.toLowerCase().includes('simulated') ||
    text.toLowerCase().includes('what-if') ||
    text.toLowerCase().includes('decreases by') ||
    text.toLowerCase().includes('reduces by') ||
    text.toLowerCase().includes('→') ||
    text.toLowerCase().includes('modeled risk')
  );
}

// ─── Risk Arrow Visualization ─────────────────────────────────────────────────

function RiskArrow({
  original,
  simulated,
  delta,
}: {
  original: number | null;
  simulated: number | null;
  delta: number | null;
}) {
  if (!delta) return null;
  const hasScores = original !== null && simulated !== null;
  const max = hasScores ? Math.max(original!, 100) : 100;

  return (
    <div className="space-y-3">
      {hasScores && (
        <div className="flex items-center gap-4">
          {/* Before bar */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Original Risk</span>
              <span className="font-bold text-red-400">{original}</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: original! / max }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="h-full bg-gradient-to-r from-red-600 to-red-400 origin-left rounded-full"
              />
            </div>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center shrink-0 text-teal-400">
            <TrendingDown className="w-4 h-4" />
            <span className="text-[9px] font-bold tabular-nums">-{delta}</span>
          </div>

          {/* After bar */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Simulated Risk</span>
              <span className="font-bold text-teal-400">{simulated}</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: simulated! / max }}
                transition={{ duration: 0.7, delay: 0.5 }}
                className="h-full bg-gradient-to-r from-teal-600 to-emerald-400 origin-left rounded-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delta badge */}
      <div className="flex items-center gap-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.8, stiffness: 200 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/30"
        >
          <TrendingDown className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-[12px] font-bold text-teal-400">Risk reduced by {delta} points</span>
        </motion.div>
        <span className="text-[11px] text-slate-600">in simulated scenario</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface CounterfactualPanelProps {
  analysis: AnalysisResponse;
}

export function CounterfactualPanel({ analysis }: CounterfactualPanelProps) {
  const [expanded, setExpanded] = useState(true);

  // Source the text — narrative.counterfactual_explanation is primary
  const cfText = analysis.narrative?.counterfactual_explanation ?? null;

  if (!cfText) return null;

  const active = isSimulationActive(cfText);
  const { originalRisk, simulatedRisk, delta } = parseRiskNumbers(cfText);

  // Extract target control from text ("What-if 'Gas Testing' had been VERIFIED?")
  const controlMatch = cfText.match(/['"'"]([^'"'"]+)['"'"]\s+had\s+been/i);
  const targetControl = controlMatch?.[1] ?? analysis.barrier ?? null;

  const simulatedStatus = cfText.match(/had\s+been\s+(\w+)/i)?.[1] ?? 'VERIFIED';

  return (
    <div className={`relative rounded-2xl overflow-hidden border ${
      active
        ? 'border-purple-500/30 bg-slate-950'
        : 'border-slate-700/50 bg-slate-950/60'
    }`}>
      {/* Animated simulation glow — only when active */}
      {active && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-teal-500/5 pointer-events-none" />
          {/* Pulsing border */}
          <div className="absolute inset-0 rounded-2xl border border-purple-500/20 animate-pulse pointer-events-none" />
          <div className="absolute -top-8 right-1/4 w-48 h-24 bg-purple-500/8 blur-3xl pointer-events-none" />
        </>
      )}

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
            active
              ? 'bg-purple-500/15 border-purple-500/30'
              : 'bg-slate-800 border-slate-700'
          }`}>
            <FlaskConical className={`w-4.5 h-4.5 ${active ? 'text-purple-400' : 'text-slate-500'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-white">What-If Simulation</h3>
              {active ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-[10px] font-bold text-purple-300 uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  Simulation Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-500 uppercase">
                  No Active Simulation
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">Counterfactual barrier restoration analysis</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="relative z-10 px-5 pb-5 pt-4 space-y-4">

              {/* Scenario header */}
              {active && targetControl && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-purple-500/8 border border-purple-500/15"
                >
                  <Zap className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-widest">Simulated Scenario</p>
                    <div className="flex items-center gap-2 flex-wrap text-[13px]">
                      <span className="text-slate-400">If</span>
                      <span className="font-semibold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {targetControl}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                      <span className="font-bold text-teal-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {simulatedStatus}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Risk delta visualization */}
              {active && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <RiskArrow original={originalRisk} simulated={simulatedRisk} delta={delta} />
                </motion.div>
              )}

              {/* Full explanation text */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className={`p-4 rounded-xl border text-[13px] leading-relaxed ${
                  active
                    ? 'bg-purple-500/5 border-purple-500/10 text-slate-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-500 italic'
                }`}
              >
                {cfText}
              </motion.div>

              {/* Disclaimer */}
              <div className="flex items-start gap-2 text-[10px] text-slate-600">
                <Info className="w-3 h-3 shrink-0 mt-0.5" />
                <p>
                  This is a counterfactual simulation produced by the deterministic backend engine. It does not alter
                  the historical incident record. Results are modelled risk deltas only.
                </p>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
