import { Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

type Bindings = {
  DB: D1Database;
  JWT_ISSUER: string;
  ACCESS_TOKEN_TTL_SECONDS: string;
  JWT_SECRET: string;
  CORS_ORIGINS?: string;
  AI_PROVIDER?: string;
  AI_MODEL?: string;
  GEMINI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
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
    traceId?: string;
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

type Variables = {
  traceId: string;
  userId?: string;
  userNickname?: string;
  userRole?: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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

      if (allowedOrigins.includes(requestOrigin)) {
        return requestOrigin;
      }

      // Support wildcard subdomain patterns (e.g. https://*.pages.dev)
      for (const pattern of allowedOrigins) {
        if (pattern.includes('*')) {
          const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[a-z0-9-]+');
          if (new RegExp(`^${escaped}$`).test(requestOrigin)) {
            return requestOrigin;
          }
        }
      }

      return '';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    maxAge: 600,
  }),
);

app.use('/api/*', async (c, next) => {
  c.set('traceId', crypto.randomUUID());
  await next();
});

// ---- JWT Utilities (Web Crypto API) ----

const base64urlEncode = (data: Uint8Array): string =>
  btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

const base64urlDecode = (str: string): Uint8Array => {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '=='.slice((2 - (base64.length & 3)) & 3);
  return new Uint8Array([...atob(padded)].map((c) => c.charCodeAt(0)));
};

const getHmacKey = (secret: string): Promise<CryptoKey> =>
  crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);

const signJwt = async (payload: Record<string, unknown>, secret: string): Promise<string> => {
  const enc = new TextEncoder();
  const header = base64urlEncode(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64urlEncode(enc.encode(JSON.stringify(payload)));
  const signingInput = `${header}.${body}`;
  const key = await getHmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(signingInput)));
  return `${signingInput}.${base64urlEncode(sig)}`;
};

const verifyJwt = async (token: string, secret: string): Promise<Record<string, unknown>> => {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('invalid jwt format');
  const [header, body, sig] = parts;
  const key = await getHmacKey(secret);
  const enc = new TextEncoder();
  const valid = await crypto.subtle.verify('HMAC', key, base64urlDecode(sig), enc.encode(`${header}.${body}`));
  if (!valid) throw new Error('invalid jwt signature');
  const decoded = JSON.parse(new TextDecoder().decode(base64urlDecode(body))) as Record<string, unknown>;
  if (typeof decoded.exp === 'number' && Date.now() / 1000 > decoded.exp) throw new Error('jwt expired');
  return decoded;
};

// ---- Password Utilities ----

const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.randomUUID().replace(/-/g, '');
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(salt + password));
  return `${salt}:${btoa(String.fromCharCode(...new Uint8Array(hash)))}`;
};

const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const idx = stored.indexOf(':');
  if (idx === -1) return false;
  const salt = stored.slice(0, idx);
  const hash = stored.slice(idx + 1);
  const enc = new TextEncoder();
  const computed = await crypto.subtle.digest('SHA-256', enc.encode(salt + password));
  return btoa(String.fromCharCode(...new Uint8Array(computed))) === hash;
};

// ---- Auth Middleware ----

// Optional auth: sets userId from JWT if valid, otherwise continues without
const optionalAuth = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization') as string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const secret = c.env.JWT_SECRET as string | undefined;
    if (secret) {
      try {
        const payload = await verifyJwt(token, secret);
        if (typeof payload.sub === 'string') c.set('userId', payload.sub);
        if (typeof payload.nickname === 'string') c.set('userNickname', payload.nickname);
        if (typeof payload.role === 'string') c.set('userRole', payload.role);
      } catch {
        // ignore — proceed as unauthenticated
      }
    }
  }
  await next();
};

// Required auth: throws 401 if no valid JWT
const requireAuth = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization') as string | undefined;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppHttpError(401, { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
  }
  const token = authHeader.slice(7);
  const secret = c.env.JWT_SECRET as string | undefined;
  if (!secret) {
    throw new AppHttpError(500, { code: 'SERVER_CONFIG_ERROR', message: '서버 설정 오류입니다.' });
  }
  try {
    const payload = await verifyJwt(token, secret);
    if (typeof payload.sub !== 'string') throw new Error('missing sub');
    c.set('userId', payload.sub);
    if (typeof payload.nickname === 'string') c.set('userNickname', payload.nickname);
    if (typeof payload.role === 'string') c.set('userRole', payload.role);
  } catch {
    throw new AppHttpError(401, { code: 'INVALID_TOKEN', message: '유효하지 않은 인증 정보입니다.' });
  }
  await next();
};

// Admin only: throws 403 if user is not admin
const requireAdmin = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization') as string | undefined;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppHttpError(401, { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
  }
  const token = authHeader.slice(7);
  const secret = c.env.JWT_SECRET as string | undefined;
  if (!secret) {
    throw new AppHttpError(500, { code: 'SERVER_CONFIG_ERROR', message: '서버 설정 오류입니다.' });
  }
  try {
    const payload = await verifyJwt(token, secret);
    if (typeof payload.sub !== 'string') throw new Error('missing sub');
    c.set('userId', payload.sub);
    if (typeof payload.nickname === 'string') c.set('userNickname', payload.nickname);
    if (typeof payload.role === 'string') c.set('userRole', payload.role);

    const role = payload.role as string | undefined;
    if (role !== 'admin') {
      throw new AppHttpError(403, { code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' });
    }
  } catch (err) {
    if (err instanceof AppHttpError) throw err;
    throw new AppHttpError(401, { code: 'INVALID_TOKEN', message: '유효하지 않은 인증 정보입니다.' });
  }
  await next();
};

// Apply optional auth to all API routes
app.use('/api/*', optionalAuth);

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

// Prefers JWT-derived userId, falls back to x-user-id header, then default test user
const getActingUserId = (c: any): string =>
  (c.get('userId') as string | undefined) ??
  (c.req.header('x-user-id') as string | undefined) ??
  '00000000-0000-0000-0000-000000000001';

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
  const traceId = c.get('traceId') ?? 'unknown';

  if (err instanceof AppHttpError) {
    return c.json<ApiError>({ success: false, error: err.payload }, err.status);
  }

  if (err instanceof HTTPException) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        traceId,
        type: 'HTTPException',
        status: err.status,
        message: err.message,
        method: c.req.method,
        path: c.req.path,
      }),
    );
    return c.json<ApiError>(
      {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: err.message,
          traceId,
        },
      },
      err.status,
    );
  }

  const errorMessage = err instanceof Error ? err.message : String(err);

  console.error(
    JSON.stringify({
      level: 'error',
      traceId,
      type: 'UnhandledError',
      message: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      name: err instanceof Error ? err.name : undefined,
      method: c.req.method,
      path: c.req.path,
      query: c.req.query(),
      userId: c.req.header('x-user-id') ?? null,
    }),
  );

  if (/no such table:\s*\S+/i.test(errorMessage)) {
    return c.json<ApiError>(
      {
        success: false,
        error: {
          code: 'DB_SCHEMA_MISSING',
          message: 'D1 스키마가 적용되지 않았습니다. 마이그레이션을 실행하세요.',
          traceId,
        },
      },
      500,
    );
  }

  return c.json<ApiError>(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '예상치 못한 오류가 발생했습니다.',
        traceId,
      },
    },
    500,
  );
});

