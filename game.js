(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const centerOverlay = document.getElementById('center-overlay');
  const gameOverOverlay = document.getElementById('gameover-overlay');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const finalScoreEl = document.getElementById('final-score');

  // Virtual resolution to keep aspect independent drawing
  const VIRTUAL_W = 900;
  const VIRTUAL_H = 1600;

  let scale = 1;
  let viewW = 0;
  let viewH = 0;

  function resize() {
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    canvas.width = viewW;
    canvas.height = viewH;
    scale = Math.min(viewW / VIRTUAL_W, viewH / VIRTUAL_H);
    ctx.setTransform(scale, 0, 0, scale, (viewW - VIRTUAL_W * scale) / 2, (viewH - VIRTUAL_H * scale) / 2);
  }
  window.addEventListener('resize', resize);
  resize();

  // Game state
  const lanesX = [VIRTUAL_W * 0.3, VIRTUAL_W * 0.5, VIRTUAL_W * 0.7];
  const groundY = VIRTUAL_H * 0.86;
  const playerSize = { w: 90, h: 130 };

  const state = {
    running: false,
    paused: false,
    time: 0,
    score: 0,
    best: Number(localStorage.getItem('runner-best') || 0),
    speed: 800, // world scroll speed px/s
    speedMax: 1800,
    speedGain: 20, // per second
    spawnTimer: 0,
    coinSpawnTimer: 0,
  };
  bestEl.textContent = `Best: ${state.best}`;

  const player = {
    lane: 1,
    x: lanesX[1] - playerSize.w / 2,
    y: groundY - playerSize.h,
    vy: 0,
    onGround: true,
    sliding: false,
    slideTimer: 0,
    targetLane: 1,
  };

  /** @type {{type:'obstacle'|'coin', x:number, lane:number, w:number, h:number, taken?:boolean}[]} */
  const entities = [];

  // Simple PRNG for variety
  let rngSeed = Math.floor(Math.random() * 1e9);
  function rand() {
    rngSeed ^= rngSeed << 13;
    rngSeed ^= rngSeed >> 17;
    rngSeed ^= rngSeed << 5;
    return (rngSeed >>> 0) / 4294967295;
  }

  // Input handling
  const keys = new Set();
  document.addEventListener('keydown', (e) => {
    keys.add(e.key);
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      tryJump();
    }
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      trySlide();
    }
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      changeLane(-1);
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      changeLane(1);
    }
    if (e.key.toLowerCase() === 'p') togglePause();
  });
  document.addEventListener('keyup', (e) => keys.delete(e.key));

  // Touch/swipe
  let touchStartX = 0, touchStartY = 0, touchStartT = 0;
  const passive = { passive: true };
  window.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartT = performance.now();
  }, passive);
  window.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const dt = performance.now() - touchStartT;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < 20 || dt > 500) {
      // Tap: treat like jump
      tryJump();
      return;
    }
    if (absX > absY) {
      changeLane(dx > 0 ? 1 : -1);
    } else {
      if (dy < 0) tryJump(); else trySlide();
    }
  }, passive);

  // Buttons
  startBtn.addEventListener('click', () => startGame());
  restartBtn.addEventListener('click', () => startGame());
  pauseBtn.addEventListener('click', () => togglePause());

  function startGame() {
    state.running = true;
    state.paused = false;
    state.time = 0;
    state.score = 0;
    state.speed = 800;
    state.spawnTimer = 0;
    state.coinSpawnTimer = 0;
    entities.length = 0;
    player.lane = 1;
    player.targetLane = 1;
    player.x = lanesX[1] - playerSize.w / 2;
    player.y = groundY - playerSize.h;
    player.vy = 0;
    player.onGround = true;
    player.sliding = false;
    player.slideTimer = 0;
    centerOverlay.classList.remove('show');
    gameOverOverlay.classList.remove('show');
  }

  function gameOver() {
    state.running = false;
    gameOverOverlay.classList.add('show');
    finalScoreEl.textContent = `Score: ${Math.floor(state.score)}`;
    if (state.score > state.best) {
      state.best = Math.floor(state.score);
      localStorage.setItem('runner-best', String(state.best));
      bestEl.textContent = `Best: ${state.best}`;
    }
  }

  function togglePause() {
    if (!state.running) return;
    state.paused = !state.paused;
  }

  function changeLane(delta) {
    if (!state.running || state.paused) return;
    player.targetLane = Math.max(0, Math.min(2, player.targetLane + delta));
  }

  function tryJump() {
    if (!state.running || state.paused) return;
    if (player.onGround && !player.sliding) {
      player.vy = -1300;
      player.onGround = false;
      beep(523, 0.05);
    }
  }

  function trySlide() {
    if (!state.running || state.paused) return;
    if (player.onGround && !player.sliding) {
      player.sliding = true;
      player.slideTimer = 0.45; // seconds
      beep(330, 0.05);
    }
  }

  function spawnObstacle() {
    const laneCount = 3;
    const count = 1 + (rand() > 0.75 ? 1 : 0); // sometimes two
    const used = new Set();
    for (let i = 0; i < count; i++) {
      let lane = Math.floor(rand() * laneCount);
      let tries = 0;
      while (used.has(lane) && tries++ < 5) lane = Math.floor(rand() * laneCount);
      used.add(lane);
      const tall = rand() > 0.5;
      const w = 120;
      const h = tall ? 180 : 100;
      const spawnX = (lanesX[lane] - w / 2) + VIRTUAL_W + 200 + rand() * 200;
      entities.push({
        type: 'obstacle',
        lane,
        x: spawnX,
        w,
        h,
      });
    }
  }

  function spawnCoin() {
    const lane = Math.floor(rand() * 3);
    const w = 60, h = 60;
    const spawnX = (lanesX[lane] - w / 2) + VIRTUAL_W + 200 + rand() * 200;
    entities.push({ type: 'coin', lane, x: spawnX, w, h });
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // Audio: tiny synth beeps
  let audioCtx;
  function beep(freq, dur) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.value = 0.08;
      o.connect(g);
      g.connect(audioCtx.destination);
      const now = audioCtx.currentTime;
      o.start(now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.stop(now + dur + 0.02);
    } catch {}
  }

  // Main loop
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (!state.running || state.paused) {
      render();
      return;
    }
    update(dt);
    render();
  }
  requestAnimationFrame(loop);

  function update(dt) {
    state.time += dt;
    state.speed = Math.min(state.speedMax, state.speed + state.speedGain * dt);
    state.score += dt * (state.speed * 0.05);
    scoreEl.textContent = String(Math.floor(state.score));

    // Player lane smoothing
    const targetX = lanesX[player.targetLane] - playerSize.w / 2;
    player.x += (targetX - player.x) * Math.min(1, 12 * dt);

    // Jump / gravity
    if (!player.onGround) {
      player.vy += 3200 * dt; // gravity
      player.y += player.vy * dt;
      if (player.y >= groundY - playerSize.h) {
        player.y = groundY - playerSize.h;
        player.vy = 0;
        player.onGround = true;
      }
    }

    // Slide timer
    if (player.sliding) {
      player.slideTimer -= dt;
      if (player.slideTimer <= 0) player.sliding = false;
    }

    // Spawning
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnObstacle();
      state.spawnTimer = Math.max(0.55, 1.2 - state.speed * 0.0003);
    }
    state.coinSpawnTimer -= dt;
    if (state.coinSpawnTimer <= 0) {
      spawnCoin();
      state.coinSpawnTimer = 0.4 + rand() * 0.8;
    }

    // Entities update and collision
    for (let i = entities.length - 1; i >= 0; i--) {
      const e = entities[i];
      e.x -= state.speed * dt;
      if (e.x < -300) { entities.splice(i, 1); continue; }

      const ey = groundY - e.h;
      const px = player.x;
      const py = player.y + (player.sliding ? playerSize.h * 0.4 : 0);
      const ph = player.sliding ? playerSize.h * 0.6 : playerSize.h;

      const pr = { x: px, y: py, w: playerSize.w, h: ph };
      const er = { x: e.x, y: ey, w: e.w, h: e.h };

      if (e.type === 'obstacle') {
        if (rectsOverlap(pr, er)) {
          beep(120, 0.12);
          gameOver();
          break;
        }
      } else if (e.type === 'coin' && !e.taken) {
        if (rectsOverlap(pr, er)) {
          e.taken = true;
          state.score += 25;
          beep(880, 0.06);
        }
      }
    }
  }

  function render() {
    // Clear virtual canvas
    ctx.clearRect(0, 0, VIRTUAL_W, VIRTUAL_H);

    // Ground lanes
    drawGround();

    // Draw entities
    for (const e of entities) {
      const ex = e.x;
      const y = groundY - e.h;
      if (e.type === 'obstacle') {
        ctx.fillStyle = '#3b82f6';
        const drawX = ex;
        ctx.fillRect(drawX, y, e.w, e.h);
        // accent stripe
        ctx.fillStyle = '#93c5fd';
        ctx.fillRect(drawX + 8, y + 8, e.w - 16, 10);
      } else if (e.type === 'coin' && !e.taken) {
        ctx.fillStyle = '#ffd166';
        const cx = ex + e.w / 2;
        const cy = y + e.h / 2;
        drawCoin(cx, cy, e.w * 0.5);
      }
    }

    // Draw player
    drawPlayer();

    // Overlays: paused blur hint
    if (!state.running) {
      // start or game-over handled by overlays in DOM
    } else if (state.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = 'bold 48px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Paused', VIRTUAL_W / 2, VIRTUAL_H * 0.45);
    }
  }

  function drawGround() {
    // Road
    ctx.fillStyle = '#111827';
    const roadY = groundY + 2;
    ctx.fillRect(0, roadY - 8, VIRTUAL_W, VIRTUAL_H - roadY + 8);

    // Lanes markers
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      const x = lanesX[i];
      ctx.beginPath();
      ctx.moveTo(x, roadY - 8);
      ctx.lineTo(x, VIRTUAL_H);
      ctx.stroke();
    }

    // Parallax buildings (simple rectangles)
    const t = state.time * 0.2;
    for (let i = 0; i < 8; i++) {
      const bx = (i * 220 - ((state.time * (state.speed * 0.1)) % 220));
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(bx, groundY - 340, 160, 340);
      ctx.fillStyle = '#0f1626';
      ctx.fillRect(bx + 40, groundY - 220, 140, 220);
    }
  }

  function drawPlayer() {
    const w = playerSize.w;
    const h = player.sliding ? playerSize.h * 0.6 : playerSize.h;
    const y = player.sliding ? player.y + playerSize.h * 0.4 : player.y;
    ctx.fillStyle = '#5eead4';
    ctx.fillRect(player.x, y, w, h);
    // face visor
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(player.x + 18, y + 24, w - 36, 26);
  }

  function drawCoin(cx, cy, r) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff1';
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
  }

  // Show start overlay initially
  centerOverlay.classList.add('show');
})();


