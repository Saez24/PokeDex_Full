import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PokemonDialog } from './pokemon-dialog';

const MOCK_POKEMON: any = {
  id: 1, name: 'bulbasaur',
  types: [{ slot: 1, type: { name: 'grass', url: '' } }],
  stats: [
    { base_stat: 45, stat: { name: 'hp', url: '' } },
    { base_stat: 49, stat: { name: 'attack', url: '' } },
    { base_stat: 49, stat: { name: 'defense', url: '' } },
  ],
  abilities: [{ ability: { name: 'overgrow', url: '' }, is_hidden: false, slot: 1 }],
  sprites: {
    front_default: '',
    other: { 'official-artwork': { front_default: '', front_shiny: '' } },
  },
  moves: [],
  species: { name: 'bulbasaur', url: '' },
  height: 7, weight: 69, base_experience: 64,
};

describe('PokemonDialog', () => {
  let component: PokemonDialog;
  let fixture: ComponentFixture<PokemonDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PokemonDialog],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: MAT_DIALOG_DATA, useValue: MOCK_POKEMON },
        { provide: MatDialogRef, useValue: { close: () => { } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PokemonDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should receive pokemon data', () => {
    expect(component.pokemon.id).toBe(1);
    expect(component.pokemon.name).toBe('bulbasaur');
  });
});
