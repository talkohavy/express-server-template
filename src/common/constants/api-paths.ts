export const API_PATHS = {
  healthCheck: '/api/health-check',
  apiDocs: '/api/docs',
  // authentication
  auth: '/api/auth',
  authLogin: '/api/auth/login',
  authLogout: '/api/auth/logout',
  createTokens: '/api/auth/tokens',
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
  metrics: '/metrics',
  // backend
  backendMiddleware: '/api/backend',
  internalWsState: '/api/internal/ws-state',
} satisfies Record<string, `/${string}`>;

/**
 * Paths that should be excluded from certain middlewares
 */
export const EXCLUDED_PATHS = [API_PATHS.healthCheck, API_PATHS.metrics] as string[];
