import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  /**
   * Regresión del bug "hay que recargar la página después de iniciar sesión".
   *
   * El guard evalúa `authenticated()` ANTES del login (usuario sin sesión).
   * Si el computed hiciera short-circuit sobre un token no reactivo, quedaría
   * sin dependencias y su `false` se cachearía para siempre: después del login
   * seguiría devolviendo false y el guard rebotaría al /login.
   */
  it('pasa a autenticado tras el login aunque authenticated() se haya evaluado antes', () => {
    expect(service.authenticated()).toBe(false);

    service.login('admin', '1234').subscribe();
    http.expectOne((request) => request.url.endsWith('auth/login')).flush({
      accessToken: 'jwt-de-prueba',
      user: {
        id: '1',
        username: 'admin',
        fullName: 'Administrador',
        role: 'Administrador',
        active: true,
        mustChangePassword: false,
      },
    });

    expect(service.authenticated()).toBe(true);
    expect(service.isAdmin()).toBe(true);
    expect(service.token()).toBe('jwt-de-prueba');
  });

  it('vuelve a no autenticado al cerrar sesión', () => {
    service.login('admin', '1234').subscribe();
    http.expectOne((request) => request.url.endsWith('auth/login')).flush({
      accessToken: 'jwt-de-prueba',
      user: {
        id: '1',
        username: 'admin',
        fullName: 'Administrador',
        role: 'Administrador',
        active: true,
        mustChangePassword: false,
      },
    });
    expect(service.authenticated()).toBe(true);

    service.logout();

    expect(service.authenticated()).toBe(false);
    expect(service.token()).toBeNull();
    expect(sessionStorage.getItem('cartera_token')).toBeNull();
  });

  it('rehidrata la sesión desde sessionStorage al construirse', () => {
    sessionStorage.setItem('cartera_token', 'jwt-persistido');
    sessionStorage.setItem(
      'cartera_user',
      JSON.stringify({
        id: '1',
        username: 'operador',
        fullName: 'Operador',
        role: 'Operador',
        active: true,
        mustChangePassword: false,
      }),
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const rehydrated = TestBed.inject(AuthService);

    expect(rehydrated.authenticated()).toBe(true);
    expect(rehydrated.isAdmin()).toBe(false);
    http = TestBed.inject(HttpTestingController);
  });
});
