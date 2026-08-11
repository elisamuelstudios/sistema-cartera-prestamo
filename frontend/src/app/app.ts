import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingOverlayComponent } from './shared/loading-overlay/loading-overlay.component';

@Component({
  selector: 'app-root', imports: [RouterOutlet, LoadingOverlayComponent], template: '<router-outlet /><app-loading-overlay />', styleUrl: './app.scss'
})
export class App {}
