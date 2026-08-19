import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { ToastService } from '../core/services/toast.service';
import { ModalComponent } from '../shared/modal/modal.component';

const SIDEBAR_COLLAPSED_KEY = 'cartera_sidebar_collapsed';

@Component({
  selector: 'app-shell', standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive, ReactiveFormsModule, ModalComponent],
  template: `
    <div class="shell" [class.menu-open]="menuOpen()" [class.collapsed]="collapsed()">
      <aside>
        <div class="brand"><div class="brand-mark">IR</div><div class="brand-text"><strong>Inversiones<br>La Roca</strong><span>Cartera inteligente</span></div></div>
        <button class="collapse-toggle" type="button" [attr.aria-label]="collapsed()?'Expandir menú':'Colapsar menú'" [title]="collapsed()?'Expandir menú':'Colapsar menú'" (click)="toggleCollapsed()"><span>{{ collapsed() ? '»' : '«' }}</span></button>
        <nav>
          @for (item of navigation; track item.path) {
            @if (!item.admin || auth.isAdmin()) { <a [routerLink]="item.path" routerLinkActive="active" [title]="item.label" (click)="menuOpen.set(false)"><span class="nav-icon">{{ item.icon }}</span><span class="nav-label">{{ item.label }}</span></a> }
          }
        </nav>
        <div class="profile"><div class="avatar">{{ initials }}</div><div class="profile-text"><strong>{{ auth.user()?.fullName }}</strong><span>{{ auth.user()?.role }}</span></div></div>
        <button class="logout" type="button" [title]="'Salir'" (click)="auth.logout()"><span class="nav-icon">↗</span><span class="nav-label">Salir</span></button>
      </aside>
      <main>
        <header class="topbar"><button class="menu" type="button" (click)="menuOpen.set(!menuOpen())">☰</button><div><span>{{ today }}</span></div><div class="top-user">{{ auth.user()?.username }}</div></header>
        <div class="page"><router-outlet /></div>
      </main>
      @if (menuOpen()) { <button class="mobile-backdrop" aria-label="Cerrar menú" (click)="menuOpen.set(false)"></button> }
      <div class="toasts">@for (toast of toastService.toasts(); track toast.id) { <button [class]="'toast '+toast.type" (click)="toastService.dismiss(toast.id)">{{ toast.message }}</button> }</div>
      <app-modal [open]="passwordModal()" [closable]="false" title="Cambia tu contraseña">
        <form class="password-form" [formGroup]="passwordForm" (ngSubmit)="changePassword()">
          <p>Por seguridad debes reemplazar la contraseña temporal antes de continuar.</p>
          <div class="field"><label class="required">Contraseña actual</label><input type="password" formControlName="currentPassword" autocomplete="current-password"></div>
          <div class="field"><label class="required">Nueva contraseña</label><input type="password" formControlName="newPassword" autocomplete="new-password"><span class="hint">Mínimo 8 caracteres.</span></div>
          <div class="field"><label class="required">Confirmar contraseña</label><input type="password" formControlName="confirmPassword" autocomplete="new-password"></div>
          @if (passwordError()) { <div class="password-error">{{ passwordError() }}</div> }
        </form>
        <div modal-actions><button class="btn btn-success" type="button" [disabled]="passwordLoading()" (click)="changePassword()">{{ passwordLoading() ? 'Actualizando…' : 'Cambiar contraseña' }}</button></div>
      </app-modal>
    </div>`,
  styleUrls: ['./app-shell.component.scss'],
  styles: [`.password-form{display:grid;gap:14px}.password-form p{margin:0 0 4px;color:#617688;line-height:1.55}.password-error{padding:10px 12px;border-radius:9px;background:#fff0f1;color:#c83945;font-size:12px}`],
})
export class AppShellComponent {
  readonly auth = inject(AuthService); readonly toastService = inject(ToastService); readonly menuOpen = signal(false);
  readonly collapsed = signal(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
  private readonly fb = inject(FormBuilder);
  readonly passwordModal = signal(Boolean(this.auth.user()?.mustChangePassword));
  readonly passwordLoading = signal(false);
  readonly passwordError = signal('');
  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });
  readonly navigation = [
    { path: '/dashboard', label: 'Inicio', icon: 'IN' }, { path: '/clientes', label: 'Clientes', icon: 'CL' },
    { path: '/prestamos', label: 'Préstamos', icon: 'PR' }, { path: '/pagos', label: 'Pagos', icon: 'PG' },
    { path: '/cartera', label: 'Cartera', icon: 'CA' }, { path: '/rutas', label: 'Rutas', icon: 'RT' },
    { path: '/cierre-caja', label: 'Cierre de caja', icon: 'CC' }, { path: '/configuracion', label: 'Configuración', icon: 'CF', admin: true },
    { path: '/usuarios', label: 'Usuarios', icon: 'US', admin: true }, { path: '/backups', label: 'Backups', icon: 'BK', admin: true },
  ];
  readonly today = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  get initials() { return (this.auth.user()?.fullName ?? 'US').split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
  toggleCollapsed() { const next = !this.collapsed(); this.collapsed.set(next); localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0'); }
  changePassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.passwordError.set('Completa los tres campos. La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.passwordError.set('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    this.passwordLoading.set(true);
    this.passwordError.set('');
    this.auth.changePassword(currentPassword, newPassword).pipe(finalize(() => this.passwordLoading.set(false))).subscribe({
      next: () => {
        this.passwordModal.set(false);
        this.passwordForm.reset();
        this.toastService.show('Contraseña actualizada correctamente');
      },
      error: () => this.passwordError.set('No fue posible actualizarla. Verifica la contraseña actual.'),
    });
  }
}
