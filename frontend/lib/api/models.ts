import { apiClient } from '@/lib/api-client';

export const modelsApi = {
  list: (): Promise<unknown[]> =>
    apiClient.get('/models').then((r) => r.data),

  getFeedback: (): Promise<Record<string, unknown>> =>
    apiClient.get('/models/feedback').then((r) => r.data),

  getPerformance: (): Promise<Record<string, unknown>> =>
    apiClient.get('/models/performance').then((r) => r.data),

  get: (modelName: string): Promise<Record<string, unknown>> =>
    apiClient.get(`/models/${modelName}`).then((r) => r.data),

  getMetrics: (modelName: string): Promise<Record<string, unknown>> =>
    apiClient.get(`/models/${modelName}/metrics`).then((r) => r.data),
};
