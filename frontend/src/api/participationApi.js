import { apiRequest } from './apiClient';

export const joinTour = (tourId) => apiRequest(`/tours/${tourId}/participation`, { method: 'POST' });

export const completeTourParticipation = (tourId) =>
  apiRequest(`/tours/${tourId}/participation/complete`, { method: 'POST' });

export const toggleTourWishlist = (tourId, wished) =>
  apiRequest(`/tours/${tourId}/wishlist`, {
    method: 'POST',
    body: { wished },
  });
