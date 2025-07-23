import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { BACKEND_URL } from './config';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const accessToken = authService.getAccessToken();
  const backendBaseUrl = BACKEND_URL;
  const isRefreshOrLogout = req.url.includes('/auth/refresh') || req.url.includes('/auth/logout');

  if (req.url.startsWith(backendBaseUrl)) {
    req = req.clone({
      withCredentials: isRefreshOrLogout,
      setHeaders: accessToken && !isRefreshOrLogout
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
    });
  }

  return next(req).pipe(
    catchError((error) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        req.url.startsWith(backendBaseUrl) &&
        !req.url.includes('/auth/refresh')
      ) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap((token) => {
              isRefreshing = false;
              authService.setAccessToken(token.access_token);
              refreshTokenSubject.next(token.access_token);

              const clonedReq = req.clone({
                setHeaders: { Authorization: `Bearer ${token.access_token}` },
              });

              return next(clonedReq);
            }),
            catchError((err) => {
              isRefreshing = false;
              authService.logout();
              return throwError(() => err);
            })
          );
        } else {
          return refreshTokenSubject.pipe(
            filter((token): token is string => !!token),
            take(1),
            switchMap((jwt) =>
              next(
                req.clone({
                  setHeaders: { Authorization: `Bearer ${jwt}` },
                })
              )
            )
          );
        }
      }

      return throwError(() => error);
    })
  );
};