// ---- Validation Schemas ----

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
  difficulty: z.string().max(30).optional(),
  duration: z.string().max(30).optional(),
  budget: z.string().max(30).optional(),
  period: z.string().max(30).optional(),
  reward: z.string().max(200).optional(),
  estimatedHours: z.number().min(0).optional(),
  estimatedCost: z.union([z.string(), z.number()]).optional(),
  organizer: z.string().max(100).optional(),
  targetAudience: z.string().max(100).optional(),
  thumbnailEmoji: z.string().max(10).optional(),
  verificationMethods: z.array(z.enum(['manual', 'gps', 'qr', 'photo'])).optional(),
  spots: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1).max(120),
    address: z.string().max(200).optional(),
    openHours: z.string().max(100).optional(),
    description: z.string().max(500).optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    verificationTypes: z.array(z.string()).optional(),
    subTourTitle: z.string().max(120).optional(),
  })).optional(),
  milestones: z.array(z.object({
    stampCount: z.number().optional(),
    reward: z.string().max(200),
  })).optional(),
  notices: z.array(z.string().max(500)).optional(),
  tags: z.array(z.string().max(50)).optional(),
  contactInfo: z.object({
    phone: z.string().optional(),
    email: z.string().optional(),
    website: z.string().optional(),
  }).optional(),
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

const spotIdParamSchema = z.object({
  tourId: z.string().uuid(),
  spotId: z.string().uuid(),
});

const upsertScheduleBodySchema = z.object({
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD여야 합니다.'),
});

const myCollectionQuerySchema = z.object({
  includeRecords: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value !== 'false'),
});

const registerBodySchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
  nickname: z.string().min(1).max(50),
});

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const searchOnlineBodySchema = z.object({
  name: z.string().min(1, '투어 이름은 필수입니다.').max(200),
  description: z.string().max(1000).optional(),
});

const aiTourResponseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  category: z.enum(['railway', 'sightseeing', 'festival', 'local', 'theme']).default('sightseeing'),
  regionCode: z.string().max(30).default('서울'),
  difficulty: z.enum(['beginner', 'mid', 'expert']).default('beginner'),
  duration: z.enum(['day', 'weekend', 'long']).default('day'),
  budget: z.enum(['low', 'mid', 'high']).default('low'),
  period: z.enum(['active', 'always', 'upcoming']).default('always'),
  status: z.enum(['planned', 'active', 'ended']).default('active'),
  reward: z.string().max(200).default(''),
  estimatedHours: z.number().min(0).default(4),
  estimatedCost: z.string().max(50).default('₩0'),
  organizer: z.string().max(200).default(''),
  targetAudience: z.string().max(200).default('누구나'),
  verificationMethods: z.array(z.enum(['manual', 'gps', 'qr', 'photo'])).default(['manual']),
  milestones: z.array(z.object({
    stampCount: z.number().min(1),
    reward: z.string().max(200),
  })).default([]),
  notices: z.array(z.string().max(500)).default([]),
  contactInfo: z.object({
    phone: z.string().default(''),
    email: z.string().default(''),
    website: z.string().default(''),
  }).default({ phone: '', email: '', website: '' }),
  tags: z.array(z.string().max(50)).default([]),
  thumbnailEmoji: z.string().max(10).default('📍'),
  spots: z.array(z.object({
    name: z.string().min(1).max(200),
    address: z.string().max(300).default(''),
    roadAddress: z.string().max(300).default(''),
    openHours: z.string().max(100).default(''),
    description: z.string().max(500).default(''),
    lat: z.number().min(33).max(39).optional(),
    lng: z.number().min(124).max(132).optional(),
    verificationTypes: z.array(z.string()).default(['manual']),
  })).default([]),
});

const aiTourMetadataSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  category: z.enum(['railway', 'sightseeing', 'festival', 'local', 'theme']).default('sightseeing'),
  regionCode: z.string().max(30).default('서울'),
  difficulty: z.enum(['beginner', 'mid', 'expert']).default('beginner'),
  duration: z.enum(['day', 'weekend', 'long']).default('day'),
  budget: z.enum(['low', 'mid', 'high']).default('low'),
  period: z.enum(['active', 'always', 'upcoming']).default('always'),
  status: z.enum(['planned', 'active', 'ended']).default('active'),
  reward: z.string().max(200).default(''),
  estimatedHours: z.number().min(0).default(4),
  estimatedCost: z.string().max(50).default('₩0'),
  organizer: z.string().max(200).default(''),
  targetAudience: z.string().max(200).default('누구나'),
  verificationMethods: z.array(z.enum(['manual', 'gps', 'qr', 'photo'])).default(['manual']),
  milestones: z.array(z.object({
    stampCount: z.number().min(1),
    reward: z.string().max(200),
  })).default([]),
  notices: z.array(z.string().max(500)).default([]),
  contactInfo: z.object({
    phone: z.string().default(''),
    email: z.string().default(''),
    website: z.string().default(''),
  }).default({ phone: '', email: '', website: '' }),
  tags: z.array(z.string().max(50)).default([]),
  thumbnailEmoji: z.string().max(10).default('📍'),
  estimatedSpotCount: z.number().min(0).default(0),
  tourType: z.string().max(50).default('코스별'),
});

const aiSpotSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(300).default(''),
  roadAddress: z.string().max(300).default(''),
  openHours: z.string().max(100).default(''),
  description: z.string().max(500).default(''),
  lat: z.number().min(33).max(39).optional(),
  lng: z.number().min(124).max(132).optional(),
  verificationTypes: z.array(z.string()).default(['manual']),
});

const aiSubTourSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  description: z.string().max(500).default(''),
  stamps: z.array(aiSpotSchema).min(1),
});

const aiTourSpotsResponseSchema = z.object({
  subTours: z.array(aiSubTourSchema).min(1),
});

const organizeBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(50).optional(),
  tourType: z.string().max(50).optional(),
  organizer: z.string().max(200).optional(),
});

// ---- AI Tour Search ----

