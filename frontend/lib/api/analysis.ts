import { apiClient } from '@/lib/api-client';
import type { AnalysisResponse } from '@/types/api';

export interface AnalyzeTextRequest {
  text: string;
}

export const analysisApi = {
  analyzeText: (payload: AnalyzeTextRequest): Promise<AnalysisResponse> =>
    apiClient.post('/analyze', payload).then((r) => r.data),

  counterfactual: (payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
    apiClient.post('/analyze/counterfactual', payload).then((r) => r.data),

  narrative: (payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
    apiClient.post('/analyze/narrative', payload).then((r) => r.data),

  interventions: (payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
    apiClient.post('/analyze/interventions', payload).then((r) => r.data),
};
