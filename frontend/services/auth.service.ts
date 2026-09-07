import { apiClient } from '@/lib/api-client';
import { User } from '@/types/auth';

export const authService = {
  async login(email: string, password: string):Promise<{ access_token: string }> {
    const { data } = await apiClient.post('/auth/login', {
      email,
      password,
    });
    return data;
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
