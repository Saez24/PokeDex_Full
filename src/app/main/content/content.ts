import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgStyle } from '@angular/common'
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
export class Content implements OnInit {
  private dialog = inject(MatDialog);
  readonly pokemonService = inject(PokemonService);

  readonly TYPE_COLORS = TYPE_COLORS;
  readonly STAT_LABELS = STAT_LABELS;

  ngOnInit(): void {
    this.pokemonService.loadNext();
  }

  openDialog(pokemon: Pokemon): void {
    this.dialog.open(PokemonDialog, {
      data: pokemon,
      panelClass: 'poke-dialog-panel',
      maxWidth: '480px',
      width: '100%',
      backdropClass: 'poke-dialog-backdrop',
    });
  }

  loadMore(): void {
    this.pokemonService.loadNext();
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