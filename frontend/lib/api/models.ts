import { apiClient } from '@/lib/api-client';
import type { ModelMetadata, ModelFeedback, ModelPerformance } from '@/types/api';

export const modelsApi = {
  list: (): Promise<ModelMetadata[]> =>
    apiClient.get('/models').then((r) => r.data),

  get: (modelName: string): Promise<ModelMetadata> =>
    apiClient.get(`/models/${modelName}`).then((r) => r.data),

  getMetrics: (modelName: string): Promise<Record<string, unknown>> =>
    apiClient.get(`/models/${modelName}/metrics`).then((r) => r.data),

  getFeedback: (): Promise<ModelFeedback> =>
    apiClient.get('/models/feedback').then((r) => r.data),

  getPerformance: (): Promise<ModelPerformance> =>
    apiClient.get('/models/performance').then((r) => r.data),
};
