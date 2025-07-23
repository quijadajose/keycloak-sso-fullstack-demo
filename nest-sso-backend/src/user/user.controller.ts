import { Controller, Get, UseGuards } from '@nestjs/common';
import { User } from './user.interface';
import {
  AuthGuard,
  ResourceGuard,
  Roles,
  AuthenticatedUser,
  RoleGuard,
} from 'nest-keycloak-connect';

@Controller('users')
export class UserController {
  constructor() {}

  @Get('me')
  @UseGuards(AuthGuard)
  getProfile(@AuthenticatedUser() user: User) {
    return user;
  }

  @UseGuards(AuthGuard, ResourceGuard, RoleGuard)
  @Roles({ roles: ['realm:admin'] })
  @Get('admin-data')
  getAdminData() {
    return { msg: 'Solo para admin' };
  }
}
