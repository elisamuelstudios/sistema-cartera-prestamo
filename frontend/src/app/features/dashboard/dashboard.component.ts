import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { OperationsService } from '../../core/services/operations.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector:'app-dashboard',standalone:true,imports:[CurrencyPipe,DecimalPipe,DatePipe],
  template:`
    <div class="page-heading"><div><h1>Resumen ejecutivo</h1><p>Una vista clara del estado actual de la operación.</p></div><button class="btn btn-ghost" (click)="load()">↻ Actualizar</button></div>
    @if(loading()){<div class="kpis">@for(i of [1,2,3,4];track i){<div class="panel kpi"><div class="skeleton"></div><div class="skeleton large"></div></div>}</div>}
    @else if(data();as report){
      <div class="kpis">
        <article class="panel kpi"><span>Clientes registrados</span><strong>{{report.kpis.clients|number}}</strong><small>Base total de clientes</small></article>
        <article class="panel kpi accent"><span>Cartera colocada</span><strong>{{report.kpis.portfolio|currency:'COP':'symbol-narrow':'1.0-0'}}</strong><small>{{report.kpis.active_loans}} préstamos vigentes</small></article>
        <article class="panel kpi warning"><span>Saldo en mora</span><strong>{{report.kpis.overdue|currency:'COP':'symbol-narrow':'1.0-0'}}</strong><small>{{report.kpis.overdue_installments}} cuotas vencidas</small></article>
        <article class="panel kpi success"><span>Recaudado hoy</span><strong>{{report.kpis.collected_today|currency:'COP':'symbol-narrow':'1.0-0'}}</strong><small>{{report.kpis.due_today}} cuotas esperan pago</small></article>
      </div>
      <div class="dashboard-grid">
        <section class="panel route-card"><header><div><h3>Cartera por ruta</h3><p>Saldo y mora distribuidos por cobrador.</p></div></header><div class="route-list">
          @for(route of report.byRoute;track route.code){<div class="route-row"><div class="route-code">{{route.code}}</div><div class="route-name"><strong>{{route.name}}</strong><span>{{route.collector||'Sin cobrador'}} · {{route.loans}} préstamos</span></div><div class="route-value"><strong>{{route.portfolio|currency:'COP':'symbol-narrow':'1.0-0'}}</strong><span [class.danger]="route.overdue>0">Mora {{route.overdue|currency:'COP':'symbol-narrow':'1.0-0'}}</span></div></div>}
        </div></section>
        <section class="panel trend-card"><header><h3>Recaudo · últimos 14 días</h3><p>Comportamiento diario de pagos.</p></header><div class="bars">
          @for(point of report.trend;track point.date){<div class="bar-col" [title]="(point.amount|currency:'COP':'symbol-narrow':'1.0-0')||''"><div class="bar" [style.height.%]="barHeight(point.amount,report.trend)"></div><span>{{point.date|date:'dd'}}</span></div>}
        </div><div class="legend"><i></i> Recaudo registrado</div></section>
      </div>
    }`,
  styles:[`
    .kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:18px}.kpi{padding:19px 20px;border-top:3px solid #8ba0af}.kpi.accent{border-color:#1b8dab}.kpi.warning{border-color:#e39a32}.kpi.success{border-color:#28a36a}.kpi>span{text-transform:uppercase;font-size:9px;letter-spacing:.08em;font-weight:850;color:#6d8192}.kpi strong{display:block;margin:10px 0 5px;font-family:Manrope;font-size:24px;color:#173a52}.kpi small{color:#8393a0;font-size:10px}.skeleton.large{height:28px;margin:13px 0}.dashboard-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:18px}.route-card header,.trend-card header{padding:18px 20px;border-bottom:1px solid #e8eef2}.route-card h3,.trend-card h3{font-size:14px;margin:0;color:#183a52}.route-card p,.trend-card p{font-size:10px;color:#7a8e9e;margin:4px 0 0}.route-row{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #edf1f4}.route-row:last-child{border:0}.route-code{width:52px;padding:7px 5px;border-radius:8px;background:#eaf5f8;color:#176b87;text-align:center;font-size:10px;font-weight:900}.route-name{display:grid;flex:1;min-width:0}.route-name strong{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.route-name span,.route-value span{font-size:9px;color:#8293a0;margin-top:3px}.route-value{text-align:right;display:grid}.route-value strong{font-size:12px}.danger{color:#c83945!important}.bars{height:240px;padding:30px 20px 10px;display:flex;align-items:flex-end;gap:8px}.bar-col{height:100%;flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:6px}.bar{width:100%;max-width:22px;min-height:3px;border-radius:6px 6px 2px 2px;background:linear-gradient(#24a2c2,#176b87)}.bar-col span{font-size:8px;color:#8b9aa6}.legend{padding:10px 20px 16px;font-size:9px;color:#758999}.legend i{display:inline-block;width:8px;height:8px;background:#1c8dab;border-radius:2px;margin-right:5px}
    @media(max-width:1100px){.kpis{grid-template-columns:repeat(2,1fr)}.dashboard-grid{grid-template-columns:1fr}}@media(max-width:560px){.kpis{grid-template-columns:1fr}}
  `]
})
export class DashboardComponent implements OnInit{
  private service=inject(OperationsService);private toast=inject(ToastService);readonly data=signal<any>(null);readonly loading=signal(true);
  ngOnInit(){this.load();}load(){this.loading.set(true);this.service.dashboard().subscribe({next:r=>{this.data.set(r);this.loading.set(false)},error:e=>{this.loading.set(false);this.toast.error(e)}})}
  barHeight(value:number,points:any[]){const max=Math.max(...points.map(p=>p.amount),1);return Math.max(2,value/max*100)}
}

