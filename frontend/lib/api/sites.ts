import { apiClient } from '@/lib/api-client';
import type { SiteRead, SiteCreate } from '@/types/api';

export const sitesApi = {
  list: (): Promise<SiteRead[]> =>
    apiClient.get('/sites').then((r) => r.data),

  get: (id: string): Promise<SiteRead> =>
    apiClient.get(`/sites/${id}`).then((r) => r.data),

  create: (payload: SiteCreate): Promise<SiteRead> =>
    apiClient.post('/sites', payload).then((r) => r.data),

  update: (id: string, payload: Partial<SiteCreate>): Promise<SiteRead> =>
    apiClient.patch(`/sites/${id}`, payload).then((r) => r.data),
};
