import { Component, computed, effect, inject, OnInit } from '@angular/core';
import { Api } from '../../shared/api/api';
import { ApiListResponse } from '../../shared/models/api-list-response.model';
import { NamedResource } from '../../shared/models/named-resource.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, switchMap } from 'rxjs';

@Component({
  selector: 'app-content',
  imports: [],
  templateUrl: './content.html',
  styleUrl: './content.scss',
})
export class Content {
  private api = inject(Api);

  private pokemonDetails$ = this.api
  .getResource<ApiListResponse<NamedResource>>('pokemon', 'limit=20')
  .pipe(
    switchMap(response =>
      forkJoin(
        response.results.map(p =>
          this.api.getResource<any>('pokemon', undefined, p.name) // slug statt query
        )
      )
    )
  );

  pokemon = toSignal(this.pokemonDetails$, { initialValue: [] });

  constructor() {
    effect(() => {
      console.log('Pokémon Details:', this.pokemon());
    });
  }
}
