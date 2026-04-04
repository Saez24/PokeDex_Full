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
  {
    path: 'type-chart',
    loadComponent: () =>
      import('./type-chart/type-chart').then((m) => m.TypeChart),
  },
  {
    path: 'team',
    loadComponent: () =>
      import('./team-builder/team-builder').then((m) => m.TeamBuilder),
  },
  {
    path: 'compare',
    loadComponent: () =>
      import('./compare/compare').then((m) => m.Compare),
  },
  {
    path: 'moves',
    loadComponent: () =>
      import('./moves/moves').then((m) => m.Moves),
  },
  {
    path: 'type/:name',
    loadComponent: () =>
      import('./type-detail/type-detail').then((m) => m.TypeDetail),
  },
];
