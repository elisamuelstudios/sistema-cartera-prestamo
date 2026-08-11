import { inject, Injectable } from '@angular/core';
import { Route, Setting, User } from '../models/models';
import { ApiService } from './api.service';
@Injectable({ providedIn: 'root' }) export class CatalogService {
  private api=inject(ApiService); routes(active?:boolean){return this.api.get<Route[]>('routes',{active:active===undefined?undefined:String(active)});}
  createRoute(body:unknown){return this.api.post<Route>('routes',body);} updateRoute(id:string,body:unknown){return this.api.patch<Route>(`routes/${id}`,body);}
  settings(){return this.api.get<Setting[]>('settings');} updateSetting(id:string,body:unknown){return this.api.patch<Setting>(`settings/${id}`,body);}
  users(){return this.api.get<User[]>('users');} createUser(body:unknown){return this.api.post<User>('users',body);} updateUser(id:string,body:unknown){return this.api.patch<User>(`users/${id}`,body);}
}

