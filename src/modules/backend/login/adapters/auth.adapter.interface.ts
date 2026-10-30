export type Tokens = {
  accessToken: string;
  /**
   * In milliseconds since the epoch.
   */
  accessTokenExpiresAt: number;
  refreshToken: string;
  /**
   * In milliseconds since the epoch.
   */
  refreshTokenExpiresAt: number;
};

/**
 * A login session, shared by every refresh token rotated from one login.
 */
export type Session = {
  /**
   * Also the access token's `sid`.
   */
  id: string;
  /**
   * The absolute end of the session, in milliseconds since the epoch.
   */
  expiresAt: number;
};

export type CreateTokensProps = {
  userId: string;
  /**
   * For RBAC, included in the access token's payload.
   */
  role: string;
  /**
   * The session to continue (on refresh). When omitted, a new session starts (on login).
   */
  session?: Session;
};

export type DecodedToken = {
  id: string;
  role: string;
  iat: number;
  exp: number;
  /**
   * The login session the token belongs to.
   * Should be unique for each login session.
   * A login is considered to be a new session when the user logs in from a new device or browser.
   */
  sid: string;
  iss: string;
  aud: string;
};

export interface IAuthAdapter {
  /**
   * Generates a hashed password from raw password and salt
   */
  generateHashedPassword(rawPassword: string, salt: string): Promise<string>;

  /**
   * Validates if the provided raw password matches the stored hashed password
   */
  getIsPasswordValid(saltAndHashedPassword: string, rawPassword: string): Promise<boolean>;

  /**
   * Creates an access token, and a refresh token that is stored in the DB.
   */
  createTokens(props: CreateTokensProps): Promise<Tokens>;

  /**
   * Verifies an access token and returns the decoded payload
   */
  verifyToken(token: string): Promise<DecodedToken>;
}
