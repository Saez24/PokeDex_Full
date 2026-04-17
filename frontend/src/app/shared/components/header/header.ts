import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { PokemonService } from '../../services/pokemon/pokemon';
import { MatIconModule } from '@angular/material/icon';
import { Theme } from '../../services/theme/theme';
import { MatSelectModule } from '@angular/material/select';
import { FavoritesService } from '../../services/favorites/favorites';
import { TYPE_COLORS } from '../../utils/pokemon-types.util';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  imports: [MatIconModule, MatSelectModule, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly themeService = inject(Theme);
  readonly pokemonService = inject(PokemonService);
  readonly favoritesService = inject(FavoritesService);
  readonly isDarkMode = this.themeService.isDarkMode;
  readonly ALL_TYPES = Object.keys(TYPE_COLORS);
  searchBarVisible: boolean = true;
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

  private readonly router = inject(Router);

  constructor() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.searchBarVisible = event.urlAfterRedirects === '/';
      });
  }

  setLanguage(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.pokemonService.setLanguage(value);
    this.currentLang = value;
    this;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
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

}
