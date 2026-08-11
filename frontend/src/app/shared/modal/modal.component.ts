import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal', standalone: true,
  template: `
    @if (open) {
      <div class="backdrop" (mousedown)="backdrop($event)">
        <section class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="title" [class.wide]="wide">
          <header><div><span class="eyebrow">Sistema de cartera</span><h2>{{ title }}</h2></div>@if (closable) { <button type="button" class="close" (click)="closed.emit()" aria-label="Cerrar">×</button> }</header>
          <div class="content"><ng-content /></div>
          <footer><ng-content select="[modal-actions]" /></footer>
        </section>
      </div>
    }`,
  styles: [`
    .backdrop{position:fixed;inset:0;z-index:1000;background:rgba(15,35,58,.58);backdrop-filter:blur(5px);display:grid;place-items:center;padding:24px}
    .dialog{width:min(620px,100%);max-height:min(86vh,780px);display:flex;flex-direction:column;background:#fff;border-radius:20px;box-shadow:0 28px 80px rgba(2,16,32,.3);overflow:hidden}.dialog.wide{width:min(920px,100%)}
    header{display:flex;justify-content:space-between;gap:20px;padding:22px 24px 16px;border-bottom:1px solid #e7edf3}h2{margin:3px 0 0;font-size:22px;color:#10243e}.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#1684a5;font-weight:800}
    .close{border:0;background:#eef3f7;width:36px;height:36px;border-radius:11px;font-size:24px;color:#526577;cursor:pointer}.content{padding:22px 24px;overflow:auto}footer{display:flex;justify-content:flex-end;gap:10px;padding:16px 24px;background:#f8fafc;border-top:1px solid #e7edf3}footer:empty{display:none}
    @media(max-width:640px){.backdrop{padding:0;place-items:end center}.dialog,.dialog.wide{max-height:94vh;border-radius:20px 20px 0 0}.content{padding:18px}}
  `],
})
export class ModalComponent {
  @Input() open = false; @Input() title = ''; @Input() wide = false; @Input() closable = true; @Output() closed = new EventEmitter<void>();
  backdrop(event: MouseEvent) { if (this.closable && event.target === event.currentTarget) this.closed.emit(); }
}
