import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Client, Loan, Payment, Route } from '../../core/models/models';
import { CatalogService } from '../../core/services/catalog.service';
import { ClientsService } from '../../core/services/clients.service';
import { LoansService } from '../../core/services/loans.service';
import { PaymentsService } from '../../core/services/payments.service';
import { ToastService } from '../../core/services/toast.service';
import { ClientPickerComponent } from '../../shared/client-picker/client-picker.component';
import { DateTimePipe } from '../../shared/date-time/date-time.pipe';
import { FilterBarComponent, FilterField } from '../../shared/filter-bar/filter-bar.component';
import { ModalComponent } from '../../shared/modal/modal.component';
import { PaymentFormComponent } from '../../shared/payment-form/payment-form.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';

@Component({
 selector:'app-payments',standalone:true,imports:[CurrencyPipe,DatePipe,DateTimePipe,ClientPickerComponent,FilterBarComponent,ModalComponent,PaymentFormComponent,StatusBadgeComponent],
 template:`
  <div class="page-heading"><div><h1>Pagos</h1><p>Registra cobros y corrige pagos digitados por error.</p></div><div class="actions"><button class="btn btn-secondary" [disabled]="!selected()" (click)="openEdit()">Editar pago</button><button class="btn btn-primary" (click)="openNew()">＋ Registrar pago</button></div></div>
  <section class="panel">
   <app-filter-bar [fields]="filterFields()" [values]="filters()" (changed)="onFilterChange($event)"/>
   <div class="table-wrap"><table><thead><tr><th>Recibo</th><th>Fecha del pago</th><th>Registrado</th><th>Préstamo</th><th>Cliente</th><th>Total deuda</th><th>Valor pagado</th><th>Saldo pendiente</th><th>Método</th><th>Responsable</th></tr></thead><tbody>
   @for(payment of payments();track payment.id){<tr [class.selected]="selected()?.id===payment.id" (click)="selected.set(payment)" (dblclick)="openEdit()"><td><strong>{{payment.receipt}}</strong></td><td>{{payment.paymentDate|date:'dd/MM/yyyy'}}</td><td>{{payment.createdAt|appDateTime}}</td><td>{{payment.loanNumber}}</td><td>{{payment.clientName}}</td><td class="money">{{payment.totalDebt|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td class="money"><strong>{{payment.amount|currency:'COP':'symbol-narrow':'1.0-0'}}</strong></td><td class="money balance">{{payment.pendingBalance|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td>{{payment.method}}</td><td>{{payment.responsible||'—'}}</td></tr>}
  </tbody></table>@if(!payments().length){<div class="empty">Todavía no hay pagos que coincidan con la búsqueda.</div>}</div><div class="pagination"><span>{{total()}} pagos · página {{page()}}</span><div class="buttons"><button [disabled]="page()===1" (click)="go(page()-1)">Anterior</button><button [disabled]="page()*25>=total()" (click)="go(page()+1)">Siguiente</button></div></div></section>

  <app-modal [open]="modal()" [wide]="!editing()" [title]="editing()?'Editar pago':'Registrar pago'" (closed)="modal.set(false)">
   @if(!editing()){
    <app-client-picker [clients]="clients()" [total]="clientTotal()" [page]="clientPage()" [search]="clientSearch()"
      [selectedId]="selectedClient()?.id" [loading]="clientLoading()" title="Selecciona el cliente que realizará el pago"
      emptyMessage="No se encontraron clientes con préstamos cobrables." (searchChange)="searchClients($event)"
      (pageChange)="goClients($event)" (selected)="chooseClient($event)"/>
    @if(selectedClient();as client){
      <section class="loan-picker"><div class="loan-heading"><div><span>Préstamo a pagar</span><strong>{{client.fullName}}</strong></div><small>Selecciona el préstamo al que se aplicará el abono.</small></div>
        <div class="loan-table"><table><thead><tr><th>Préstamo</th><th>Fecha</th><th>Cuota</th><th>Saldo</th><th>Vencido</th><th>Estado</th></tr></thead><tbody>
          @for(loan of loans();track loan.id){<tr [class.active]="selectedLoan()?.id===loan.id" (click)="chooseLoan(loan)"><td><strong>{{loan.number}}</strong></td><td>{{loan.loanDate|date:'dd/MM/yyyy'}}</td><td class="money">{{loan.dailyInstallment|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td class="money">{{loan.outstandingPrincipal|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td class="money" [class.text-red]="loan.overdueAmount>0">{{loan.overdueAmount|currency:'COP':'symbol-narrow':'1.0-0'}}</td><td><app-status-badge [value]="loan.status"/></td></tr>}
        </tbody></table>@if(!loans().length&&!loanLoading()){<div class="empty small">Este cliente no tiene préstamos disponibles para pago.</div>}</div>
      </section>
    }
    @if(selectedLoan();as loan){<app-payment-form [loan]="{id:loan.id,number:loan.number,dailyInstallment:loan.dailyInstallment}" (saved)="onSaved($event)" (cancelled)="modal.set(false)"/>}
   }@else{<div class="locked"><span>Pago seleccionado</span><strong>{{selected()?.receipt}} · {{selected()?.loanNumber}}</strong><small>{{selected()?.clientName}}</small></div>
    <app-payment-form [loan]="{id:selected()!.loanId,number:selected()!.loanNumber}" [payment]="selected()" (saved)="onSaved($event)" (cancelled)="modal.set(false)"/>
   }
  </app-modal>`,
 styles:[`
  .balance{color:#176b87;font-weight:800}.loan-picker{border:1px solid #dce7ed;border-radius:12px;margin:0 0 20px;overflow:hidden}.loan-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 14px;background:#f6f9fa}.loan-heading div{display:grid;gap:2px}.loan-heading span,.loan-heading small{font-size:9px;color:#718697}.loan-heading strong{font-size:13px;color:#173a52}.loan-table{max-height:190px;overflow:auto}.loan-table table{min-width:700px;width:100%}.loan-table th,.loan-table td{padding:9px 11px}.loan-table tbody tr{cursor:pointer}.loan-table tbody tr.active{background:#e5f5fa;box-shadow:inset 4px 0 #1882a1}.loan-table .empty.small{padding:22px}.locked{display:grid;gap:4px;background:#edf3f6;border-radius:11px;padding:14px;margin-bottom:18px}.locked span,.locked small{font-size:9px;color:#718697}.locked strong{color:#173a52;font-size:13px}
 `]
})
export class PaymentsComponent implements OnInit{
 private service=inject(PaymentsService);private loanService=inject(LoansService);private clientService=inject(ClientsService);private catalog=inject(CatalogService);private toast=inject(ToastService);
 readonly payments=signal<Payment[]>([]);readonly loans=signal<Loan[]>([]);readonly clients=signal<Client[]>([]);readonly routes=signal<Route[]>([]);readonly selected=signal<Payment|null>(null);readonly selectedClient=signal<Client|null>(null);readonly selectedLoan=signal<Loan|null>(null);readonly page=signal(1);readonly total=signal(0);readonly modal=signal(false);readonly editing=signal(false);
 readonly clientSearch=signal('');readonly clientPage=signal(1);readonly clientTotal=signal(0);readonly clientLoading=signal(false);readonly loanLoading=signal(false);
 private clientTimer?:number;

