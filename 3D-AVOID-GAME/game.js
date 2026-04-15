const screenTopContainer = document.getElementById('screen-top');
const screenSideContainer = document.getElementById('screen-side');
const scoreEl = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

const CELL_SIZE = 100;

// Game State
let player = { x: 1, y: 1, z: 0 };
let obstacles = []; // { id, x, y, z }
let score = 0;
let isGameOver = false;
let obstacleIdCounter = 0;
let gameLoopInterval;
let BASE_SPEED = 700;

// DOM elements
let obsTopElements = {};
let obsSideElements = {};
let playerTopEl = null;
let playerSideEl = null;

function updateSpeed() {
    document.documentElement.style.setProperty('--game-speed', `${BASE_SPEED}ms`);
}

function init() {
    isGameOver = false;
    score = 0;
    scoreEl.innerText = score;
    player = { x: 1, y: 1, z: 0 };
    obstacles = [];
    obstacleIdCounter = 0;
    obsTopElements = {};
    obsSideElements = {};
    BASE_SPEED = 700;
    updateSpeed();

    // Clear entities
    screenTopContainer.querySelectorAll('.entity').forEach(e => e.remove());
    screenSideContainer.querySelectorAll('.entity').forEach(e => e.remove());

    gameOverScreen.classList.add('hidden');

    playerTopEl = document.createElement('div');
    playerTopEl.className = 'entity player';
    screenTopContainer.appendChild(playerTopEl);

    playerSideEl = document.createElement('div');
    playerSideEl.className = 'entity player';
    screenSideContainer.appendChild(playerSideEl);

    render();

    if(gameLoopInterval) clearInterval(gameLoopInterval);
    gameLoopInterval = setInterval(gameStep, BASE_SPEED);
}

function spawnObstacles() {
    // Increase density over time
    const obstacleCount = Math.min(8, 2 + Math.floor(score / 15));
    const positions = [];
    for(let x=0; x<3; x++) {
        for(let y=0; y<3; y++) {
            positions.push({x, y});
        }
    }
    // Shuffle positions
    for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    // Spawn at z=3 (sliding in)
    for(let i=0; i<obstacleCount; i++) {
        createObstacle(positions[i].x, positions[i].y, 3);
    }
}

function createObstacle(x, y, z) {
    const id = obstacleIdCounter++;
    obstacles.push({ id, x, y, z });

    const topEl = document.createElement('div');
    topEl.className = 'entity obstacle';
    screenTopContainer.appendChild(topEl);
    obsTopElements[id] = topEl;

    const sideEl = document.createElement('div');
    sideEl.className = 'entity obstacle';
    screenSideContainer.appendChild(sideEl);
    obsSideElements[id] = sideEl;
}

function gameStep() {
    if (isGameOver) return;

    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].z -= 1;
        if (obstacles[i].z < -1) { // Removed from board
            const id = obstacles[i].id;
            if (obsTopElements[id]) obsTopElements[id].remove();
            if (obsSideElements[id]) obsSideElements[id].remove();
            delete obsTopElements[id];
            delete obsSideElements[id];
            obstacles.splice(i, 1);
        }
    }

    score++;
    scoreEl.innerText = score;

    spawnObstacles();
    
    checkCollision();
    render();

    // Speed up dynamically
    if (score % 20 === 0 && BASE_SPEED > 250) {
        BASE_SPEED -= 50;
        updateSpeed();
        clearInterval(gameLoopInterval);
        gameLoopInterval = setInterval(gameStep, BASE_SPEED);
    }
}

function checkCollision() {
    for (let o of obstacles) {
        if (o.x === player.x && o.y === player.y && o.z === player.z) {
            triggerGameOver();
            return;
        }
    }
}

function triggerGameOver() {
    isGameOver = true;
    clearInterval(gameLoopInterval);
    finalScoreEl.innerText = score;
    gameOverScreen.classList.remove('hidden');
}

function render() {
    // ----------------------------------
    // TOP VIEW (タテ) projection
    // X -> left, Z -> top (inverted, so Z=2 is at top=0)
    // ----------------------------------
    playerTopEl.style.left = `${player.x * CELL_SIZE}px`;
    playerTopEl.style.top = `${(2 - player.z) * CELL_SIZE}px`;

    // ----------------------------------
    // SIDE VIEW (ヨコ) projection
    // Z -> left, Y -> top (inverted, so Y=2 is at top=0)
    // ----------------------------------
    playerSideEl.style.left = `${player.z * CELL_SIZE}px`;
    playerSideEl.style.top = `${(2 - player.y) * CELL_SIZE}px`;

    for (let o of obstacles) {
        if (obsTopElements[o.id]) {
            obsTopElements[o.id].style.left = `${o.x * CELL_SIZE}px`;
            obsTopElements[o.id].style.top = `${(2 - o.z) * CELL_SIZE}px`;
        }
        if (obsSideElements[o.id]) {
            obsSideElements[o.id].style.left = `${o.z * CELL_SIZE}px`;
            obsSideElements[o.id].style.top = `${(2 - o.y) * CELL_SIZE}px`;
        }
    }
}

window.addEventListener('keydown', (e) => {
    if (isGameOver) return;

    let moved = false;

    // TOP VIEW (タテ) Keys: W/S map to Z axis, A/D map to X axis
    if (e.key === 'w' || e.key === 'W') { player.z = Math.min(2, player.z + 1); moved = true; }
    if (e.key === 's' || e.key === 'S') { player.z = Math.max(0, player.z - 1); moved = true; }
    if (e.key === 'a' || e.key === 'A') { player.x = Math.max(0, player.x - 1); moved = true; }
    if (e.key === 'd' || e.key === 'D') { player.x = Math.min(2, player.x + 1); moved = true; }

    // SIDE VIEW (ヨコ) Keys: Up/Down map to Y axis, Left/Right map to Z axis
    if (e.key === 'ArrowUp') { player.y = Math.min(2, player.y + 1); moved = true; }
    if (e.key === 'ArrowDown') { player.y = Math.max(0, player.y - 1); moved = true; }
    if (e.key === 'ArrowLeft') { player.z = Math.max(0, player.z - 1); moved = true; }
    if (e.key === 'ArrowRight') { player.z = Math.min(2, player.z + 1); moved = true; }

    if (moved) {
        checkCollision();
        render();
    }
});

restartBtn.addEventListener('click', init);

// Initial start
init();
