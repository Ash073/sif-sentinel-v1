export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  site_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

