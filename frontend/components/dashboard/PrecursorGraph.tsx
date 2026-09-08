'use client';

import React, { useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PrecursorGraph as PrecursorGraphType, GraphNode as ApiGraphNode } from '@/types/api';

// --- Custom Nodes ---

const BaseNode = ({ data, typeColor, icon }: { data: any, typeColor: string, icon: string }) => {
  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-white border-2 ${typeColor} min-w-[200px]`}>
      <Handle type="target" position={Position.Left} className="w-2 h-2" />
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <div className="font-bold text-sm text-slate-800 uppercase tracking-wider">{data.type}</div>
      </div>
      <div className="text-slate-600 font-medium text-base mb-2">{data.label}</div>
      <div className="border-t border-slate-100 pt-2 mt-2">
        {Object.entries(data.statistics).map(([k, v]) => (
          <div key={k} className="flex justify-between text-xs">
            <span className="text-slate-500 capitalize">{k.replace('_', ' ')}</span>
            <span className="font-bold text-slate-700">{String(v)}</span>
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Right} className="w-2 h-2" />
    </div>
  );
};

const ActivityNode = ({ data }: { data: any }) => <BaseNode data={data} typeColor="border-blue-500" icon="🏗️" />;
const HazardNode = ({ data }: { data: any }) => <BaseNode data={data} typeColor="border-amber-500" icon="⚠️" />;
const BarrierNode = ({ data }: { data: any }) => <BaseNode data={data} typeColor="border-emerald-500" icon="🛡️" />;
const FailureNode = ({ data }: { data: any }) => <BaseNode data={data} typeColor="border-red-500" icon="❌" />;
const SifNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 shadow-lg rounded-md bg-red-50 border-2 border-red-600 min-w-[200px]">
    <Handle type="target" position={Position.Left} className="w-2 h-2" />
    <div className="flex items-center gap-2 mb-2">
      <span className="text-lg">🚨</span>
      <div className="font-bold text-sm text-red-800 uppercase tracking-wider">{data.type}</div>
    </div>
    <div className="text-red-900 font-bold text-lg mb-2">{data.label}</div>
    <div className="border-t border-red-200 pt-2 mt-2">
      {Object.entries(data.statistics).map(([k, v]) => (
        <div key={k} className="flex justify-between text-xs">
          <span className="text-red-700 capitalize">{k.replace('_', ' ')}</span>
          <span className="font-bold text-red-900">{String(v)}</span>
        </div>
      ))}
    </div>
  </div>
);

const nodeTypes = {
  activity: ActivityNode,
  hazard: HazardNode,
  barrier: BarrierNode,
  failure: FailureNode,
  sif: SifNode,
};

// --- Main Component ---

interface PrecursorGraphProps {
  data: PrecursorGraphType | undefined;
  isLoading: boolean;
}

export function PrecursorGraph({ data, isLoading }: PrecursorGraphProps) {
  const initialNodes = useMemo(() => {
    if (!data?.nodes) return [];
    
    // Auto-layout in a horizontal line
    return data.nodes.map((node: ApiGraphNode, index: number) => ({
      id: node.id,
      type: node.type,
      position: { x: index * 300, y: 150 }, // Simple horizontal layout
      data: { 
        label: node.label,
        type: node.type,
        statistics: node.statistics 
      },
    }));
  }, [data]);

  const initialEdges = useMemo(() => {
    if (!data?.edges) return [];
    return data.edges.map((edge, i) => ({
      id: `e${i}-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated: edge.source === 'failure', // Animate the path to SIF
      style: { strokeWidth: 2, stroke: edge.source === 'failure' ? '#ef4444' : '#94a3b8' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.source === 'failure' ? '#ef4444' : '#94a3b8',
      },
    }));
  }, [data]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update state when data changes
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (isLoading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-500">Loading precursor graph...</span>
        </div>
      </div>
    );
  }

  if (!data || nodes.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
        <div className="text-center">
          <span className="text-lg mb-2 block">📉</span>
          <span className="text-sm font-medium text-slate-500">No precursor data available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background color="#cbd5e1" gap={16} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
