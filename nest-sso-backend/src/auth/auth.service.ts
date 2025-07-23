import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  async generatePkce(): Promise<{ redirectUrl: string; codeVerifier: string }> {
    const codeChallengeMethod =
      this.configService.get<string>('KEYCLOAK_PKCE_CHALLENGE_METHOD') ??
      'S256';
    const codeVerifier = crypto.randomBytes(32).toString('hex');
    const challenge = this.base64URLEncode(
      crypto.createHash('SHA256').update(codeVerifier).digest(),
    );
    const params = new URLSearchParams({
      client_id: this.configService.get('KEYCLOAK_CLIENT_ID'),
      redirect_uri: this.configService.get('KEYCLOAK_REDIRECT_URI'),
      response_type: 'code',
      scope: 'openid profile email',
      code_challenge: challenge,
      code_challenge_method: codeChallengeMethod,
      state: crypto.randomBytes(8).toString('hex'),
    });
    const redirectUrl = `${this.configService.get('KEYCLOAK_ISSUER_URL')}/protocol/openid-connect/auth?${params}`;
    return { redirectUrl, codeVerifier };
  }

  async handleCallback(code: string, codeVerifier: string) {
    const tokenUrl = `${this.configService.get('KEYCLOAK_ISSUER_URL')}/protocol/openid-connect/token`;

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.configService.get('KEYCLOAK_REDIRECT_URI'),
      client_id: this.configService.get('KEYCLOAK_CLIENT_ID'),
      client_secret: this.configService.get('KEYCLOAK_CLIENT_SECRET'),
      code_verifier: codeVerifier,
    });

    try {
      const response = await axios.post(tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return {
        refreshToken: response.data.refresh_token,
        idToken: response.data.id_token,
        accessExpiresIn: response.data.expires_in,
        refreshExpiresIn: response.data.refresh_expires_in,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new UnauthorizedException(
          `Refresh failed: ${error.response?.data?.error_description || error.message}`,
        );
      }
      throw new UnauthorizedException('Unexpected error during token exchange');
    }
  }

  async refreshToken(refreshToken: string) {
    const tokenUrl = `${this.configService.get('KEYCLOAK_ISSUER_URL')}/protocol/openid-connect/token`;
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.configService.get('KEYCLOAK_CLIENT_ID'),
      client_secret: this.configService.get('KEYCLOAK_CLIENT_SECRET'),
    });
    const response = await axios.post(tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (response.status !== 200) throw new UnauthorizedException();
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      accessExpiresIn: response.data.expires_in,
      refreshExpiresIn: response.data.refresh_expires_in || 3600,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const logoutUrl = `${this.configService.get('KEYCLOAK_ISSUER_URL')}/protocol/openid-connect/logout`;
    const params = new URLSearchParams({
      client_id: this.configService.get('KEYCLOAK_CLIENT_ID'),
      client_secret: this.configService.get('KEYCLOAK_CLIENT_SECRET'),
      refresh_token: refreshToken,
    });

    try {
      const response = await axios.post(logoutUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      if (response.status !== 204 && response.status !== 200) {
        throw new HttpException(
          'Failed to logout from Keycloak',
          HttpStatus.BAD_GATEWAY,
        );
      }
    } catch (error) {
      throw new HttpException('Keycloak logout failed', HttpStatus.BAD_GATEWAY);
    }
  }

  private base64URLEncode(buffer: Buffer) {
    return buffer
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
}
