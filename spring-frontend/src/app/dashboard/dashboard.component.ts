import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { BACKEND_URL } from '../config';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: `dashboard.component.html`,
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  isAdmin = false;
  protectedData$!: Observable<any>;
  adminData$!: Observable<any>;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) { }
  ngOnInit(): void {
    this.authService.userProfile$.subscribe(profile => {
      if (profile) {
        this.isAdmin = this.authService.isAdmin();
      } else {
        console.warn('Profile not yet available');
      }
    });
    
  }

  fetchProtectedData() {
    const profile = this.authService.getUserProfile();
    if (profile) {
      this.protectedData$ = of(profile);
    } else {
      console.warn('No profile found yet');
    }
  }
  
  logout() {
    this.authService.logout();
  }
  fetchAdminData(): void {
    this.adminData$ = this.http.get<any>(`${BACKEND_URL}/users/admin-data`);
  } 
  
}
