import { LoginResponse } from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL;

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Erro ao fazer login');
  }

  return response.json();
}

export async function logout(): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) return;

  const response = await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Erro ao fazer logout');
  }

  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export async function getProfile(): Promise<LoginResponse['user']> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Não autenticado');
  }

  const response = await fetch(`${API_URL}/api/profile`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Erro ao obter perfil');
  }

  return response.json();
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token');
}
