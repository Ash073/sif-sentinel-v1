import { apiClient } from '@/lib/api-client';
import type {
  CorrectiveActionRead,
  CorrectiveActionCreate,
  CorrectiveActionDecisionRequest,
  CorrectiveActionModifyRequest,
  CorrectiveActionVerifyRequest,
} from '@/types/api';

export interface CorrectiveActionListParams {
  page?: number;
  page_size?: number;
  status?: string;
  report_id?: string;
}

export const correctiveActionsApi = {
  list: (params: CorrectiveActionListParams = {}): Promise<CorrectiveActionRead[]> =>
    apiClient.get('/corrective-actions', { params }).then((r) => r.data),

  get: (actionId: string): Promise<CorrectiveActionRead> =>
    apiClient.get(`/corrective-actions/${actionId}`).then((r) => r.data),

  create: (payload: CorrectiveActionCreate): Promise<CorrectiveActionRead> =>
    apiClient.post('/corrective-actions', payload).then((r) => r.data),

  submit: (actionId: string): Promise<CorrectiveActionRead> =>
    apiClient.post(`/corrective-actions/${actionId}/submit`).then((r) => r.data),

  approve: (actionId: string, payload: CorrectiveActionDecisionRequest = {}): Promise<CorrectiveActionRead> =>
    apiClient.post(`/corrective-actions/${actionId}/approve`, payload).then((r) => r.data),

  reject: (actionId: string, payload: CorrectiveActionDecisionRequest): Promise<CorrectiveActionRead> =>
    apiClient.post(`/corrective-actions/${actionId}/reject`, payload).then((r) => r.data),

  cancel: (actionId: string, payload: CorrectiveActionDecisionRequest): Promise<CorrectiveActionRead> =>
    apiClient.post(`/corrective-actions/${actionId}/cancel`, payload).then((r) => r.data),

  modify: (actionId: string, payload: CorrectiveActionModifyRequest): Promise<CorrectiveActionRead> =>
    apiClient.post(`/corrective-actions/${actionId}/modify`, payload).then((r) => r.data),

  start: (actionId: string): Promise<CorrectiveActionRead> =>
    apiClient.post(`/corrective-actions/${actionId}/start`).then((r) => r.data),

  requestVerification: (actionId: string): Promise<CorrectiveActionRead> =>
    apiClient.post(`/corrective-actions/${actionId}/request-verification`).then((r) => r.data),

  verify: (actionId: string, payload: CorrectiveActionVerifyRequest): Promise<CorrectiveActionRead> =>
    apiClient.post(`/corrective-actions/${actionId}/verify`, payload).then((r) => r.data),

  close: (actionId: string, payload: CorrectiveActionDecisionRequest = {}): Promise<CorrectiveActionRead> =>
    apiClient.post(`/corrective-actions/${actionId}/close`, payload).then((r) => r.data),

  getAudit: (actionId: string): Promise<Record<string, unknown>[]> =>
    apiClient.get(`/corrective-actions/${actionId}/audit`).then((r) => r.data),

  export: (params: CorrectiveActionListParams = {}): Promise<Blob> =>
    apiClient.get('/corrective-actions/export', { params, responseType: 'blob' }).then((r) => r.data),
};
