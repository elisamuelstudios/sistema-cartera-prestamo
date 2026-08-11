import { inject, Injectable } from '@angular/core';
import { Client, Page } from '../models/models';
import { ApiService } from './api.service';
@Injectable({ providedIn: 'root' }) export class ClientsService {
  private api=inject(ApiService); list(search='',page=1,pageSize=25,status='',collectable=false){return this.api.get<Page<Client>>('clients',{search,page,pageSize,status,collectable:String(collectable)});}
  get(id:string){return this.api.get<Client>(`clients/${id}`);} create(body:unknown){return this.api.post<Client>('clients',body);} update(id:string,body:unknown){return this.api.patch<Client>(`clients/${id}`,body);}
}
