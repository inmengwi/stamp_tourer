import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

type Bindings = {
  DB: D1Database;
  JWT_ISSUER: string;
  ACCESS_TOKEN_TTL_SECONDS: string;
};

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

const app = new Hono<{ Bindings: Bindings }>();

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json<ApiError>(
      {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: err.message,
        },
      },
      err.status,
    );
  }

  return c.json<ApiError>(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '예상치 못한 오류가 발생했습니다.',
      },
    },
    500,
  );
});

app.get('/api/v1/health', (c) => {
  return c.json<ApiSuccess<{ status: 'ok' }>>({
    success: true,
    data: { status: 'ok' },
  });
});

const listToursQuerySchema = z.object({
  keyword: z.string().max(100).optional(),
  region: z.string().max(30).optional(),
  category: z.enum(['railway', 'sightseeing', 'festival', 'local', 'theme']).optional(),
  status: z.enum(['planned', 'active', 'ended']).optional(),
});

app.get('/api/v1/tours', zValidator('query', listToursQuerySchema), async (c) => {
  const query = c.req.valid('query');

  const where: string[] = [];
  const params: unknown[] = [];

  if (query.keyword) {
    where.push('(title LIKE ? OR description LIKE ?)');
    params.push(`%${query.keyword}%`, `%${query.keyword}%`);
  }
  if (query.region) {
    where.push('region_code = ?');
    params.push(query.region);
  }
  if (query.category) {
    where.push('category = ?');
    params.push(query.category);
  }
  if (query.status) {
    where.push('status = ?');
    params.push(query.status);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `
    SELECT id, title, description, category, region_code AS regionCode, status
    FROM tours
    ${whereClause}
    ORDER BY updated_at DESC
    LIMIT 50
  `;

  const result = await c.env.DB.prepare(sql)
    .bind(...params)
    .all<{
      id: string;
      title: string;
      description: string | null;
      category: string;
      regionCode: string;
      status: string;
    }>();

  return c.json<ApiSuccess<{ items: unknown[] }>>({
    success: true,
    data: {
      items: result.results,
    },
  });
});

app.get('/api/v1/tours/:tourId', async (c) => {
  const tourId = c.req.param('tourId');

  const tour = await c.env.DB.prepare(
    `SELECT id, title, description, category, region_code AS regionCode, status
     FROM tours
     WHERE id = ?`,
  )
    .bind(tourId)
    .first();

  if (!tour) {
    throw new HTTPException(404, { message: '투어를 찾을 수 없습니다.' });
  }

  return c.json<ApiSuccess<{ tour: unknown }>>({
    success: true,
    data: { tour },
  });
});

export default app;
