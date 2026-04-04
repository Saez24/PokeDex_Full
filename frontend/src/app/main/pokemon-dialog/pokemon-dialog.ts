import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { NgStyle, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';

import {
  getPrimaryColor,
  getPrimaryGlow,
  STAT_LABELS,
  TYPE_COLORS,
} from '../../shared/utils/pokemon-types.util';
import { Pokemon } from '../../shared/models/pokemon.model';
import { Api } from '../../shared/services/api/api';
import { EvolutionStep } from '../../shared/models/evolution.model';
import { MoveRow } from '../../shared/models/move.model';
import { PokemonService } from '../../shared/services/pokemon/pokemon';
import { FavoritesService } from '../../shared/services/favorites/favorites';

@Component({
  selector: 'app-pokemon-dialog',
  imports: [MatDialogModule, MatTabsModule, NgStyle, DecimalPipe],
  templateUrl: './pokemon-dialog.html',
  styleUrl: './pokemon-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonDialog implements OnInit {
  readonly dialogRef = inject(MatDialogRef<PokemonDialog>);
  readonly pokemon: Pokemon = inject(MAT_DIALOG_DATA);
  private readonly api = inject(Api);
  readonly pokemonService = inject(PokemonService);
  readonly favoritesService = inject(FavoritesService);

  readonly STAT_LABELS = STAT_LABELS;
  readonly TYPE_COLORS = TYPE_COLORS;

  private readonly router = inject(Router);

  /* ── Signals ── */
  evolutionChain = signal<EvolutionStep[]>([]);
  moves = signal<MoveRow[]>([]);
  movesLoading = signal(false);
  evolutionLoading = signal(false);
  species = signal<any | null>(null);
  selectedMove = signal<MoveRow | null>(null);
  isShiny = signal(false);
  isCryPlaying = signal(false);
  abilityDetails = signal<Record<string, string>>({});

  /* ── Forms ── */
  formPokemon = signal<Pokemon | null>(null);
  formLoading = signal(false);
  currentFormName = signal('');

  /* ── Varieties (computed → reaktiv in OnPush) ── */
  readonly varieties = computed<any[]>(
    () => this.species()?.varieties?.filter((v: any) => !v.is_default) ?? []
  );

  /* ── Move tabs ── */
  moveTab = signal<'level-up' | 'machine' | 'egg'>('level-up');
  tmMoves = signal<MoveRow[]>([]);
  eggMoves = signal<MoveRow[]>([]);
  tmMovesLoading = signal(false);
  eggMovesLoading = signal(false);

  /* ── Display pokemon (form-aware) ── */
  readonly dp = computed(() => this.formPokemon() ?? this.pokemon);

  /* ── Tab state ── */
  activeTab = signal(0);

  ngOnInit(): void {
    // Species ist bereits im pokemon-Objekt (aus loadMore) vorhanden
    const preloaded = (this.pokemon as any).species;
    if (preloaded?.varieties) {
      this.species.set(preloaded);
    } else {
      this.loadSpecies();
    }
    this.loadAbilityDescriptions();
  }

  onTabChange(index: number): void {
    this.activeTab.set(index);
    this.selectedMove.set(null);

    if (index === 1 && this.evolutionChain().length === 0) {
      this.loadEvolution();
    }
    if (index === 2 && this.moves().length === 0) {
      this.pokemonService.loadMovesForPokemon(
        this.dp().moves.map((m) => m.move.name).slice(0, 20),
      );
      this.loadMoves();
    }
  }

  /* ── Move Sub-Tabs ── */
  switchMoveTab(tab: 'level-up' | 'machine' | 'egg'): void {
    this.moveTab.set(tab);
    this.selectedMove.set(null);
    if (tab === 'machine' && this.tmMoves().length === 0) this.loadMovesByMethod('machine');
    if (tab === 'egg' && this.eggMoves().length === 0) this.loadMovesByMethod('egg');
  }

  /* ── Pokémon Forms ── */
  switchForm(pokemonName: string): void {
    if (pokemonName === this.currentFormName()) {
      // toggle back to base
      this.formPokemon.set(null);
      this.currentFormName.set('');
      this.moves.set([]);
      this.tmMoves.set([]);
      this.eggMoves.set([]);
      return;
    }
    this.formLoading.set(true);
    this.currentFormName.set(pokemonName);
    this.api.getResource<Pokemon>('pokemon', undefined, pokemonName).subscribe({
      next: (data) => {
        this.formPokemon.set(data);
        this.formLoading.set(false);
        this.moves.set([]);
        this.tmMoves.set([]);
        this.eggMoves.set([]);
        if (this.activeTab() === 2) this.loadMoves();
      },
      error: () => this.formLoading.set(false),
    });
  }

  /* ── Open as page ── */
  openDetailPage(): void {
    this.router.navigate(['/pokemon', this.pokemon.id]);
    this.dialogRef.close();
  }

  /* ── Move selection ── */
  toggleMove(move: MoveRow): void {
    this.selectedMove.update(current =>
      current?.name === move.name ? null : move
    );
  }

  /* ── Shiny Toggle ── */
  toggleShiny(): void {
    this.isShiny.update(v => !v);
  }

  /* ── Cry (Audio) ── */
  playCry(): void {
    const cryUrl = (this.pokemon.sprites as any).other?.cries?.latest
      ?? (this.pokemon.sprites as any).cries?.latest;
    if (!cryUrl || this.isCryPlaying()) return;

    this.isCryPlaying.set(true);
    const audio = new Audio(cryUrl);
    audio.volume = 0.5;
    audio.play().catch(() => null);
    audio.addEventListener('ended', () => this.isCryPlaying.set(false));
    audio.addEventListener('error', () => this.isCryPlaying.set(false));
  }

  hasCry(): boolean {
    const s = this.pokemon.sprites as any;
    return !!(s?.other?.cries?.latest ?? s?.cries?.latest);
  }

  /* ── Favorites ── */
  toggleFavorite(): void {
    this.favoritesService.toggle(this.pokemon.id);
  }

  /* ── Getters ── */
  get primaryColor(): string { return getPrimaryColor(this.dp().types); }
  get primaryGlow(): string { return getPrimaryGlow(this.dp().types); }

  get spriteUrl(): string {
    const p = this.dp();
    if (this.isShiny()) {
      const shiny = (p.sprites as any).other?.['official-artwork']?.front_shiny
        ?? (p.sprites as any).front_shiny;
      if (shiny) return shiny;
    }
    return (p.sprites.other as any)['official-artwork'].front_default;
  }

  get paddedId(): string { return String(this.pokemon.id).padStart(3, '0'); }

  statPercent(value: number): number { return Math.min((value / 160) * 100, 100); }
  statColor(value: number): string {
    if (value >= 100) return '#30d158';
    if (value >= 70) return '#ffd60a';
    return this.primaryColor;
  }

  spriteById(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  }

  idFromUrl(url: string): number {
    const parts = url.replace(/\/$/, '').split('/');
    return parseInt(parts[parts.length - 1], 10);
  }

  /* ── Breeding helpers ── */
  genderRatio(genderRate: number): { male: number; female: number } | null {
    if (genderRate === -1) return null; // genderless
    const female = (genderRate / 8) * 100;
    return { male: 100 - female, female };
  }

  hatchSteps(hatchCounter: number): number {
    return (hatchCounter + 1) * 255;
  }

  getAbilityDescription(englishName: string): string {
    return this.abilityDetails()[englishName] ?? '';
  }

  private loadSpecies(): void {
    // Nach species-Name des Pokémon suchen (ID-Lookup kann falschen Cache-Key treffen)
    const speciesName = (this.pokemon as any).species?.name ?? this.pokemon.name;
    this.api.getResource<any>('pokemon-species', undefined, speciesName).subscribe({
      next: (data) => this.species.set(data),
      error: () => this.species.set(null),
    });
  }

  private loadAbilityDescriptions(): void {
    const abilities = this.pokemon.abilities.map(a => a.ability.name);
    forkJoin(
      abilities.map(name => this.api.getResource<any>('ability', undefined, name))
    ).subscribe({
      next: (details) => {
        const lang = this.pokemonService.language();
        const map: Record<string, string> = {};
        details.forEach((d, i) => {
          const entry =
            d.effect_entries?.find((e: any) => e.language.name === lang) ??
            d.effect_entries?.find((e: any) => e.language.name === 'en');
          map[abilities[i]] = entry?.short_effect ?? entry?.effect ?? '';
        });
        this.abilityDetails.set(map);
      },
      error: () => { },
    });
  }

  private loadEvolution(): void {
    this.evolutionLoading.set(true);

    // Species bereits geladen → direkt nutzen; sonst API-Call
    const speciesAlready = this.species();
    const speciesName = (this.pokemon as any).species?.name ?? this.pokemon.name;

    const species$ = speciesAlready?.evolution_chain
      ? of(speciesAlready)
      : this.api.getResource<any>('pokemon-species', undefined, speciesName);

    species$
      .pipe(
        switchMap((species) => {
          const chainId = species.evolution_chain.url.replace(/\/$/, '').split('/').pop();
          return this.api.getResource<any>('evolution-chain', undefined, chainId);
        }),
        switchMap((chain) => {
          const rawSteps = this.flattenChainRaw(chain.chain);
          return forkJoin(
            rawSteps.map((step) =>
              this.api.getResource<any>('pokemon-species', undefined, String(step.id)),
            ),
          ).pipe(
            map((speciesResults) =>
              rawSteps.map((step, i) => ({
                ...step,
                localizedName: this.pokemonService.getLocalizedName(speciesResults[i]),
              })),
            ),
          );
        }),
      )
      .subscribe({
        next: (steps) => {
          this.evolutionChain.set(steps);
          this.evolutionLoading.set(false);
        },
        error: () => this.evolutionLoading.set(false),
      });
  }

  private flattenChainRaw(
    link: any,
    steps: Omit<EvolutionStep, 'localizedName'>[] = [],
  ): Omit<EvolutionStep, 'localizedName'>[] {
    const id = this.idFromUrl(link.species.url);
    const detail = link.evolution_details?.[0];
    steps.push({
      id,
      name: link.species.name,
      spriteUrl: this.spriteById(id),
      trigger: detail?.trigger?.name ?? null,
      minLevel: detail?.min_level ?? null,
    });
    if (link.evolves_to?.length) {
      this.flattenChainRaw(link.evolves_to[0], steps);
    }
    return steps;
  }

  private loadMoves(): void {
    this.movesLoading.set(true);
    const lang = this.pokemonService.language();
    const levelUpMoves = this.dp().moves
      .map((entry) => {
        const detail = entry.version_group_details
          .filter((d) => d.move_learn_method.name === 'level-up')
          .sort((a, b) => b.version_group.name.localeCompare(a.version_group.name))[0];
        return detail
          ? { name: entry.move.name, url: entry.move.url, level: detail.level_learned_at }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => a!.level - b!.level)
      .slice(0, 20);

    if (!levelUpMoves.length) { this.movesLoading.set(false); return; }

    forkJoin(
      levelUpMoves.map((m) => this.api.getResource<any>('move', undefined, m!.name)),
    ).subscribe({
      next: (details) => {
        this.moves.set(
          details.map((d, i) => {
            const effectEntry =
              d.effect_entries?.find((e: any) => e.language.name === lang) ??
              d.effect_entries?.find((e: any) => e.language.name === 'en');
            return {
              name: d.name, level: levelUpMoves[i]!.level,
              type: d.type.name, power: d.power, accuracy: d.accuracy,
              pp: d.pp, damageClass: d.damage_class.name,
              effect: effectEntry?.short_effect ?? null,
            };
          }),
        );
        this.movesLoading.set(false);
      },
      error: () => this.movesLoading.set(false),
    });
  }

  private loadMovesByMethod(method: 'machine' | 'egg'): void {
    const loadingSignal = method === 'machine' ? this.tmMovesLoading : this.eggMovesLoading;
    const targetSignal = method === 'machine' ? this.tmMoves : this.eggMoves;
    loadingSignal.set(true);
    const lang = this.pokemonService.language();
    const methodMoves = this.dp().moves
      .filter((entry) => entry.version_group_details.some((d) => d.move_learn_method.name === method))
      .map((entry) => ({ name: entry.move.name }))
      .slice(0, 20);

    if (!methodMoves.length) { loadingSignal.set(false); return; }

    forkJoin(methodMoves.map((m) => this.api.getResource<any>('move', undefined, m.name))).subscribe({
      next: (details) => {
        targetSignal.set(
          details.map((d) => {
            const effectEntry =
              d.effect_entries?.find((e: any) => e.language.name === lang) ??
              d.effect_entries?.find((e: any) => e.language.name === 'en');
            return {
              name: d.name, level: 0,
              type: d.type.name, power: d.power, accuracy: d.accuracy,
              pp: d.pp, damageClass: d.damage_class.name,
              effect: effectEntry?.short_effect ?? null,
            };
          }),
        );
        loadingSignal.set(false);
      },
      error: () => loadingSignal.set(false),
    });
  }

  damageClassIcon(cls: string): string {
    const map: Record<string, string> = {
      physical: '⚔️',
      special: '✨',
      status: '💫',
    };
    return map[cls] ?? '–';
  }

  eggGroupNames(species: any): string {
    if (!species?.egg_groups?.length) return '—';
    return species.egg_groups.map((g: any) => g.name).join(', ');
  }

  close(): void {
    this.dialogRef.close();
  }
}