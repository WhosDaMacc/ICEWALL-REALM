// Shared Move type, used by TagTeamBattle (which imports it from here).
// Shape mirrors the Move in contexts/NavitarContext.
export interface Move {
  name: string;
  type:
    'ice' | 'fire' | 'nature' | 'shadow' | 'light' | 'quantum' | 'electric' | 'spiritual' | 'water';
  damage: number;
  energyCost: number;
  cooldown: number;
  description: string;
}
