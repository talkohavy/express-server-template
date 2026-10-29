export type CreateAccessTokenProps = {
  id: string;
  role?: string;
  /**
   * The login session the token belongs to.
   */
  sid?: string;
};

export type CreateRefreshTokenProps = {
  id: string;
  role?: string;
  /**
   * The login session the token belongs to.
   */
  sid?: string;
};
