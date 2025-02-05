// script.js

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