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
  spriteUrl: string;
  trigger: string | null;
  minLevel: number | null;
}