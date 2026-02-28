import { apiRequest } from './apiClient';

export const login = (payload) => apiRequest('/auth/login', { method: 'POST', body: payload });

export const register = (payload) => apiRequest('/auth/register', { method: 'POST', body: payload });

export const getMe = () => apiRequest('/users/me');
