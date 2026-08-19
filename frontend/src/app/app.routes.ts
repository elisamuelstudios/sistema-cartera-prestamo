import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { AppShellComponent } from './layout/app-shell.component';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent) },
  {
    path: '', component: AppShellComponent, canActivate: [authGuard], children: [
      { path: 'dashboard', title: 'Resumen ejecutivo', loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'clientes', title: 'Clientes', loadComponent: () => import('./features/clients/clients.component').then((m) => m.ClientsComponent) },
      { path: 'prestamos', title: 'Préstamos', loadComponent: () => import('./features/loans/loans.component').then((m) => m.LoansComponent) },
      { path: 'pagos', title: 'Pagos', loadComponent: () => import('./features/payments/payments.component').then((m) => m.PaymentsComponent) },
      { path: 'cartera', title: 'Cartera', loadComponent: () => import('./features/portfolio/portfolio.component').then((m) => m.PortfolioComponent) },
      { path: 'rutas', title: 'Rutas', loadComponent: () => import('./features/routes/routes.component').then((m) => m.RoutesComponent) },
      { path: 'cierre-caja', title: 'Cierre de caja', loadComponent: () => import('./features/cash-closures/cash-closures.component').then((m) => m.CashClosuresComponent) },
      { path: 'configuracion', title: 'Configuración', canActivate: [adminGuard], loadComponent: () => import('./features/settings/settings.component').then((m) => m.SettingsComponent) },
      { path: 'usuarios', title: 'Usuarios', canActivate: [adminGuard], loadComponent: () => import('./features/users/users.component').then((m) => m.UsersComponent) },
      { path: 'backups', title: 'Backups', canActivate: [adminGuard], loadComponent: () => import('./features/backups/backups.component').then((m) => m.BackupsComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];

