export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  site_id?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}
