import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  OnInit,
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
import { PokemonService } from '../../shared/services/pokemon/pokemon';
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
  readonly TYPE_COLORS = TYPE_COLORS;
  readonly STAT_LABELS = STAT_LABELS;

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
    console.log(pokemon);
  }

  loadMore() {
    this.pokemonService.loadMore();

    setTimeout(() => {
      this.observeNewCards();
    }, 50);
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
