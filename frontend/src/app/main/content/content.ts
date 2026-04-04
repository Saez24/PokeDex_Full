import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgStyle } from '@angular/common';
import {
  getPrimaryColor,
  getPrimaryGlow,
  STAT_LABELS,
  TYPE_COLORS,
} from '../../shared/utils/pokemon-types.util';
import { PokemonDialog } from '../pokemon-dialog/pokemon-dialog';
import { PokemonService, GENERATIONS } from '../../shared/services/pokemon/pokemon';
import { FavoritesService } from '../../shared/services/favorites/favorites';
import { Pokemon } from '../../shared/models/pokemon.model';

@Component({
  selector: 'app-content',
  imports: [MatButtonModule, MatProgressSpinnerModule, NgStyle],
  templateUrl: './content.html',
  styleUrl: './content.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Content implements OnInit, AfterViewInit {
  private dialog = inject(MatDialog);
  private observer!: IntersectionObserver;
  readonly pokemonService = inject(PokemonService);
  readonly favoritesService = inject(FavoritesService);
  readonly TYPE_COLORS = TYPE_COLORS;
  readonly STAT_LABELS = STAT_LABELS;
  readonly GENERATIONS = GENERATIONS;
  readonly ALL_TYPES = Object.keys(TYPE_COLORS);

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
    this.pokemonService.loadMore();
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

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.pokemonService.searchQuery.set(value);
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
}
