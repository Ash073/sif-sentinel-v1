import { apiClient } from '@/lib/api-client';
import { User } from '@/types/auth';

export const authService = {
  /** Login — backend uses JSON body with email and password */
  login: async (email: string, password: string): Promise<{ access_token: string }> => {
    const response = await apiClient.post<{ access_token: string }>('/auth/login', {
      email,
      password
    });
    return response.data;
  },

  async register(full_name: string, email: string, password: string):Promise<{ id: string }> {
    const { data } = await apiClient.post('/auth/register', {
      full_name,
      email,
      password,
    });
    return data;
  },

  async getMe():Promise<User> {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  }
};
