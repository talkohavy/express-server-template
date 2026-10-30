export type CreateAccessTokenProps = {
  id: string;
  role?: string;
  /**
   * The login session the token belongs to.
   */
  sid?: string;
};

export type AccessTokenResult = {
  accessToken: string;
  /**
   * When the access token expires, in milliseconds since the epoch.
   */
  expiresAt: number;
};
