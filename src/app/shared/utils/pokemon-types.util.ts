export const TYPE_COLORS: Record<string, string> = {
  fire: '#f08030',
  water: '#6890f0',
  grass: '#78c850',
  electric: '#f8d030',
  psychic: '#f85888',
  ice: '#98d8d8',
  dragon: '#7038f8',
  dark: '#705848',
  fairy: '#ee99ac',
  normal: '#a8a878',
  fighting: '#c03028',
  poison: '#a040a0',
  ground: '#e0c068',
  flying: '#a890f0',
  bug: '#a8b820',
  rock: '#b8a038',
  ghost: '#705898',
  steel: '#b8b8d0',
};

export const TYPE_GLOW: Record<string, string> = {
  fire: 'rgba(240,128,48,.4)',
  water: 'rgba(104,144,240,.4)',
  grass: 'rgba(120,200,80,.4)',
  electric: 'rgba(248,208,48,.4)',
  psychic: 'rgba(248,88,136,.4)',
  ice: 'rgba(152,216,216,.4)',
  dragon: 'rgba(112,56,248,.4)',
  dark: 'rgba(112,88,72,.3)',
  fairy: 'rgba(238,153,172,.4)',
  normal: 'rgba(168,168,120,.3)',
  fighting: 'rgba(192,48,40,.4)',
  poison: 'rgba(160,64,160,.4)',
  ground: 'rgba(224,192,104,.4)',
  flying: 'rgba(168,144,240,.4)',
  bug: 'rgba(168,184,32,.4)',
  rock: 'rgba(184,160,56,.4)',
  ghost: 'rgba(112,88,152,.4)',
  steel: 'rgba(184,184,208,.4)',
};

export const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'ATK',
  defense: 'DEF',
  'special-attack': 'SpA',
  'special-defense': 'SpD',
  speed: 'SPD',
};

export function getPrimaryColor(types: { type: { name: string } }[]): string {
  return TYPE_COLORS[types[0]?.type?.name] ?? '#8e8e93';
}

export function getPrimaryGlow(types: { type: { name: string } }[]): string {
  return TYPE_GLOW[types[0]?.type?.name] ?? 'rgba(142,142,147,.3)';
}