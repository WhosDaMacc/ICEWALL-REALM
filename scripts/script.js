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