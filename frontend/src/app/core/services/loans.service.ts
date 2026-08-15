import { inject, Injectable } from '@angular/core';
import { Loan, Page } from '../models/models';
import { ApiService } from './api.service';
@Injectable({ providedIn: 'root' }) export class LoansService {
  private api=inject(ApiService); list(search='',page=1,pageSize=25,status=''){return this.api.get<Page<Loan>>('loans',{search,page,pageSize,status});}
  listForClient(clientId:string){return this.api.get<Page<Loan>>('loans',{clientId,page:1,pageSize:100});}
  get(id:string){return this.api.get<Loan>(`loans/${id}`);} preview(body:unknown){return this.api.post<{interestRate:number;generatedInterest:number;total:number;dailyInstallment:number;installmentCount:number;lastInstallment:number;warnings:string[]}>('loans/preview',body);}
  create(body:unknown){return this.api.post<Loan>('loans',body);} update(id:string,body:unknown){return this.api.patch<Loan>(`loans/${id}`,body);} refinance(id:string,body:unknown){return this.api.post<Loan>(`loans/${id}/refinance`,body);}
}
