import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

type Bindings = {
  DB: D1Database;
  JWT_ISSUER: string;
  ACCESS_TOKEN_TTL_SECONDS: string;
  CORS_ORIGINS?: string;
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

type ErrorPayload = ApiError['error'];

class AppHttpError extends HTTPException {
  payload: ErrorPayload;

  constructor(status: number, payload: ErrorPayload) {
    super(status as never, { message: payload.message });
    this.payload = payload;
  }
}

const app = new Hono<{ Bindings: Bindings }>();

const defaultCorsOrigins = ['http://localhost:5173'];

const getAllowedCorsOrigins = (rawOrigins?: string): string[] => {
  const envOrigins =
    rawOrigins
      ?.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0) ?? [];

  return [...new Set([...defaultCorsOrigins, ...envOrigins])];
};

app.use(
  '/api/*',
  cors({
    origin: (requestOrigin, c) => {
      if (!requestOrigin) {
        return '';
      }

      const allowedOrigins = getAllowedCorsOrigins(c.env.CORS_ORIGINS);
      return allowedOrigins.includes(requestOrigin) ? requestOrigin : '';
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
  }),
);

const requiredTables = ['users', 'tours', 'stamp_spots', 'tour_participations', 'tour_wishlist', 'stamp_records'] as const;

const toValidationDetails = (issues: z.ZodIssue[]) =>
  issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

const validationError = (
  target: 'json' | 'query' | 'param',
  issues: z.ZodIssue[],
) =>
  new AppHttpError(400, {
    code: `VALIDATION_INVALID_${target.toUpperCase()}`,
    message: `요청 ${target} 값이 올바르지 않습니다.`,
    details: toValidationDetails(issues),
  });

const validateJson = <T extends z.ZodTypeAny>(schema: T) =>
  zValidator('json', schema, (result) => {
    if (!result.success) {
      throw validationError('json', result.error.issues);
    }
  });

const validateQuery = <T extends z.ZodTypeAny>(schema: T) =>
  zValidator('query', schema, (result) => {
    if (!result.success) {
      throw validationError('query', result.error.issues);
    }
  });

const validateParam = <T extends z.ZodTypeAny>(schema: T) =>
  zValidator('param', schema, (result) => {
    if (!result.success) {
      throw validationError('param', result.error.issues);
    }
  });

const getActingUserId = (c: any): string => c.req.header('x-user-id') ?? '00000000-0000-0000-0000-000000000001';

const assertTourExists = async (db: D1Database, tourId: string) => {
  const tour = await db.prepare('SELECT id FROM tours WHERE id = ?').bind(tourId).first<{ id: string }>();
  if (!tour) {
    throw new AppHttpError(404, {
      code: 'NOT_FOUND_TOUR',
      message: '투어를 찾을 수 없습니다.',
      details: { tourId },
    });
  }
};

app.onError((err, c) => {
  if (err instanceof AppHttpError) {
    return c.json<ApiError>({ success: false, error: err.payload }, err.status);
  }

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

app.get('/api/v1/health', async (c) => {
  const existingTablesResult = await c.env.DB.prepare(
    `SELECT name
     FROM sqlite_master
     WHERE type = 'table'
       AND name IN (${requiredTables.map(() => '?').join(', ')})`,
  )
    .bind(...requiredTables)
    .all<{ name: string }>();

  const existingTableNames = new Set(existingTablesResult.results?.map((row) => row.name) ?? []);
  const missingTables = requiredTables.filter((table) => !existingTableNames.has(table));

  if (missingTables.length > 0) {
    return c.json<ApiError>(
      {
        success: false,
        error: {
          code: 'DB_SCHEMA_MISSING',
          message: 'D1 스키마가 적용되지 않았습니다. 마이그레이션을 실행하세요.',
          details: { missingTables },
        },
      },
      500,
    );
  }

  return c.json<ApiSuccess<{ status: 'ok'; tables: readonly string[] }>>({
    success: true,
    data: {
      status: 'ok',
      tables: requiredTables,
    },
  });
});

const listToursQuerySchema = z.object({
  keyword: z.string().max(100).optional(),
  category: z.enum(['railway', 'sightseeing', 'festival', 'local', 'theme']).optional(),
  regionCode: z.string().max(30).optional(),
  period: z.enum(['active', 'always', 'upcoming']).optional(),
  sortBy: z.enum(['popular', 'latest', 'review']).optional(),
});

const tourIdParamSchema = z.object({
  tourId: z.string().uuid(),
});

const createTourBodySchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  category: z.enum(['railway', 'sightseeing', 'festival', 'local', 'theme']),
  regionCode: z.string().min(1).max(30),
  status: z.enum(['planned', 'active', 'ended']).default('planned'),
});

const participationBodySchema = z.object({
  note: z.string().max(300).optional(),
});

const wishlistBodySchema = z.object({
  wished: z.boolean().default(true),
});

const createStampRecordBodySchema = z.object({
  spotId: z.string().uuid(),
  method: z.enum(['manual', 'gps', 'qr', 'photo']),
  memo: z.string().max(300).optional(),
  acquiredAt: z.string().datetime().optional(),
});

const myCollectionQuerySchema = z.object({
  includeRecords: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value !== 'false'),
});

