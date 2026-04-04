import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgStyle, TitleCasePipe } from '@angular/common';
import { Api } from '../shared/services/api/api';
import { SeoService } from '../shared/services/seo/seo';
import { TYPE_COLORS } from '../shared/utils/pokemon-types.util';
import { TYPES, CHART } from '../type-chart/type-chart';

interface TypeApiResponse {
    name: string;
    pokemon: { pokemon: { name: string; url: string }; slot: number }[];
    damage_relations: {
        double_damage_from: { name: string; url: string }[];
        half_damage_from: { name: string; url: string }[];
        no_damage_from: { name: string; url: string }[];
        double_damage_to: { name: string; url: string }[];
        half_damage_to: { name: string; url: string }[];
        no_damage_to: { name: string; url: string }[];
    };
    moves: { name: string; url: string }[];
}

interface TypePokemonSprite {
    name: string;
    id: number;
    sprite: string;
}

const PAGE = 24;

@Component({
    selector: 'app-type-detail',
    imports: [RouterLink, NgStyle, TitleCasePipe],
    templateUrl: './type-detail.html',
    styleUrl: './type-detail.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypeDetail {
    private readonly route = inject(ActivatedRoute);
    private readonly api = inject(Api);
    private readonly seoService = inject(SeoService);

    readonly TYPE_COLORS = TYPE_COLORS;
    readonly TYPES = TYPES;

    readonly typeName = signal('');
    readonly typeData = signal<TypeApiResponse | null>(null);
    readonly loading = signal(true);
    readonly error = signal(false);

    // sprite cache for displayed pokemon
    readonly sprites = signal<Record<string, string>>({});
    readonly page = signal(1);

    readonly typeColor = computed(() => TYPE_COLORS[this.typeName()] ?? '#888');

    readonly typeIndex = computed(() => TYPES.indexOf(this.typeName() as any));

    readonly weaknesses = computed(() => {
        const ti = this.typeIndex();
        if (ti < 0) return [];
        // attacking types that deal 2× or 4× to this type
        return TYPES.filter((_, ai) => CHART[ai][ti] > 1).map(t => ({
            type: t, multiplier: CHART[TYPES.indexOf(t as any)][ti],
        }));
    });

    readonly resistances = computed(() => {
        const ti = this.typeIndex();
        if (ti < 0) return [];
        return TYPES.filter((_, ai) => CHART[ai][ti] > 0 && CHART[ai][ti] < 1).map(t => ({
            type: t, multiplier: CHART[TYPES.indexOf(t as any)][ti],
        }));
    });

    readonly immunities = computed(() => {
        const ti = this.typeIndex();
        if (ti < 0) return [];
        return TYPES.filter((_, ai) => CHART[ai][ti] === 0).map(t => ({ type: t }));
    });

    readonly offStrong = computed(() => {
        const ti = this.typeIndex();
        if (ti < 0) return [];
        return TYPES.filter((_, di) => CHART[ti][di] > 1).map(t => ({
            type: t, multiplier: CHART[ti][TYPES.indexOf(t as any)],
        }));
    });

    readonly offWeak = computed(() => {
        const ti = this.typeIndex();
        if (ti < 0) return [];
        return TYPES.filter((_, di) => CHART[ti][di] > 0 && CHART[ti][di] < 1).map(t => ({
            type: t, multiplier: CHART[ti][TYPES.indexOf(t as any)],
        }));
    });

    readonly offImmune = computed(() => {
        const ti = this.typeIndex();
        if (ti < 0) return [];
        return TYPES.filter((_, di) => CHART[ti][di] === 0).map(t => ({ type: t }));
    });

    readonly allPokemon = computed((): TypePokemonSprite[] => {
        const data = this.typeData();
        if (!data) return [];
        const sprites = this.sprites();
        return data.pokemon
            .filter(p => p.slot === 1) // primary type only
            .map(p => {
                const id = this.idFromUrl(p.pokemon.url);
                return {
                    name: p.pokemon.name,
                    id,
                    sprite: sprites[p.pokemon.name] ?? this.spriteFromId(id),
                };
            })
            .sort((a, b) => a.id - b.id);
    });

    readonly displayedPokemon = computed(() =>
        this.allPokemon().slice(0, this.page() * PAGE),
    );

    readonly hasMore = computed(() =>
        this.displayedPokemon().length < this.allPokemon().length,
    );

    readonly pokemonCount = computed(() => this.allPokemon().length);
    readonly movesCount = computed(() => this.typeData()?.moves?.length ?? 0);

    constructor() {
        this.route.paramMap.subscribe(params => {
            const name = params.get('name') ?? '';
            this.typeName.set(name);
            const displayName = name.charAt(0).toUpperCase() + name.slice(1);
            this.seoService.setPage({
                title: `${displayName}-Typ`,
                description: `Alle Pokémon und Attacken vom Typ ${displayName} – Stärken, Schwächen und mehr.`,
            });
            this.loading.set(true);
            this.error.set(false);
            this.page.set(1);
            this.typeData.set(null);
            this.sprites.set({});

            this.api.getResource<TypeApiResponse>('type', undefined, name).subscribe({
                next: (data) => {
                    this.typeData.set(data);
                    this.loading.set(false);
                },
                error: () => {
                    this.loading.set(false);
                    this.error.set(true);
                },
            });
        });
    }

    private idFromUrl(url: string): number {
        const parts = url.replace(/\/$/, '').split('/');
        return parseInt(parts[parts.length - 1], 10);
    }

    private spriteFromId(id: number): string {
        // Only main-series ids have official artwork
        if (id > 10000) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
    }

    loadMore(): void {
        this.page.update(p => p + 1);
    }

    multLabel(v: number): string {
        if (v === 0.25) return '¼×';
        if (v === 0.5) return '½×';
        if (v === 2) return '2×';
        if (v === 4) return '4×';
        return `${v}×`;
    }
}
