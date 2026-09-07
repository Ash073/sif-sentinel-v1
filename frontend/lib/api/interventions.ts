import { apiClient } from '@/lib/api-client';
import type {
  InterventionRead,
  InterventionSummary,
  InterventionReviewRequest,
} from '@/types/api';

export interface InterventionListParams {
  report_id?: string;
  priority?: string;
}

export const interventionsApi = {
  list: (params: InterventionListParams = {}): Promise<InterventionRead[]> =>
    apiClient.get('/interventions', { params }).then((r) => r.data),

  getSummary: (): Promise<InterventionSummary> =>
    apiClient.get('/interventions/summary').then((r) => r.data),

  get: (id: string): Promise<InterventionRead> =>
    apiClient.get(`/interventions/${id}`).then((r) => r.data),

  review: (id: string, payload: InterventionReviewRequest): Promise<InterventionRead> =>
    apiClient.post(`/interventions/${id}/review`, payload).then((r) => r.data),
};
