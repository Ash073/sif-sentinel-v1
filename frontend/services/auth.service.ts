import { apiClient } from '@/lib/api-client';
import { User, LoginResponse } from '@/types/auth';

export const authService = {
  async login(username: string, password: string):Promise<LoginResponse> {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await apiClient.post<LoginResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    return response.data;
  },

  async getMe():Promise<User> {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  }
};
