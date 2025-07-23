import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UserProfile } from './interfaces/UserProfile';
import { BACKEND_URL } from '../config';

export enum AuthStatus {
  Unknown,
  Authenticated,
  Unauthenticated,
}

const USER_PROFILE_KEY = 'userProfile';
const ACCESS_TOKEN_KEY = 'accessToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  public userProfile$ = this.userProfileSubject.asObservable();

  private authStatusSubject = new BehaviorSubject<AuthStatus>(AuthStatus.Unknown);
  public authStatus$ = this.authStatusSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.restoreSessionFromStorage();
  }

  /** --- Public API --- */

  getAccessToken(): string | null {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }

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

  getUserProfile(): UserProfile | null {
    return this.userProfileSubject.value;
  }

  hasRole(roleName: string): boolean {
    return this.userProfileSubject.value?.realm_access?.roles.includes(roleName) ?? false;
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  login(): void {
    this.setAccessToken(null);
    window.location.href = `${BACKEND_URL}/auth/login`;
  }

  logout(): void {
    this.http.post(`${BACKEND_URL}/auth/logout`, {}, { observe: 'response' })
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: () => this.performLogoutCleanup(),
        error: () => this.performLogoutCleanup()
      });
  }

  refreshToken(): Observable<{ access_token: string; expires_in: number }> {
    return this.http.post<{ access_token: string; expires_in: number }>(`${BACKEND_URL}/auth/refresh`, {})
      .pipe(tap(res => this.setAccessToken(res.access_token)));
  }

  tryRestoreSession(): void {
    this.authStatusSubject.next(AuthStatus.Unknown);

    const token = this.getAccessToken();
    if (!token) {
      this.authStatusSubject.next(AuthStatus.Unauthenticated);
      return;
    }

    this.fetchAndStoreUserProfile();
  }

  /** --- Private Helpers --- */

  private fetchAndStoreUserProfile(): void {
    this.http.get<UserProfile>(`${BACKEND_URL}/users/me`)
      .pipe(
        tap(profile => this.updateUserProfile(profile)),
        catchError(() => {
          this.performLogoutCleanup();
          return of(null);
        })
      ).subscribe();
  }

  private updateUserProfile(profile: UserProfile | null): void {
    if (profile) {
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(USER_PROFILE_KEY);
    }
    this.userProfileSubject.next(profile);
  }

  private clearUserProfile(): void {
    this.updateUserProfile(null);
  }

  private restoreSessionFromStorage(): void {
    const profileString = localStorage.getItem(USER_PROFILE_KEY);

    if (profileString) {
      try {
        const profile: UserProfile = JSON.parse(profileString);
        this.userProfileSubject.next(profile);
      } catch {
        this.clearUserProfile();
      }
    }

    const token = this.getAccessToken();
    if (token) {
      this.authStatusSubject.next(AuthStatus.Authenticated);
    } else {
      this.authStatusSubject.next(AuthStatus.Unauthenticated);
    }
  }

  private performLogoutCleanup(): void {
    this.clearUserProfile();
    this.setAccessToken(null);
    this.router.navigate(['/']);
  }
}
