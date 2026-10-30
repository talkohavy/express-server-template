/**
 * A login session: every refresh token rotated from one login (a token "family") shares it.
 */
export type Session = {
  /**
   * The refresh tokens' `family_id`, and the access token's `sid`.
   */
  id: string;
  /**
   * The absolute end of the session, in milliseconds since the epoch. Rotating a token never extends it.
   */
  expiresAt: number;
};

export type CreateTokensProps = {
  userId: string;
  role: string;
  /**
   * The session to continue (on refresh). When omitted, a new session starts (on login).
   */
  session?: Session;
};

export type CreateTokensResult = {
  accessToken: string;
  /**
   * In milliseconds since the epoch.
   */
  accessTokenExpiresAt: number;
  refreshToken: string;
  /**
   * In milliseconds since the epoch. Never later than the session's end.
   */
  refreshTokenExpiresAt: number;
};

export type ConsumeRefreshTokenResult = {
  userId: string;
  /**
   * The session the consumed token belonged to. Pass it to `createTokens` to issue the session's next token.
   */
  session: Session;
};
