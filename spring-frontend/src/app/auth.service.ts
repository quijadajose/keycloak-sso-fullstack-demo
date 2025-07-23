import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UserProfile } from './interfaces/UserProfile';
import { BACKEND_URL } from './config';

export enum AuthStatus {
  Unknown,
  Authenticated,
  Unauthenticated,
}

export const USER_PROFILE_KEY = 'userProfile';
export const ACCESS_TOKEN_KEY = 'accessToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  public userProfile$ = this.userProfileSubject.asObservable();

  private authStatusSubject = new BehaviorSubject<AuthStatus>(AuthStatus.Unknown);
  public authStatus$ = this.authStatusSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.restoreAccessToken();
    this.loadUserProfile();
  }

  /**
   * Token Management
   */
  setAccessToken(token: string | null): void {
    if (token) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
      this.authStatusSubject.next(AuthStatus.Authenticated);
      this.fetchAndStoreUserProfile();
    } else {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      this.authStatusSubject.next(AuthStatus.Unauthenticated);
      this.clearUserProfile();
    }
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }

  private restoreAccessToken(): void {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      this.authStatusSubject.next(AuthStatus.Authenticated);
    } else {
      this.authStatusSubject.next(AuthStatus.Unauthenticated);
    }
  }

  /**
   * User Profile Management
   */
  private loadUserProfile(): void {
    const profileString = localStorage.getItem(USER_PROFILE_KEY);

    if (profileString) {
      try {
        const profile = JSON.parse(profileString);
        this.userProfileSubject.next(profile);
      } catch (e) {
        console.error('Error parsing user profile from localStorage', e);
        this.clearUserProfile();
      }
    } else {
      this.fetchAndStoreUserProfile();
    }
  }

  private fetchAndStoreUserProfile(): void {
    const token = this.getAccessToken();
    if (!token) {
      this.clearUserProfile();
      return;
    }

    this.http.get<UserProfile>(`${BACKEND_URL}/users/me`)
      .pipe(
        tap(profile => {
          localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
          this.userProfileSubject.next(profile);
        }),
        catchError(err => {
          console.error('Failed to fetch user profile:', err);
          this.clearUserProfile();
          return of(null);
        })
      )
      .subscribe();
  }

  clearUserProfile(): void {
    localStorage.removeItem(USER_PROFILE_KEY);
    this.userProfileSubject.next(null);
  }

  /**
   * Role Checks
   */
  public getUserProfile(): UserProfile | null {
    return this.userProfileSubject.value;
  }

  public hasRole(roleName: string): boolean {
    const profile = this.getUserProfile();
    return profile?.realm_access?.roles?.includes(roleName) ?? false;
  }

  public isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * Authentication Actions
   */
  login(): void {
    this.setAccessToken(null);
    window.location.href = `${BACKEND_URL}/auth/login`;
  }

  logout(): void {
    this.http.post(`${BACKEND_URL}/auth/logout`, {}, { observe: 'response' })
      .pipe(
        catchError(err => {
          console.error('Backend logout request failed:', err);
          return of(null);
        })
      )
      .subscribe(() => {
        this.setAccessToken(null);
        this.router.navigate(['/']);
      });
  }

  refreshToken(): Observable<{ access_token: string; expires_in: number }> {
    return this.http.post<any>(`${BACKEND_URL}/auth/refresh`, {})
      .pipe(
        tap((res) => {
          if (!res?.access_token) {
            throw new Error('No access token in refresh response');
          }
          this.setAccessToken(res.access_token);
        }),
        map((res) => ({
          access_token: res.access_token,
          expires_in: res.expires_in,
        })),
        catchError(err => {
          console.error('Refresh token failed:', err);
          this.setAccessToken(null);
          return throwError(() => err);
        })
      );
  }

  /**
   * Optional session restore
   * Could be called at app startup if desired
   */
  tryRestoreSession(): void {
    this.authStatusSubject.next(AuthStatus.Unknown);
    this.refreshToken().subscribe({
      next: () => {
        this.authStatusSubject.next(AuthStatus.Authenticated);
      },
      error: () => {
        this.setAccessToken(null);
      }
    });
  }
}
