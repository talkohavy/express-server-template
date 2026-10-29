import jwt, { type VerifyOptions } from 'jsonwebtoken';
import { UnauthorizedError } from '@src/core/errors';
import type { JwtConfig } from '@src/plugins/config-service';

export class TokenVerificationService {
  constructor(private readonly jwtConfig: JwtConfig) {}

  async verifyToken(token: string): Promise<any> {
    const { accessSecret, issuer } = this.jwtConfig;

    // Pinned to the algorithm tokens are signed with (see TokenGenerationService), so a token can't pick its own.
    const options: VerifyOptions = { issuer, algorithms: ['HS256'] };

    const decodedToken = (await new Promise((resolve, reject) => {
      jwt.verify(token, accessSecret, options, (error, decoded: any) => {
        if (error) return reject(new UnauthorizedError('Invalid or expired access token'));

        resolve(decoded);
      });
    })) as any;

    return decodedToken;
  }
}
