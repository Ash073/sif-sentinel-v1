'use client';

/**
 * CausalChainFlow
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the backend-produced causal chain as a fixed left-to-right DAG using
 * @xyflow/react.  Dragging and user-interaction are fully disabled so the graph
 * reads like a forensic evidence diagram.
 *
 * Node colours follow Oil India Limited brand palette:
 *   Activity  → slate / blue       (antecedent cause)
 *   Hazard    → amber / orange     (energy / danger)
 *   Barrier   → red (FAILED) | emerald (EFFECTIVE) | slate (UNKNOWN/MISSING)
 *   Outcome   → red (SIF) | emerald (Controlled)
 */

import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { CausalChain, CausalNode } from '@/types/api';
import type { AnalysisResponse } from '@/types/api';
import { GitBranch } from 'lucide-react';

// ─── Node type helpers ────────────────────────────────────────────────────────

type NodeKind = 'activity' | 'hazard' | 'barrier' | 'outcome' | 'unknown';

function resolveKind(n: CausalNode): NodeKind {
  const raw = (n.node_type ?? n.type ?? '').toLowerCase();
  if (raw.includes('activity')) return 'activity';
  if (raw.includes('hazard')) return 'hazard';
  if (raw.includes('barrier') || raw.includes('control')) return 'barrier';
  if (raw.includes('outcome') || raw.includes('incident') || raw.includes('sif')) return 'outcome';
  return 'unknown';
}

const KIND_STYLES: Record<NodeKind, { bg: string; border: string; label: string; dot: string }> = {
  activity: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/40',
    label: 'text-blue-200',
    dot: '🔧',
  },
  hazard: {
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/40',
    label: 'text-amber-200',
    dot: '⚡',
  },
  barrier: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/40',
    label: 'text-red-200',
    dot: '🛡',
  },
  outcome: {
    bg: 'bg-red-600/20',
    border: 'border-red-600/50',
    label: 'text-red-200',
    dot: '💀',
  },
  unknown: {
    bg: 'bg-slate-800/80',
    border: 'border-slate-700',
    label: 'text-slate-300',
    dot: '◆',
  },
};

function getBarrierStyle(n: CausalNode) {
  const s = (n.status ?? '').toUpperCase();
  if (s === 'EFFECTIVE' || s === 'VERIFIED') return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', label: 'text-emerald-200' };
  if (s === 'FAILED') return { bg: 'bg-red-500/15', border: 'border-red-500/50', label: 'text-red-200' };
  return { bg: 'bg-slate-800/60', border: 'border-slate-600', label: 'text-slate-300' };
}

// ─── Custom React Flow node component ────────────────────────────────────────

