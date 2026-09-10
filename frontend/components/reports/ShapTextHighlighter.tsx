'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { ExplainabilityFactor } from '@/types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TermData {
  term: string;          // original casing from factors
  weight: number;        // absolute contribution
  direction: 'INCREASES' | 'DECREASES' | 'EVIDENCE';
  source: string;
}

type Tier = 'critical' | 'high' | 'low' | 'safe' | 'evidence';

interface TextSegment {
  text: string;
  matched: boolean;
  tier?: Tier;
  termData?: TermData;
}

interface ShapTextHighlighterProps {
  text: string;
  factors: ExplainabilityFactor[];
  evidenceTerms: string[];
  evidenceSpan?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getTier(data: TermData): Tier {
  if (data.direction === 'EVIDENCE') return 'evidence';
  if (data.direction === 'DECREASES') return 'safe';
  // INCREASES
  if (data.weight >= 0.5) return 'critical';
  if (data.weight >= 0.2) return 'high';
  return 'low';
}

function buildTermMap(
  factors: ExplainabilityFactor[],
  evidenceTerms: string[],
): Map<string, TermData> {
  const map = new Map<string, TermData>();

  // Load factors first (ML model features)
  for (const f of factors) {
    if (!f.name?.trim()) continue;
    const key = f.name.toLowerCase().trim();
    map.set(key, {
      term: f.name,
      weight: Math.abs(f.contribution),
      direction: f.direction === 'DECREASES' ? 'DECREASES' : 'INCREASES',
      source: f.source,
    });
  }

  // Evidence terms always override as high-risk (backend flagged them explicitly)
  for (const t of evidenceTerms) {
    if (!t?.trim()) continue;
    const key = t.toLowerCase().trim();
    if (!map.has(key)) {
      // Not already a factor — add as pure evidence
      map.set(key, {
        term: t,
        weight: 0.9,
        direction: 'EVIDENCE',
        source: 'EVIDENCE',
      });
    } else {
      // Upgrade existing factor to include evidence flag
      const existing = map.get(key)!;
      map.set(key, { ...existing, direction: 'EVIDENCE' });
    }
  }

  return map;
}

function segmentText(text: string, termMap: Map<string, TermData>): TextSegment[] {
  if (!text || termMap.size === 0) return [{ text, matched: false }];

  // Sort by length descending — longer matches take priority (e.g. "lockout tagout" > "lockout")
  const sortedTerms = [...termMap.keys()].sort((a, b) => b.length - a.length);

  // Build a single alternation regex that matches any term, case-insensitive
  // Wrap each term with a word-boundary only if the term starts/ends with a word char
  const pattern = sortedTerms
    .map((t) => {
      const esc = escapeRegExp(t);
      const startBoundary = /^\w/.test(t) ? '(?<![\\w])' : '';
      const endBoundary = /\w$/.test(t) ? '(?![\\w])' : '';
      return `${startBoundary}(${esc})${endBoundary}`;
    })
    .join('|');

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, 'gi');
  } catch {
    // Fallback: plain literal match without boundaries
    const simplePattern = sortedTerms.map(escapeRegExp).join('|');
    try {
      regex = new RegExp(`(${simplePattern})`, 'gi');
    } catch {
      return [{ text, matched: false }];
    }
  }

  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  regex.lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    // Capture the actual matched string (any of the alternation groups)
    const matchedStr = match[0];
    const start = match.index;
    const end = start + matchedStr.length;

    if (start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, start), matched: false });
    }

    const key = matchedStr.toLowerCase().trim();
    const termData = termMap.get(key);
    if (termData) {
      segments.push({
        text: matchedStr,
        matched: true,
        tier: getTier(termData),
        termData,
      });
    } else {
      segments.push({ text: matchedStr, matched: false });
    }

    lastIndex = end;
    // Avoid infinite loop on zero-length matches
    if (match.index === regex.lastIndex) regex.lastIndex++;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), matched: false });
  }

  return segments;
}

// ─── Tier styles ─────────────────────────────────────────────────────────────

const TIER_STYLES: Record<Tier, { bg: string; text: string; border: string; dot: string; label: string }> = {
  critical: {
    bg: 'bg-red-500/20',
    text: 'text-red-200',
    border: 'border-b border-red-400',
    dot: 'bg-red-400',
    label: 'Critical Risk',
  },
  high: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-200',
    border: 'border-b border-amber-400',
    dot: 'bg-amber-400',
    label: 'High Risk',
  },
  low: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-200',
    border: 'border-b border-orange-400/50',
    dot: 'bg-orange-400',
    label: 'Risk Factor',
  },
  safe: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-200',
    border: 'border-b border-blue-400',
    dot: 'bg-blue-400',
    label: 'Mitigating',
  },
  evidence: {
    bg: 'bg-orange-500/25',
    text: 'text-orange-100',
    border: 'border-b-2 border-orange-400',
    dot: 'bg-orange-400',
    label: 'Key Evidence',
  },
};

// ─── Floating Tooltip ────────────────────────────────────────────────────────

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  termData: TermData;
  tier: Tier;
}

