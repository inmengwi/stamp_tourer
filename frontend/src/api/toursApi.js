import { apiRequest } from './apiClient';

export const getTours = (params = {}) => {
  const query = {
    keyword: params.keyword,
    category: params.category,
    regionCode: params.regionCode,
    period: params.period,
    sortBy: params.sortBy,
  };

  return apiRequest('/tours', { query, retries: 1 });
};

export const getTourDetail = (tourId) => apiRequest(`/tours/${tourId}`, { retries: 1 });

export const createTour = (payload) => apiRequest('/tours', { method: 'POST', body: payload });
