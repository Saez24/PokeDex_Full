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
  languages = [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
    { code: 'es', label: 'Español' },
    { code: 'it', label: 'Italiano' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
    { code: 'pt', label: 'Português' },
    { code: 'ru', label: 'Русский' },
    { code: 'tr', label: 'Türkçe' },
    // ...alle Sprachen aus Pokémon-API hinzufügen
  ];

  currentLang = 'en';

  setLanguage(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.pokemonService.setLanguage(value);
    this.currentLang = value;
    this;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