function FloatingTooltip({ state }: { state: TooltipState | null }) {
  if (!state?.visible || !state.termData) return null;
  const s = TIER_STYLES[state.tier];
  const weightPct = (state.termData.weight * 100).toFixed(1);
  const directionLabel =
    state.tier === 'evidence' ? 'Evidence term' :
    state.termData.direction === 'INCREASES' ? '▲ Increases SIF risk' :
    '▼ Decreases SIF risk';

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{ left: state.x + 12, top: state.y - 8 }}
    >
      <div className="bg-slate-900 border border-white/15 rounded-xl shadow-2xl p-3 text-xs min-w-[180px] max-w-[240px]">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
          <span className={`font-bold uppercase tracking-wide text-[10px] ${s.text}`}>{s.label}</span>
        </div>
        <p className="font-mono text-white font-semibold mb-2 leading-tight">
          &ldquo;{state.termData.term}&rdquo;
        </p>
        <div className="space-y-1 border-t border-white/10 pt-2">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">SHAP weight</span>
            <span className={`font-bold tabular-nums ${state.termData.direction === 'DECREASES' ? 'text-blue-400' : 'text-orange-400'}`}>
              {state.termData.direction === 'DECREASES' ? '-' : '+'}{weightPct}%
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">Direction</span>
            <span className={`font-medium text-[10px] ${state.termData.direction === 'DECREASES' ? 'text-blue-400' : 'text-red-400'}`}>
              {directionLabel}
            </span>
          </div>
          {state.termData.source !== 'EVIDENCE' && (
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Source</span>
              <span className="text-slate-400 font-mono text-[10px]">{state.termData.source}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Highlighted Token ────────────────────────────────────────────────────────

function HighlightedToken({
  segment,
  onEnter,
  onLeave,
}: {
  segment: TextSegment;
  onEnter: (e: React.MouseEvent, td: TermData, tier: Tier) => void;
  onLeave: () => void;
}) {
  if (!segment.matched || !segment.tier || !segment.termData) {
    return <>{segment.text}</>;
  }
  const s = TIER_STYLES[segment.tier];
  return (
    <span
      className={`${s.bg} ${s.text} ${s.border} rounded-sm px-0.5 cursor-help transition-all duration-150 hover:brightness-110`}
      onMouseEnter={(e) => onEnter(e, segment.termData!, segment.tier!)}
      onMouseLeave={onLeave}
    >
      {segment.text}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ShapTextHighlighter({
  text,
  factors,
  evidenceTerms,
  evidenceSpan,
}: ShapTextHighlighterProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const termMap = useMemo(
    () => buildTermMap(factors, evidenceTerms),
    [factors, evidenceTerms],
  );

  const segments = useMemo(
    () => segmentText(text, termMap),
    [text, termMap],
  );

  const matchCount = useMemo(
    () => segments.filter((s) => s.matched).length,
    [segments],
  );

  const criticalCount = segments.filter((s) => s.tier === 'critical' || s.tier === 'evidence').length;
  const highCount = segments.filter((s) => s.tier === 'high').length;
  const safeCount = segments.filter((s) => s.tier === 'safe').length;

  const handleEnter = (e: React.MouseEvent, td: TermData, tier: Tier) => {
    setTooltip({ visible: true, x: e.clientX, y: e.clientY, termData: td, tier });
  };
  const handleLeave = () => setTooltip(null);
  const handleMove = (e: React.MouseEvent) => {
    if (tooltip) setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null);
  };

  if (!text) return null;

  // If nothing was matched — render plain text gracefully
  if (matchCount === 0) {
    return (
      <div className="space-y-3">
        <div className="p-4 bg-slate-950/60 rounded-xl border border-white/5 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">
          {text}
        </div>
        <p className="text-[11px] text-slate-600 italic">No SHAP terms matched in this narrative.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Evidence span callout */}
      {evidenceSpan && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <span className="text-orange-400 mt-0.5 shrink-0 text-[12px] font-bold">KEY</span>
          <p className="text-[13px] text-orange-200 italic leading-relaxed">&ldquo;{evidenceSpan}&rdquo;</p>
        </div>
      )}

      {/* Highlighted text */}
      <div
        className="relative p-5 bg-slate-950/70 rounded-xl border border-white/8 text-[14px] text-slate-200 leading-8 whitespace-pre-wrap font-mono tracking-tight"
        onMouseMove={handleMove}
      >
        {segments.map((seg, i) => (
          <HighlightedToken
            key={i}
            segment={seg}
            onEnter={handleEnter}
            onLeave={handleLeave}
          />
        ))}
      </div>

      {/* Legend + stats strip */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {/* Count badges */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-400">{matchCount} terms highlighted</span>
          <span>·</span>
          {criticalCount > 0 && <span className="text-red-400">{criticalCount} critical/evidence</span>}
          {highCount > 0 && <><span>·</span><span className="text-amber-400">{highCount} high-risk</span></>}
          {safeCount > 0 && <><span>·</span><span className="text-blue-400">{safeCount} mitigating</span></>}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Legend chips */}
        <div className="flex items-center gap-3 text-[11px]">
          {[
            { label: 'Key Evidence', cls: 'bg-orange-500/25 text-orange-200 border-orange-400/50' },
            { label: 'Critical Risk', cls: 'bg-red-500/20 text-red-300 border-red-400/40' },
            { label: 'High Risk',    cls: 'bg-amber-500/20 text-amber-300 border-amber-400/40' },
            { label: 'Risk Factor',  cls: 'bg-orange-500/10 text-orange-300 border-orange-400/30' },
            { label: 'Mitigating',   cls: 'bg-blue-500/15 text-blue-300 border-blue-400/40' },
          ].map((item) => (
            <span
              key={item.label}
              className={`px-2 py-0.5 rounded border font-medium ${item.cls}`}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* Global floating tooltip */}
      <FloatingTooltip state={tooltip} />
    </div>
  );
}