function SifNode({ data }: { data: { label: string; kind: NodeKind; status?: string; nodeData: CausalNode } }) {
  const { kind, status, nodeData } = data;
  const base = KIND_STYLES[kind];
  const style = kind === 'barrier' ? { ...base, ...getBarrierStyle(nodeData) } : base;

  return (
    <div
      className={`relative px-4 py-3 rounded-xl border ${style.bg} ${style.border} shadow-lg min-w-[130px] max-w-[180px] text-center select-none`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-slate-600 !border-slate-500" />
      <div className={`text-[11px] font-semibold ${style.label} leading-snug`}>
        <span className="mr-1">{base.dot}</span>
        <span className="uppercase tracking-wide text-[9px] opacity-70 block mb-0.5">{kind}</span>
        {data.label}
      </div>
      {status && (
        <span className={`mt-1.5 text-[9px] font-bold uppercase tracking-wider block ${
          status.toUpperCase() === 'FAILED' ? 'text-red-400' :
          status.toUpperCase() === 'EFFECTIVE' ? 'text-emerald-400' :
          'text-slate-500'
        }`}>
          {status}
        </span>
      )}
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-slate-600 !border-slate-500" />
    </div>
  );
}

const NODE_TYPES = { sifNode: SifNode };

// ─── Layout builder ───────────────────────────────────────────────────────────

const NODE_W = 180;
const NODE_H = 80;
const H_GAP = 80;   // horizontal gap between columns
const V_GAP = 24;   // vertical gap between rows in same column

/**
 * Simple topological-column layout:
 * Groups nodes by their "distance from source" (column index) so the graph
 * reads left-to-right. Falls back to a single-row layout if topology fails.
 */
function buildFlowNodes(
  nodes: CausalNode[],
  edges: { source: string; target: string; label?: string }[],
): { flowNodes: any[]; flowEdges: any[] } {
  if (!nodes.length) return { flowNodes: [], flowEdges: [] };

  // Build adjacency
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => { inDegree.set(n.id, 0); adj.set(n.id, []); });
  edges.forEach((e) => {
    if (!inDegree.has(e.source) || !inDegree.has(e.target)) return;
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    adj.get(e.source)!.push(e.target);
  });

  // BFS to assign column depth
  const depth = new Map<string, number>();
  const queue: string[] = [];
  nodes.forEach((n) => { if ((inDegree.get(n.id) ?? 0) === 0) { queue.push(n.id); depth.set(n.id, 0); } });

  // If no sources found (cycle), assign all to col 0 as fallback
  if (!queue.length) nodes.forEach((n) => { depth.set(n.id, nodes.indexOf(n)); queue.push(n.id); });

  let qi = 0;
  while (qi < queue.length) {
    const cur = queue[qi++];
    for (const next of adj.get(cur) ?? []) {
      const nd = (depth.get(cur) ?? 0) + 1;
      if (!depth.has(next) || (depth.get(next) ?? 0) < nd) {
        depth.set(next, nd);
        queue.push(next);
      }
    }
  }

  // Group by column
  const cols = new Map<number, CausalNode[]>();
  nodes.forEach((n) => {
    const d = depth.get(n.id) ?? 0;
    if (!cols.has(d)) cols.set(d, []);
    cols.get(d)!.push(n);
  });

  // Assign positions
  const posMap = new Map<string, { x: number; y: number }>();
  const sortedCols = [...cols.keys()].sort((a, b) => a - b);
  sortedCols.forEach((col) => {
    const colNodes = cols.get(col)!;
    const x = col * (NODE_W + H_GAP);
    colNodes.forEach((n, row) => {
      posMap.set(n.id, { x, y: row * (NODE_H + V_GAP) });
    });
  });

  const flowNodes = nodes.map((n) => {
    const kind = resolveKind(n);
    const pos = posMap.get(n.id) ?? { x: 0, y: 0 };
    return {
      id: n.id,
      type: 'sifNode',
      position: pos,
      data: {
        label: n.label ?? n.id,
        kind,
        status: n.status as string | undefined,
        nodeData: n,
      },
      draggable: false,
      selectable: false,
      connectable: false,
    };
  });

  const flowEdges = edges
    .filter((e) => nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target))
    .map((e, idx) => ({
      id: `e-${idx}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      label: e.label,
      type: 'smoothstep',
      animated: false,
      labelStyle: { fill: '#64748b', fontSize: 10 },
      labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
      style: { stroke: '#334155', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#475569', width: 14, height: 14 },
    }));

  return { flowNodes, flowEdges };
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface CausalChainFlowProps {
  analysis: AnalysisResponse;
}

export function CausalChainFlow({ analysis }: CausalChainFlowProps) {
  const chains = analysis.causal_chains;
  const safetyGraph = analysis.safety_graph;

  // Extract nodes + edges — prefer causal_chains[0], fall back to safety_graph
  const { rawNodes, rawEdges } = useMemo(() => {
    if (chains?.length) {
      const chain = chains[0];
      return {
        rawNodes: (chain.nodes ?? []) as CausalNode[],
        rawEdges: (chain.edges ?? []) as { source: string; target: string; label?: string }[],
      };
    }
    if (safetyGraph) {
      return {
        rawNodes: ((safetyGraph as any).nodes ?? []) as CausalNode[],
        rawEdges: ((safetyGraph as any).edges ?? []) as { source: string; target: string; label?: string }[],
      };
    }

    // Fallback: synthesise a minimal chain from top-level analysis fields
    const fallbackNodes: CausalNode[] = [];
    const fallbackEdges: { source: string; target: string; label?: string }[] = [];
    if (analysis.activity) fallbackNodes.push({ id: 'activity', label: analysis.activity, node_type: 'activity' });
    if (analysis.hazard) fallbackNodes.push({ id: 'hazard', label: analysis.hazard, node_type: 'hazard' });
    if (analysis.barrier) fallbackNodes.push({ id: 'barrier', label: analysis.barrier, node_type: 'barrier', status: analysis.barrier_status });
    fallbackNodes.push({ id: 'outcome', label: analysis.sif_potential ? 'SIF Outcome' : 'Controlled', node_type: 'outcome' });
    if (fallbackNodes.length > 1) {
      for (let i = 0; i < fallbackNodes.length - 1; i++) {
        fallbackEdges.push({ source: fallbackNodes[i].id, target: fallbackNodes[i + 1].id });
      }
    }
    return { rawNodes: fallbackNodes, rawEdges: fallbackEdges };
  }, [chains, safetyGraph, analysis]);

  const { flowNodes, flowEdges } = useMemo(
    () => buildFlowNodes(rawNodes, rawEdges),
    [rawNodes, rawEdges],
  );

  // Calculate viewport height based on node count
  const yPositions = Array.from(new Set<number>(flowNodes.map((n: any) => n.position.y as number)));
  const maxRows = Math.max(yPositions.length, 1);
  const graphH = Math.max(200, maxRows * (NODE_H + V_GAP) + 80);

  if (!flowNodes.length) {
    return (
      <div className="flex items-center justify-center h-32 rounded-xl bg-slate-950/50 border border-white/5">
        <p className="text-sm text-slate-600">No causal chain data available for this report.</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden border border-white/8 bg-slate-950/70"
      style={{ height: graphH + 'px' }}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent' }}
      >
        <Background color="#1e293b" gap={24} size={1} />
      </ReactFlow>
    </div>
  );
}
