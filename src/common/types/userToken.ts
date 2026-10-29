export type UserToken = {
  id: string;
  role: string;
  /**
   * Expiry, in seconds since the epoch (the JWT `exp` claim).
   */
  exp: number;
  /**
   * The login session the token belongs to (the JWT `sid` claim). Every login starts a new one.
   */
  sid: string;
};
