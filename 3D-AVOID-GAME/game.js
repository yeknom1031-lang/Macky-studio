const screenTopContainer = document.getElementById('screen-top');
const screenSideContainer = document.getElementById('screen-side');
const scoreEl = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

const CELL_SIZE = 100;

// Game State
let player = { x: 1, y: 1 }; // Player is fixed in Z=0 slice relative to camera
let obstacles = []; // { id, x, y, z }
let score = 0;
let worldProgress = 0; // The actual depth we have travelled
let isGameOver = false;
let obstacleIdCounter = 0;

// DOM elements
let obsTopElements = {};
let obsSideElements = {};
let playerTopEl = null;
let playerSideEl = null;

function init() {
    isGameOver = false;
    score = 0;
    worldProgress = 0;
    scoreEl.innerText = score;
    player = { x: 1, y: 1 };
    obstacles = [];
    obstacleIdCounter = 0;
    obsTopElements = {};
    obsSideElements = {};

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

    spawnInitialObstacles();
    render();
}

function spawnInitialObstacles() {
    // Spawn some obstacles ahead
    for (let z = 1; z <= 3; z++) {
        spawnSlice(z);
    }
}

function spawnSlice(z) {
    const obstacleCount = Math.min(6, 2 + Math.floor(worldProgress / 10));
    const positions = [];
    for(let x=0; x<3; x++) {
        for(let y=0; y<3; y++) {
            positions.push({x, y});
        }
    }
    for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    for(let i=0; i<obstacleCount; i++) {
        createObstacle(positions[i].x, positions[i].y, z);
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

function gameStep(direction = 1) {
    if (isGameOver) return;

    worldProgress += direction;
    if (worldProgress < 0) worldProgress = 0;
    
    // Move existing obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].z -= direction;
        if (obstacles[i].z < -1) {
            const id = obstacles[i].id;
            if (obsTopElements[id]) obsTopElements[id].remove();
            if (obsSideElements[id]) obsSideElements[id].remove();
            delete obsTopElements[id];
            delete obsSideElements[id];
            obstacles.splice(i, 1);
        }
    }

    if (direction > 0) {
        score++;
        scoreEl.innerText = score;
        spawnSlice(3); // Spawn new slice at the far end
    }
    
    checkCollision();
    render();
}

function checkCollision() {
    for (let o of obstacles) {
        // Player & obstacle are in the same exact tile
        if (o.x === player.x && o.y === player.y && o.z === player.z) {
            triggerGameOver();
            return;
        }
    }
}

function triggerGameOver() {
    isGameOver = true;
    finalScoreEl.innerText = score;
    gameOverScreen.classList.remove('hidden');
}

function render() {
    // ----------------------------------
    // TOP VIEW (タテ) projection: X vs Z
    // X -> left, Z -> top (Z=0 is bottom, Z=2 is top)
    // ----------------------------------
    playerTopEl.style.left = `${player.x * CELL_SIZE}px`;
    playerTopEl.style.top = `${2 * CELL_SIZE}px`; // Player fixed at Z=0 (bottom row)

    // ----------------------------------
    // SIDE VIEW (ヨコ) projection: Z vs Y
    // Z -> left (Z=0 is left, Z=2 is right), Y -> top
    // ----------------------------------
    playerSideEl.style.left = `0px`; // Player fixed at Z=0 (left column)
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

    // Advance backgrounds visually relative to the score progression step (1 turn = 1 move)
    const scrTopBg = document.querySelector('#screen-top .grid-bg');
    if(scrTopBg) scrTopBg.style.backgroundPosition = `-2px ${-2 + (score * CELL_SIZE)}px`;
    
    const scrSideBg = document.querySelector('#screen-side .grid-bg');
    if(scrSideBg) scrSideBg.style.backgroundPosition = `${-2 - (score * CELL_SIZE)}px -2px`;
}

window.addEventListener('keydown', (e) => {
    if (isGameOver) return;

    let moved = false;

    // LEFT SCREEN (タテ): A/D move X, W/S move Y
    if (e.key === 'a' || e.key === 'A') { player.x = Math.max(0, player.x - 1); moved = true; }
    if (e.key === 'd' || e.key === 'D') { player.x = Math.min(2, player.x + 1); moved = true; }
    if (e.key === 'w' || e.key === 'W') { player.y = Math.min(2, player.y + 1); moved = true; }
    if (e.key === 's' || e.key === 'S') { player.y = Math.max(0, player.y - 1); moved = true; }

    // RIGHT SCREEN (ヨコ): Up/Down move Y (shared), Left/Right move World Depth
    if (e.key === 'ArrowUp') { player.y = Math.min(2, player.y + 1); moved = true; }
    if (e.key === 'ArrowDown') { player.y = Math.max(0, player.y - 1); moved = true; }
    
    if (e.key === 'ArrowLeft') { 
        gameStep(-1); // Step back
        return;
    }
    if (e.key === 'ArrowRight') { 
        gameStep(1); // Step forward
        return;
    }

    if (moved) {
        checkCollision();
        render();
    }
});

restartBtn.addEventListener('click', init);

// Initial start
init();
