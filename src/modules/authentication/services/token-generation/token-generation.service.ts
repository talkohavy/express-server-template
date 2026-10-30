import { randomBytes } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { JwtConfig } from '@src/plugins/config-service';
import type { AccessTokenResult, CreateAccessTokenProps } from './types';

const REFRESH_TOKEN_BYTES = 32;

export class TokenGenerationService {
  constructor(private readonly jwtConfig: JwtConfig) {}

  async createAccessToken(payload: CreateAccessTokenProps): Promise<AccessTokenResult> {
    const { accessSecret, accessTokenTtlSeconds, issuer } = this.jwtConfig;

    const options: SignOptions = {
      expiresIn: accessTokenTtlSeconds,
      issuer, // <--- issuer should be defined either here or inside the payload as { iss: 'lkybe' }. YOU CANNOT DO BOTH! Having both will cause an error!
      audience: payload.id.toString(), // who this token is intended for (SPECIFICALLY!)
      header: { alg: 'HS256', typ: 'JWT' },
    };

    const expiresAt = Date.now() + accessTokenTtlSeconds * 1000;

    const accessToken = await new Promise<string>((resolve, reject) => {
      jwt.sign(payload, accessSecret, options, (error, token) => {
        if (error) return reject(new Error('something went wrong'));

        resolve(token!);
      });
    });

    return { accessToken, expiresAt };
  }

  /**
   * An opaque random string: it is looked up in the DB on every use anyway, so it carries no claims.
   */
  createRefreshToken(): string {
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');

    return refreshToken;
  }
}
