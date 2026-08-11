import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  get<T>(path: string, params: Record<string, string | number | undefined> = {}): Observable<T> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') httpParams = httpParams.set(key, String(value));
    return this.http.get<T>(`/api/${path}`, { params: httpParams });
  }
  post<T>(path: string, body: unknown): Observable<T> { return this.http.post<T>(`/api/${path}`, body); }
  patch<T>(path: string, body: unknown): Observable<T> { return this.http.patch<T>(`/api/${path}`, body); }
  download(path: string): Observable<Blob> { return this.http.get(`/api/${path}`, { responseType: 'blob' }); }
}

