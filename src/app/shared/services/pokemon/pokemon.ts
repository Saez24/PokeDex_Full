import { inject, Injectable, signal, computed } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { Pokemon } from '../../models/pokemon.model';
import { Api } from '../api/api';
import { ApiListResponse } from '../../models/api-list-response.model';
import { NamedResource } from '../../models/named-resource.model';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PokemonService {
  private api = inject(Api);
  private readonly PAGE_SIZE = 20;
  http = inject(HttpClient);
  pokemon = signal<Pokemon[]>([]);
  loading = signal(false);
  offset = signal(0);
  hasMore = signal(true);
  total = computed(() => this.pokemon().length);
  private _language = signal('de'); // Default Deutsch
  public language = computed(() => this._language());

  setLanguage(lang: string) {
    this._language.set(lang);
  }

  constructor() {
    this.loadMore();
  }

  getLocalizedName(species: any): string {
    const lang = this._language();
    const name = species.names.find((n: any) => n.language.name === lang);
    return name?.name ?? species.name;
  }

  getLocalizedFlavor(species: any): string {
    const lang = this._language();
    const entry = species.flavor_text_entries.find((f: any) => f.language.name === lang);
    return entry?.flavor_text.replace(/\n|\f/g, ' ') ?? '';
  }

  getLocalizedGenus(species: any): string {
    const lang = this._language();
    const genus = species.genera.find((g: any) => g.language.name === lang);
    return genus?.genus ?? '';
  }

  loadMore(): void {
    if (this.loading() || !this.hasMore()) return;

    this.loading.set(true);

    this.api
      .getResource<
        ApiListResponse<NamedResource>
      >('pokemon', `limit=${this.PAGE_SIZE}&offset=${this.offset()}`)
      .subscribe((response) => {
        if (!response.next) this.hasMore.set(false);

        forkJoin(
          response.results.map((p) =>
            // Hol Basisdaten + species
            forkJoin({
              base: this.api.getResource<Pokemon>('pokemon', undefined, p.name),
              species: this.api.getResource<any>('pokemon-species', undefined, p.name),
            }),
          ),
        ).subscribe((results) => {
          const enriched = results.map((r) => ({
            ...r.base,
            species: r.species,
          }));

          this.pokemon.update((prev) => [...prev, ...enriched]);
          this.offset.update((v) => v + this.PAGE_SIZE);
          this.loading.set(false);
        });
      });
  }
}