const TOUR_SEARCH_SYSTEM_PROMPT = `당신은 한국의 스탬프 투어 전문가입니다. 사용자가 투어 이름과 설명을 제공하면, 해당 투어에 대한 상세 정보를 JSON 형식으로 생성합니다.

## 규칙
1. 반드시 유효한 JSON만 출력하세요. 설명이나 마크다운 없이 순수 JSON만 반환합니다.
2. 한국의 실제 장소, 관광지, 문화유산, 축제, 철도 등에 대한 지식을 활용하세요.
3. 알 수 없는 투어라면, 사용자가 제공한 이름과 설명을 바탕으로 합리적인 투어 정보를 생성하세요.
4. 모든 텍스트는 한국어로 작성하세요.
5. 장소(spots)는 최소 3개, 최대 10개를 포함하세요.

## 주소 규칙 (매우 중요)
- 모든 주소는 반드시 대한민국 도로명주소 형식을 사용하세요.
- 올바른 형식 예시: "서울특별시 종로구 사직로 161", "부산광역시 해운대구 해운대해변로 264"
- 잘못된 형식 예시: "서울 종로구 경복궁 근처", "부산 해운대 해변가"
- 주소를 확신할 수 없는 경우, address와 roadAddress 필드를 빈 문자열("")로 두세요. 절대 추측하여 존재하지 않는 주소를 생성하지 마세요.
- roadAddress 필드에도 도로명주소를 기재하세요. address와 동일할 수 있습니다.

## 좌표 규칙
- 각 장소의 위도(lat)와 경도(lng)를 소수점 6자리까지 제공하세요.
- 대한민국 좌표 범위: 위도 33.0~38.7, 경도 124.5~131.9
- 좌표를 확신할 수 없는 경우, lat과 lng 필드를 생략하세요.

## 운영시간 규칙
- 운영시간은 "HH:MM-HH:MM" 형식을 사용하세요 (예: "09:00-18:00").
- 24시간 운영: "00:00-24:00"
- 상시 개방된 야외 장소: "상시"
- 운영시간을 확신할 수 없는 경우 빈 문자열("")로 두세요.

## 출력 JSON 스키마
{
  "title": "투어 제목 (string)",
  "description": "투어 상세 설명 (string, 2~3문장)",
  "category": "railway | sightseeing | festival | local | theme 중 하나",
  "regionCode": "서울 | 부산 | 제주 | 경기 | 강원 | 충북 | 충남 | 전북 | 전남 | 경북 | 경남 | 인천 | 대전 | 대구 | 광주 | 울산 | 세종 중 하나",
  "difficulty": "beginner | mid | expert 중 하나",
  "duration": "day | weekend | long 중 하나",
  "budget": "low | mid | high 중 하나",
  "period": "active | always | upcoming 중 하나",
  "status": "planned | active | ended 중 하나",
  "reward": "최종 보상 설명 (string)",
  "estimatedHours": 예상 소요 시간 (number),
  "estimatedCost": "예상 비용 (string, 예: ₩15,000)",
  "organizer": "주최 기관 (string)",
  "targetAudience": "대상 (string, 예: 누구나)",
  "verificationMethods": ["manual", "gps", "qr", "photo" 중 해당하는 것들],
  "milestones": [
    { "stampCount": number, "reward": "보상 설명" }
  ],
  "notices": ["주의사항1", "주의사항2"],
  "contactInfo": {
    "phone": "전화번호",
    "email": "이메일",
    "website": "웹사이트 URL"
  },
  "tags": ["태그1", "태그2"],
  "thumbnailEmoji": "대표 이모지 1개",
  "spots": [
    {
      "name": "장소명",
      "address": "도로명주소 (확실한 경우만)",
      "roadAddress": "도로명주소 (확실한 경우만)",
      "openHours": "운영시간 (예: 09:00-18:00, 확실한 경우만)",
      "description": "장소 설명 (1~2문장)",
      "lat": 위도 (number, 소수점 6자리, 확실한 경우만),
      "lng": 경도 (number, 소수점 6자리, 확실한 경우만),
      "verificationTypes": ["manual", "gps", "qr", "photo" 중 해당하는 것들]
    }
  ]
}`;

const GROUNDING_PROMPT_ADDENDUM = `

## 웹 검색 활용 지침
- Google 검색을 통해 각 장소의 최신 정보를 확인하세요.
- 검색 결과에서 확인된 실제 도로명주소, 운영시간, 좌표를 우선 사용하세요.
- 검색으로 확인할 수 없는 정보는 빈 문자열로 두세요.
- 공식 웹사이트나 네이버/카카오 지도 정보를 우선 참고하세요.`;

const TOUR_METADATA_SYSTEM_PROMPT = `당신은 한국의 스탬프 투어 전문가입니다. 사용자가 투어 이름과 설명을 제공하면, 해당 투어에 대한 기본 메타데이터 정보를 JSON 형식으로 생성합니다.

## 규칙
1. 반드시 유효한 JSON만 출력하세요. 설명이나 마크다운 없이 순수 JSON만 반환합니다.
2. 한국의 실제 장소, 관광지, 문화유산, 축제, 철도 등에 대한 지식을 활용하세요.
3. 알 수 없는 투어라면, 사용자가 제공한 이름과 설명을 바탕으로 합리적인 투어 정보를 생성하세요.
4. 모든 텍스트는 한국어로 작성하세요.
5. **중요: 방문 장소(spots)는 포함하지 마세요.** 투어 메타데이터만 생성합니다.
6. estimatedSpotCount: 이 투어에 포함될 것으로 예상되는 방문 장소 수를 추정하세요.
7. tourType: 투어의 구조 유형을 다음 중 하나로 지정하세요:
   - "코스별": 여러 코스/길로 구성 (예: 국가유산 방문자여권의 궁궐길, 왕릉길 등)
   - "지역별": 지역 단위로 구성 (예: 서울권, 부산권 등)
   - "테마별": 테마 단위로 구성 (예: 역사, 자연, 미식 등)
   - "단일코스": 하나의 코스로 구성된 투어

## 출력 JSON 스키마
{
  "title": "투어 제목 (string)",
  "description": "투어 상세 설명 (string, 2~3문장)",
  "category": "railway | sightseeing | festival | local | theme 중 하나",
  "regionCode": "서울 | 부산 | 제주 | 경기 | 강원 | 충북 | 충남 | 전북 | 전남 | 경북 | 경남 | 인천 | 대전 | 대구 | 광주 | 울산 | 세종 중 하나",
  "difficulty": "beginner | mid | expert 중 하나",
  "duration": "day | weekend | long 중 하나",
  "budget": "low | mid | high 중 하나",
  "period": "active | always | upcoming 중 하나",
  "status": "planned | active | ended 중 하나",
  "reward": "최종 보상 설명 (string)",
  "estimatedHours": 예상 소요 시간 (number),
  "estimatedCost": "예상 비용 (string, 예: ₩15,000)",
  "organizer": "주최 기관 (string)",
  "targetAudience": "대상 (string, 예: 누구나)",
  "verificationMethods": ["manual", "gps", "qr", "photo" 중 해당하는 것들],
  "milestones": [
    { "stampCount": number, "reward": "보상 설명" }
  ],
  "notices": ["주의사항1", "주의사항2"],
  "contactInfo": {
    "phone": "전화번호",
    "email": "이메일",
    "website": "웹사이트 URL"
  },
  "tags": ["태그1", "태그2"],
  "thumbnailEmoji": "대표 이모지 1개",
  "estimatedSpotCount": 예상 방문 장소 수 (number),
  "tourType": "코스별 | 지역별 | 테마별 | 단일코스 중 하나"
}`;

