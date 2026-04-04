import { Routes } from '@angular/router';
import { Main } from './main/main';

export const routes: Routes = [
  {
    path: '',
    component: Main,
  },
  {
    path: 'pokemon/:id',
    loadComponent: () =>
      import('./pokemon-detail/pokemon-detail').then((m) => m.PokemonDetail),
  },
];