 readonly codeOptions=signal<{value:string;label:string}[]>([]);
 readonly filters=signal<Record<string,string>>({receipt:'',clientName:'',identification:'',method:'',routeId:''});
 readonly filterFields=computed<FilterField[]>(()=>[
   {key:'receipt',label:'Recibo',type:'select',placeholder:'Todos los recibos',options:this.codeOptions().map(o=>({value:o.value,label:o.label}))},
   {key:'clientName',label:'Cliente',type:'text',placeholder:'Nombre del cliente'},
   {key:'identification',label:'Documento',type:'text',placeholder:'Número de documento'},
   {key:'method',label:'Método',type:'select',placeholder:'Todos los métodos',options:[{value:'Efectivo',label:'Efectivo'},{value:'Transferencia',label:'Transferencia'},{value:'Otro',label:'Otro'}]},
   {key:'routeId',label:'Ruta',type:'select',placeholder:'Todas las rutas',options:this.routes().map(r=>({value:r.id,label:`${r.code} · ${r.name}`}))},
 ]);

 ngOnInit(){this.load();this.catalog.routes(true).subscribe(r=>this.routes.set(r));this.service.codes().subscribe(c=>this.codeOptions.set(c))}
 load(){const f=this.filters();this.service.list(this.page(),25,{receipt:f['receipt'],clientName:f['clientName'],identification:f['identification'],method:f['method'],routeId:f['routeId']}).subscribe({next:r=>{this.payments.set(r.items);this.total.set(r.total)},error:e=>this.toast.error(e)})}
 go(p:number){this.page.set(p);this.load()}
 onFilterChange(event:{key:string;value:string}){this.filters.update(f=>({...f,[event.key]:event.value}));this.page.set(1);this.load()}

 openNew(){this.editing.set(false);this.selectedClient.set(null);this.selectedLoan.set(null);this.loans.set([]);this.clientSearch.set('');this.clientPage.set(1);this.loadClients();this.modal.set(true)}
 openEdit(){const p=this.selected();if(!p)return;this.editing.set(true);this.selectedClient.set(null);this.selectedLoan.set(null);this.modal.set(true)}
 loadClients(){this.clientLoading.set(true);this.clientService.list(this.clientPage(),15,{status:'Activo',collectable:true,q:this.clientSearch()}).subscribe({next:r=>{this.clients.set(r.items);this.clientTotal.set(r.total);this.clientLoading.set(false)},error:e=>{this.clientLoading.set(false);this.toast.error(e)}})}
 searchClients(value:string){this.clientSearch.set(value);clearTimeout(this.clientTimer);this.clientTimer=window.setTimeout(()=>{this.clientPage.set(1);this.loadClients()},250)}
 goClients(page:number){this.clientPage.set(page);this.loadClients()}
 chooseClient(client:Client){this.selectedClient.set(client);this.selectedLoan.set(null);this.loans.set([]);this.loanLoading.set(true);this.loanService.listForClient(client.id).subscribe({next:r=>{const available=r.items.filter(loan=>['Activo','En mora'].includes(loan.status));this.loans.set(available);this.loanLoading.set(false);if(available.length===1)this.chooseLoan(available[0])},error:e=>{this.loanLoading.set(false);this.toast.error(e)}})}
 chooseLoan(loan:Loan){this.selectedLoan.set(loan)}
 onSaved(payment:Payment){this.modal.set(false);this.selected.set(payment);this.page.set(1);this.load()}
}
