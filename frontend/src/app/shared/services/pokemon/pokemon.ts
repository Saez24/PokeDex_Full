import { inject, Injectable, signal, computed } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { Pokemon } from '../../models/pokemon.model';
import { Api } from '../api/api';
import { ApiListResponse } from '../../models/api-list-response.model';
import { NamedResource } from '../../models/named-resource.model';
import { HttpClient } from '@angular/common/http';
import { FavoritesService } from '../favorites/favorites';

export const GENERATIONS: { label: string; offset: number; limit: number }[] = [
  { label: 'All', offset: 0, limit: 20 },
  { label: 'Gen I', offset: 0, limit: 151 },
  { label: 'Gen II', offset: 151, limit: 100 },
  { label: 'Gen III', offset: 251, limit: 135 },
  { label: 'Gen IV', offset: 386, limit: 107 },
  { label: 'Gen V', offset: 493, limit: 156 },
  { label: 'Gen VI', offset: 649, limit: 72 },
  { label: 'Gen VII', offset: 721, limit: 88 },
  { label: 'Gen VIII', offset: 809, limit: 96 },
  { label: 'Gen IX', offset: 905, limit: 120 },
];

@Injectable({ providedIn: 'root' })
export class PokemonService {
  private api = inject(Api);
  private favoritesService = inject(FavoritesService);
  private readonly PAGE_SIZE = 20;
  http = inject(HttpClient);

  /* ── Raw data ── */
  pokemon = signal<Pokemon[]>([]);
  loading = signal(false);
  offset = signal(0);
  hasMore = signal(true);
  total = computed(() => this.pokemon().length);

  /* ── Filter signals ── */
  searchQuery = signal('');
  selectedType = signal('');
  selectedGenIndex = signal(0);
  showFavorites = signal(false);

  /* ── Filtered view ── */
  filteredPokemon = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const type = this.selectedType();
    const favOnly = this.showFavorites();
    const favSet = this.favoritesService.favorites();

