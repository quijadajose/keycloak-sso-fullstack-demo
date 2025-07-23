import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BACKEND_URL } from '../config';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  styleUrl : './home.component.css',
  templateUrl: './home.component.html',
})
export class HomeComponent {
  login() {
    window.location.href = `${BACKEND_URL}/auth/login`;
  }
}