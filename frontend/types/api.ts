// ============================================================
// Enums — exact mirror of backend app/core/constants.py
// ============================================================

export type UserRole = 'ADMIN' | 'HSE_MANAGER' | 'HSE_ANALYST' | 'REVIEWER' | 'VIEWER';
export type ReportType = 'UNSAFE_ACT' | 'UNSAFE_CONDITION' | 'NEAR_MISS' | 'INCIDENT';
export type SourceType = 'PUBLIC' | 'SYNTHETIC' | 'USER_SUBMITTED' | 'IMPORTED';
export type ReportStatus = 'NEW' | 'ANALYZED' | 'REVIEW_REQUIRED' | 'REVIEWED' | 'CLOSED';
export type SIFLevel = 'NON_SIF' | 'LOW' | 'MEDIUM' | 'HIGH' | 'REVIEW';
export type BarrierStatus = 'EFFECTIVE' | 'FAILED' | 'MISSING' | 'UNKNOWN';
export type ReviewDecision = 'PENDING' | 'APPROVE' | 'REJECT' | 'MODIFY';
export type InterventionReviewStatus = 'PENDING' | 'ACCEPTED' | 'MODIFIED' | 'REJECTED';
export type ReviewStatusFilter = 'PENDING' | 'REVIEWED' | 'ALL';
export type CorrectiveActionStatus =
  | 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  | 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'CLOSED' | 'CANCELLED';

// ============================================================
// User
// ============================================================

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ============================================================
// Sites
// ============================================================

