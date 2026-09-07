import { apiClient } from '@/lib/api-client';
import type { PrecursorSummary, PrecursorDetail, PrecursorGraph } from '@/types/api';

export interface PrecursorListParams {
  site?: string;
  activity?: string;
  hazard?: string;
  barrier?: string;
  priority?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  sort?: 'risk_score' | 'recent';
}

export const precursorsApi = {
  list: (params: PrecursorListParams = {}): Promise<PrecursorSummary[]> =>
    apiClient.get('/precursors', { params }).then((r) => r.data),

  trends: (limit = 50): Promise<PrecursorSummary[]> =>
    apiClient.get('/precursors/trends', { params: { limit } }).then((r) => r.data),

  get: (id: string): Promise<PrecursorDetail> =>
    apiClient.get(`/precursors/${id}`).then((r) => r.data),

  getGraph: (id: string): Promise<PrecursorGraph> =>
    apiClient.get(`/precursors/${id}/graph`).then((r) => r.data),

  rebuild: (): Promise<{ message: string }> =>
    apiClient.post('/precursors/rebuild').then((r) => r.data),
};
