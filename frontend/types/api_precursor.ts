// ============================================================
// Precursors
// ============================================================

export interface PrecursorRead {
  id: string;
  activity: string;
  hazard: string;
}

export interface PrecursorSummary extends PrecursorRead {
  category: string;
  barrier: string;
  failure_type: string;
  occurrence_count: number;
  sif_count: number;
  sif_density: number;
  recent_count: number;
  site_count: number;
  department_count: number;
  trend: string;
  risk_score: number;
  priority: string;
  first_seen: string | null;
  last_seen: string | null;
  why_it_matters: string;
}

export interface RepresentativeReport {
  report_id: string;
  reported_at: string;
  site_name: string;
  department: string;
  sif_level: string | null;
}

export interface PrecursorDetail extends PrecursorSummary {
  sites: string[];
  departments: string[];
  representative_reports: RepresentativeReport[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  statistics: Record<string, number | string>;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface PrecursorGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
