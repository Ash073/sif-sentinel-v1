import { apiClient } from '@/lib/api-client';
import type { LifeSavingRule, LSRAnalytics } from '@/types/api';

export const rulesApi = {
  list: (): Promise<LifeSavingRule[]> =>
    apiClient.get('/rules').then((r) => r.data),

  get: (ruleId: string): Promise<LifeSavingRule> =>
    apiClient.get(`/rules/${ruleId}`).then((r) => r.data),

  getAnalytics: (ruleId: string): Promise<LSRAnalytics> =>
    apiClient.get(`/rules/${ruleId}/analytics`).then((r) => r.data),
};