const TOUR_SPOTS_SYSTEM_PROMPT = `당신은 한국의 스탬프 투어 전문가입니다. 사용자가 투어 정보를 제공하면, 해당 투어의 방문 장소들을 서브투어(코스/테마/지역) 구조로 정리하여 JSON 형식으로 생성합니다.

## 규칙
1. 반드시 유효한 JSON만 출력하세요. 설명이나 마크다운 없이 순수 JSON만 반환합니다.
2. 한국의 실제 장소, 관광지, 문화유산, 축제, 철도 등에 대한 지식을 활용하세요.
3. 모든 텍스트는 한국어로 작성하세요.
4. **중요: 반드시 subTours 배열로 장소를 구조화하세요.**

## 서브투어 구조화 규칙
- 투어 유형에 따라 적절히 서브투어를 나누세요:
  - 코스별: 코스/길 단위 (예: 궁궐길, 왕릉길 등)
  - 지역별: 지역 단위 (예: 서울권, 부산권, 제주권 등)
  - 테마별: 테마 단위 (예: 역사유적, 자연경관, 미식체험 등)
  - 단일코스: 하나의 서브투어에 모든 장소를 포함
- 각 서브투어에는 최소 2개, 최대 10개의 장소(stamps)를 포함하세요.
- 전체 장소 수는 최소 3개, 최대 30개를 포함하세요.

## 주소 규칙 (매우 중요)
- 모든 주소는 반드시 대한민국 도로명주소 형식을 사용하세요.
- 올바른 형식 예시: "서울특별시 종로구 사직로 161", "부산광역시 해운대구 해운대해변로 264"
- 주소를 확신할 수 없는 경우, address와 roadAddress 필드를 빈 문자열("")로 두세요.

## 좌표 규칙
- 각 장소의 위도(lat)와 경도(lng)를 소수점 6자리까지 제공하세요.
- 대한민국 좌표 범위: 위도 33.0~38.7, 경도 124.5~131.9
- 좌표를 확신할 수 없는 경우, lat과 lng 필드를 생략하세요.

## 운영시간 규칙
- 운영시간은 "HH:MM-HH:MM" 형식을 사용하세요 (예: "09:00-18:00").
- 24시간 운영: "00:00-24:00", 상시 개방: "상시"
- 운영시간을 확신할 수 없는 경우 빈 문자열("")로 두세요.

## 출력 JSON 스키마
{
  "subTours": [
    {
      "id": "고유 ID (string, 예: course-1, region-seoul)",
      "title": "서브투어 제목 (string, 예: 궁궐길 (서울))",
      "description": "서브투어 설명 (string, 1문장)",
      "stamps": [
        {
          "name": "장소명",
          "address": "도로명주소 (확실한 경우만)",
          "roadAddress": "도로명주소 (확실한 경우만)",
          "openHours": "운영시간 (예: 09:00-18:00)",
          "description": "장소 설명 (1~2문장)",
          "lat": 위도 (number, 확실한 경우만),
          "lng": 경도 (number, 확실한 경우만),
          "verificationTypes": ["manual", "gps", "qr", "photo" 중 해당하는 것들]
        }
      ]
    }
  ]
}`;

const DEFAULT_AI_MODELS: Record<string, string> = {
  gemini: 'gemini-3.1-pro-preview',
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o-mini',
};

const MODEL_MAX_OUTPUT_TOKENS: Record<string, number> = {
  // Gemini
  'gemini-3.1-pro-preview': 65_536,
  'gemini-3-pro-preview': 65_536,
  'gemini-3-flash-preview': 64_000,
  'gemini-2.5-pro': 65_536,
  'gemini-2.5-flash': 65_536,
  'gemini-2.0-flash': 8_192,
  'gemini-1.5-pro': 8_192,
  'gemini-1.5-flash': 8_192,
  // Anthropic
  'claude-opus-4-6': 128_000,
  'claude-sonnet-4-6': 64_000,
  'claude-opus-4-5': 64_000,
  'claude-opus-4-5-20251101': 64_000,
  'claude-sonnet-4-5': 64_000,
  'claude-sonnet-4-5-20250929': 64_000,
  'claude-haiku-4-5': 8_192,
  'claude-haiku-4-5-20251001': 8_192,
  'claude-opus-4-1': 32_000,
  'claude-opus-4-1-20250805': 32_000,
  'claude-opus-4': 32_000,
  'claude-sonnet-4': 64_000,
  'claude-sonnet-4-20250514': 64_000,
  'claude-3-5-sonnet-20241022': 8_192,
  'claude-haiku-3-5-20241022': 8_192,
  // OpenAI
  'gpt-5': 128_000,
  'gpt-5-mini': 128_000,
  'gpt-4.1': 32_768,
  'gpt-4.1-mini': 32_768,
  'gpt-4o': 16_384,
  'gpt-4o-mini': 16_384,
  'gpt-4-turbo': 4_096,
  'gpt-3.5-turbo': 4_096,
  'o3': 100_000,
  'o3-pro': 100_000,
  'o3-mini': 100_000,
  'o4-mini': 100_000,
  'o1': 100_000,
  'o1-mini': 65_536,
};

const DEFAULT_MAX_OUTPUT_TOKENS = 4_096;

function getMaxOutputTokens(model: string): number {
  return MODEL_MAX_OUTPUT_TOKENS[model] ?? DEFAULT_MAX_OUTPUT_TOKENS;
}

function extractJSON(text: string): unknown {
  let jsonStr = text.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }
  return JSON.parse(jsonStr);
}

async function callGemini(model: string, apiKey: string, systemPrompt: string, userMessage: string, maxTokens: number): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: maxTokens },
      }),
    },
  );
  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown');
    throw new Error(`Gemini API returned ${response.status}: ${errorBody}`);
  }
  const result = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text content in Gemini response');
  return text;
}

async function callAnthropic(model: string, apiKey: string, systemPrompt: string, userMessage: string, maxTokens: number): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown');
    throw new Error(`Anthropic API returned ${response.status}: ${errorBody}`);
  }
  const result = await response.json() as {
    content?: Array<{ type: string; text?: string }>;
  };
  const textBlock = result.content?.find((block) => block.type === 'text');
  if (!textBlock?.text) throw new Error('No text content in Anthropic response');
  return textBlock.text;
}

async function callOpenAI(model: string, apiKey: string, systemPrompt: string, userMessage: string, maxTokens: number): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown');
    throw new Error(`OpenAI API returned ${response.status}: ${errorBody}`);
  }
  const result = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = result.choices?.[0]?.message?.content;
  if (!text) throw new Error('No text content in OpenAI response');
  return text;
}

