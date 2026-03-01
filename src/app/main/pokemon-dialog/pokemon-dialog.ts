import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { NgStyle } from '@angular/common';
import { forkJoin, switchMap } from 'rxjs';

import {
  getPrimaryColor,
  getPrimaryGlow,
  STAT_LABELS,
  TYPE_COLORS,
} from '../../shared/utils/pokemon-types.util';
import { Pokemon } from '../../shared/models/pokemon.model';
import { Api } from '../../shared/services/api/api';
import { EvolutionStep } from '../../shared/models/evolution.model';
import { MoveRow } from '../../shared/models/move.model';

@Component({
  selector: 'app-pokemon-dialog',
  imports: [MatDialogModule, MatTabsModule, NgStyle],
  templateUrl: './pokemon-dialog.html',
  styleUrl: './pokemon-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonDialog implements OnInit {
  readonly dialogRef = inject(MatDialogRef<PokemonDialog>);
  readonly pokemon: Pokemon = inject(MAT_DIALOG_DATA);
  private readonly api = inject(Api);

  readonly STAT_LABELS = STAT_LABELS;
  readonly TYPE_COLORS = TYPE_COLORS;

  /* ── Signals ── */
  evolutionChain = signal<EvolutionStep[]>([]);
  moves = signal<MoveRow[]>([]);
  movesLoading = signal(false);
  evolutionLoading = signal(false);

  /* ── Tab state ── */
  activeTab = signal(0);

  ngOnInit(): void {
    this.loadEvolution();
  }

  onTabChange(index: number): void {
    this.activeTab.set(index);
    if (index === 2 && this.moves().length === 0) {
      this.loadMoves();
    }
  }

  /* ── Getters ── */
  get primaryColor(): string { return getPrimaryColor(this.pokemon.types); }
  get primaryGlow(): string  { return getPrimaryGlow(this.pokemon.types); }
  get spriteUrl(): string    { return this.pokemon.sprites.other['official-artwork'].front_default; }
  get paddedId(): string     { return String(this.pokemon.id).padStart(3, '0'); }

  statPercent(value: number): number { return Math.min((value / 160) * 100, 100); }
  statColor(value: number): string {
    if (value >= 100) return '#30d158';
    if (value >= 70)  return '#ffd60a';
    return this.primaryColor;
  }

  spriteById(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  }

  idFromUrl(url: string): number {
    const parts = url.replace(/\/$/, '').split('/');
    return parseInt(parts[parts.length - 1], 10);
  }

  /* ── Evolution loading ── */
  private loadEvolution(): void {
    this.evolutionLoading.set(true);

    this.api
      .getResource<any>('pokemon-species', undefined, String(this.pokemon.id))
      .pipe(
        switchMap(species => {
          const chainId = species.evolution_chain.url
            .replace(/\/$/, '').split('/').pop();
          return this.api.getResource<any>('evolution-chain', undefined, chainId);
        })
      )
      .subscribe({
        next: chain => {
          this.evolutionChain.set(this.flattenChain(chain.chain));
          this.evolutionLoading.set(false);
        },
        error: () => this.evolutionLoading.set(false),
      });
  }

  private flattenChain(link: any, steps: EvolutionStep[] = []): EvolutionStep[] {
    const id = this.idFromUrl(link.species.url);
    const detail = link.evolution_details?.[0];

    steps.push({
      id,
      name: link.species.name,
      spriteUrl: this.spriteById(id),
      trigger: detail?.trigger?.name ?? null,
      minLevel: detail?.min_level ?? null,
    });

    if (link.evolves_to?.length) {
      this.flattenChain(link.evolves_to[0], steps);
    }
    return steps;
  }

  /* ── Moves loading ── */
  private loadMoves(): void {
    this.movesLoading.set(true);

    // Get level-up moves from latest version group, sorted by level
    const levelUpMoves = this.pokemon.moves
      .map(entry => {
        const detail = entry.version_group_details
          .filter(d => d.move_learn_method.name === 'level-up')
          .sort((a, b) => b.version_group.name.localeCompare(a.version_group.name))[0];
        return detail
          ? { name: entry.move.name, url: entry.move.url, level: detail.level_learned_at }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => a!.level - b!.level)
      .slice(0, 20); // max 20 for performance

    if (!levelUpMoves.length) {
      this.movesLoading.set(false);
      return;
    }

    forkJoin(
      levelUpMoves.map(m =>
        this.api.getResource<any>('move', undefined, m!.name)
      )
    ).subscribe({
      next: details => {
        this.moves.set(
          details.map((d, i) => ({
            name: d.name,
            level: levelUpMoves[i]!.level,
            type: d.type.name,
            power: d.power,
            accuracy: d.accuracy,
            pp: d.pp,
            damageClass: d.damage_class.name,
          }))
        );
        this.movesLoading.set(false);
      },
      error: () => this.movesLoading.set(false),
    });
  }

  damageClassIcon(cls: string): string {
    const map: Record<string, string> = {
      physical: '⚔️',
      special:  '✨',
      status:   '💫',
    };
    return map[cls] ?? '–';
  }

  close(): void { this.dialogRef.close(); }
}