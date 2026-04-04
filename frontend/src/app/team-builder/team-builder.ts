import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from '../shared/services/api/api';
import { PokemonService } from '../shared/services/pokemon/pokemon';
import { SeoService } from '../shared/services/seo/seo';
import { Pokemon } from '../shared/models/pokemon.model';
import { TYPE_COLORS } from '../shared/utils/pokemon-types.util';
import { CHART, TYPES } from '../type-chart/type-chart';

export interface TeamSlot {
    pokemon: Pokemon | null;
    loading: boolean;
}

function emptySlots(): TeamSlot[] {
    return Array.from({ length: 6 }, () => ({ pokemon: null, loading: false }));
}

@Component({
    selector: 'app-team-builder',
    imports: [RouterLink, NgStyle, FormsModule],
    templateUrl: './team-builder.html',
    styleUrl: './team-builder.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamBuilder {
    private readonly api = inject(Api);
    readonly pokemonService = inject(PokemonService);
    private readonly seoService = inject(SeoService);

    constructor() {
        this.seoService.setPage({
            title: 'Team Builder',
            description: 'Erstelle und analysiere dein Pokémon-Team – Coverage, Synergien und mehr.',
        });
    }

    readonly TYPE_COLORS = TYPE_COLORS;

    slots = signal<TeamSlot[]>(emptySlots());
    searchInputs = signal<string[]>(Array(6).fill(''));
    searchErrors = signal<(string | null)[]>(Array(6).fill(null));

    /** Active Pokémon in the team (non-null slots) */
    readonly teamPokemon = computed(() =>
        this.slots().map(s => s.pokemon).filter((p): p is Pokemon => p !== null),
    );

    /** Coverage: for each of 18 types, what multiplier does this team deal? */
    readonly offensiveCoverage = computed(() => {
        const team = this.teamPokemon();
        if (!team.length) return null;

        return TYPES.map((defType, di) => {
            const best = team.reduce((max, p) => {
                const atkMults = p.types.map(t => {
                    const ai = TYPES.indexOf(t.type.name as any);
                    return ai >= 0 ? CHART[ai][di] : 1;
                });
                return Math.max(max, ...atkMults);
            }, 0);
            return { type: defType, value: best };
        });
    });

    /** Defensive: for each of 18 attacking types, what is the team's average damage taken? */
    readonly defensiveCoverage = computed(() => {
        const team = this.teamPokemon();
        if (!team.length) return null;

        return TYPES.map((atkType, ai) => {
            const avg = team.reduce((sum, p) => {
                const defMults = p.types.map(t => {
                    const di = TYPES.indexOf(t.type.name as any);
                    return di >= 0 ? CHART[ai][di] : 1;
                });
                // Combined multiplier for dual-type
                const combined = defMults.reduce((a, b) => a * b, 1);
                return sum + combined;
            }, 0) / team.length;
            return { type: atkType, value: avg };
        });
    });

    /** Weaknesses shared by the whole team */
    readonly teamWeaknesses = computed(() => {
        const def = this.defensiveCoverage();
        if (!def) return [];
        return def.filter(d => d.value > 1).sort((a, b) => b.value - a.value);
    });

    /** Type coverage gaps (types the team can't hit for 2×) */
    readonly coverageGaps = computed(() => {
        const off = this.offensiveCoverage();
        if (!off) return [];
        return off.filter(d => d.value < 2);
    });

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

    clearTeam(): void {
        this.slots.set(emptySlots());
        this.searchInputs.set(Array(6).fill(''));
        this.searchErrors.set(Array(6).fill(null));
    }

    updateInput(slotIdx: number, value: string): void {
        this.searchInputs.update(i => { const n = [...i]; n[slotIdx] = value; return n; });
    }

    onInputKeydown(event: KeyboardEvent, slotIdx: number): void {
        if (event.key === 'Enter') {
            this.addPokemon(slotIdx, this.searchInputs()[slotIdx]);
        }
    }

    spriteUrl(p: Pokemon): string {
        return (p.sprites.other as any)?.['official-artwork']?.front_default ?? '';
    }

    primaryTypeColor(p: Pokemon): string {
        return TYPE_COLORS[p.types[0]?.type?.name] ?? '#aaa';
    }

    /** Export team as URL query string */
    readonly teamUrl = computed(() => {
        const names = this.slots()
            .map(s => s.pokemon?.name ?? '')
            .filter(Boolean)
            .join(',');
        if (!names) return '';
        return `${window.location.origin}/team?pokemon=${names}`;
    });

    copyUrl(): void {
        navigator.clipboard.writeText(this.teamUrl()).catch(() => null);
    }

    multiplierLabel(v: number): string {
        if (v === 0) return '✕';
        if (v === 0.5) return '½×';
        if (v === 2) return '2×';
        if (v === 4) return '4×';
        if (v > 1) return `${v}×`;
        return '1×';
    }

    multiplierColor(v: number): string {
        if (v === 0) return 'rgba(100,100,110,0.3)';
        if (v < 1) return 'rgba(48,209,88,0.15)';
        if (v > 1 && v <= 2) return 'rgba(255,159,10,0.15)';
        if (v > 2) return 'rgba(255,69,58,0.15)';
        return 'transparent';
    }

    multiplierTextColor(v: number): string {
        if (v === 0) return 'var(--app-text-secondary, rgba(245,245,247,0.4))';
        if (v < 1) return '#30d158';
        if (v > 1 && v <= 2) return '#ff9f0a';
        if (v > 2) return '#ff453a';
        return 'var(--app-text-secondary)';
    }
}