async function callGeminiWithGrounding(model: string, apiKey: string, systemPrompt: string, userMessage: string, maxTokens: number): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userMessage }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    },
  );
  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown');
    // If grounding fails (unsupported model or upstream timeout), fall back to standard call
    if (response.status === 400 || response.status === 408 || response.status === 504 || response.status === 524) {
      return callGemini(model, apiKey, systemPrompt, userMessage, maxTokens);
    }
    throw new Error(`Gemini API (grounded) returned ${response.status}: ${errorBody}`);
  }
  const result = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text content in grounded Gemini response');
  return text;
}

async function callAI(
  provider: string, model: string, apiKey: string,
  systemPrompt: string, userMessage: string,
  options?: { useGrounding?: boolean },
): Promise<string> {
  const maxTokens = getMaxOutputTokens(model);
  switch (provider) {
    case 'gemini':
      if (options?.useGrounding) {
        return callGeminiWithGrounding(model, apiKey, systemPrompt, userMessage, maxTokens);
      }
      return callGemini(model, apiKey, systemPrompt, userMessage, maxTokens);
    case 'anthropic': return callAnthropic(model, apiKey, systemPrompt, userMessage, maxTokens);
    case 'openai': return callOpenAI(model, apiKey, systemPrompt, userMessage, maxTokens);
    default: throw new Error(`Unknown AI provider: ${provider}`);
  }
}

interface AiStreamLogMessages {
  init: string;
  prompt: string;
  generating: string;
  parsing: string;
  validating: string;
  complete: (data: unknown) => string;
}

async function handleAiStreamRequest<T>(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  systemPromptBase: string,
  userMessage: string,
  schema: z.ZodType<T>,
  logMessages: AiStreamLogMessages,
  resultMapper: (data: T) => unknown,
) {
  const provider = (c.env.AI_PROVIDER || 'gemini').toLowerCase();
  const model = c.env.AI_MODEL || DEFAULT_AI_MODELS[provider] || DEFAULT_AI_MODELS.gemini;

  const apiKeyMap: Record<string, string | undefined> = {
    gemini: c.env.GEMINI_API_KEY,
    anthropic: c.env.ANTHROPIC_API_KEY,
    openai: c.env.OPENAI_API_KEY,
  };
  const apiKey = apiKeyMap[provider];

  if (!apiKey) {
    throw new AppHttpError(503, {
      code: 'AI_SERVICE_UNAVAILABLE',
      message: 'AI 검색 서비스가 설정되지 않았습니다.',
    });
  }

  const useGrounding = provider === 'gemini';
  const systemPrompt = useGrounding
    ? systemPromptBase + GROUNDING_PROMPT_ADDENDUM
    : systemPromptBase;

  let sseId = 0;
  const traceId = c.get('traceId');

  return streamSSE(c, async (stream) => {
    const sendLog = async (step: string, message: string, detail?: string) => {
      await stream.writeSSE({
        event: 'log',
        data: JSON.stringify({ step, message, detail }),
        id: String(sseId++),
      });
    };

    try {
      await sendLog('init', logMessages.init);

      console.log(
        JSON.stringify({
          level: 'debug',
          type: 'AISearchRequest',
          provider,
          model,
          userMessage,
          traceId,
        }),
      );

      await sendLog('prompt', logMessages.prompt, `${provider} / ${model}`);
      await sendLog('generating', logMessages.generating);

      let aiResponseText: string;
      try {
        aiResponseText = await callAI(provider, model, apiKey, systemPrompt, userMessage, { useGrounding });
      } catch (err) {
        console.error(
          JSON.stringify({
            level: 'error',
            type: 'AISearchError',
            provider,
            model,
            message: err instanceof Error ? err.message : String(err),
            traceId,
          }),
        );
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({
            code: 'AI_REQUEST_FAILED',
            message: 'AI 서비스 요청에 실패했습니다. 잠시 후 다시 시도해주세요.',
          }),
          id: String(sseId++),
        });
        return;
      }

      console.log(
        JSON.stringify({
          level: 'debug',
          type: 'AISearchRawResponse',
          responseLength: aiResponseText.length,
          rawResponse: aiResponseText.slice(0, 2000),
          traceId,
        }),
      );

      await sendLog('parsing', logMessages.parsing);

      let parsed: unknown;
      try {
        parsed = extractJSON(aiResponseText);
      } catch {
        console.error(
          JSON.stringify({
            level: 'error',
            type: 'AIResponseParseError',
            raw: aiResponseText.slice(0, 500),
            traceId,
          }),
        );
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({
            code: 'AI_RESPONSE_INVALID',
            message: 'AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.',
          }),
          id: String(sseId++),
        });
        return;
      }

      console.log(
        JSON.stringify({
          level: 'debug',
          type: 'AISearchParsedJSON',
          parsed,
          traceId,
        }),
      );

      await sendLog('validating', logMessages.validating);

      const validation = schema.safeParse(parsed);
      if (!validation.success) {
        console.error(
          JSON.stringify({
            level: 'error',
            type: 'AIResponseValidationError',
            issues: validation.error.issues,
            traceId,
          }),
        );
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({
            code: 'AI_RESPONSE_INVALID',
            message: 'AI 응답이 올바른 형식이 아닙니다. 다시 시도해주세요.',
          }),
          id: String(sseId++),
        });
        return;
      }

      const completeMsg = logMessages.complete(validation.data);
      await sendLog('complete', completeMsg);

      await stream.writeSSE({
        event: 'result',
        data: JSON.stringify({
          success: true,
          data: resultMapper(validation.data),
        }),
        id: String(sseId++),
      });
    } catch (err) {
      console.error(
        JSON.stringify({
          level: 'error',
          type: 'AISearchUnexpectedError',
          message: err instanceof Error ? err.message : String(err),
          traceId,
        }),
      );
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({
          code: 'INTERNAL_ERROR',
          message: '예상치 못한 오류가 발생했습니다.',
        }),
        id: String(sseId++),
      });
    }
  });
}

// ---- Health ----

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

// ---- Auth Endpoints ----

app.post('/api/v1/auth/register', validateJson(registerBodySchema), async (c) => {
  const { email, password, nickname } = c.req.valid('json');

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    throw new AppHttpError(409, { code: 'DUPLICATE_EMAIL', message: '이미 사용 중인 이메일입니다.' });
  }

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const now = Date.now();

  const role = 'tourer';
  await c.env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, nickname, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, email, passwordHash, nickname, role, now, now)
    .run();

  const secret = c.env.JWT_SECRET;
  const ttl = parseInt(c.env.ACCESS_TOKEN_TTL_SECONDS || '86400');
  const iat = Math.floor(Date.now() / 1000);

  const token = await signJwt(
    { sub: id, nickname, email, role, iat, exp: iat + ttl, iss: c.env.JWT_ISSUER },
    secret,
  );

  return c.json<ApiSuccess<{ token: string; user: unknown }>>(
    { success: true, data: { token, user: { id, email, nickname, role } } },
    201,
  );
});

