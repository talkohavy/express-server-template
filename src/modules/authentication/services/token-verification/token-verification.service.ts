import jwt, { type VerifyOptions } from 'jsonwebtoken';
import { UnauthorizedError } from '@src/core/errors';
import { JWT_ALGORITHM } from '../../logic/constants';
import type { JwtConfig } from '@src/plugins/config-service';

export class TokenVerificationService {
  constructor(private readonly jwtConfig: JwtConfig) {}

  async verifyToken(token: string): Promise<any> {
    const { accessPublicKey, issuer } = this.jwtConfig;

    // Pinned to the algorithm tokens are signed with, so a token can't pick its own (e.g. HS256 with the public key as its secret).
    const options: VerifyOptions = { issuer, algorithms: [JWT_ALGORITHM] };

    const decodedToken = (await new Promise((resolve, reject) => {
      jwt.verify(token, accessPublicKey, options, (error, decoded: any) => {
        if (error) return reject(new UnauthorizedError('Invalid or expired access token'));

        resolve(decoded);
      });
    })) as any;

    return decodedToken;
  }
}
