import { Component, inject } from '@angular/core';
import { PokemonService } from '../../services/pokemon/pokemon';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  readonly pokemonService = inject(PokemonService);
}
