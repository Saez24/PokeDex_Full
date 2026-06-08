import {
    Component,
    computed,
    inject,
    signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgStyle, TitleCasePipe } from '@angular/common';
import { Api } from '../shared/services/api/api';
import { ApiListResponse, ApiResource } from '../shared/models/api-list-response.model';
import { SeoService } from '../shared/services/seo/seo';
import { MoveDetail } from '../shared/models/move.model';
import { TYPE_COLORS } from '../shared/utils/pokemon-types.util';

const PAGE_SIZE = 100;

export const DAMAGE_CLASS_COLORS: Record<string, string> = {
    physical: '#ff9f0a',
    special: '#0a84ff',
    status: '#30d158',
};

@Component({
    selector: 'app-moves',
    imports: [RouterLink, NgStyle, TitleCasePipe],
    templateUrl: './moves.html',
    styleUrl: './moves.scss',
})
export class Moves {
    private readonly api = inject(Api);
    private readonly seoService = inject(SeoService);
    readonly TYPE_COLORS = TYPE_COLORS;
    readonly DAMAGE_CLASS_COLORS = DAMAGE_CLASS_COLORS;

    // ── Pagination & raw data
    readonly allMoves = signal<ApiResource[]>([]);
    readonly totalCount = signal(0);
    readonly currentOffset = signal(0);
    readonly pageLoading = signal(false);

    // ── Row details cache (lazy loaded per row)
    readonly moveDetails = signal<Record<string, MoveDetail>>({});
    readonly loadingDetails = signal<Set<string>>(new Set());

    // ── Filters
    readonly searchQuery = signal('');
    readonly filterType = signal<string>('');
    readonly filterClass = signal<string>('');

    // ── Selected move for detail panel
    readonly selectedMove = signal<MoveDetail | null>(null);

    readonly TYPES = [
        'normal', 'fire', 'water', 'electric', 'grass', 'ice',
        'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
        'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
    ];

    readonly DAMAGE_CLASSES = ['physical', 'special', 'status'];

    // ── Derived
    readonly filteredMoves = computed(() => {
        const q = this.searchQuery().toLowerCase().trim();
        const t = this.filterType();
        const c = this.filterClass();
        const details = this.moveDetails();

        return this.allMoves().filter(m => {
            if (q && !m.name.includes(q)) return false;
            const detail = details[m.name];
            if (t && detail?.type?.name !== t) return false;
            if (c && detail?.damage_class?.name !== c) return false;
            return true;
        });
    });

    readonly hasMore = computed(() =>
        this.currentOffset() + PAGE_SIZE < this.totalCount(),
    );

    constructor() {
        this.seoService.setPage({
            title: 'Move-Lexikon',
            description: 'Alle Pokémon-Attacken mit Power, Genauigkeit, Typ und Effekt.',
        });
        this.loadPage(0);
    }

    loadPage(offset: number): void {
        this.pageLoading.set(true);
        this.api.getResource<ApiListResponse<ApiResource>>(
            'move',
            `limit=${PAGE_SIZE}&offset=${offset}`,
        ).subscribe({
            next: (res) => {
                this.totalCount.set(res.count);
                this.currentOffset.set(offset);
                this.allMoves.update(prev => offset === 0 ? res.results : [...prev, ...res.results]);
                this.pageLoading.set(false);
                // eagerly load details for first batch
                res.results.slice(0, 50).forEach(m => this.ensureDetail(m.name));
            },
            error: () => this.pageLoading.set(false),
        });
    }

    loadMore(): void {
        if (!this.hasMore() || this.pageLoading()) return;
        this.loadPage(this.currentOffset() + PAGE_SIZE);
    }

    ensureDetail(name: string): void {
        if (this.moveDetails()[name] || this.loadingDetails().has(name)) return;
        this.loadingDetails.update(s => { const n = new Set(s); n.add(name); return n; });
        this.api.getResource<MoveDetail>('move', undefined, name).subscribe({
            next: (d) => {
                this.moveDetails.update(m => ({ ...m, [name]: d }));
                this.loadingDetails.update(s => { const n = new Set(s); n.delete(name); return n; });
            },
            error: () => {
                this.loadingDetails.update(s => { const n = new Set(s); n.delete(name); return n; });
            },
        });
    }

    selectMove(name: string): void {
        this.ensureDetail(name);
        // wait for it
        const check = () => {
            const d = this.moveDetails()[name];
            if (d) { this.selectedMove.set(d); return; }
            setTimeout(check, 100);
        };
        check();
    }

    closeDetail(): void {
        this.selectedMove.set(null);
    }

    moveType(name: string): string {
        return this.moveDetails()[name]?.type?.name ?? '';
    }

    movePower(name: string): number | null {
        return this.moveDetails()[name]?.power ?? null;
    }

    moveAccuracy(name: string): number | null {
        return this.moveDetails()[name]?.accuracy ?? null;
    }

    movePP(name: string): number | null {
        return this.moveDetails()[name]?.pp ?? null;
    }

    moveDamageClass(name: string): string {
        return this.moveDetails()[name]?.damage_class?.name ?? '';
    }

    moveEffect(d: MoveDetail): string {
        return d.effect_entries?.find(e => e.language.name === 'en')?.short_effect ?? '—';
    }

    setSearch(value: string): void {
        this.searchQuery.set(value);
    }
}