app.post('/api/v1/auth/login', validateJson(loginBodySchema), async (c) => {
  const { email, password } = c.req.valid('json');

  const user = await c.env.DB.prepare('SELECT id, email, password_hash, nickname, role FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; email: string; password_hash: string; nickname: string; role: string }>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw new AppHttpError(401, { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  }

  const secret = c.env.JWT_SECRET;
  const ttl = parseInt(c.env.ACCESS_TOKEN_TTL_SECONDS || '86400');
  const iat = Math.floor(Date.now() / 1000);

  const token = await signJwt(
    { sub: user.id, nickname: user.nickname, email: user.email, role: user.role, iat, exp: iat + ttl, iss: c.env.JWT_ISSUER },
    secret,
  );

  return c.json<ApiSuccess<{ token: string; user: unknown }>>({
    success: true,
    data: { token, user: { id: user.id, email: user.email, nickname: user.nickname, role: user.role } },
  });
});

// ---- User Endpoints ----

app.get('/api/v1/users/me', requireAuth, async (c) => {
  const userId = c.get('userId') as string;

  const user = await c.env.DB.prepare('SELECT id, email, nickname, role FROM users WHERE id = ?')
    .bind(userId)
    .first<{ id: string; email: string; nickname: string; role: string }>();

  if (!user) {
    throw new AppHttpError(404, { code: 'NOT_FOUND_USER', message: '사용자를 찾을 수 없습니다.' });
  }

  return c.json<ApiSuccess<{ user: unknown }>>({ success: true, data: { user } });
});

// ---- Tour Endpoints ----

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
      (COUNT(DISTINCT s.id) + COUNT(DISTINCT ts.id)) AS spotCount,
      GROUP_CONCAT(DISTINCT vm.method) AS verificationMethods,
      GROUP_CONCAT(DISTINCT tg.tag) AS tags
    FROM tours
    t
    LEFT JOIN stamp_spots s ON s.tour_id = t.id
    LEFT JOIN tour_spots ts ON ts.tour_id = t.id
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

app.post('/api/v1/tours', requireAdmin, validateJson(createTourBodySchema), async (c) => {
  const body = c.req.valid('json');
  const now = Date.now();
  const id = crypto.randomUUID();

  const estimatedCostNum =
    body.estimatedCost == null
      ? null
      : typeof body.estimatedCost === 'number'
        ? body.estimatedCost
        : parseInt(String(body.estimatedCost), 10) || null;

  // Insert tour with all columns
  await c.env.DB.prepare(
    `INSERT INTO tours (id, title, description, category, region_code, status,
       difficulty, duration, budget, period, reward,
       estimated_hours, estimated_cost, organizer, target_audience, thumbnail_emoji,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id, body.title, body.description ?? null, body.category, body.regionCode, body.status,
      body.difficulty ?? null, body.duration ?? null, body.budget ?? null, body.period ?? null, body.reward ?? null,
      body.estimatedHours ?? null, estimatedCostNum, body.organizer ?? null, body.targetAudience ?? null, body.thumbnailEmoji ?? null,
      now, now,
    )
    .run();

  // Insert spots into tour_spots
  const spots: Array<{ id: string; name: string; description: string | null; address: string | null; openHours: string | null; lat: number | null; lng: number | null; subTourTitle: string | null }> = [];
  if (body.spots?.length) {
    const stmts = body.spots.map((spot, idx) => {
      const spotId = spot.id || crypto.randomUUID();
      spots.push({ id: spotId, name: spot.name, description: spot.description ?? null, address: spot.address ?? null, openHours: spot.openHours ?? null, lat: spot.lat ?? null, lng: spot.lng ?? null, subTourTitle: spot.subTourTitle ?? null });
      return c.env.DB.prepare(
        `INSERT INTO tour_spots (id, tour_id, name, description, address, lat, lng, operation_hours, sub_tour_title, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(spotId, id, spot.name, spot.description ?? null, spot.address ?? null, spot.lat ?? null, spot.lng ?? null, spot.openHours ?? null, spot.subTourTitle ?? null, idx, now, now);
    });
    await c.env.DB.batch(stmts);
  }

  // Insert milestones into tour_milestones
  const milestones: Array<{ stampCount: number | null; reward: string }> = [];
  if (body.milestones?.length) {
    const stmts = body.milestones.map((m, idx) => {
      milestones.push({ stampCount: m.stampCount ?? null, reward: m.reward });
      return c.env.DB.prepare(
        `INSERT INTO tour_milestones (id, tour_id, title, reward, target_count, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(crypto.randomUUID(), id, m.reward, m.reward, m.stampCount ?? null, idx, now, now);
    });
    await c.env.DB.batch(stmts);
  }

  // Insert notices into tour_notices
  const notices: string[] = [];
  if (body.notices?.length) {
    const stmts = body.notices.map((n) => {
      notices.push(n);
      return c.env.DB.prepare(
        `INSERT INTO tour_notices (id, tour_id, title, content, is_pinned, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
      ).bind(crypto.randomUUID(), id, n, n, now, now);
    });
    await c.env.DB.batch(stmts);
  }

  // Insert verification methods
  if (body.verificationMethods?.length) {
    const stmts = body.verificationMethods.map((method) =>
      c.env.DB.prepare(
        `INSERT INTO tour_verification_methods (id, tour_id, method, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).bind(crypto.randomUUID(), id, method, now, now),
    );
    await c.env.DB.batch(stmts);
  }

  // Insert tags
  const tags: string[] = [];
  if (body.tags?.length) {
    const stmts = body.tags.map((tag) => {
      tags.push(tag);
      return c.env.DB.prepare(
        `INSERT INTO tour_tags (id, tour_id, tag, created_at) VALUES (?, ?, ?, ?)`,
      ).bind(crypto.randomUUID(), id, tag, now);
    });
    await c.env.DB.batch(stmts);
  }

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
          difficulty: body.difficulty ?? null,
          duration: body.duration ?? null,
          budget: body.budget ?? null,
          period: body.period ?? null,
          reward: body.reward ?? null,
          estimatedHours: body.estimatedHours ?? null,
          estimatedCost: estimatedCostNum,
          organizer: body.organizer ?? null,
          targetAudience: body.targetAudience ?? null,
          thumbnailEmoji: body.thumbnailEmoji ?? null,
          participants: 0,
          reviewScore: null,
          spots,
          milestones,
          notices,
          tags,
          verificationMethods: body.verificationMethods ?? [],
        },
      },
    },
    201,
  );
});

app.post('/api/v1/tours/search-online', requireAdmin, validateJson(searchOnlineBodySchema), async (c) => {
  const { name, description } = c.req.valid('json');
  const userMessage = description
    ? `투어 이름: ${name}\n투어 설명: ${description}`
    : `투어 이름: ${name}`;

  return handleAiStreamRequest(
    c,
    TOUR_SEARCH_SYSTEM_PROMPT,
    userMessage,
    aiTourResponseSchema,
    {
      init: 'AI 서비스를 초기화하고 있습니다...',
      prompt: 'AI에게 투어 정보 생성을 요청하고 있습니다...',
      generating: 'AI가 투어 정보를 생성하고 있습니다...',
      parsing: 'AI 응답을 분석하고 있습니다...',
      validating: '투어 정보를 검증하고 있습니다...',
      complete: (data) => `투어 정보 생성 완료! (${(data as z.infer<typeof aiTourResponseSchema>).spots.length}개 스팟)`,
    },
    (data) => ({ tour: data }),
  );
});

app.post('/api/v1/tours/search-online/metadata', requireAdmin, validateJson(searchOnlineBodySchema), async (c) => {
  const { name, description } = c.req.valid('json');
  const userMessage = description
    ? `투어 이름: ${name}\n투어 설명: ${description}`
    : `투어 이름: ${name}`;

  return handleAiStreamRequest(
    c,
    TOUR_METADATA_SYSTEM_PROMPT,
    userMessage,
    aiTourMetadataSchema,
    {
      init: 'AI 서비스를 초기화하고 있습니다...',
      prompt: 'AI에게 투어 메타데이터 생성을 요청하고 있습니다...',
      generating: 'AI가 투어 정보를 검색하고 있습니다...',
      parsing: 'AI 응답을 분석하고 있습니다...',
      validating: '투어 메타데이터를 검증하고 있습니다...',
      complete: (data) => {
        const meta = data as z.infer<typeof aiTourMetadataSchema>;
        return `투어 검색 완료! (예상 ${meta.estimatedSpotCount}개 장소, ${meta.tourType} 구조)`;
      },
    },
    (data) => ({ tour: data }),
  );
});

app.post('/api/v1/tours/search-online/organize', requireAdmin, validateJson(organizeBodySchema), async (c) => {
  const { title, description, category, tourType, organizer } = c.req.valid('json');
  const parts = [`투어 이름: ${title}`];
  if (description) parts.push(`투어 설명: ${description}`);
  if (category) parts.push(`카테고리: ${category}`);
  if (tourType) parts.push(`투어 구조 유형: ${tourType}`);
  if (organizer) parts.push(`주최: ${organizer}`);
  const userMessage = parts.join('\n');

  return handleAiStreamRequest(
    c,
    TOUR_SPOTS_SYSTEM_PROMPT,
    userMessage,
    aiTourSpotsResponseSchema,
    {
      init: 'AI 서비스를 초기화하고 있습니다...',
      prompt: 'AI에게 방문 장소 정리를 요청하고 있습니다...',
      generating: 'AI가 방문 장소를 서브투어 구조로 정리하고 있습니다...',
      parsing: 'AI 응답을 분석하고 있습니다...',
      validating: '방문 장소 정보를 검증하고 있습니다...',
      complete: (data) => {
        const result = data as z.infer<typeof aiTourSpotsResponseSchema>;
        const totalStamps = result.subTours.reduce((sum, st) => sum + st.stamps.length, 0);
        return `방문 장소 정리 완료! (${result.subTours.length}개 서브투어, ${totalStamps}개 장소)`;
      },
    },
    (data) => data,
  );
});

app.get('/api/v1/tours/:tourId', validateParam(tourIdParamSchema), async (c) => {
  const { tourId } = c.req.valid('param');

  const tour = await c.env.DB.prepare(
    `SELECT id, title, description, category, region_code AS regionCode, status,
            difficulty, duration, budget, period, reward,
            estimated_hours AS estimatedHours, estimated_cost AS estimatedCost,
            organizer, target_audience AS targetAudience,
            thumbnail_emoji AS thumbnailEmoji, participants, review_score AS reviewScore
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
      difficulty: string | null;
      duration: string | null;
      budget: string | null;
      period: string | null;
      reward: string | null;
      estimatedHours: number | null;
      estimatedCost: number | null;
      organizer: string | null;
      targetAudience: string | null;
      thumbnailEmoji: string | null;
      participants: number | null;
      reviewScore: number | null;
    }>();

  if (!tour) {
    throw new AppHttpError(404, {
      code: 'NOT_FOUND_TOUR',
      message: '투어를 찾을 수 없습니다.',
      details: { tourId },
    });
  }

  // Query tour_spots first, fall back to stamp_spots for legacy data
  const tourSpotsResult = await c.env.DB.prepare(
    `SELECT id, name, description, address, lat, lng, operation_hours AS openHours, sub_tour_title AS subTourTitle
     FROM tour_spots
     WHERE tour_id = ?
     ORDER BY sort_order ASC, created_at ASC`,
  )
    .bind(tourId)
    .all<{
      id: string;
      name: string;
      description: string | null;
      address: string | null;
      lat: number | null;
      lng: number | null;
      openHours: string | null;
      subTourTitle: string | null;
    }>();

  let spots: Array<{ id: string; name: string; description: string | null; address: string | null; lat: number | null; lng: number | null; openHours: string | null; subTourTitle: string | null }>;
  if ((tourSpotsResult.results ?? []).length > 0) {
    spots = (tourSpotsResult.results ?? []).map((spot) => ({
      id: spot.id,
      name: spot.name,
      description: spot.description,
      address: spot.address,
      lat: spot.lat,
      lng: spot.lng,
      openHours: spot.openHours,
      subTourTitle: spot.subTourTitle,
    }));
  } else {
    // Fallback to legacy stamp_spots table
    const legacySpotsResult = await c.env.DB.prepare(
      `SELECT id, name, address, operation_hours AS openHours, verification_type AS verificationType
       FROM stamp_spots
       WHERE tour_id = ?
       ORDER BY created_at ASC`,
    )
      .bind(tourId)
      .all<{
        id: string;
        name: string;
        address: string | null;
        openHours: string | null;
        verificationType: string | null;
      }>();
    spots = (legacySpotsResult.results ?? []).map((spot) => ({
      id: spot.id,
      name: spot.name,
      description: null,
      address: spot.address,
      lat: null,
      lng: null,
      openHours: spot.openHours,
      subTourTitle: null,
    }));
  }

  // Query milestones from tour_milestones, fall back to defaults
  const milestonesResult = await c.env.DB.prepare(
    `SELECT target_count AS stampCount, reward
     FROM tour_milestones
     WHERE tour_id = ?
     ORDER BY sort_order ASC, created_at ASC`,
  )
    .bind(tourId)
    .all<{ stampCount: number | null; reward: string }>();

  const milestones = (milestonesResult.results ?? []).length > 0
    ? milestonesResult.results!
    : [
        { stampCount: 1, reward: '첫 인증 배지' },
        { stampCount: Math.max(spots.length, 3), reward: '투어 완주 배지' },
      ];

  // Query notices from tour_notices, fall back to defaults
  const noticesResult = await c.env.DB.prepare(
    `SELECT content FROM tour_notices WHERE tour_id = ? ORDER BY created_at ASC`,
  )
    .bind(tourId)
    .all<{ content: string }>();

  const notices = (noticesResult.results ?? []).length > 0
    ? (noticesResult.results!).map((n) => n.content)
    : [
        '운영시간 외에는 스탬프 적립이 제한될 수 있습니다.',
        '현장 상황에 따라 스팟 접근이 제한될 수 있습니다.',
      ];

  // Query tags
  const tagsResult = await c.env.DB.prepare(
    `SELECT tag FROM tour_tags WHERE tour_id = ? ORDER BY created_at ASC`,
  )
    .bind(tourId)
    .all<{ tag: string }>();
  const tags = (tagsResult.results ?? []).map((t) => t.tag);

  // Query verification methods
  const vmResult = await c.env.DB.prepare(
    `SELECT DISTINCT method FROM tour_verification_methods WHERE tour_id = ?`,
  )
    .bind(tourId)
    .all<{ method: string }>();
  const verificationMethods = (vmResult.results ?? []).map((v) => v.method);

  return c.json<ApiSuccess<{ tour: unknown }>>({
    success: true,
    data: {
      tour: {
        ...tour,
        spots,
        milestones,
        notices,
        tags,
        verificationMethods,
      },
    },
  });
});

// ---- Participation Endpoints ----


app.delete('/api/v1/tours/:tourId', requireAdmin, validateParam(tourIdParamSchema), async (c) => {
  const { tourId } = c.req.valid('param');

  await assertTourExists(c.env.DB, tourId);

  await c.env.DB.prepare('DELETE FROM spot_schedules WHERE tour_id = ?').bind(tourId).run();
  await c.env.DB.prepare('DELETE FROM stamp_records WHERE tour_id = ?').bind(tourId).run();
  await c.env.DB.prepare('DELETE FROM tour_participations WHERE tour_id = ?').bind(tourId).run();
  await c.env.DB.prepare('DELETE FROM tour_wishlist WHERE tour_id = ?').bind(tourId).run();
  await c.env.DB.prepare('DELETE FROM wishlists WHERE tour_id = ?').bind(tourId).run();

  await c.env.DB.prepare('DELETE FROM tour_notices WHERE tour_id = ?').bind(tourId).run();
  await c.env.DB.prepare('DELETE FROM tour_milestones WHERE tour_id = ?').bind(tourId).run();
  await c.env.DB.prepare('DELETE FROM tour_tags WHERE tour_id = ?').bind(tourId).run();
  await c.env.DB.prepare('DELETE FROM tour_verification_methods WHERE tour_id = ?').bind(tourId).run();
  await c.env.DB.prepare('DELETE FROM tour_spots WHERE tour_id = ?').bind(tourId).run();
  await c.env.DB.prepare('DELETE FROM stamp_spots WHERE tour_id = ?').bind(tourId).run();
  await c.env.DB.prepare('DELETE FROM tours WHERE id = ?').bind(tourId).run();

  return c.json<ApiSuccess<{ deletedTourId: string }>>({
    success: true,
    data: { deletedTourId: tourId },
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

app.post(
  '/api/v1/tours/:tourId/participation/complete',
  validateParam(tourIdParamSchema),
  async (c) => {
    const userId = getActingUserId(c);
    const { tourId } = c.req.valid('param');

    const participation = await c.env.DB.prepare(
      `SELECT id FROM tour_participations WHERE tour_id = ? AND user_id = ? AND status = 'active'`,
    )
      .bind(tourId, userId)
      .first<{ id: string }>();

    if (!participation) {
      throw new AppHttpError(404, {
        code: 'NOT_FOUND_PARTICIPATION',
        message: '참여 중인 투어를 찾을 수 없습니다.',
        details: { tourId, userId },
      });
    }

    const now = Date.now();
    await c.env.DB.prepare(
      `UPDATE tour_participations SET status = 'completed', updated_at = ? WHERE tour_id = ? AND user_id = ?`,
    )
      .bind(now, tourId, userId)
      .run();

    return c.json<ApiSuccess<{ participation: unknown }>>({
      success: true,
      data: {
        participation: {
          tourId,
          userId,
          status: 'completed',
          completedAt: new Date(now).toISOString(),
        },
      },
    });
  },
);

// ---- Wishlist Endpoint ----

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

// ---- Stamp Endpoints ----

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

// ---- Schedule Endpoints ----

app.get('/api/v1/tours/:tourId/schedules', validateParam(tourIdParamSchema), async (c) => {
  const userId = getActingUserId(c);
  const { tourId } = c.req.valid('param');

  const result = await c.env.DB.prepare(
    `SELECT spot_id AS spotId, scheduled_date AS scheduledDate
     FROM spot_schedules
     WHERE user_id = ? AND tour_id = ?`,
  )
    .bind(userId, tourId)
    .all<{ spotId: string; scheduledDate: string }>();

  const schedules: Record<string, string> = {};
  for (const row of result.results ?? []) {
    schedules[row.spotId] = row.scheduledDate;
  }

  return c.json<ApiSuccess<{ schedules: Record<string, string> }>>({
    success: true,
    data: { schedules },
  });
});

app.put(
  '/api/v1/tours/:tourId/spots/:spotId/schedule',
  validateParam(spotIdParamSchema),
  validateJson(upsertScheduleBodySchema),
  async (c) => {
    const userId = getActingUserId(c);
    const { tourId, spotId } = c.req.valid('param');
    const { scheduledDate } = c.req.valid('json');
    const now = Date.now();
    const id = crypto.randomUUID();

    await c.env.DB.prepare(
      `INSERT INTO spot_schedules (id, user_id, tour_id, spot_id, scheduled_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, tour_id, spot_id)
       DO UPDATE SET scheduled_date = excluded.scheduled_date, updated_at = excluded.updated_at`,
    )
      .bind(id, userId, tourId, spotId, scheduledDate, now, now)
      .run();

    return c.json<ApiSuccess<{ schedule: unknown }>>({
      success: true,
      data: {
        schedule: {
          tourId,
          spotId,
          userId,
          scheduledDate,
          updatedAt: new Date(now).toISOString(),
        },
      },
    });
  },
);

// ---- Collection Endpoint ----

app.get('/api/v1/collections/me', validateQuery(myCollectionQuerySchema), async (c) => {
  const { includeRecords } = c.req.valid('query');
  const userId = getActingUserId(c);

  const [userResult, activeToursResult, completedToursResult, wishlistResult, recordsResult] = await Promise.all([
    c.env.DB.prepare('SELECT id, nickname FROM users WHERE id = ?')
      .bind(userId)
      .first<{ id: string; nickname: string }>(),
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
        user: { id: userId, nickname: userResult?.nickname ?? null },
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
