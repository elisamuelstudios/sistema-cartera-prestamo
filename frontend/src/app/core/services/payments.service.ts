import { inject, Injectable } from '@angular/core';
import { Page, Payment } from '../models/models';
import { ApiService } from './api.service';
export interface PaymentFilters { receipt?: string; clientName?: string; identification?: string; method?: string; routeId?: string; }

@Injectable({ providedIn: 'root' }) export class PaymentsService {
  private api=inject(ApiService);
  list(page=1,pageSize=25,filters:PaymentFilters={}){return this.api.get<Page<Payment>>('payments',{page,pageSize,receipt:filters.receipt,clientName:filters.clientName,identification:filters.identification,method:filters.method,routeId:filters.routeId});}
  listByLoan(loanId:string){return this.api.get<Page<Payment>>('payments',{loanId,page:1,pageSize:100});}
  create(body:unknown){return this.api.post<Payment>('payments',body);} update(id:string,body:unknown){return this.api.patch<Payment>(`payments/${id}`,body);}
  codes(){return this.api.get<{value:string;label:string}[]>('payments/codes');}
}

