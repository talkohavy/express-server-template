export type UserToken = {
  id: string;
  role: string;
  /**
   * Expiry, in seconds since the epoch (the JWT `exp` claim).
   */
  exp: number;
};
