const player = document.getElementById("player");
const obstacle = document.getElementById("obstacle");
const scoreText = document.getElementById("score");

const leftBtn = document.getElementById("left");
const rightBtn = document.getElementById("right");
const jumpBtn = document.getElementById("jump");

let jumping = false;
let score = 0;
let lane = 1; // 0 = left, 1 = middle, 2 = right
const lanes = [120, 275, 430]; // horizontal positions for lanes

// Move obstacle continuously
function moveObstacle() {
  let obstacleX = 650;
  const move = setInterval(() => {
    obstacleX -= 6;
    obstacle.style.right = `${-obstacleX + 600}px`;

    if (obstacleX < -60) {
      obstacleX = 650;
      // Randomly place obstacle in one of the lanes
      const randomLane = Math.floor(Math.random() * 3);
      obstacle.style.left = lanes[randomLane] + "px";
      score++;
      scoreText.textContent = `Score: ${score}`;
    }

    // Collision detection
    const playerBottom = parseInt(window.getComputedStyle(player).bottom);
    const obstacleLeft = parseInt(window.getComputedStyle(obstacle).left);

    if (
      Math.abs(obstacleLeft - parseInt(player.style.left)) < 40 &&
      playerBottom < 60 &&
      obstacleX < 120
    ) {
      alert(`💥 Game Over! Final Score: ${score}`);
      location.reload();
    }
  }, 20);
}

// Jump
function jump() {
  if (jumping) return;
  jumping = true;
  let up = 0;
  const jumpInterval = setInterval(() => {
    if (up >= 100) {
      clearInterval(jumpInterval);
      const fallInterval = setInterval(() => {
        if (up <= 0) {
          clearInterval(fallInterval);
          jumping = false;
        }
        up -= 5;
        player.style.bottom = 20 + up + "px";
      }, 20);
    }
    up += 5;
    player.style.bottom = 20 + up + "px";
  }, 20);
}

// Change lanes
function moveLeft() {
  if (lane > 0) lane--;
  player.style.left = lanes[lane] + "px";
}

function moveRight() {
  if (lane < 2) lane++;
  player.style.left = lanes[lane] + "px";
}

// Keyboard Controls
document.addEventListener("keydown", (e) => {
  if (e.code === "ArrowUp" || e.code === "Space") jump();
  if (e.code === "ArrowLeft") moveLeft();
  if (e.code === "ArrowRight") moveRight();
});

// Touch Controls
leftBtn.addEventListener("click", moveLeft);
rightBtn.addEventListener("click", moveRight);
jumpBtn.addEventListener("click", jump);

// Start game
player.style.left = lanes[lane] + "px";
moveObstacle();