app.get('/api/v1/tours', validateQuery(listToursQuerySchema), async (c) => {
  const query = c.req.valid('query');

  const where: string[] = [];
  const params: unknown[] = [];

  if (query.keyword) {
    where.push('(title LIKE ? OR description LIKE ?)');
    params.push(`%${query.keyword}%`, `%${query.keyword}%`);
  }
  if (query.regionCode) {
    where.push('region_code = ?');
    params.push(query.regionCode);
  }
  if (query.category) {
    where.push('category = ?');
    params.push(query.category);
  }
  if (query.period) {
    where.push('period = ?');
    params.push(query.period);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const orderClause =
    query.sortBy === 'review'
      ? 'ORDER BY t.review_score DESC NULLS LAST, t.created_at DESC'
      : query.sortBy === 'latest'
        ? 'ORDER BY t.created_at DESC'
        : 'ORDER BY t.participants DESC, t.created_at DESC';
  const sql = `
    SELECT
      t.id,
      t.title,
      t.description,
      t.category,
      t.region_code AS regionCode,
      t.difficulty,
      t.duration,
      t.budget,
      t.period,
      t.status,
      t.review_score AS reviewScore,
      t.participants,
      t.reward,
      t.estimated_hours AS estimatedHours,
      t.estimated_cost AS estimatedCost,
      t.organizer,
      t.target_audience AS targetAudience,
      t.thumbnail_emoji AS thumbnailEmoji,
      COUNT(DISTINCT s.id) AS spotCount,
      GROUP_CONCAT(DISTINCT vm.method) AS verificationMethods,
      GROUP_CONCAT(DISTINCT tg.tag) AS tags
    FROM tours
    t
    LEFT JOIN stamp_spots s ON s.tour_id = t.id
    LEFT JOIN tour_verification_methods vm ON vm.tour_id = t.id
    LEFT JOIN tour_tags tg ON tg.tour_id = t.id
    ${whereClause}
    GROUP BY t.id
    ${orderClause}
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
      difficulty: string | null;
      duration: string | null;
      budget: string | null;
      period: string | null;
      status: string;
      reviewScore: number | null;
      participants: number | null;
      reward: string | null;
      estimatedHours: number | null;
      estimatedCost: number | null;
      organizer: string | null;
      targetAudience: string | null;
      thumbnailEmoji: string | null;
      spotCount: number | null;
      verificationMethods: string | null;
      tags: string | null;
    }>();

  const items = (result.results ?? []).map((tour) => ({
    id: tour.id,
    title: tour.title,
    description: tour.description ?? '',
    category: tour.category,
    regionCode: tour.regionCode,
    difficulty: tour.difficulty ?? 'beginner',
    duration: tour.duration ?? 'day',
    budget: tour.budget ?? 'low',
    period: tour.period ?? 'active',
    status: tour.status,
    reviewScore: tour.reviewScore ?? 0,
    participants: tour.participants ?? 0,
    reward: tour.reward ?? '',
    estimatedHours: tour.estimatedHours == null ? 0 : Math.round(tour.estimatedHours),
    estimatedCost:
      tour.estimatedCost == null
        ? '₩0'
        : `₩${new Intl.NumberFormat('ko-KR').format(Math.max(0, Math.round(tour.estimatedCost)))}`,
    organizer: tour.organizer ?? '',
    targetAudience: tour.targetAudience ?? '',
    verificationMethods: tour.verificationMethods ? tour.verificationMethods.split(',') : [],
    tags: tour.tags ? tour.tags.split(',') : [],
    thumbnailEmoji: tour.thumbnailEmoji ?? '🧭',
    spotCount: tour.spotCount ?? 0,
  }));

  return c.json<ApiSuccess<{ items: unknown[] }>>({
    success: true,
    data: {
      items,
    },
  });
});

app.post('/api/v1/tours', validateJson(createTourBodySchema), async (c) => {
  const body = c.req.valid('json');
  const now = Date.now();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO tours (id, title, description, category, region_code, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, body.title, body.description ?? null, body.category, body.regionCode, body.status, now, now)
    .run();

  return c.json<ApiSuccess<{ tour: unknown }>>(
    {
      success: true,
      data: {
        tour: {
          id,
          title: body.title,
          description: body.description ?? null,
          category: body.category,
          regionCode: body.regionCode,
          status: body.status,
        },
      },
    },
    201,
  );
});

app.get('/api/v1/tours/:tourId', validateParam(tourIdParamSchema), async (c) => {
  const { tourId } = c.req.valid('param');

  const tour = await c.env.DB.prepare(
    `SELECT id, title, description, category, region_code AS regionCode, status
     FROM tours
     WHERE id = ?`,
  )
    .bind(tourId)
    .first<{
      id: string;
      title: string;
      description: string | null;
      category: string;
      regionCode: string;
      status: string;
    }>();

  if (!tour) {
    throw new AppHttpError(404, {
      code: 'NOT_FOUND_TOUR',
      message: '투어를 찾을 수 없습니다.',
      details: { tourId },
    });
  }

  const spotsResult = await c.env.DB.prepare(
    `SELECT id, name, address, operation_hours AS operationHours, verification_type AS verificationType
     FROM stamp_spots
     WHERE tour_id = ?
     ORDER BY created_at ASC`,
  )
    .bind(tourId)
    .all<{
      id: string;
      name: string;
      address: string | null;
      operationHours: string | null;
      verificationType: 'manual' | 'gps' | 'qr' | 'photo';
    }>();

  const spots = (spotsResult.results ?? []).map((spot) => ({
    id: spot.id,
    name: spot.name,
    address: spot.address,
    openHours: spot.operationHours,
    verificationTypes: [spot.verificationType],
  }));

  return c.json<ApiSuccess<{ tour: unknown }>>({
    success: true,
    data: {
      tour: {
        ...tour,
        spots,
        milestones: [
          { stampCount: 1, reward: '첫 인증 배지' },
          { stampCount: Math.max(spots.length, 3), reward: '투어 완주 배지' },
        ],
        notices: [
          '운영시간 외에는 스탬프 적립이 제한될 수 있습니다.',
          '현장 상황에 따라 스팟 접근이 제한될 수 있습니다.',
        ],
      },
    },
  });
});

app.post(
  '/api/v1/tours/:tourId/participation',
  validateParam(tourIdParamSchema),
  validateJson(participationBodySchema),
  async (c) => {
    const userId = getActingUserId(c);
    const { tourId } = c.req.valid('param');
    await assertTourExists(c.env.DB, tourId);

    const existing = await c.env.DB.prepare('SELECT id FROM tour_participations WHERE tour_id = ? AND user_id = ?')
      .bind(tourId, userId)
      .first<{ id: string }>();

    if (existing) {
      throw new AppHttpError(409, {
        code: 'DUPLICATE_PARTICIPATION',
        message: '이미 참여 중인 투어입니다.',
        details: { tourId, userId },
      });
    }

    const now = Date.now();
    await c.env.DB.prepare(
      `INSERT INTO tour_participations (id, tour_id, user_id, status, joined_at, created_at, updated_at)
       VALUES (?, ?, ?, 'active', ?, ?, ?)`,
    )
      .bind(crypto.randomUUID(), tourId, userId, now, now, now)
      .run();

    return c.json<ApiSuccess<{ participation: unknown }>>(
      {
        success: true,
        data: {
          participation: {
            tourId,
            userId,
            status: 'active',
            joinedAt: new Date(now).toISOString(),
          },
        },
      },
      201,
    );
  },
);

app.post('/api/v1/tours/:tourId/wishlist', validateParam(tourIdParamSchema), validateJson(wishlistBodySchema), async (c) => {
  const userId = getActingUserId(c);
  const { tourId } = c.req.valid('param');
  const { wished } = c.req.valid('json');

  await assertTourExists(c.env.DB, tourId);

  const now = Date.now();
  if (wished) {
    const existing = await c.env.DB.prepare('SELECT id FROM tour_wishlist WHERE tour_id = ? AND user_id = ?')
      .bind(tourId, userId)
      .first<{ id: string }>();

    if (existing) {
      throw new AppHttpError(409, {
        code: 'DUPLICATE_WISHLIST',
        message: '이미 찜한 투어입니다.',
        details: { tourId, userId },
      });
    }

    await c.env.DB.prepare(
      `INSERT INTO tour_wishlist (id, tour_id, user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(crypto.randomUUID(), tourId, userId, now, now)
      .run();
  } else {
    await c.env.DB.prepare('DELETE FROM tour_wishlist WHERE tour_id = ? AND user_id = ?').bind(tourId, userId).run();
  }

  return c.json<ApiSuccess<{ wishlist: unknown }>>({
    success: true,
    data: {
      wishlist: {
        tourId,
        userId,
        wished,
        updatedAt: new Date(now).toISOString(),
      },
    },
  });
});

app.post('/api/v1/stamps/records', validateJson(createStampRecordBodySchema), async (c) => {
  const body = c.req.valid('json');
  const userId = getActingUserId(c);
  const now = Date.now();
  const acquiredAt = body.acquiredAt ? new Date(body.acquiredAt).getTime() : now;

  const spot = await c.env.DB.prepare(
    `SELECT id, tour_id AS tourId, name
     FROM stamp_spots
     WHERE id = ?`,
  )
    .bind(body.spotId)
    .first<{ id: string; tourId: string; name: string }>();

  if (!spot) {
    throw new AppHttpError(404, {
      code: 'NOT_FOUND_SPOT',
      message: '스팟을 찾을 수 없습니다.',
      details: { spotId: body.spotId },
    });
  }

  const duplicate = await c.env.DB.prepare(
    'SELECT id FROM stamp_records WHERE user_id = ? AND spot_id = ? AND acquired_at = ?',
  )
    .bind(userId, body.spotId, acquiredAt)
    .first<{ id: string }>();

  if (duplicate) {
    throw new AppHttpError(409, {
      code: 'DUPLICATE_STAMP_RECORD',
      message: '동일한 스탬프 기록이 이미 존재합니다.',
      details: { spotId: body.spotId, acquiredAt: new Date(acquiredAt).toISOString() },
    });
  }

  const recordId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO stamp_records (id, user_id, tour_id, spot_id, method, memo, acquired_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(recordId, userId, spot.tourId, body.spotId, body.method, body.memo ?? null, acquiredAt, now, now)
    .run();

  return c.json<ApiSuccess<{ record: unknown }>>(
    {
      success: true,
      data: {
        record: {
          id: recordId,
          userId,
          tourId: spot.tourId,
          spotId: body.spotId,
          spotName: spot.name,
          method: body.method,
          memo: body.memo ?? null,
          acquiredAt: new Date(acquiredAt).toISOString(),
        },
      },
    },
    201,
  );
});

app.get('/api/v1/collections/me', validateQuery(myCollectionQuerySchema), async (c) => {
  const { includeRecords } = c.req.valid('query');
  const userId = getActingUserId(c);

  const [activeToursResult, completedToursResult, wishlistResult, recordsResult] = await Promise.all([
    c.env.DB.prepare(
      `SELECT tp.tour_id AS tourId, t.title, tp.joined_at AS joinedAt
       FROM tour_participations tp
       JOIN tours t ON t.id = tp.tour_id
       WHERE tp.user_id = ? AND tp.status = 'active'
       ORDER BY tp.joined_at DESC`,
    )
      .bind(userId)
      .all<{ tourId: string; title: string; joinedAt: number }>(),
    c.env.DB.prepare(
      `SELECT tp.tour_id AS tourId, t.title, tp.updated_at AS completedAt
       FROM tour_participations tp
       JOIN tours t ON t.id = tp.tour_id
       WHERE tp.user_id = ? AND tp.status = 'completed'
       ORDER BY tp.updated_at DESC`,
    )
      .bind(userId)
      .all<{ tourId: string; title: string; completedAt: number }>(),
    c.env.DB.prepare(
      `SELECT w.tour_id AS tourId, t.title, w.created_at AS wishedAt
       FROM tour_wishlist w
       JOIN tours t ON t.id = w.tour_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
    )
      .bind(userId)
      .all<{ tourId: string; title: string; wishedAt: number }>(),
    includeRecords
      ? c.env.DB.prepare(
          `SELECT sr.id, sr.tour_id AS tourId, sr.spot_id AS spotId, ss.name AS spotName, sr.method, sr.memo, sr.acquired_at AS acquiredAt
           FROM stamp_records sr
           JOIN stamp_spots ss ON ss.id = sr.spot_id
           WHERE sr.user_id = ?
           ORDER BY sr.acquired_at DESC`,
        )
          .bind(userId)
          .all<{
            id: string;
            tourId: string;
            spotId: string;
            spotName: string;
            method: string;
            memo: string | null;
            acquiredAt: number;
          }>()
      : Promise.resolve({ results: [] }),
  ]);

  return c.json<ApiSuccess<{ collection: unknown }>>({
    success: true,
    data: {
      collection: {
        user: { id: userId },
        summary: {
          activeTourCount: activeToursResult.results?.length ?? 0,
          completedTourCount: completedToursResult.results?.length ?? 0,
          wishlistCount: wishlistResult.results?.length ?? 0,
          stampRecordCount: recordsResult.results?.length ?? 0,
        },
        activeTours:
          activeToursResult.results?.map((item) => ({
            tourId: item.tourId,
            title: item.title,
            joinedAt: new Date(item.joinedAt).toISOString(),
          })) ?? [],
        completedTours:
          completedToursResult.results?.map((item) => ({
            tourId: item.tourId,
            title: item.title,
            completedAt: new Date(item.completedAt).toISOString(),
          })) ?? [],
        wishlist:
          wishlistResult.results?.map((item) => ({
            tourId: item.tourId,
            title: item.title,
            wishedAt: new Date(item.wishedAt).toISOString(),
          })) ?? [],
        records:
          recordsResult.results?.map((item) => ({
            ...item,
            acquiredAt: new Date(item.acquiredAt).toISOString(),
          })) ?? [],
      },
    },
  });
});

export default app;
