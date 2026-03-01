import { Component, inject } from '@angular/core';
import { PokemonService } from '../../services/pokemon/pokemon';
import { MatIconModule } from '@angular/material/icon';
import { App } from '../../../app';
import { Theme } from '../../services/theme/theme';

@Component({
  selector: 'app-header',
  imports: [MatIconModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly themeService = inject(Theme);
  readonly pokemonService = inject(PokemonService);
  readonly isDarkMode = this.themeService.isDarkMode;

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
