import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { NgStyle, DecimalPipe } from '@angular/common';
import { forkJoin, map, switchMap } from 'rxjs';

import {
    getPrimaryColor,
    getPrimaryGlow,
    STAT_LABELS,
    TYPE_COLORS,
} from '../shared/utils/pokemon-types.util';
import { Pokemon } from '../shared/models/pokemon.model';
import { Api } from '../shared/services/api/api';
import { EvolutionStep } from '../shared/models/evolution.model';
import { MoveRow } from '../shared/models/move.model';
import { PokemonService } from '../shared/services/pokemon/pokemon';
import { FavoritesService } from '../shared/services/favorites/favorites';
import { SeoService } from '../shared/services/seo/seo';

@Component({
    selector: 'app-pokemon-detail',
    imports: [MatTabsModule, NgStyle, DecimalPipe],
    templateUrl: './pokemon-detail.html',
    styleUrl: './pokemon-detail.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonDetail implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly api = inject(Api);
    readonly pokemonService = inject(PokemonService);
    readonly favoritesService = inject(FavoritesService);
    private readonly seoService = inject(SeoService);

    readonly STAT_LABELS = STAT_LABELS;
    readonly TYPE_COLORS = TYPE_COLORS;

    /* ── Signals ── */
    pokemon = signal<Pokemon | null>(null);
    species = signal<any | null>(null);
    loading = signal(true);
    error = signal(false);

    evolutionChain = signal<EvolutionStep[]>([]);
    evolutionLoading = signal(false);
    moves = signal<MoveRow[]>([]);
    movesLoading = signal(false);
    tmMoves = signal<MoveRow[]>([]);
    eggMoves = signal<MoveRow[]>([]);
    tmMovesLoading = signal(false);
    eggMovesLoading = signal(false);
    selectedMove = signal<MoveRow | null>(null);
    moveTab = signal<'level-up' | 'machine' | 'egg'>('level-up');
    abilityDetails = signal<Record<string, string>>({});
    isShiny = signal(false);
    isCryPlaying = signal(false);

    /* ── Computed ── */
    readonly primaryColor = computed(() => getPrimaryColor(this.pokemon()?.types ?? []));
    readonly primaryGlow = computed(() => getPrimaryGlow(this.pokemon()?.types ?? []));
    readonly spriteUrl = computed(() => {
        const p = this.pokemon();
        if (!p) return '';
        if (this.isShiny()) {
            const shiny =
                (p.sprites as any).other?.['official-artwork']?.front_shiny ??
                (p.sprites as any).front_shiny;
            if (shiny) return shiny;
        }
        return (p.sprites.other as any)['official-artwork'].front_default;
    });
    readonly paddedId = computed(() => String(this.pokemon()?.id ?? 0).padStart(3, '0'));

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) { this.router.navigate(['/']); return; }
        this.loadPokemon(id);
    }

    goBack(): void {
        this.router.navigate(['/']);
    }

    onTabChange(index: number): void {
        if (index === 1 && this.evolutionChain().length === 0) this.loadEvolution();
        if (index === 2 && this.moves().length === 0) this.loadMoves();
    }

    switchMoveTab(tab: 'level-up' | 'machine' | 'egg'): void {
        this.moveTab.set(tab);
        this.selectedMove.set(null);
        if (tab === 'machine' && this.tmMoves().length === 0) this.loadMovesByMethod('machine');
        if (tab === 'egg' && this.eggMoves().length === 0) this.loadMovesByMethod('egg');
    }

    toggleShiny(): void { this.isShiny.update(v => !v); }

    playCry(): void {
        const p = this.pokemon();
        if (!p) return;
        const cryUrl =
            (p.sprites as any).other?.cries?.latest ?? (p.sprites as any).cries?.latest;
        if (!cryUrl || this.isCryPlaying()) return;
        this.isCryPlaying.set(true);
        const audio = new Audio(cryUrl);
        audio.volume = 0.5;
        audio.play().catch(() => null);
        audio.addEventListener('ended', () => this.isCryPlaying.set(false));
        audio.addEventListener('error', () => this.isCryPlaying.set(false));
    }

    hasCry = computed(() => {
        const s = this.pokemon()?.sprites as any;
        return !!(s?.other?.cries?.latest ?? s?.cries?.latest);
    });

    toggleFavorite(): void {
        const p = this.pokemon();
        if (p) this.favoritesService.toggle(p.id);
    }

    toggleMove(move: MoveRow): void {
        this.selectedMove.update(c => (c?.name === move.name ? null : move));
    }

    statPercent(value: number): number { return Math.min((value / 160) * 100, 100); }
    statColor(value: number): string {
        if (value >= 100) return '#30d158';
        if (value >= 70) return '#ffd60a';
        return this.primaryColor();
    }

    getAbilityDescription(name: string): string {
        return this.abilityDetails()[name] ?? '';
    }

    genderRatio(genderRate: number): { male: number; female: number } | null {
        if (genderRate === -1) return null;
        const female = (genderRate / 8) * 100;
        return { male: 100 - female, female };
    }

    hatchSteps(hatchCounter: number): number { return (hatchCounter + 1) * 255; }

    eggGroupNames(species: any): string {
        if (!species?.egg_groups?.length) return '—';
        const lang = this.pokemonService.language();
        return species.egg_groups
            .map((g: any) => {
                const name = g.names?.find((n: any) => n.language.name === lang)?.name ?? g.name;
                return name.charAt(0).toUpperCase() + name.slice(1);
            })
            .join(', ');
    }

    spriteById(id: number): string {
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
    }

    idFromUrl(url: string): number {
        const parts = url.replace(/\/$/, '').split('/');
        return parseInt(parts[parts.length - 1], 10);
    }

    damageClassIcon(cls: string): string {
        const map: Record<string, string> = { physical: '⚔️', special: '✨', status: '💫' };
        return map[cls] ?? '–';
    }

    /* ── Private loaders ── */
    private loadPokemon(id: string): void {
        this.loading.set(true);
        this.api.getResource<Pokemon>('pokemon', undefined, id).subscribe({
            next: (p) => {
                this.pokemon.set(p);
                this.loadSpecies(id);
                this.loadAbilityDescriptions(p);
                this.loading.set(false);
                const name = p.name.charAt(0).toUpperCase() + p.name.slice(1);
                this.seoService.setPage({
                    title: `${name} #${String(p.id).padStart(3, '0')}`,
                    description: `${name} – Typen, Stats, Moves und mehr im PokéDex.`,
                    image: (p.sprites.other as any)['official-artwork']?.front_default,
                });
            },

            error: () => { this.error.set(true); this.loading.set(false); },
        });
    }

    private loadSpecies(id: string): void {
        this.api.getResource<any>('pokemon-species', undefined, id).subscribe({
            next: (s) => this.species.set(s),
            error: () => { },
        });
    }

    private loadAbilityDescriptions(p: Pokemon): void {
        const abilities = p.abilities.map(a => a.ability.name);
        forkJoin(abilities.map(n => this.api.getResource<any>('ability', undefined, n))).subscribe({
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
        const p = this.pokemon();
        if (!p) return;
        this.evolutionLoading.set(true);
        this.api
            .getResource<any>('pokemon-species', undefined, String(p.id))
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
                next: (steps) => { this.evolutionChain.set(steps); this.evolutionLoading.set(false); },
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
        if (link.evolves_to?.length) this.flattenChainRaw(link.evolves_to[0], steps);
        return steps;
    }

    private loadMoves(): void {
        const p = this.pokemon();
        if (!p) return;
        this.movesLoading.set(true);
        const lang = this.pokemonService.language();
        const levelUpMoves = p.moves
            .map((entry) => {
                const detail = entry.version_group_details
                    .filter((d) => d.move_learn_method.name === 'level-up')
                    .sort((a, b) => b.version_group.name.localeCompare(a.version_group.name))[0];
                return detail
                    ? { name: entry.move.name, level: detail.level_learned_at }
                    : null;
            })
            .filter(Boolean)
            .sort((a, b) => a!.level - b!.level)
            .slice(0, 20);

        if (!levelUpMoves.length) { this.movesLoading.set(false); return; }

        forkJoin(levelUpMoves.map((m) => this.api.getResource<any>('move', undefined, m!.name))).subscribe({
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
        const p = this.pokemon();
        if (!p) return;
        const loadingSignal = method === 'machine' ? this.tmMovesLoading : this.eggMovesLoading;
        const targetSignal = method === 'machine' ? this.tmMoves : this.eggMoves;
        loadingSignal.set(true);
        const lang = this.pokemonService.language();
        const methodMoves = p.moves
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
}
