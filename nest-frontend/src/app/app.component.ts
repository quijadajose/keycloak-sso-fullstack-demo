import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthService, AuthStatus } from './auth.service';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  
  authStatus$: Observable<AuthStatus>;

constructor(private authService: AuthService) {
  this.authStatus$ = this.authService.authStatus$;
}


  ngOnInit() {
    this.authService.tryRestoreSession();
  }

  login() {
    this.authService.login();
  }

  logout() {
    this.authService.logout();
  }
}
