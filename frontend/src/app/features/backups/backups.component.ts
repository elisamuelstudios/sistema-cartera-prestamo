import { Component, inject, OnInit, signal } from '@angular/core';
import { BackupFile, BackupsService } from '../../core/services/backups.service';
import { ToastService } from '../../core/services/toast.service';
import { DateTimePipe } from '../../shared/date-time/date-time.pipe';

@Component({
  selector: 'app-backups', standalone: true, imports: [DateTimePipe],
  template: `
 <div class="page-heading"><div><h1>Copias de seguridad</h1><p>Respaldos de la base de datos disponibles para descarga.</p></div><button class="btn btn-primary" [disabled]="creating()" (click)="create()">{{ creating() ? 'Creando…' : '＋ Crear backup' }}</button></div>
 <section class="panel">
  <div class="table-wrap"><table><thead><tr><th>Archivo</th><th>Fecha</th><th>Tamaño</th><th>Acción</th></tr></thead><tbody>
   @for (file of files(); track file.name) {<tr><td><strong>{{ file.name }}</strong></td><td>{{ file.createdAt|appDateTime }}</td><td>{{ formatSize(file.size) }}</td><td><button type="button" class="btn btn-ghost" (click)="download(file)">↓ Descargar</button></td></tr>}
  </tbody></table>@if (!loading()&&!files().length) {<div class="empty">Todavía no hay backups. Crea el primero con el botón de arriba.</div>}</div>
 </section>`,
  styles: [`table td:last-child{text-align:right}`],
})
export class BackupsComponent implements OnInit {
  private readonly service = inject(BackupsService); private readonly toast = inject(ToastService);
  readonly files = signal<BackupFile[]>([]); readonly loading = signal(false); readonly creating = signal(false);

  ngOnInit() { this.load(); }
  load() { this.loading.set(true); this.service.list().subscribe({ next: (r) => { this.files.set(r); this.loading.set(false); }, error: (e) => { this.loading.set(false); this.toast.error(e); } }); }

  create() {
    this.creating.set(true);
    this.service.create().subscribe({
      next: () => { this.creating.set(false); this.toast.show('Backup creado correctamente'); this.load(); },
      error: (e) => { this.creating.set(false); this.toast.error(e); },
    });
  }

  download(file: BackupFile) {
    this.service.download(file.name).subscribe({
      next: (blob) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); URL.revokeObjectURL(url); },
      error: (e) => this.toast.error(e),
    });
  }

  formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
