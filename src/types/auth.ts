export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  companyName: string;
}

export type UserRole = 'admin' | 'director' | 'manager' | 'driver' | 'partner';

export interface LoginResponse {
  user: User;
  token: string;
}

export interface LoginLog {
  userId: string;
  email: string;
  companyId: string;
  timestamp: Date;
  ip: string;
  country: string;
  city: string;
  region: string;
  status: 'success' | 'failed';
  reason?: string;
}