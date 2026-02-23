import { apiRequest } from './apiClient';

export const login = (payload) => apiRequest('/auth/login', { method: 'POST', body: payload });
