import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Client, Route } from '../../core/models/models';
import { CatalogService } from '../../core/services/catalog.service';
import { ClientsService } from '../../core/services/clients.service';
import { ToastService } from '../../core/services/toast.service';
import { DateTimePipe } from '../../shared/date-time/date-time.pipe';
import { ModalComponent } from '../../shared/modal/modal.component';
import { MoneyInputDirective } from '../../shared/money-input/money-input.directive';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';

@Component({
  selector:'app-clients',standalone:true,imports:[ReactiveFormsModule,DateTimePipe,ModalComponent,MoneyInputDirective,StatusBadgeComponent],
  template:`
    <div class="page-heading"><div><h1>Clientes</h1><p>Consulta, registra y actualiza la información de tus clientes.</p></div><div class="actions"><button class="btn btn-secondary" [disabled]="!selected()" (click)="edit()">Editar seleccionado</button><button class="btn btn-primary" (click)="openNew()">＋ Nuevo cliente</button></div></div>
    <section class="panel">
      <div class="toolbar"><div class="search"><input placeholder="Buscar por cualquier campo…" [value]="search()" (input)="changeSearch($event)"></div><select [value]="status()" (change)="changeStatus($event)"><option value="">Todos los estados</option><option>Activo</option><option>Lista Negra</option><option>Inactivo</option></select></div>
      <div class="table-wrap"><table><thead><tr><th>Código</th><th>Cliente</th><th>Documento</th><th>Teléfono</th><th>Ruta</th><th>Préstamo actual</th><th>Estado</th><th>Registrado</th></tr></thead><tbody>
        @for(client of clients();track client.id){<tr [class.selected]="selected()?.id===client.id" (click)="selected.set(client)" (dblclick)="edit()"><td><strong>{{client.code}}</strong></td><td>{{client.fullName}}</td><td>{{client.identification}}</td><td>{{client.primaryPhone||'—'}}</td><td>{{client.route?.code||'—'}}</td><td><app-status-badge [value]="client.loanStatus"/></td><td><app-status-badge [value]="client.status"/></td><td>{{client.createdAt|appDateTime}}</td></tr>}
      </tbody></table>@if(!loading()&&!clients().length){<div class="empty">No se encontraron clientes con esos filtros.</div>}</div>
      <div class="pagination"><span>{{total()}} clientes · página {{page()}}</span><div class="buttons"><button [disabled]="page()===1" (click)="go(page()-1)">Anterior</button><button [disabled]="page()*25>=total()" (click)="go(page()+1)">Siguiente</button></div></div>
    </section>

    <app-modal [open]="modal()" [wide]="true" [title]="editing()?'Editar cliente':'Registrar cliente'" (closed)="closeModal()">
      <div class="stepper"><div [class.active]="step()>=1"><b>1</b><span>Identificación</span></div><i></i><div [class.active]="step()>=2"><b>2</b><span>Contacto</span></div><i></i><div [class.active]="step()>=3"><b>3</b><span>Actividad</span></div></div>
      <form [formGroup]="form" (ngSubmit)="save()">
        @if(step()===1){<div class="form-grid">
          <div class="field"><label class="required">Nombres</label><input formControlName="firstNames" autofocus>@if(invalid('firstNames')){<span class="error-text">Ingresa los nombres.</span>}</div>
          <div class="field"><label class="required">Apellidos</label><input formControlName="lastNames">@if(invalid('lastNames')){<span class="error-text">Ingresa los apellidos.</span>}</div>
          <div class="field"><label class="required">Identificación</label><input formControlName="identification">@if(invalid('identification')){<span class="error-text">La identificación es obligatoria.</span>}</div>
          <div class="field"><label>Fecha de nacimiento</label><input type="date" formControlName="birthDate"></div>
        </div>}
        @if(step()===2){<div class="form-grid">
          <div class="field"><label class="required">Teléfono principal</label><input formControlName="primaryPhone">@if(invalid('primaryPhone')){<span class="error-text">Ingresa un teléfono válido.</span>}</div>
          <div class="field"><label>Teléfono alterno</label><input formControlName="alternatePhone"></div>
          <div class="field span-2"><label>Dirección</label><input formControlName="address"></div>
          <div class="field"><label>Barrio</label><input formControlName="neighborhood"></div><div class="field"><label>Ciudad</label><input formControlName="city"></div>
          <div class="field span-2"><label>Correo</label><input type="email" formControlName="email">@if(invalid('email')){<span class="error-text">Escribe un correo válido.</span>}</div>
        </div>}
        @if(step()===3){<div class="form-grid">
          <div class="field"><label>Ocupación</label><input formControlName="occupation"></div><div class="field"><label>Empresa</label><input formControlName="workplace"></div>
          <div class="field"><label>Ingresos mensuales</label><input appMoneyInput type="text" inputmode="numeric" formControlName="monthlyIncome"></div>
          <div class="field"><label class="required">Estado</label><select formControlName="status"><option>Activo</option><option>Lista Negra</option><option>Inactivo</option></select></div>
          <div class="field"><label class="required">Ruta asignada</label><select formControlName="routeId"><option value="">Selecciona una ruta</option>@for(route of routes();track route.id){<option [value]="route.id">{{route.code}} · {{route.name}}</option>}</select></div>
          <div class="field"><label>Observaciones</label><textarea rows="3" formControlName="observations"></textarea></div>
        </div>}
      </form>
      <div modal-actions class="modal-actions"><button class="btn btn-secondary" type="button" (click)="step()===1?closeModal():step.set(step()-1)">{{step()===1?'Cancelar':'← Atrás'}}</button>@if(step()<3){<button class="btn btn-primary" type="button" (click)="next()">Siguiente →</button>}@else{<button class="btn btn-success" [disabled]="saving()" type="button" (click)="save()">{{saving()?'Guardando…':'Guardar cliente'}}</button>}</div>
    </app-modal>`,
  styles:[`
    .toolbar select{width:180px}.stepper{display:flex;align-items:center;justify-content:center;margin:-3px 0 24px}.stepper div{display:flex;align-items:center;gap:6px;color:#8a9aa7;font-size:10px;font-weight:800}.stepper b{display:grid;place-items:center;width:25px;height:25px;border-radius:50%;background:#e8eef2;color:#6e8292}.stepper .active{color:#176b87}.stepper .active b{background:#176b87;color:#fff}.stepper i{height:1px;background:#dce5eb;width:50px;margin:0 8px}.modal-actions{display:flex;gap:10px}.modal-actions .btn{min-width:110px}@media(max-width:600px){.stepper span{display:none}.stepper i{width:32px}}
  `]
})
export class ClientsComponent implements OnInit{
  private service=inject(ClientsService);private catalog=inject(CatalogService);private toast=inject(ToastService);private fb=inject(FormBuilder);private timer?:number;
  readonly clients=signal<Client[]>([]);readonly routes=signal<Route[]>([]);readonly total=signal(0);readonly page=signal(1);readonly search=signal('');readonly status=signal('');readonly loading=signal(false);readonly selected=signal<Client|null>(null);readonly modal=signal(false);readonly editing=signal(false);readonly step=signal(1);readonly saving=signal(false);
  readonly form=this.fb.group({firstNames:['',[Validators.required,Validators.minLength(2)]],lastNames:['',[Validators.required,Validators.minLength(2)]],identification:['',[Validators.required,Validators.minLength(3)]],birthDate:[''],primaryPhone:['',[Validators.required,Validators.minLength(7)]],alternatePhone:[''],address:[''],neighborhood:[''],city:[''],email:['',Validators.email],occupation:[''],workplace:[''],monthlyIncome:[0,[Validators.min(0)]],status:['Activo',Validators.required],routeId:['',Validators.required],observations:['']});
  ngOnInit(){this.load();this.catalog.routes(true).subscribe(r=>this.routes.set(r));}
  load(selectId?:string){this.loading.set(true);this.service.list(this.search(),this.page(),25,this.status()).subscribe({next:r=>{this.clients.set(r.items);this.total.set(r.total);this.loading.set(false);if(selectId)this.selected.set(r.items.find(c=>c.id===selectId)??null)},error:e=>{this.loading.set(false);this.toast.error(e)}})}
  changeSearch(event:Event){this.search.set((event.target as HTMLInputElement).value);window.clearTimeout(this.timer);this.timer=window.setTimeout(()=>{this.page.set(1);this.load()},300)}
  changeStatus(event:Event){this.status.set((event.target as HTMLSelectElement).value);this.page.set(1);this.load()}go(page:number){this.page.set(page);this.load()}
  openNew(){this.editing.set(false);this.form.reset({firstNames:'',lastNames:'',identification:'',birthDate:'',primaryPhone:'',alternatePhone:'',address:'',neighborhood:'',city:'',email:'',occupation:'',workplace:'',monthlyIncome:0,status:'Activo',routeId:'',observations:''});this.step.set(1);this.modal.set(true)}
  edit(){const client=this.selected();if(!client)return;this.editing.set(true);this.service.get(client.id).subscribe(full=>{this.form.patchValue({firstNames:full.firstNames,lastNames:full.lastNames,identification:full.identification,birthDate:String(full['birthDate']??''),primaryPhone:full.primaryPhone??'',alternatePhone:String(full['alternatePhone']??''),address:String(full['address']??''),neighborhood:String(full['neighborhood']??''),city:String(full.city??''),email:String(full['email']??''),occupation:String(full['occupation']??''),workplace:String(full['workplace']??''),monthlyIncome:Number(full.monthlyIncome??0),status:full.status,routeId:String(full.routeId??''),observations:String(full['observations']??'')});this.step.set(1);this.modal.set(true)})}
  next(){const names=this.step()===1?['firstNames','lastNames','identification']:['primaryPhone','email'];let valid=true;for(const name of names){const control=this.form.get(name);control?.markAsTouched();if(control?.invalid)valid=false}if(valid)this.step.set(this.step()+1);else this.toast.show('Completa los campos obligatorios antes de continuar','error')}
  invalid(name:string){const control=this.form.get(name);return !!control&&control.invalid&&(control.touched||control.dirty)}closeModal(){this.modal.set(false)}
  save(){if(this.form.invalid){this.form.markAllAsTouched();this.toast.show('Revisa los campos obligatorios','error');return}this.saving.set(true);const request=this.editing()&&this.selected()?this.service.update(this.selected()!.id,this.form.getRawValue()):this.service.create(this.form.getRawValue());request.subscribe({next:client=>{this.saving.set(false);this.modal.set(false);this.page.set(1);this.load(client.id);this.toast.show(this.editing()?'Cliente actualizado':'Cliente registrado')},error:e=>{this.saving.set(false);this.toast.error(e)}})}
}
