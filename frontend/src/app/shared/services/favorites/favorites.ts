import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const STORAGE_KEY = 'pokedex_favorites';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
    private platformId = inject(PLATFORM_ID);
    private _favorites = signal<Set<number>>(this.loadFromStorage());

    readonly favorites = computed(() => this._favorites());
    readonly count = computed(() => this._favorites().size);

    isFavorite(id: number): boolean {
        return this._favorites().has(id);
    }

    toggle(id: number): void {
        this._favorites.update((set) => {
            const next = new Set(set);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            this.saveToStorage(next);
            return next;
        });
    }

    private loadFromStorage(): Set<number> {
        if (!isPlatformBrowser(this.platformId)) return new Set();
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? new Set<number>(JSON.parse(raw)) : new Set();
        } catch {
            return new Set();
        }
    }

    private saveToStorage(set: Set<number>): void {
        if (!isPlatformBrowser(this.platformId)) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
        } catch {
            // ignore quota errors
        }
    }
}
