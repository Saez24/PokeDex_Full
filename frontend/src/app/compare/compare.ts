import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgStyle } from '@angular/common';
import { Api } from '../shared/services/api/api';
import { Pokemon } from '../shared/models/pokemon.model';
import { SeoService } from '../shared/services/seo/seo';
import { TYPE_COLORS } from '../shared/utils/pokemon-types.util';

export const STAT_LABELS: Record<string, string> = {
    hp: 'HP',
    attack: 'Atk',
    defense: 'Def',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    speed: 'Speed',
};

const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const MAX_STAT = 255;

export interface CompareSlot {
    pokemon: Pokemon | null;
    loading: boolean;
}

function emptySlots(): CompareSlot[] {
    return Array.from({ length: 4 }, () => ({ pokemon: null, loading: false }));
}

@Component({
    selector: 'app-compare',
    imports: [RouterLink, NgStyle],
    templateUrl: './compare.html',
    styleUrl: './compare.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Compare {
    private readonly api = inject(Api);
    private readonly seoService = inject(SeoService);

    constructor() {
        this.seoService.setPage({
            title: 'Pokémon Vergleich',
            description: 'Vergleiche bis zu 4 Pokémon direkt nebeneinander – Stats, Typen und mehr.',
        });
    }

    readonly TYPE_COLORS = TYPE_COLORS;
    readonly STAT_LABELS = STAT_LABELS;
    readonly STAT_ORDER = STAT_ORDER;
    readonly MAX_STAT = MAX_STAT;

    slots = signal<CompareSlot[]>(emptySlots());
    searchInputs = signal<string[]>(Array(4).fill(''));
    searchErrors = signal<(string | null)[]>(Array(4).fill(null));

    /** Only filled slots */
    readonly activePokemon = computed(() =>
        this.slots().map(s => s.pokemon).filter((p): p is Pokemon => p !== null),
    );

    /** For each stat, the max value across all filled pokemon (for bar scaling) */
    readonly statMaxima = computed(() => {
        const team = this.activePokemon();
        const maxima: Record<string, number> = {};
        for (const statName of STAT_ORDER) {
            maxima[statName] = Math.max(...team.map(p => this.getStat(p, statName)), 1);
        }
        return maxima;
    });

    /** Total base stats for each filled slot (same order as slots()) */
    readonly totals = computed(() =>
        this.slots().map(s =>
            s.pokemon ? s.pokemon.stats.reduce((sum, st) => sum + st.base_stat, 0) : null,
        ),
    );

    getStat(p: Pokemon, statName: string): number {
        return p.stats.find(s => s.stat.name === statName)?.base_stat ?? 0;
    }

    spriteUrl(p: Pokemon): string {
        return (p.sprites.other as any)?.['official-artwork']?.front_default ?? '';
    }

    primaryTypeColor(p: Pokemon): string {
        return TYPE_COLORS[p.types[0]?.type?.name] ?? '#aaa';
    }

    statBarColor(p: Pokemon, statName: string): string {
        const val = this.getStat(p, statName);
        if (val >= 120) return '#30d158';
        if (val >= 80) return '#0a84ff';
        if (val >= 50) return '#ff9f0a';
        return '#ff453a';
    }

    addPokemon(slotIdx: number, nameOrId: string): void {
        const val = nameOrId.trim().toLowerCase();
        if (!val) return;

        this.slots.update(s => {
            const next = [...s];
            next[slotIdx] = { pokemon: null, loading: true };
            return next;
        });
        this.searchErrors.update(e => { const n = [...e]; n[slotIdx] = null; return n; });

        this.api.getResource<Pokemon>('pokemon', undefined, val).subscribe({
            next: (p) => {
                this.slots.update(s => {
                    const next = [...s];
                    next[slotIdx] = { pokemon: p, loading: false };
                    return next;
                });
                this.searchInputs.update(i => { const n = [...i]; n[slotIdx] = ''; return n; });
            },
            error: () => {
                this.slots.update(s => {
                    const next = [...s];
                    next[slotIdx] = { pokemon: null, loading: false };
                    return next;
                });
                this.searchErrors.update(e => {
                    const n = [...e]; n[slotIdx] = `"${val}" not found`; return n;
                });
            },
        });
    }

    removePokemon(slotIdx: number): void {
        this.slots.update(s => {
            const next = [...s];
            next[slotIdx] = { pokemon: null, loading: false };
            return next;
        });
        this.searchErrors.update(e => { const n = [...e]; n[slotIdx] = null; return n; });
    }

    clearAll(): void {
        this.slots.set(emptySlots());
        this.searchInputs.set(Array(4).fill(''));
        this.searchErrors.set(Array(4).fill(null));
    }

    updateInput(slotIdx: number, value: string): void {
        this.searchInputs.update(i => { const n = [...i]; n[slotIdx] = value; return n; });
    }

    onInputKeydown(event: KeyboardEvent, slotIdx: number): void {
        if (event.key === 'Enter') {
            this.addPokemon(slotIdx, this.searchInputs()[slotIdx]);
        }
    }

    totalStats(p: Pokemon): number {
        return p.stats.reduce((sum, st) => sum + st.base_stat, 0);
    }

    maxTotalStats(): number {
        const team = this.activePokemon();
        return team.reduce((m, p) => Math.max(m, this.totalStats(p)), 0);
    }
}
