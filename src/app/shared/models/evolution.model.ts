export interface EvolutionDetail {
  min_level: number | null;
  trigger: { name: string; url: string };
  item: { name: string; url: string } | null;
}

export interface ChainLink {
  species: { name: string; url: string };
  evolution_details: EvolutionDetail[];
  evolves_to: ChainLink[];
}

export interface EvolutionChain {
  id: number;
  chain: ChainLink;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  names: { name: string; language: { name: string } }[];
  order: number;
  gender_rate: number;
  capture_rate: number;
  base_happiness: number;
  is_baby: boolean;
  is_legendary: boolean;
  is_mythical: boolean;
  hatch_counter: number;
  has_gender_differences: boolean;
  forms_switchable: boolean;
  growth_rate: { name: string; url: string };
  pokedex_numbers: { entry_number: number; pokedex: { name: string; url: string } }[];
  egg_groups: { name: string; url: string }[];
  color: { name: string; url: string };
  shape: { name: string; url: string };
  evolves_from_species: { name: string; url: string } | null;
  evolution_chain: { url: string };
  flavor_text_entries: {
    flavor_text: string;
    language: { name: string };
    version: { name: string };
  }[];
}

export interface EvolutionStep {
  id: number;
  name: string;
  localizedName: string;
  spriteUrl: string;
  trigger: string | null;
  minLevel: number | null;
}
