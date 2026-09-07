import { apiClient } from '@/lib/api-client';

export interface MessageResponse {
  message: string;
}

export const importsApi = {
  uploadCsv: async (file: File): Promise<MessageResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.post<MessageResponse>('/imports/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((r) => r.data);
  },
};
