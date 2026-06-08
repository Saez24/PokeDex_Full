import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgStyle, TitleCasePipe } from '@angular/common';
import { TYPE_COLORS } from '../shared/utils/pokemon-types.util';
import { SeoService } from '../shared/services/seo/seo';

export const TYPES = [
    'normal', 'fire', 'water', 'electric', 'grass', 'ice',
    'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
    'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
] as const;

export type PokemonType = (typeof TYPES)[number];

/**
 * Full Gen 6+ type effectiveness chart.
 * CHART[attackerIndex][defenderIndex] = multiplier
 */
export const CHART: readonly (readonly number[])[] = [
    // normal
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0, 1, 1, 0.5, 1],
    // fire
    [1, 0.5, 0.5, 1, 2, 2, 1, 1, 1, 1, 1, 2, 0.5, 1, 0.5, 1, 2, 1],
    // water
    [1, 2, 0.5, 1, 0.5, 1, 1, 1, 2, 1, 1, 1, 2, 1, 0.5, 1, 1, 1],
    // electric
    [1, 1, 2, 0.5, 0.5, 1, 1, 1, 0, 2, 1, 1, 1, 1, 0.5, 1, 1, 1],
    // grass
    [1, 0.5, 2, 1, 0.5, 1, 1, 0.5, 2, 0.5, 1, 0.5, 2, 1, 0.5, 1, 0.5, 1],
    // ice
    [1, 0.5, 0.5, 1, 2, 0.5, 1, 1, 2, 2, 1, 1, 1, 1, 2, 1, 0.5, 1],
    // fighting
    [2, 1, 1, 1, 1, 2, 1, 0.5, 1, 0.5, 0.5, 0.5, 2, 0, 1, 2, 2, 0.5],
    // poison
    [1, 1, 1, 1, 2, 1, 1, 0.5, 0.5, 1, 1, 1, 0.5, 0.5, 1, 1, 0, 2],
    // ground
    [1, 2, 1, 2, 0.5, 1, 1, 2, 1, 0, 1, 0.5, 2, 1, 1, 1, 2, 1],
    // flying
    [1, 1, 1, 0.5, 2, 1, 2, 1, 1, 1, 1, 2, 0.5, 1, 1, 1, 0.5, 1],
    // psychic
    [1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 0.5, 1, 1, 1, 1, 0, 0.5, 1],
    // bug
    [1, 0.5, 1, 1, 2, 1, 0.5, 0.5, 1, 0.5, 2, 1, 1, 0.5, 1, 2, 0.5, 0.5],
    // rock
    [1, 2, 1, 1, 1, 2, 0.5, 1, 0.5, 2, 1, 2, 1, 1, 1, 1, 0.5, 1],
    // ghost
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 0.5, 1, 1],
    // dragon
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 0.5, 0],
    // dark
    [1, 1, 1, 1, 1, 1, 0.5, 1, 1, 1, 2, 1, 1, 2, 1, 0.5, 1, 0.5],
    // steel
    [1, 0.5, 0.5, 0.5, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 0.5, 2],
    // fairy
    [1, 0.5, 1, 1, 1, 1, 2, 0.5, 1, 1, 1, 1, 1, 1, 2, 2, 0.5, 1],
] as const;

@Component({
    selector: 'app-type-chart',
    imports: [RouterLink, NgStyle, TitleCasePipe],
    templateUrl: './type-chart.html',
    styleUrl: './type-chart.scss',
})
export class TypeChart {
    private readonly seoService = inject(SeoService);
    readonly TYPES = TYPES;

    constructor() {
        this.seoService.setPage({
            title: 'Typ-Tabelle',
            description: 'Vollständige Pokémon-Typ-Effektivitätstabelle (Gen 6+) – alle Stärken und Schwächen.',
        });
    }

    readonly TYPE_COLORS = TYPE_COLORS;
    readonly CHART = CHART;

    /** Filter: highlight only rows/cols where the selected type has non-1× matchups */
    selectedAttacker = signal<PokemonType | null>(null);
    selectedDefender = signal<PokemonType | null>(null);

    setAttacker(t: PokemonType) {
        this.selectedAttacker.update(v => (v === t ? null : t));
        this.selectedDefender.set(null);
    }

    setDefender(t: PokemonType) {
        this.selectedDefender.update(v => (v === t ? null : t));
        this.selectedAttacker.set(null);
    }

    /** Effectiveness of attacker[row] vs defender[col] */
    eff(row: number, col: number): number {
        return CHART[row][col];
    }

    cellColor(value: number): string {
        if (value === 0) return 'var(--cell-immune)';
        if (value === 0.5) return 'var(--cell-resist)';
        if (value === 2) return 'var(--cell-super)';
        return 'transparent';
    }

    cellText(value: number): string {
        if (value === 0) return '✕';
        if (value === 0.5) return '½';
        if (value === 2) return '2×';
        return '';
    }

    cellTextColor(value: number): string {
        if (value === 0) return 'var(--cell-immune-text)';
        if (value === 0.5) return 'var(--cell-resist-text)';
        if (value === 2) return 'var(--cell-super-text)';
        return 'transparent';
    }

    isRowHighlighted(rowIdx: number): boolean {
        const a = this.selectedAttacker();
        if (!a) return false;
        return TYPES[rowIdx] === a;
    }

    isColHighlighted(colIdx: number): boolean {
        const d = this.selectedDefender();
        if (!d) return false;
        return TYPES[colIdx] === d;
    }

    /** Weaknesses of a defender type (attacker types that deal 2×) */
    readonly defenderWeaknesses = computed(() => {
        const d = this.selectedDefender();
        if (!d) return [];
        const di = TYPES.indexOf(d);
        return TYPES.filter((_, ai) => CHART[ai][di] === 2);
    });

    /** Resistances of a defender type */
    readonly defenderResistances = computed(() => {
        const d = this.selectedDefender();
        if (!d) return [];
        const di = TYPES.indexOf(d);
        return TYPES.filter((_, ai) => CHART[ai][di] === 0.5);
    });

    /** Immunities of a defender type */
    readonly defenderImmunities = computed(() => {
        const d = this.selectedDefender();
        if (!d) return [];
        const di = TYPES.indexOf(d);
        return TYPES.filter((_, ai) => CHART[ai][di] === 0);
    });

    /** Super-effective targets of an attacker type */
    readonly attackerSuperEffective = computed(() => {
        const a = this.selectedAttacker();
        if (!a) return [];
        const ai = TYPES.indexOf(a);
        return TYPES.filter((_, di) => CHART[ai][di] === 2);
    });

    /** Not-very-effective targets of an attacker type */
    readonly attackerResisted = computed(() => {
        const a = this.selectedAttacker();
        if (!a) return [];
        const ai = TYPES.indexOf(a);
        return TYPES.filter((_, di) => CHART[ai][di] === 0.5);
    });

    /** Immune targets of an attacker type */
    readonly attackerImmune = computed(() => {
        const a = this.selectedAttacker();
        if (!a) return [];
        const ai = TYPES.indexOf(a);
        return TYPES.filter((_, di) => CHART[ai][di] === 0);
    });
}
