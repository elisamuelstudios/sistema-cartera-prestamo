import { inject, Injectable } from '@angular/core';
import { Installment, Page } from '../models/models';
import { ApiService } from './api.service';
@Injectable({ providedIn: 'root' }) export class OperationsService {
  private api=inject(ApiService); portfolio(search='',page=1,pageSize=25,state='',routeId=''){return this.api.get<Page<Installment>>('portfolio',{search,page,pageSize,state,routeId});}
  dashboard(){return this.api.get<any>('dashboard');} closures(routeId=''){return this.api.get<any[]>('cash-closures',{routeId});}
  closeSummary(routeId:string,date:string){return this.api.get<any>('cash-closures/summary',{routeId,date});} createClose(body:unknown){return this.api.post<any>('cash-closures',body);}
  routeReport(date:string){return this.api.download(`reports/routes.xlsx?date=${date}`);}
}

