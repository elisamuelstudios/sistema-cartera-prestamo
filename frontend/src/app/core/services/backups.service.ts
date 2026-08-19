import { inject, Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface BackupFile { name: string; size: number; createdAt: string; }

@Injectable({ providedIn: 'root' }) export class BackupsService {
  private api = inject(ApiService);
  list() { return this.api.get<BackupFile[]>('backups'); }
  create() { return this.api.post<BackupFile>('backups', {}); }
  download(name: string) { return this.api.download(`backups/${encodeURIComponent(name)}/download`); }
}
