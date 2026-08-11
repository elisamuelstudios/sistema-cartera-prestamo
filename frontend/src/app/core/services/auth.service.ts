import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { User } from '../models/models';
import { ApiService } from './api.service';

interface LoginResponse { accessToken: string; user: User; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService); private readonly router = inject(Router);
  private readonly userState = signal<User | null>(this.loadUser());
  readonly user = this.userState.asReadonly(); readonly authenticated = computed(() => !!this.token && !!this.userState());
  readonly isAdmin = computed(() => this.userState()?.role === 'Administrador');
  get token() { return sessionStorage.getItem('cartera_token'); }
  login(username: string, password: string) { return this.api.post<LoginResponse>('auth/login', { username, password }).pipe(tap(({ accessToken, user }) => {
    sessionStorage.setItem('cartera_token', accessToken); sessionStorage.setItem('cartera_user', JSON.stringify(user)); this.userState.set(user);
  })); }
  changePassword(currentPassword: string, newPassword: string) {
    return this.api.post<{ message: string }>('auth/change-password', { currentPassword, newPassword }).pipe(tap(() => {
      const current = this.userState();
      if (!current) return;
      const updated = { ...current, mustChangePassword: false };
      sessionStorage.setItem('cartera_user', JSON.stringify(updated));
      this.userState.set(updated);
    }));
  }
  logout() { sessionStorage.removeItem('cartera_token'); sessionStorage.removeItem('cartera_user'); this.userState.set(null); void this.router.navigateByUrl('/login'); }
  private loadUser(): User | null { try { return JSON.parse(sessionStorage.getItem('cartera_user') ?? 'null') as User | null; } catch { return null; } }
}
