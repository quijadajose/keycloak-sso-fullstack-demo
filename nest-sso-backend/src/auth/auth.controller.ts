import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Redirect,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('login')
  @Redirect()
  async login(@Res({ passthrough: true }) res: Response) {
    const data = await this.authService.generatePkce();
    const { redirectUrl, codeVerifier } = data;
    res.cookie('pkce_verifier', codeVerifier, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
    return { url: redirectUrl };
  }

  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response) {
    const { code, state } = req.query as { code: string; state: string };
    if (!code || !state) {
      throw new BadRequestException('Missing code or state in callback');
    }

    const codeVerifier = req.cookies['pkce_verifier'];
    if (!codeVerifier) {
      throw new UnauthorizedException('PKCE code verifier missing');
    }
    const tokens = await this.authService.handleCallback(code, codeVerifier);

    res.clearCookie('pkce_verifier', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: tokens.refreshExpiresIn * 1000,
      domain: '.quijadajosed.duckdns.org',
      path: '/',
    });
    const angularCallbackUrl = `${this.configService.get<string>('SPA_BASE_URL')}/auth-callback`;
    res.redirect(angularCallbackUrl);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    try {
      const tokens = await this.authService.refreshToken(refreshToken);
      res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: tokens.refreshExpiresIn * 1000,
        domain: '.quijadajosed.duckdns.org',
        path: '/',
      });
      return res.json({
        access_token: tokens.accessToken,
        expires_in: tokens.accessExpiresIn,
        token_type: 'Bearer',
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new HttpException(
        'Failed to refresh token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refresh_token = req.cookies['refresh_token'];
    if (!refresh_token) {
      throw new UnauthorizedException('Missing refresh_token for logout');
    }

    await this.authService.logout(refresh_token);
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.quijadajosed.duckdns.org',
      path: '/',
    });
  }
}
