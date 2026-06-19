export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

export type DecodedToken = {
  id: string;
  role: string;
  iat: number;
  exp: number;
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
   * Creates access and refresh tokens for the given user ID
   * @param userId - User ID
   * @param role - role for RBAC (included in JWT payload)
   */
  createTokens(userId: string, role: string): Promise<Tokens>;

  /**
   * Verifies an access token and returns the decoded payload
   */
  verifyToken(token: string): Promise<DecodedToken>;
}
