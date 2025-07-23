import { Routes } from '@angular/router';
    import { HomeComponent } from './home/home.component';
    import { DashboardComponent } from './dashboard/dashboard.component';
    import { AuthCallbackComponent } from './auth-callback/auth-callback.component';
import { authGuard } from './auth.guard';

    export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'auth-callback', component: AuthCallbackComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
];
