import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Theme {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly _isDarkMode = signal<boolean>(false);
  
  // Public readonly computed signal
  public readonly isDarkMode = computed(() => this._isDarkMode());
  
  constructor() {
    // Effect für automatisches Theme-Management
    effect(() => {
      this.applyTheme();
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('theme', this.isDarkMode() ? 'dark' : 'light');
      }
    });
    
    this.loadInitialTheme();
    this.preventTransitionFlicker();
  }

  private loadInitialTheme(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return; // SSR-sicher
    }

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      this._isDarkMode.set(savedTheme === 'dark');
    } else {
      this._isDarkMode.set(prefersDark);
    }
  }

  public toggleTheme(): void {
    this._isDarkMode.update(prev => !prev);
  }

  private applyTheme(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const htmlElement = document.documentElement;
    
    // Setze color-scheme für native Browser-Unterstützung
    htmlElement.style.colorScheme = this.isDarkMode() ? 'dark' : 'light';
    
    // Optional: Zusätzliche Klassen für eigene Styles
    if (this.isDarkMode()) {
      htmlElement.classList.add('dark-theme');
      htmlElement.classList.remove('light-theme');
    } else {
      htmlElement.classList.add('light-theme');
      htmlElement.classList.remove('dark-theme');
    }
  }

  private preventTransitionFlicker(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    // Verhindere Transition-Flicker beim ersten Laden
    document.documentElement.classList.add('no-transition');
    setTimeout(() => {
      document.documentElement.classList.remove('no-transition');
    }, 100);
  }
}
