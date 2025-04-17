import { NavitarCharacter, NavitarType, Rarity } from '../components/NavitarCharacter';

export const navitarCharacters: NavitarCharacter[] = [
  {
    id: '1',
    name: 'Blaze Phoenix',
    type: 'fire',
    level: 1,
    stats: {
      strength: 8,
      defense: 5,
      speed: 7,
      stamina: 6
    },
    skills: [
      {
        name: 'Flame Burst',
        description: 'Launches a powerful fireball that deals damage to all enemies in range',
        power: 10,
        cooldown: 3
      },
      {
        name: 'Phoenix Shield',
        description: 'Creates a protective barrier of flames that reduces incoming damage',
        power: 8,
        cooldown: 5
      }
    ],
    rarity: 'epic',
    imageUrl: '/images/navitars/blaze-phoenix.png',
    description: 'A majestic fire bird that rises from the ashes, embodying the power of flames.'
  },
  {
    id: '2',
    name: 'Aqua Serpent',
    type: 'water',
    level: 1,
    stats: {
      strength: 6,
      defense: 7,
      speed: 8,
      stamina: 7
    },
    skills: [
      {
        name: 'Tidal Wave',
        description: 'Summons a massive wave that pushes back enemies and deals damage',
        power: 9,
        cooldown: 4
      },
      {
        name: 'Healing Waters',
        description: 'Restores health to allies within range',
        power: 7,
        cooldown: 6
      }
    ],
    rarity: 'rare',
    imageUrl: '/images/navitars/aqua-serpent.png',
    description: 'A graceful water serpent that moves with the flow of the ocean.'
  },
  {
    id: '3',
    name: 'Terra Guardian',
    type: 'earth',
    level: 1,
    stats: {
      strength: 9,
      defense: 9,
      speed: 4,
      stamina: 8
    },
    skills: [
      {
        name: 'Earthquake',
        description: 'Causes the ground to shake, stunning enemies and dealing damage',
        power: 11,
        cooldown: 5
      },
      {
        name: 'Stone Wall',
        description: 'Erects a protective barrier that blocks enemy attacks',
        power: 8,
        cooldown: 4
      }
    ],
    rarity: 'epic',
    imageUrl: '/images/navitars/terra-guardian.png',
    description: 'A mighty earth elemental that stands as an unbreakable fortress.'
  },
  {
    id: '4',
    name: 'Zephyr Swift',
    type: 'air',
    level: 1,
    stats: {
      strength: 5,
      defense: 6,
      speed: 10,
      stamina: 7
    },
    skills: [
      {
        name: 'Gale Force',
        description: 'Creates a powerful wind that pushes enemies away and deals damage',
        power: 8,
        cooldown: 3
      },
      {
        name: 'Air Dash',
        description: 'Quickly moves to a target location, dealing damage to enemies in the path',
        power: 7,
        cooldown: 4
      }
    ],
    rarity: 'rare',
    imageUrl: '/images/navitars/zephyr-swift.png',
    description: 'A swift air spirit that moves with the speed of the wind.'
  },
  {
    id: '5',
    name: 'Lumina Star',
    type: 'light',
    level: 1,
    stats: {
      strength: 7,
      defense: 7,
      speed: 7,
      stamina: 7
    },
    skills: [
      {
        name: 'Radiant Burst',
        description: 'Releases a blinding light that damages and stuns enemies',
        power: 10,
        cooldown: 4
      },
      {
        name: 'Healing Light',
        description: 'Restores health and removes negative effects from allies',
        power: 9,
        cooldown: 5
      }
    ],
    rarity: 'legendary',
    imageUrl: '/images/navitars/lumina-star.png',
    description: 'A celestial being that brings light and hope to the battlefield.'
  },
  {
    id: '6',
    name: 'Shadow Reaper',
    type: 'dark',
    level: 1,
    stats: {
      strength: 8,
      defense: 6,
      speed: 8,
      stamina: 6
    },
    skills: [
      {
        name: 'Dark Slash',
        description: 'Performs a quick attack that deals bonus damage to weakened enemies',
        power: 9,
        cooldown: 3
      },
      {
        name: 'Shadow Step',
        description: 'Teleports behind an enemy and deals critical damage',
        power: 11,
        cooldown: 5
      }
    ],
    rarity: 'epic',
    imageUrl: '/images/navitars/shadow-reaper.png',
    description: 'A mysterious entity that moves through the shadows, striking fear into enemies.'
  },
  {
    id: '7',
    name: 'Tech Nova',
    type: 'tech',
    level: 1,
    stats: {
      strength: 6,
      defense: 8,
      speed: 7,
      stamina: 7
    },
    skills: [
      {
        name: 'Plasma Blast',
        description: 'Fires a concentrated beam of energy that pierces through enemies',
        power: 10,
        cooldown: 4
      },
      {
        name: 'Energy Shield',
        description: 'Creates a protective barrier that absorbs damage and reflects some back',
        power: 8,
        cooldown: 5
      }
    ],
    rarity: 'rare',
    imageUrl: '/images/navitars/tech-nova.png',
    description: 'An advanced technological being that harnesses the power of energy.'
  },
  {
    id: '8',
    name: 'Verdant Sprout',
    type: 'nature',
    level: 1,
    stats: {
      strength: 7,
      defense: 7,
      speed: 6,
      stamina: 8
    },
    skills: [
      {
        name: 'Vine Whip',
        description: 'Summons vines that entangle and damage enemies',
        power: 8,
        cooldown: 3
      },
      {
        name: 'Nature\'s Blessing',
        description: 'Heals allies and provides a temporary boost to their stats',
        power: 9,
        cooldown: 6
      }
    ],
    rarity: 'common',
    imageUrl: '/images/navitars/verdant-sprout.png',
    description: 'A young nature spirit that grows stronger with each battle.'
  }
]; 