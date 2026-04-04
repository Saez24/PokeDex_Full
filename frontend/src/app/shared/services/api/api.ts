import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { retry, timeout } from 'rxjs/operators';
import { PokeEndpoint } from '../../models/poke-endpoint.type';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private http = inject(HttpClient);
  // Relative URL → nginx proxiert /api/ intern zum FastAPI-Backend.
  // Standalone-Fallback (kein Backend): https://pokeapi.co/api/v2/
  private apiUrl = '/api/v2/';

  getResource<T>(endpoint: PokeEndpoint, query?: string, slug?: string) {
    let url = `${this.apiUrl}${endpoint}`;
    if (slug) url += `/${slug}`;
    if (query) url += `?${query}`;
    return this.http.get<T>(url).pipe(timeout(10000), retry({ count: 2, delay: 800 }));
  }
}
