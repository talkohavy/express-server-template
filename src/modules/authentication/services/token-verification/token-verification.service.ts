import jwt, { type VerifyOptions } from 'jsonwebtoken';
import type { JwtConfig } from '@src/plugins/config-service';

export class TokenVerificationService {
  constructor(private readonly jwtConfig: JwtConfig) {}

  async verifyToken(token: string): Promise<any> {
    const { accessSecret, issuer } = this.jwtConfig;

    const options: VerifyOptions = { issuer };

    const decodedToken = (await new Promise((resolve, reject) => {
      jwt.verify(token, accessSecret, options, (error, decoded: any) => {
        if (error) return reject(error);

        resolve(decoded);
      });
    })) as any;

    return decodedToken;
  }
}
