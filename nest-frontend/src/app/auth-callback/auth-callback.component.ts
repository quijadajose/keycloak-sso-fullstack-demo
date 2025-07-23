import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AuthStatus } from '../auth.service';
import { filter, take } from 'rxjs';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: '<p>Procesando autenticación...</p>',
})
export class AuthCallbackComponent implements OnInit {
  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.authService.refreshToken().subscribe({
      next: () => {
        this.authService.authStatus$
          .pipe(
            filter((status) => status === AuthStatus.Authenticated),
            take(1)
          )
          .subscribe(() => this.router.navigate(['/dashboard']));
      },
      error: () => {
        console.error('Error al refrescar token en /auth-callback');
        this.authService.logout();
      },
    });
  }
}
