import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login', standalone: true, imports: [ReactiveFormsModule],
  template: `
    <main class="login-page">
      <section class="visual">
        <div class="visual-content"><div class="logo">IR</div><span class="overline">Inversiones La Roca</span><h1>Control claro.<br><em>Cartera al día.</em></h1><p>Clientes, cobros, rutas y caja en una plataforma local, segura y preparada para crecer.</p>
          <div class="feature-grid"><div><strong>341</strong><span>Clientes migrados</span></div><div><strong>100%</strong><span>Operación local</span></div></div>
        </div><div class="orb one"></div><div class="orb two"></div>
      </section>
      <section class="form-side">
        <form [formGroup]="form" (ngSubmit)="submit()">
          <span class="eyebrow">Acceso seguro</span><h2>Bienvenido de nuevo</h2><p>Ingresa tus credenciales para continuar.</p>
          <label>Usuario<input formControlName="username" autocomplete="username" placeholder="Escribe tu usuario"></label>
          <label>Contraseña<input type="password" formControlName="password" autocomplete="current-password" placeholder="••••••••"></label>
          @if (error()) { <div class="login-error">{{ error() }}</div> }
          <button type="submit" [disabled]="form.invalid || loading()">{{ loading() ? 'Ingresando…' : 'Iniciar sesión' }}</button>
          <small>Los datos se almacenan únicamente en el equipo del cliente.</small>
        </form>
      </section>
    </main>`,
  styles: [`
    .login-page{min-height:100vh;display:grid;grid-template-columns:1.15fr .85fr;background:#fff}.visual{position:relative;overflow:hidden;background:linear-gradient(145deg,#0d2239,#123d58);display:grid;place-items:center;padding:60px;color:#fff}.visual:before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:40px 40px}.visual-content{position:relative;z-index:2;max-width:560px}.logo{width:58px;height:58px;border-radius:17px;background:#1d91b2;display:grid;place-items:center;font-weight:900;margin-bottom:48px}.overline{color:#69c4dc;text-transform:uppercase;letter-spacing:.18em;font-size:11px;font-weight:800}h1{font-size:55px;line-height:1.05;letter-spacing:-.055em;margin:14px 0 22px}h1 em{font-style:normal;color:#e6b85e}.visual p{max-width:480px;color:#b9cad6;line-height:1.7;font-size:15px}.feature-grid{display:flex;gap:50px;margin-top:48px;padding-top:26px;border-top:1px solid rgba(255,255,255,.12)}.feature-grid div{display:grid}.feature-grid strong{font-family:Manrope;font-size:25px}.feature-grid span{font-size:11px;color:#8da8b9}.orb{position:absolute;border-radius:50%;filter:blur(1px)}.orb.one{width:360px;height:360px;background:rgba(31,148,180,.11);right:-90px;top:-100px}.orb.two{width:210px;height:210px;border:1px solid rgba(230,184,94,.2);left:-70px;bottom:-50px}.form-side{display:grid;place-items:center;padding:40px}form{width:min(390px,100%)}.eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.15em;font-weight:900;color:#1684a5}h2{font-size:30px;color:#10243e;margin:8px 0 4px}form>p{color:#718292;margin:0 0 30px;font-size:13px}label{display:grid;gap:7px;color:#324d63;font-size:11px;font-weight:800;margin:16px 0}input{padding:13px}form button{width:100%;border:0;border-radius:11px;padding:13px;background:#176b87;color:#fff;font-weight:800;margin-top:10px;cursor:pointer;box-shadow:0 8px 22px rgba(23,107,135,.25)}.login-error{background:#fff0f1;color:#c83945;border-radius:9px;padding:10px 12px;font-size:12px}small{display:block;text-align:center;color:#94a2ad;font-size:9px;margin-top:22px}
    @media(max-width:850px){.login-page{grid-template-columns:1fr}.visual{display:none}.form-side{min-height:100vh;padding:28px}}
  `],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder); private readonly auth = inject(AuthService); private readonly router = inject(Router);
  readonly loading = signal(false); readonly error = signal('');
  readonly form = this.fb.nonNullable.group({ username: ['', Validators.required], password: ['', [Validators.required, Validators.minLength(4)]] });
  submit() { if (this.form.invalid) return; this.loading.set(true); this.error.set(''); this.auth.login(this.form.value.username!, this.form.value.password!).pipe(finalize(() => this.loading.set(false))).subscribe({ next: () => void this.router.navigateByUrl('/dashboard'), error: () => this.error.set('Usuario o contraseña incorrectos') }); }
}

