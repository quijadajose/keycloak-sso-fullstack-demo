import { IsString, IsIn } from 'class-validator';

export class EnvConfig {
  @IsString()
  KEYCLOAK_AUTH_URL: string;

  @IsString()
  KEYCLOAK_REALM: string;

  @IsString()
  KEYCLOAK_CLIENT_ID: string;

  @IsString()
  KEYCLOAK_CLIENT_SECRET: string;

  @IsString()
  KEYCLOAK_ISSUER_URL: string;

  @IsIn(['S256', 'plain']) // Keycloak soporta 'S256' y 'plain'
  KEYCLOAK_PKCE_CHALLENGE_METHOD: string;

  @IsString()
  SPA_BASE_URL: string;

  @IsString()
  KEYCLOAK_REDIRECT_URI: string;
}
