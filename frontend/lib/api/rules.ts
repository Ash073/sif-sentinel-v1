import { apiClient } from '@/lib/api-client';

export const rulesApi = {
  list: (): Promise<unknown[]> =>
    apiClient.get('/rules').then((r) => r.data),

  get: (ruleId: string): Promise<unknown> =>
    apiClient.get(`/rules/${ruleId}`).then((r) => r.data),

  getAnalytics: (ruleId: string): Promise<unknown> =>
    apiClient.get(`/rules/${ruleId}/analytics`).then((r) => r.data),
};