export interface SiteRead {
  id: string;
  name: string;
  code: string;
  location: string;
  region: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SiteCreate {
  name: string;
  code: string;
  location: string;
  region: string;
  description?: string;
  is_active?: boolean;
}

// ============================================================
// Reports
// ============================================================

export interface ReportRead {
  id: string;
  report_id: string;
  report_type: ReportType;
  report_text: string;
  site_id: string;
  location: string;
  department: string;
  activity: string | null;
  reported_at: string;
  source_type: SourceType;
  status: ReportStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ReportCreate {
  report_id?: string;
  report_type: ReportType;
  report_text: string;
  site_id: string;
  location: string;
  department: string;
  activity?: string;
  reported_at: string;
  source_type: SourceType;
}

export interface ReportUpdate {
  report_text?: string;
  location?: string;
  department?: string;
  activity?: string;
}

export interface ReportPage {
  items: ReportRead[];
  total: number;
  page: number;
  page_size: number;
}

// ============================================================
// Analysis
// ============================================================

export interface RiskComponent {
  name: string;
  score: number;
  reason: string;
}

export interface RiskDetail {
  score: number;
  priority: string;
  components: RiskComponent[];
  version: string;
}

export interface ExplainabilityFactor {
  name: string;
  contribution: number;
  source: string;
  direction: string;
  evidence?: string | null;
}

export interface AnalysisResponse {
  report_id: string | null;
  analysis_id: string | null;
  sif_potential: boolean;
  sif_level: SIFLevel;
  model_probability: number;
  activity: string | null;
  hazard: string | null;
  barrier: string | null;
  barrier_status: BarrierStatus;
  barrier_failure: string | null;
  life_saving_rule: string | null;
  rule_confidence: number;
  evidence_span: string | null;
  evidence_sentences: string[];
  evidence_terms: string[];
  overall_confidence: number;
  review_required: boolean;
  model_version: string;
  explanation: string;
  risk: RiskDetail | null;
  explainability_factors: ExplainabilityFactor[];
  safety_graph: Record<string, unknown> | null;
  causal_chains: Record<string, unknown>[] | null;
  reasoning_summary: string | null;
  narrative: Record<string, unknown> | null;
  interventions: Record<string, unknown>[] | null;
  prevention_plan: Record<string, unknown> | null;
  reviewer_summary: string | null;
  llm_attempted: boolean;
  llm_used: boolean;
  llm_provider: string | null;
  llm_model_used: string | null;
  llm_timestamp: string | null;
  llm_error_code: string | null;
}

// ============================================================
// Reviews
// ============================================================

export interface ReviewQueueItem {
  id: string;
  report_id: string;
  decision: ReviewDecision;
  reviewer_id: string | null;
  reviewed_at: string | null;
  report_text: string;
  evidence_span: string | null;
  overall_confidence: number | null;
  explanation: string | null;
  reviewer_comment: string | null;
  corrected_sif_level: SIFLevel | null;
  corrected_activity: string | null;
  corrected_hazard: string | null;
  corrected_barrier: string | null;
  corrected_barrier_status: BarrierStatus | null;
  corrected_barrier_failure: string | null;
  corrected_life_saving_rule: string | null;
}

export interface ReviewDecisionRequest {
  decision: ReviewDecision;
  corrected_sif_level?: SIFLevel;
  corrected_activity?: string;
  corrected_hazard?: string;
  corrected_barrier?: string;
  corrected_barrier_status?: BarrierStatus;
  corrected_barrier_failure?: string;
  corrected_life_saving_rule?: string;
  reviewer_comment?: string;
}

export interface DecisionResponse {
  review_id: string;
  decision: ReviewDecision;
  report_id: string;
  report_status: string;
  reviewer_id: string;
  reviewed_at: string;
  message: string;
}

// ============================================================
// Interventions
// ============================================================

export interface InterventionRead {
  id: string;
  report_id: string | null;
  precursor_pattern_id: string | null;
  intervention_rule_id: string;
  category: string;
  title: string;
  description: string;
  rationale: string;
  priority: string;
  action_type: string;
  review_required: boolean;
  evidence_snapshot: Record<string, unknown>;
  source_rule: string;
  engine_version: string;
  risk_priority: string | null;
  life_saving_rule: string | null;
  review_status: InterventionReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_comments: string | null;
  reviewer_title: string | null;
  reviewer_description: string | null;
  reviewer_rationale: string | null;
  created_at: string;
}

export interface InterventionSummary {
  total: number;
  critical: number;
  pending: number;
  by_category: Record<string, number>;
}

export interface InterventionReviewRequest {
  decision: InterventionReviewStatus;
  reviewer_comments?: string;
  reviewer_title?: string;
  reviewer_description?: string;
  reviewer_rationale?: string;
}

// ============================================================
// Corrective Actions
// ============================================================

export interface CorrectiveActionRead {
  id: string;
  report_id: string | null;
  intervention_recommendation_id: string | null;
  intervention_code: string;
  title: string;
  description: string;
  hierarchy_level: string;
  action_type: string;
  priority: string;
  status: CorrectiveActionStatus;
  original_recommendation: Record<string, unknown>;
  user_modifications: Record<string, unknown>[];
  assigned_to: string | null;
  due_date: string | null;
  created_by: string;
  reviewed_by: string | null;
  approved_by: string | null;
  verified_by: string | null;
  closed_by: string | null;
  approved_at: string | null;
  completed_at: string | null;
  verified_at: string | null;
  closed_at: string | null;
  verification_notes: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CorrectiveActionCreate {
  report_id?: string;
  intervention_recommendation_id?: string;
  intervention_code: string;
  title: string;
  description: string;
  hierarchy_level: string;
  action_type: string;
  priority: string;
  assigned_to?: string;
  due_date?: string;
  original_recommendation?: Record<string, unknown>;
}

export interface CorrectiveActionListResponse {
  total: number;
  items: CorrectiveActionRead[];
}

export interface CorrectiveActionDecisionRequest {
  notes?: string;
  reason?: string;
}

export interface CorrectiveActionModifyRequest {
  title?: string;
  description?: string;
  assigned_to?: string;
  due_date?: string;
  modification_reason: string;
}

export interface CorrectiveActionVerifyRequest {
  verification_notes: string;
  effective?: boolean;
}

// ============================================================
// Precursors
// ============================================================

export interface PrecursorSummary {
  id: string;
  activity: string;
  hazard: string;
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

// ============================================================
// Risk
// ============================================================

export interface RiskItem {
  name: string;
  report_count: number;
  sif_count: number;
  sif_density: number;
  barrier_failure_count: number;
  risk_score: number;
  risk_level: string;
  explanation: string;
}

export interface SiteRiskItem extends RiskItem {
  site_id: string;
  total_reports: number;
  sif_reports: number;
  sif_rate: number;
  high_risk_reports: number;
  active_precursor_patterns: number;
  recent_reports: number;
}

export interface BarrierRiskItem {
  barrier: string;
  total_occurrences: number;
  failed_count: number;
  failure_rate: number;
  associated_sif_count: number;
  risk_score: number;
  risk_level: string;
  explanation: string;
}

// ============================================================
// Dashboard
// ============================================================

export interface DashboardSummary {
  total_reports: number;
  total_sif_reports: number;
  high_risk_reports: number;
  review_required: number;
  active_precursors: number;
  sites_monitored: number;
  sif_rate: number;
  high_risk_rate: number;
}

export interface TimeSeriesPoint {
  date: string;
  total_reports: number;
  sif_reports: number;
  high_sif_reports: number;
  sif_rate: number;
}

export interface DistributionItem {
  name: string;
  count: number;
  sif_count: number;
  sif_density: number;
  percentage: number;
}

export interface BarrierFailurePoint {
  date: string;
  failed_count: number;
}

// ============================================================
// LSR / Life-Saving Rules
// ============================================================

export interface LifeSavingRule {
  code: string;
  name: string;
}

export interface LSRAnalytics {
  code: string;
  name: string;
  total_violations: number;
  sif_violations: number;
  violation_rate: number;
  [key: string]: unknown;
}

// ============================================================
// Models / ML
// ============================================================

export interface ModelMetadata {
  model_name: string;
  model_version: string;
  model_type: string;
  description: string;
  created_at: string;
  metrics: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ModelFeedback {
  total_reviews: number;
  approved: number;
  rejected: number;
  modified: number;
  approval_rate: number;
  [key: string]: unknown;
}

export interface ModelPerformance {
  [key: string]: unknown;
}

// ============================================================
// API Error shape (from backend error_handler.py)
// ============================================================

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details: Record<string, unknown> | unknown[];
  };
  request_id: string | null;
}
