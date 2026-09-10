'use client';

/**
 * GeminiNarrativeCard
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the Gemini AI narrative with a typewriter stagger effect.
 * Sections are drawn from `analysis.narrative` (NarrativePayload).
 * The card is clearly badged as "AI Advisory — Not Authoritative".
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ChevronDown, ChevronUp, Info,
  CheckCircle, AlertTriangle, Lightbulb, BookOpen,
} from 'lucide-react';
import type { AnalysisResponse } from '@/types/api';

// ─── Typewriter hook ──────────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 18, startDelay = 400) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const tick = () => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i < text.length) {
        rafRef.current = setTimeout(tick, speed);
      } else {
        setDone(true);
      }
    };
    const init = setTimeout(tick, startDelay);
    return () => {
      clearTimeout(init);
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, [text, speed, startDelay]);

  return { displayed, done };
}

// ─── Staggered fade-in section ────────────────────────────────────────────────

function FadeList({ items, delay = 0 }: { items: string[]; delay?: number }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: delay + i * 0.08 }}
          className="flex items-start gap-2 text-[13px] text-slate-300"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
          {item}
        </motion.li>
      ))}
    </ul>
  );
}

// ─── Section types ────────────────────────────────────────────────────────────

interface NarrativeSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  content: string | string[];
  type: 'text' | 'list';
  delay: number;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface GeminiNarrativeCardProps {
  analysis: AnalysisResponse;
}

export function GeminiNarrativeCard({ analysis }: GeminiNarrativeCardProps) {
  const narrative = analysis.narrative;
  const [expanded, setExpanded] = useState(true);
  const [activeSection, setActiveSection] = useState(0);

  // Primary text to typewrite — executive summary or reviewer_summary
  const primaryText =
    narrative?.executive_summary ||
    analysis.reviewer_summary ||
    '';

  const { displayed, done } = useTypewriter(primaryText, 14, 300);

  if (!primaryText && !narrative) return null;

  const sections: NarrativeSection[] = [
    ...(narrative?.incident_interpretation ? [{
      id: 'interpretation',
      label: 'Incident Interpretation',
      icon: <BookOpen className="w-3.5 h-3.5" />,
      content: narrative.incident_interpretation,
      type: 'text' as const,
      delay: 0.1,
    }] : []),
    ...(narrative?.causal_explanation ? [{
      id: 'causal',
      label: 'Causal Explanation',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      content: narrative.causal_explanation,
      type: 'text' as const,
      delay: 0.2,
    }] : []),
    ...(narrative?.key_findings?.length ? [{
      id: 'findings',
      label: 'Key Findings',
      icon: <Lightbulb className="w-3.5 h-3.5" />,
      content: narrative.key_findings,
      type: 'list' as const,
      delay: 0.3,
    }] : []),
    ...(narrative?.lsr_explanation ? [{
      id: 'lsr',
      label: 'Life-Saving Rule',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      content: narrative.lsr_explanation,
      type: 'text' as const,
      delay: 0.4,
    }] : []),
  ];

  return (
    <div className="relative rounded-2xl overflow-hidden border border-blue-500/20 bg-slate-950">
      {/* Ambient gradient border glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-24 bg-blue-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-blue-500/10">
        <div className="flex items-center gap-3">
          {/* Gemini-style gradient icon */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/20">
            <Sparkles className="w-4.5 h-4.5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-white">Gemini AI Forensic Analysis</h3>
              {/* Gemini-style animated dot */}
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                {analysis.llm_provider && (
                  <><span className="text-blue-500/70">{analysis.llm_provider}</span> · </>
                )}
                {analysis.llm_model_used && (
                  <span className="font-mono text-slate-600">{analysis.llm_model_used}</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Advisory badge */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Info className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] text-amber-400 font-medium">Advisory Only</span>
          </div>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
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
            <div className="relative z-10 px-5 pb-5 pt-4 space-y-5">

              {/* Typewriter executive summary */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Executive Summary</p>
                <div className="relative p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 min-h-[60px]">
                  <p className="text-[13px] text-slate-200 leading-relaxed font-light">
                    {displayed}
                    {!done && (
                      <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="ml-0.5 inline-block w-0.5 h-3.5 bg-blue-400 align-middle"
                      />
                    )}
                  </p>
                </div>
              </div>

              {/* Section tabs — only if there are sub-sections */}
              {sections.length > 0 && done && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="space-y-3"
                >
                  {/* Tab switcher */}
                  <div className="flex flex-wrap gap-1.5">
                    {sections.map((sec, i) => (
                      <button
                        key={sec.id}
                        onClick={() => setActiveSection(i)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          activeSection === i
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'text-slate-500 hover:text-slate-300 border border-transparent'
                        }`}
                      >
                        {sec.icon} {sec.label}
                      </button>
                    ))}
                  </div>

                  {/* Active section content */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSection}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="p-4 rounded-xl bg-slate-900/60 border border-white/5 min-h-[80px]"
                    >
                      {sections[activeSection]?.type === 'list' ? (
                        <FadeList items={sections[activeSection].content as string[]} delay={0} />
                      ) : (
                        <p className="text-[13px] text-slate-300 leading-relaxed">
                          {sections[activeSection]?.content as string}
                        </p>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Model metadata footer */}
              <div className="flex items-center gap-3 text-[10px] text-slate-600 border-t border-white/5 pt-3">
                <Info className="w-3 h-3 shrink-0" />
                <p>
                  AI-generated content. All authoritative SIF classifications are produced by the deterministic backend engine.
                  {narrative?.confidence_statement && (
                    <span className="ml-1 text-slate-700"> {narrative.confidence_statement}</span>
                  )}
                </p>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
