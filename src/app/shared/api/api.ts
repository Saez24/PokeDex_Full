import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PokeEndpoint } from '../models/poke-endpoint.type';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private http = inject(HttpClient);
  private apiUrl = 'https://pokeapi.co/api/v2/';


  getResource<T>(endpoint: PokeEndpoint, query?: string, slug?: string) {
  let url = `${this.apiUrl}${endpoint}`;
  if (slug) url += `/${slug}`;
  if (query) url += `?${query}`;
  return this.http.get<T>(url);
}
}
