import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NgStyle } from '@angular/common';
import {
  getPrimaryColor,
  getPrimaryGlow,
  STAT_LABELS,
  TYPE_COLORS,
} from '../../shared/utils/pokemon-types.util';
import { Pokemon } from '../../shared/models/pokemon.model';

@Component({
  selector: 'app-pokemon-dialog',
  imports: [MatDialogModule, NgStyle],
  templateUrl: './pokemon-dialog.html',
  styleUrl: './pokemon-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonDialog {
  readonly dialogRef = inject(MatDialogRef<PokemonDialog>);
  readonly pokemon: Pokemon = inject(MAT_DIALOG_DATA);

  readonly STAT_LABELS = STAT_LABELS;
  readonly TYPE_COLORS = TYPE_COLORS;

  get primaryColor(): string {
    return getPrimaryColor(this.pokemon.types);
  }

  get primaryGlow(): string {
    return getPrimaryGlow(this.pokemon.types);
  }

  get spriteUrl(): string {
    return this.pokemon.sprites.other['official-artwork'].front_default;
  }

  get paddedId(): string {
    return String(this.pokemon.id).padStart(3, '0');
  }

  statPercent(value: number): number {
    return Math.min((value / 160) * 100, 100);
  }

  statColor(value: number): string {
    if (value >= 100) return '#30d158';
    if (value >= 70) return '#ffd60a';
    return this.primaryColor;
  }

  close(): void {
    this.dialogRef.close();
  }
}