    return this.pokemon().filter((p) => {
      if (favOnly && !favSet.has(p.id)) return false;
      if (type && !p.types.some((t) => t.type.name === type)) return false;
      if (query) {
        const matchName = p.name.toLowerCase().includes(query);
        const matchId = String(p.id).includes(query);
        const matchLocalizedName = this.getLocalizedName(p.species)?.toLowerCase().includes(query);
        if (!matchName && !matchId && !matchLocalizedName) return false;
      }
      return true;
    });
  });

  private _language = signal('en');
  public language = computed(() => this._language());
  private typeCache = new Map<string, any>();
  private _genIndex = 0;

  setLanguage(lang: string) {
    this._language.set(lang);
  }

  setGeneration(index: number): void {
    if (index === this._genIndex) return;
    this._genIndex = index;
    this.selectedGenIndex.set(index);
    this.pokemon.set([]);
    this.offset.set(0);
    this.hasMore.set(true);
    this.loadMore();
  }

  constructor() {
    this.loadMore();
  }

  getLocalizedStatName(englishStatName: string): string {
    const statData = this.typeCache.get(englishStatName);
    if (!statData) return englishStatName; // Fallback

    const localized = statData.names.find((n: any) => n.language.name === this._language());
    return localized?.name ?? englishStatName;
  }

  getLocalizedStats(pokemon: Pokemon): { name: string; value: number }[] {
    return pokemon.stats.map((s) => ({
      name: this.getLocalizedStatName(s.stat.name),
      value: s.base_stat,
    }));
  }

  getLocalizedMoveName(englishMoveName: string): string {
    const moveData = this.typeCache.get(englishMoveName);
    if (!moveData) return englishMoveName; // Fallback

    const localized = moveData.names.find((n: any) => n.language.name === this._language());
    return localized?.name ?? englishMoveName;
  }

  getLocalizedMoveNames(pokemon: Pokemon): string[] {
    return pokemon.moves.map((m) => this.getLocalizedMoveName(m.move.name));
  }

  getLocalizedAbilityName(englishAbilityName: string): string {
    const abilityData = this.typeCache.get(englishAbilityName);
    if (!abilityData) return englishAbilityName; // Fallback

    const localized = abilityData.names.find((n: any) => n.language.name === this._language());
    return localized?.name ?? englishAbilityName;
  }

  getLocalizedAbilities(pokemon: Pokemon): string[] {
    return pokemon.abilities.map((a) => this.getLocalizedAbilityName(a.ability.name));
  }

  getLocalizedMoveTypes(pokemon: Pokemon): string[] {
    return pokemon.moves.map((m) => {
      const moveData = this.typeCache.get(m.move.name);
      if (!moveData) return m.move.name; // Fallback

      const localized = moveData.names.find((n: any) => n.language.name === this._language());
      return localized?.name ?? m.move.name;
    });
  }

  // Lokalisierter Typ-Name aus dem Cache
  getLocalizedTypeName(englishTypeName: string): string {
    const typeData = this.typeCache.get(englishTypeName);
    if (!typeData) return englishTypeName; // Fallback

    const localized = typeData.names.find((n: any) => n.language.name === this._language());
    return localized?.name ?? englishTypeName;
  }

  // Alle lokalisierten Typen eines Pokémon
  getLocalizedTypes(pokemon: Pokemon): string[] {
    return pokemon.types.map((t) => this.getLocalizedTypeName(t.type.name));
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

  getLocalizedMoveEffect(moveData: any): string {
    const lang = this._language();
    const effectEntry =
      moveData.effect_entries?.find((e: any) => e.language.name === lang) ??
      moveData.effect_entries?.find((e: any) => e.language.name === 'en');
    return effectEntry?.short_effect ?? '';
  }

  getTypes(type: any): string[] {
    return type.names
      .map((n: any) => {
        if (n.language.name === this._language()) return n.name;
        return null;
      })
      .filter((n: any) => n !== null);
  }

  loadMovesForPokemon(moveNames: string[]): void {
    const uncached = moveNames.filter((n) => !this.typeCache.has(n));
    if (!uncached.length) return;

    forkJoin(uncached.map((n) => this.api.getResource<any>('move', undefined, n))).subscribe(
      (details) => {
        uncached.forEach((name, i) => this.typeCache.set(name, details[i]));
      },
    );
  }

  loadMore(): void {
    if (this.loading() || !this.hasMore()) return;
    this.loading.set(true);

    const gen = GENERATIONS[this._genIndex];
    const genOffset = gen.offset;
    const maxForGen = gen.limit;
    const currentOffset = this.offset();

    // In "All"-Mode (index 0) laden wir unbegrenzt
    // In Gen-Modus laden wir nur bis zum Limit
    const remaining = this._genIndex === 0 ? this.PAGE_SIZE : maxForGen - currentOffset;
    if (remaining <= 0) {
      this.hasMore.set(false);
      this.loading.set(false);
      return;
    }
    const pageSize = Math.min(this.PAGE_SIZE, remaining);
    const fetchOffset = this._genIndex === 0 ? currentOffset : genOffset + currentOffset;

    this.api
      .getResource<ApiListResponse<NamedResource>>(
        'pokemon',
        `limit=${pageSize}&offset=${fetchOffset}`,
      )
      .subscribe({
        next: (response) => {
          if (!response.next || (this._genIndex !== 0 && currentOffset + pageSize >= maxForGen)) {
            this.hasMore.set(false);
          }

          forkJoin(
            response.results.map((p) =>
              forkJoin({
                base: this.api.getResource<Pokemon>('pokemon', undefined, p.name),
                species: this.api.getResource<any>('pokemon-species', undefined, p.name),
              }),
            ),
          ).subscribe({
            next: (results) => {
              const uniqueTypeNames = [
                ...new Set(results.flatMap((r) => r.base.types.map((t: any) => t.type.name))),
              ];
              const uniqueAbilityNames = [
                ...new Set(
                  results.flatMap((r) => r.base.abilities.map((a: any) => a.ability.name)),
                ),
              ];

              const uncachedTypes = uniqueTypeNames.filter((n) => !this.typeCache.has(n));
              const uncachedAbilities = uniqueAbilityNames.filter((n) => !this.typeCache.has(n));
              const allUncached = [...uncachedTypes, ...uncachedAbilities];

              const finalize = () => {
                const enriched = results.map((r) => ({ ...r.base, species: r.species }));
                this.pokemon.update((prev) => [...prev, ...enriched]);
                this.offset.update((v) => v + pageSize);
                this.loading.set(false);
              };

              if (allUncached.length === 0) {
                finalize();
                return;
              }

              forkJoin([
                ...uncachedTypes.map((n) => this.api.getResource<any>('type', undefined, n)),
                ...uncachedAbilities.map((n) =>
                  this.api.getResource<any>('ability', undefined, n),
                ),
              ]).subscribe({
                next: (details) => {
                  uncachedTypes.forEach((name, i) => this.typeCache.set(name, details[i]));
                  uncachedAbilities.forEach((name, i) =>
                    this.typeCache.set(name, details[uncachedTypes.length + i]),
                  );
                  finalize();
                },
                error: () => {
                  // Cache miss – trotzdem anzeigen
                  finalize();
                },
              });
            },
            error: () => this.loading.set(false),
          });
        },
        error: () => this.loading.set(false),
      });
  }
}
