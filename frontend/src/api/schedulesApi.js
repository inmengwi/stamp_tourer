import { apiRequest } from './apiClient';

export const getSchedules = (tourId) =>
  apiRequest(`/tours/${tourId}/schedules`);

export const upsertSchedule = (tourId, spotId, scheduledDate) =>
  apiRequest(`/tours/${tourId}/spots/${spotId}/schedule`, {
    method: 'PUT',
    body: { scheduledDate },
  });
