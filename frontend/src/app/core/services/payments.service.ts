import { inject, Injectable } from '@angular/core';
import { Page, Payment } from '../models/models';
import { ApiService } from './api.service';
@Injectable({ providedIn: 'root' }) export class PaymentsService {
  private api=inject(ApiService); list(search='',page=1,pageSize=25,method='',routeId=''){return this.api.get<Page<Payment>>('payments',{search,page,pageSize,method,routeId});}
  listByLoan(loanId:string){return this.api.get<Page<Payment>>('payments',{loanId,page:1,pageSize:100});}
  create(body:unknown){return this.api.post<Payment>('payments',body);} update(id:string,body:unknown){return this.api.patch<Payment>(`payments/${id}`,body);}
}

