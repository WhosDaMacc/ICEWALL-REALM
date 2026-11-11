// Shared Navitar type, used by TagTeamBattle (which imports it from here).
// Shape mirrors the Navitar in contexts/NavitarContext, plus `maxHealth`,
// which the tag-team battle screen needs for its health bars. The repo has
// several Navitar shapes (NavitarContext, NavitarFightClub, NavitarBattle);
// consolidating them into this folder is a later cleanup, not part of the
// build fix.
import type { Move } from './Move';

export interface Navitar {
  id: string;
  name: string;
  type:
    'ice' | 'fire' | 'nature' | 'shadow' | 'light' | 'quantum' | 'electric' | 'spiritual' | 'water';
  level: number;
  health: number;
  maxHealth: number;
  energy: number;
  moves: Move[];
  personality: string;
  image: string;
}
