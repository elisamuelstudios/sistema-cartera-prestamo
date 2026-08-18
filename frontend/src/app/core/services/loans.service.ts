import { inject, Injectable } from '@angular/core';
import { Loan, Page } from '../models/models';
import { ApiService } from './api.service';

export interface LoanPreviewResult {
  interestRate: number; interestType: string; chargeMode: string;
  principal: number; disbursedAmount: number; charges: number;
  generatedInterest: number; total: number; dailyInstallment: number;
  installmentCount: number; lastInstallment: number; warnings: string[];
}

@Injectable({ providedIn: 'root' }) export class LoansService {
  private api=inject(ApiService); list(search='',page=1,pageSize=25,status='',routeId=''){return this.api.get<Page<Loan>>('loans',{search,page,pageSize,status,routeId});}
  listForClient(clientId:string){return this.api.get<Page<Loan>>('loans',{clientId,page:1,pageSize:100});}
  get(id:string){return this.api.get<Loan>(`loans/${id}`);} preview(body:unknown){return this.api.post<LoanPreviewResult>('loans/preview',body);}
  create(body:unknown){return this.api.post<Loan>('loans',body);} update(id:string,body:unknown){return this.api.patch<Loan>(`loans/${id}`,body);} refinance(id:string,body:unknown){return this.api.post<Loan>(`loans/${id}/refinance`,body);}
}
