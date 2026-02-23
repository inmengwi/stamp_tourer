import { apiRequest } from './apiClient';

export const getTours = (params) => apiRequest('/tours', { query: params, retries: 1 });

export const getTourDetail = (tourId) => apiRequest(`/tours/${tourId}`, { retries: 1 });

export const createTour = (payload) => apiRequest('/tours', { method: 'POST', body: payload });
