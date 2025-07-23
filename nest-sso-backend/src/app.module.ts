import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { KeycloakConfigService } from './keycloak.config.service';
import { UserController } from './user/user.controller';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { KeycloakConnectModule } from 'nest-keycloak-connect';
@Module({
  imports: [
    ConfigModule.forRoot({
      validate,
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    KeycloakConnectModule.registerAsync({
      imports: [ConfigModule],
      useClass: KeycloakConfigService,
    }),
  ],
  controllers: [UserController, AuthController],
  providers: [KeycloakConfigService, AuthService],
})
export class AppModule {}
