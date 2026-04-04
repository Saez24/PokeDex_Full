import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgStyle } from '@angular/common';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import {
  getPrimaryColor,
  getPrimaryGlow,
  STAT_LABELS,
  TYPE_COLORS,
} from '../../shared/utils/pokemon-types.util';
import { PokemonDialog } from '../pokemon-dialog/pokemon-dialog';
import { PokemonService, GENERATIONS } from '../../shared/services/pokemon/pokemon';
import { FavoritesService } from '../../shared/services/favorites/favorites';
import { SeoService } from '../../shared/services/seo/seo';
import { Pokemon } from '../../shared/models/pokemon.model';

@Component({
  selector: 'app-content',
  imports: [MatButtonModule, MatProgressSpinnerModule, NgStyle, ScrollingModule],
  templateUrl: './content.html',
  styleUrl: './content.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Content implements OnInit, AfterViewInit, OnDestroy {
  private dialog = inject(MatDialog);
  private observer!: IntersectionObserver;
  private resizeObserver!: ResizeObserver;
  readonly pokemonService = inject(PokemonService);
  readonly favoritesService = inject(FavoritesService);
  private readonly seoService = inject(SeoService);
  readonly TYPE_COLORS = TYPE_COLORS;
  readonly STAT_LABELS = STAT_LABELS;
  readonly GENERATIONS = GENERATIONS;
  readonly ALL_TYPES = Object.keys(TYPE_COLORS);
  readonly ITEM_SIZE = 270; // card height (260px) + gap (10px)

  @ViewChild(CdkVirtualScrollViewport) viewport?: CdkVirtualScrollViewport;

  /** Number of grid columns — updated on resize */
  private readonly cols = signal(this.calcCols());

  /** Filtered pokemon grouped into rows */
  readonly pokemonRows = computed(() => {
    const n = this.cols();
    const items = this.pokemonService.filteredPokemon();
    const rows: Pokemon[][] = [];
    for (let i = 0; i < items.length; i += n) {
      rows.push(items.slice(i, i + n));
    }
    return rows;
  });

  constructor(private el: ElementRef) {
    this.initObserver();

    effect(() => {
      this.pokemonService.pokemon();

      queueMicrotask(() => {
        this.observeNewCards();
      });
    });
  }

  ngOnInit(): void {
    this.seoService.setPage({
      title: 'PokéDex – Alle Pokémon',
      description: 'Entdecke alle Pokémon – Stats, Typen, Moves und mehr.',
    });
    this.pokemonService.loadMore();
    this.resizeObserver = new ResizeObserver(() => {
      this.cols.set(this.calcCols());
    });
    this.resizeObserver.observe(document.body);
  }

  ngAfterViewInit() {
    this.initObserver();
    this.observeNewCards();
  }

  private initObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            el.classList.add('is-visible');
            this.observer.unobserve(el);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -60px 0px',
      },
    );
  }

  private observeNewCards() {
    const elements = this.el.nativeElement.querySelectorAll('.reveal:not(.is-visible)');

    elements.forEach((el: HTMLElement, index: number) => {
      el.style.setProperty('--reveal-delay', `${index * 20}ms`);
      this.observer.observe(el);
    });
  }

  openDialog(pokemon: Pokemon): void {
    this.dialog.open(PokemonDialog, {
      data: pokemon,
      panelClass: 'poke-dialog-panel',
      maxHeight: '90vh',
      maxWidth: '600px',
      width: '100%',
      backdropClass: 'poke-dialog-backdrop',
    });
  }

  loadMore() {
    this.pokemonService.loadMore();

    setTimeout(() => {
      this.observeNewCards();
    }, 50);
  }

  /** Called by cdkVirtualFor scrolledIndexChange — auto-loads when near bottom */
  onScrollIndex(firstVisible: number): void {
    const rows = this.pokemonRows();
    if (
      firstVisible + 15 >= rows.length &&
      this.pokemonService.hasMore() &&
      !this.pokemonService.loading()
    ) {
      this.pokemonService.loadMore();
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
  }

  private calcCols(): number {
    const w = window.innerWidth;
    if (w < 600) return 2;
    if (w < 900) return 3;
    return 4;
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.pokemonService.setSearch(value);
  }

  onTypeFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.pokemonService.selectedType.set(value);
  }

  onGenFilter(index: number): void {
    this.pokemonService.setGeneration(index);
  }

  toggleFavorites(): void {
    this.pokemonService.showFavorites.update((v) => !v);
  }

  primaryColor(p: Pokemon): string {
    return getPrimaryColor(p.types);
  }

  primaryGlow(p: Pokemon): string {
    return getPrimaryGlow(p.types);
  }

  spriteUrl(p: Pokemon): string {
    return p.sprites.other['official-artwork'].front_default;
  }

  paddedId(id: number): string {
    return String(id).padStart(3, '0');
  }

  statPercent(value: number): number {
    return Math.min((value / 150) * 100, 100);
  }

  trackById(_: number, p: Pokemon): number {
    return p.id;
  }

  trackRow(_: number, row: Pokemon[]): number {
    return row[0]?.id ?? _;
  }
}
