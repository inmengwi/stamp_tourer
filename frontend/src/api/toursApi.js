import { apiRequest, ApiRequestError, getAuthToken } from './apiClient';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

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

export const searchTourOnline = (name, description) =>
  apiRequest('/tours/search-online', {
    method: 'POST',
    body: { name, description: description || undefined },
  });

export const searchTourOnlineWithLogs = async (name, description, onLog) => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/tours/search-online`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, description: description || undefined }),
    });
  } catch {
    throw new ApiRequestError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }

  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      /* ignore parse error */
    }
    throw new ApiRequestError(
      payload?.error?.message || `HTTP ${response.status} 오류가 발생했습니다.`,
      { status: response.status, code: payload?.error?.code },
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split('\n\n');
    buffer = parts.pop();

    for (const part of parts) {
      if (!part.trim()) continue;
      const lines = part.split('\n');
      let event = '';
      let data = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) event = line.slice(7);
        else if (line.startsWith('data: ')) data = line.slice(6);
      }
      if (!event || !data) continue;

      const parsed = JSON.parse(data);
      if (event === 'log') {
        onLog(parsed);
      } else if (event === 'result') {
        result = parsed;
      } else if (event === 'error') {
        throw new ApiRequestError(parsed.message, { code: parsed.code });
      }
    }
  }

  if (!result) throw new ApiRequestError('스트림이 비정상적으로 종료되었습니다.');
  return result.data;
};
