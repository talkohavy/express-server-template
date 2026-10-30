export const API_PATHS = {
  healthCheck: '/api/health-check',
  apiDocs: '/api/docs',
  // authentication
  auth: '/api/auth',
  authLogin: '/api/auth/login',
  authLogout: '/api/auth/logout',
  authRefresh: '/api/auth/refresh',
  createTokens: '/api/auth/tokens',
  consumeRefreshToken: '/api/auth/consume-refresh-token',
  revokeSession: '/api/auth/revoke-session',
  verifyToken: '/api/auth/verify-token',
  isPasswordValid: '/api/auth/is-password-valid',
  // users
  users: '/api/users',
  userById: '/api/users/:userId',
  getProfile: '/api/users/get-profile',
  getUserByEmail: '/api/users/get-by-email',
  // books
  books: '/api/books',
  bookById: '/api/books/:bookId',
  // dragons
  dragons: '/api/dragons',
  dragonById: '/api/dragons/:dragonId',
  // upload file
  uploadFileMultipart: '/api/upload-file/multipart',
  uploadFileBinary: '/api/upload-file/binary',
  // metrics
  metrics: '/api/metrics',
  // data query
  dataQuery: '/api/data',
  dataQuerySchema: '/api/data/schema',
  // feature flags
  featureFlags: '/api/feature-flags',
  featureFlagByKey: '/api/feature-flags/:key',
  evaluateFeatureFlags: '/api/feature-flags/evaluate',
  isFeatureFlagEnabled: '/api/feature-flags/:key/enabled',
  // server-sent events
  sse: '/api/sse',
  // backend
  backendMiddleware: '/api/backend',
  internalWsState: '/api/internal/ws-state',
} satisfies Record<string, `/${string}`>;

/**
 * Paths that should be excluded from certain middlewares
 */
export const EXCLUDED_PATHS = [API_PATHS.healthCheck, API_PATHS.metrics] as string[];
