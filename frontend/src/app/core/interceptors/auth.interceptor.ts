import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const token = sessionStorage.getItem('cartera_token');
  const secured = token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  return next(secured).pipe(catchError((error: HttpErrorResponse) => {
    if (error.status === 401 && !request.url.endsWith('/auth/login')) {
      sessionStorage.removeItem('cartera_token');
      sessionStorage.removeItem('cartera_user');
      void router.navigateByUrl('/login');
    }
    return throwError(() => error);
  }));
};
