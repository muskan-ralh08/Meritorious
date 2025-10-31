const player = document.getElementById('player');
const obstacle = document.getElementById('obstacle');
const scoreText = document.getElementById('score');

let jumping = false;
let score = 0;

// Jump logic
function jump() {
  if (jumping) return;
  jumping = true;
  let jumpHeight = 0;
  const jumpInterval = setInterval(() => {
    if (jumpHeight >= 120) {
      clearInterval(jumpInterval);
      const fallInterval = setInterval(() => {
        if (jumpHeight <= 0) {
          clearInterval(fallInterval);
          jumping = false;
        }
        jumpHeight -= 5;
        player.style.bottom = `${jumpHeight}px`;
      }, 20);
    }
    jumpHeight += 5;
    player.style.bottom = `${jumpHeight}px`;
  }, 20);
}

// Obstacle movement
function moveObstacle() {
  let obstacleX = window.innerWidth;
  const move = setInterval(() => {
    if (obstacleX < -60) {
      obstacleX = window.innerWidth;
      score++;
      scoreText.textContent = `Score: ${score}`;
    }
    obstacleX -= 5;
    obstacle.style.right = `${-obstacleX + window.innerWidth}px`;

    // Collision detection
    const playerBottom = parseInt(window.getComputedStyle(player).bottom);
    if (obstacleX < 90 && obstacleX > 40 && playerBottom < 40) {
      alert(`💥 Game Over! Final Score: ${score}`);
      score = 0;
      scoreText.textContent = `Score: 0`;
      obstacleX = window.innerWidth;
    }
  }, 20);
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') jump();
});

moveObstacle();
