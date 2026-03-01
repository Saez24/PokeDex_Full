import { inject, Injectable, signal, computed } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Pokemon } from '../../models/pokemon.model';
import { Api } from '../api/api';
import { ApiListResponse } from '../../models/api-list-response.model';
import { NamedResource } from '../../models/named-resource.model';


@Injectable({ providedIn: 'root' })
export class PokemonService {
  private api = inject(Api);

  private readonly PAGE_SIZE = 20;

  pokemon = signal<Pokemon[]>([]);
  loading = signal(false);
  offset = signal(0);
  hasMore = signal(true);

  total = computed(() => this.pokemon().length);

  loadNext(): void {
    if (this.loading() || !this.hasMore()) return;

    this.loading.set(true);

    this.api
      .getResource<ApiListResponse<NamedResource>>(
        'pokemon',
        `limit=${this.PAGE_SIZE}&offset=${this.offset()}`
      )
      .pipe(
        // switchMap would cancel previous — use a local subscribe chain
      )
      .subscribe(response => {
        if (!response.next) this.hasMore.set(false);

        forkJoin(
          response.results.map(p =>
            this.api.getResource<Pokemon>('pokemon', undefined, p.name)
          )
        ).subscribe(details => {
          this.pokemon.update(prev => [...prev, ...details]);
          this.offset.update(v => v + this.PAGE_SIZE);
          this.loading.set(false);
        });
      });
  }
}