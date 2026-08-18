import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { User } from '../models/models';
import { ApiService } from './api.service';

interface LoginResponse {
  accessToken: string;
  user: User;
}

const TOKEN_KEY = 'cartera_token';
const USER_KEY = 'cartera_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  /**
   * El token y el usuario viven en señales, no solo en sessionStorage.
   *
   * IMPORTANTE: un `computed()` solo registra como dependencias las señales que
   * se leen durante su evaluación. Si se usara `!!this.token && !!this.user()`
   * con `token` leyendo sessionStorage, el operador `&&` haría short-circuit
   * cuando no hay token y el computed quedaría sin productores: su valor `false`
   * se cachearía para siempre y `login()` nunca lo invalidaría. Ese era el bug
   * que obligaba a recargar la página después de iniciar sesión.
   */
  private readonly tokenState = signal<string | null>(sessionStorage.getItem(TOKEN_KEY));
  private readonly userState = signal<User | null>(this.loadUser());

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();

  readonly authenticated = computed(() => {
    // Ambas señales se leen SIEMPRE, antes de cualquier operador lógico.
    const token = this.tokenState();
    const user = this.userState();
    return token !== null && token !== '' && user !== null;
  });

  readonly isAdmin = computed(() => this.userState()?.role === 'Administrador');

  login(username: string, password: string) {
    return this.api
      .post<LoginResponse>('auth/login', { username, password })
      .pipe(tap(({ accessToken, user }) => this.setSession(accessToken, user)));
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.api
      .post<{ message: string }>('auth/change-password', { currentPassword, newPassword })
      .pipe(
        tap(() => {
          const current = this.userState();
          if (!current) return;
          this.persistUser({ ...current, mustChangePassword: false });
        }),
      );
  }

  logout() {
    this.clearSession();
    void this.router.navigateByUrl('/login');
  }

  /** Limpia la sesión sin navegar. Lo usa el interceptor ante un 401. */
  clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.tokenState.set(null);
    this.userState.set(null);
  }

  private setSession(accessToken: string, user: User) {
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    this.tokenState.set(accessToken);
    this.persistUser(user);
  }

  private persistUser(user: User) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    this.userState.set(user);
  }

  private loadUser(): User | null {
    try {
      return JSON.parse(sessionStorage.getItem(USER_KEY) ?? 'null') as User | null;
    } catch {
      return null;
    }
  }
}
