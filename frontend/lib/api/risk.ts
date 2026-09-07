import { apiClient } from '@/lib/api-client';
import type { RiskItem, SiteRiskItem, BarrierRiskItem } from '@/types/api';

export interface RiskParams {
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export const riskApi = {
  getSites: (params: RiskParams = {}): Promise<SiteRiskItem[]> =>
    apiClient.get('/risk/sites', { params }).then((r) => r.data),

  getActivities: (params: RiskParams = {}): Promise<RiskItem[]> =>
    apiClient.get('/risk/activities', { params }).then((r) => r.data),

  getHazards: (params: RiskParams = {}): Promise<RiskItem[]> =>
    apiClient.get('/risk/hazards', { params }).then((r) => r.data),

  getBarriers: (params: RiskParams = {}): Promise<BarrierRiskItem[]> =>
    apiClient.get('/risk/barriers', { params }).then((r) => r.data),
};
