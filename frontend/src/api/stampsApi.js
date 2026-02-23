import { apiRequest } from './apiClient';

export const createStampRecord = (payload) =>
  apiRequest('/stamps/records', {
    method: 'POST',
    body: payload,
  });
