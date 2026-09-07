import type { User } from './api';

export type { User };

export interface LoginResponse {
  access_token: string;
  token_type: string;
}
