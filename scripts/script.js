// Mobile Menu Toggle
const menuBtn = document.querySelector('.menu-btn');
const navMenu = document.querySelector('.nav-menu');

menuBtn.addEventListener('click', () => {
  navMenu.classList.toggle('active');
});
// Snowflake Generator
function createSnowflakes() {
  const container = document.querySelector('.snowflakes');
  for (let i = 0; i < 50; i++) {
    const snowflake = document.createElement('div');
    snowflake.classList.add('snowflake');
    snowflake.style.left = Math.random() * 100 + '%';
    snowflake.style.width = snowflake.style.height = Math.random() * 5 + 3 + 'px';
    snowflake.style.animationDuration = Math.random() * 3 + 2 + 's';
    container.appendChild(snowflake);
  }
}
createSnowflakes();

// Attack Animation
document.querySelector('.attack-btn').addEventListener('click', () => {
  const polarBear = document.querySelector('.polar-bear img');
  const dragon = document.querySelector('.ice-dragon img');
  
  polarBear.classList.add('attack-animation');
  dragon.classList.add('attack-animation');
  
  setTimeout(() => {
    polarBear.classList.remove('attack-animation');
    dragon.classList.remove('attack-animation');
  }, 500);
});
// script.js

// Mobile Menu Toggle (Existing Code)
const menuBtn = document.querySelector('.menu-btn');
const navMenu = document.querySelector('.nav-menu');
menuBtn.addEventListener('click', () => {
  navMenu.classList.toggle('active');
});

// Scroll Animation for Cards (Existing Code)
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

// ⚔️ Battle System (NEW CODE) ⚔️
let polarBearHealth = 100;
let iceDragonHealth = 100;
const attackBtn = document.querySelector('.attack-btn');

function updateHealthBars() {
  // Target the inner health bar element (no ::after pseudo-selector)
  document.querySelector('.polar-bear .health-bar').style.width = `${polarBearHealth}%`;
  document.querySelector('.ice-dragon .health-bar').style.width = `${iceDragonHealth}%`;
}

attackBtn.addEventListener('click', () => {
  // Reduce health (you can randomize damage later!)
  polarBearHealth -= 10;
  iceDragonHealth -= 10;
  
  // Update visuals
  updateHealthBars();
  
  // Optional: Add attack animations
  document.querySelector('.polar-bear img').classList.add('attack-animation');
  document.querySelector('.ice-dragon img').classList.add('attack-animation');
  
  // Reset animations after 0.5s
  setTimeout(() => {
    document.querySelector('.polar-bear img').classList.remove('attack-animation');
    document.querySelector('.ice-dragon img').classList.remove('attack-animation');
  }, 500);
});