import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, AuthStatus } from './auth.service';
import { filter, map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authStatus$.pipe(
    filter((status) => status !== AuthStatus.Unknown),
    take(1),
    map((status) => {
      if (status === AuthStatus.Authenticated) return true;
      authService.login();
      return false;
    })
  );
};
