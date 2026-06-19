import jwt, { type SignOptions } from 'jsonwebtoken';
import type { JwtConfig } from '@src/plugins/config-service';
import type { CreateAccessTokenProps, CreateRefreshTokenProps } from './types';

export class TokenGenerationService {
  constructor(private readonly jwtConfig: JwtConfig) {}

  async createTokens(props: { userId: string; role: string }): Promise<{ accessToken: string; refreshToken: string }> {
    const { userId, role } = props;
    const payload = { id: userId, role };
    const accessToken = await this.createAccessToken(payload);
    const refreshToken = await this.createRefreshToken(payload);

    return { accessToken, refreshToken };
  }

  async createAccessToken(payload: CreateAccessTokenProps): Promise<string> {
    const { accessSecret, accessExpireTime, issuer } = this.jwtConfig;

    const options: SignOptions = {
      expiresIn: accessExpireTime as any,
      issuer, // <--- issuer should be defined either here or inside the payload as { iss: 'lkybe' }. YOU CANNOT DO BOTH! Having both will cause an error!
      audience: payload.id.toString(), // who this token is intended for (SPECIFICALLY!)
      header: { alg: 'HS256', typ: 'JWT' },
    };

    return new Promise((resolve, reject) => {
      jwt.sign(payload, accessSecret, options, (error, token) => {
        if (error) return reject(new Error('something went wrong'));

        resolve(token!);
      });
    });
  }

  async createRefreshToken(payload: CreateRefreshTokenProps): Promise<string> {
    const { refreshSecret, refreshExpireTime, issuer } = this.jwtConfig;

    const options: SignOptions = {
      expiresIn: refreshExpireTime as any,
      issuer,
      audience: payload.id.toString(), // who this token is intended for (SPECIFICALLY!)
      header: { alg: 'HS256', typ: 'JWT' },
    };

    return new Promise((resolve, reject) => {
      jwt.sign(payload, refreshSecret, options, (error, token) => {
        if (error) return reject(new Error('500 InternalServerError'));

        resolve(token!);
      });
    });
  }
}
