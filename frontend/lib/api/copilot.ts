import { apiClient } from '../api-client';
import type { CopilotQueryRequest, CopilotResponse } from '@/types/api';

export const copilotApi = {
  ask: async (data: CopilotQueryRequest): Promise<CopilotResponse> => {
    const response = await apiClient.post<CopilotResponse>('/copilot/ask', data);
    return response.data;
  },
};
