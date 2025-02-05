// script.js

// ==================== BATTLE SYSTEM ====================
let polarBearHealth = 100;
let iceDragonHealth = 100;
const attackBtn = document.querySelector('.attack-btn');

// Sound Effects (Add this block)
const soundEffects = {
  attack: new Howl({ src: ['assets/sounds/attack.mp3'], volume: 0.5 }),
  damage: new Howl({ src: ['assets/sounds/damage.mp3'], volume: 0.6 }),
  victory: new Howl({ src: ['assets/sounds/victory.mp3'], volume: 0.7 })
};

// Rest of your code (updateHealthBars, resetGame, etc.)

// ==================== MOBILE MENU ==================== 
const menuBtn = document.querySelector('.menu-btn');
const navMenu = document.querySelector('.nav-menu');
menuBtn.addEventListener('click', () => {
  navMenu.classList.toggle('active');
});

// ==================== CARD ANIMATIONS ====================
const cards = document.querySelectorAll('.card');
const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
      }
    });
  },
  { threshold: 0.1 }
);
cards.forEach(card => observer.observe(card));

// ==================== BATTLE SYSTEM ====================
let polarBearHealth = 100;
let iceDragonHealth = 100;
const attackBtn = document.querySelector('.attack-btn');
const victoryModal = document.getElementById('victory-modal');
const winnerText = document.getElementById('winner-text');
const playAgainBtn = document.getElementById('play-again');

// Sound Effects (using Howler.js - include in HTML first!)
const soundEffects = {
  attack: new Howl({ src: ['assets/sounds/attack.mp3'], volume: 0.5 }),
  victory: new Howl({ src: ['assets/sounds/victory.mp3'], volume: 0.7 }),
  damage: new Howl({ src: ['assets/sounds/damage.mp3'], volume: 0.6 })
};

function getRandomDamage(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updateHealthBars() {
  document.querySelector('.polar-bear .health-bar').style.width = `${polarBearHealth}%`;
  document.querySelector('.ice-dragon .health-bar').style.width = `${iceDragonHealth}%`;
}

function showVictory(winner) {
  winnerText.textContent = `${winner} Wins!`;
  victoryModal.style.display = 'block';
  soundEffects.victory.play();
}

function resetGame() {
  polarBearHealth = 100;
  iceDragonHealth = 100;
  updateHealthBars();
  victoryModal.style.display = 'none';
  
  // Reset character positions
  document.querySelectorAll('.character img').forEach(img => {
    img.style.transform = 'translateX(0)';
  });
}

attackBtn.addEventListener('click', () => {
  // Calculate random damage
  const bearDamage = getRandomDamage(8, 15);
  const dragonDamage = getRandomDamage(5, 12);
  
  // Apply damage
  polarBearHealth = Math.max(0, polarBearHealth - dragonDamage);
  iceDragonHealth = Math.max(0, iceDragonHealth - bearDamage);
  
  // Update visuals
  updateHealthBars();
  soundEffects.attack.play();
  soundEffects.damage.play();

  // Attack animations
  document.querySelector('.polar-bear img').style.transform = 'translateX(30px)';
  document.querySelector('.ice-dragon img').style.transform = 'translateX(-30px)';
  
  setTimeout(() => {
    document.querySelector('.polar-bear img').style.transform = 'translateX(0)';
    document.querySelector('.ice-dragon img').style.transform = 'translateX(0)';
  }, 200);

  // Check victory conditions
  if (polarBearHealth <= 0) showVictory('❄️ Ice Dragon');
  if (iceDragonHealth <= 0) showVictory('🐻 Polar Bear');
});

playAgainBtn.addEventListener('click', resetGame);

// ==================== SNOWFLAKES ====================
function createSnowflakes() {
  const container = document.querySelector('.snowflakes');
  for (let i = 0; i < 50; i++) {
    const snowflake = document.createElement('div');
    snowflake.className = 'snowflake';
    snowflake.style.left = Math.random() * 100 + '%';
    snowflake.style.animationDuration = Math.random() * 3 + 2 + 's';
    snowflake.style.animationDelay = Math.random() * 5 + 's';
    container.appendChild(snowflake);
  }
}
createSnowflakes();
// Define Navitar Classes
const Navitars = {
  iceDragon: {
    name: "Frostclaw",
    health: 120,
    attack: 18,
    defense: 12,
    speed: 8,
    abilities: {
      frostBreath: { damage: 25, staminaCost: 30 },
      iceShard: { damage: 15, staminaCost: 15 },
    },
    stamina: 100,
  },
  polarBear: {
    name: "Glacius",
    health: 150,
    attack: 22,
    defense: 15,
    speed: 5,
    abilities: {
      maul: { damage: 20, staminaCost: 25 },
      avalanche: { damage: 30, staminaCost: 40 },
    },
    stamina: 100,
  },
};// Tier Multipliers (Novice, Champion, Elder)
const tiers = {
  Novice: { health: 1.0, attack: 1.0, speed: 1.0 },
  Champion: { health: 1.5, attack: 1.3, speed: 1.2 },
  Elder: { health: 2.0, attack: 1.6, speed: 1.4 }
};

// Base Navitar Class
class Navitar {
  constructor(name, tier) {
    this.name = name;
    this.tier = tier;
    this.health = 100 * tiers[tier].health;
    this.attack = 10 * tiers[tier].attack;
    this.speed = 8 * tiers[tier].speed;
    this.stamina = 100;
    this.abilities = [];
  }
}

// Polar Bear Navitar (Glacius)
class PolarBear extends Navitar {
  constructor(tier) {
    super("Glacius", tier);
    this.abilities = [
      { 
        name: "Arctic Maul", 
        damage: 20 * tiers[tier].attack, 
        cost: 15,
        effect: "stun" // 25% chance to stun
      },
      {
        name: "Avalanche Crush",
        damage: 35 * tiers[tier].attack,
        cost: 30,
        effect: "defense_break" // Reduces target’s defense by 20%
      }
    ];
  }
}

// Ice Dragon Navitar (Frostclaw)
class IceDragon extends Navitar {
  constructor(tier) {
    super("Frostclaw", tier);
    this.abilities = [
      { 
        name: "Frost Breath", 
        damage: 25 * tiers[tier].attack, 
        cost: 20,
        effect: "freeze" // Freezes target for 1 turn
      },
      {
        name: "Ice Shard Barrage",
        damage: 15 * tiers[tier].attack,
        cost: 10,
        effect: "bleed" // Deals 5% max health/turn for 2 turns
      }
    ];
  }
}