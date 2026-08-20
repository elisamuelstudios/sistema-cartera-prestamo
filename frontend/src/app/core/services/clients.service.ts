import { inject, Injectable } from '@angular/core';
import { Client, Page } from '../models/models';
import { ApiService } from './api.service';

export interface ClientFilters { code?: string; name?: string; identification?: string; status?: string; routeId?: string; collectable?: boolean; q?: string; }

@Injectable({ providedIn: 'root' }) export class ClientsService {
  private api=inject(ApiService);
  list(page=1,pageSize=25,filters:ClientFilters={}){return this.api.get<Page<Client>>('clients',{page,pageSize,code:filters.code,name:filters.name,identification:filters.identification,status:filters.status,routeId:filters.routeId,collectable:filters.collectable===undefined?undefined:String(filters.collectable),q:filters.q});}
  get(id:string){return this.api.get<Client>(`clients/${id}`);} create(body:unknown){return this.api.post<Client>('clients',body);} update(id:string,body:unknown){return this.api.patch<Client>(`clients/${id}`,body);}
  codes(){return this.api.get<{value:string;label:string}[]>('clients/codes');}
  remove(id:string){return this.api.delete<void>(`clients/${id}`);}
}
