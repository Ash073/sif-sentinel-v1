import { apiClient } from '@/lib/api-client';
import type {
  ReportCreate,
  ReportUpdate,
  ReportRead,
  ReportPage,
  AnalysisResponse,
  ReportType,
  ReportStatus,
  SourceType,
  SIFLevel,
} from '@/types/api';

export interface ReportListParams {
  page?: number;
  page_size?: number;
  site_id?: string;
  report_type?: ReportType;
  status?: ReportStatus;
  source_type?: SourceType;
  date_from?: string;
  date_to?: string;
  search?: string;
  sif_level?: SIFLevel;
}

export const reportsApi = {
  list: (params: ReportListParams = {}): Promise<ReportPage> =>
    apiClient.get('/reports', { params }).then((r) => r.data),

  get: (reportId: string): Promise<ReportRead> =>
    apiClient.get(`/reports/${reportId}`).then((r) => r.data),

  create: (payload: ReportCreate): Promise<ReportRead> =>
    apiClient.post('/reports', payload).then((r) => r.data),

  update: (reportId: string, payload: ReportUpdate): Promise<ReportRead> =>
    apiClient.patch(`/reports/${reportId}`, payload).then((r) => r.data),

  delete: (reportId: string): Promise<{ message: string }> =>
    apiClient.delete(`/reports/${reportId}`).then((r) => r.data),

  analyze: (reportId: string): Promise<AnalysisResponse> =>
    apiClient.post(`/reports/${reportId}/analyze`).then((r) => r.data),
};
