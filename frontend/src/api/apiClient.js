const DEFAULT_ERROR = '요청 처리 중 오류가 발생했습니다.';

export class ApiRequestError extends Error {
  constructor(message, { status, code, details, traceId } = {}) {
    super(message || DEFAULT_ERROR);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.traceId = traceId;
  }
}

export const parseApiEnvelope = (payload, status) => {
  if (!payload || typeof payload !== 'object') {
    throw new ApiRequestError(DEFAULT_ERROR, { status });
  }

  if (payload.success === true) {
    return payload.data;
  }

  const error = payload.error ?? {};
  throw new ApiRequestError(error.message || DEFAULT_ERROR, {
    status,
    code: error.code,
    details: error.details,
    traceId: error.traceId,
  });
};

const buildQuery = (query = {}) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export const apiRequest = async (path, { method = 'GET', query, body, headers, retries = 0 } = {}) => {
  const attemptRequest = async (attempt) => {
    let response;
    try {
      response = await fetch(`/api/v1${path}${buildQuery(query)}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      if (attempt < retries) return attemptRequest(attempt + 1);
      throw new ApiRequestError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      if (!response.ok) {
        throw new ApiRequestError(`HTTP ${response.status} 오류가 발생했습니다.`, { status: response.status });
      }
    }

    try {
      return parseApiEnvelope(payload, response.status);
    } catch (error) {
      if (attempt < retries && error instanceof ApiRequestError && (!error.status || error.status >= 500)) {
        return attemptRequest(attempt + 1);
      }
      throw error;
    }
  };

  return attemptRequest(0);
};
