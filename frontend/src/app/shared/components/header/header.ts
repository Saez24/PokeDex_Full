import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PokemonService } from '../../services/pokemon/pokemon';
import { MatIconModule } from '@angular/material/icon';
import { Theme } from '../../services/theme/theme';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-header',
  imports: [MatIconModule, MatSelectModule, RouterLink, RouterLinkActive],
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
