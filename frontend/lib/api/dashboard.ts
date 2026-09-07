import { apiClient } from '@/lib/api-client';
import type {
  DashboardSummary,
  TimeSeriesPoint,
  DistributionItem,
  BarrierFailurePoint,
} from '@/types/api';

export const dashboardApi = {
  getSummary: (): Promise<DashboardSummary> =>
    apiClient.get('/dashboard/summary').then((r) => r.data),

  getSifTrend: (window: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<TimeSeriesPoint[]> =>
    apiClient.get('/dashboard/sif-trend', { params: { window } }).then((r) => r.data),

  getLsrDistribution: (): Promise<DistributionItem[]> =>
    apiClient.get('/dashboard/lsr-distribution').then((r) => r.data),

  getSiteComparison: (): Promise<DistributionItem[]> =>
    apiClient.get('/dashboard/site-comparison').then((r) => r.data),

  getActivityDistribution: (): Promise<DistributionItem[]> =>
    apiClient.get('/dashboard/activity-distribution').then((r) => r.data),

  getHazardDistribution: (): Promise<DistributionItem[]> =>
    apiClient.get('/dashboard/hazard-distribution').then((r) => r.data),

  getBarrierFailures: (window: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<BarrierFailurePoint[]> =>
    apiClient.get('/dashboard/barrier-failures', { params: { window } }).then((r) => r.data),

  exportCsv: (): Promise<Blob> =>
    apiClient.get('/dashboard/export/csv', { responseType: 'blob' }).then((r) => r.data),
};
