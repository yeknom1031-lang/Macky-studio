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

// DOM elements
let obsTopElements = {};
let obsSideElements = {};
let playerTopEl = null;
let playerSideEl = null;

function init() {
    isGameOver = false;
    score = 0;
    scoreEl.innerText = score;
    player = { x: 1, y: 1, z: 0 };
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

    spawnSlice(3);
    render();
}

function spawnSlice(z) {
    const obstacleCount = Math.min(6, 2 + Math.floor(score / 10));
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

function gameStep(skipObstacleMove = false) {
    if (isGameOver) return;
    
    // Default turn: obstacles move Z--
    if (!skipObstacleMove) {
        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].z -= 1;
            if (obstacles[i].z < -1) {
                removeObstacle(i);
            }
        }
    }

    score++;
    scoreEl.innerText = score;
    spawnSlice(3); // Spawn at edge

    checkCollision();
    render();
}

function removeObstacle(index) {
    const id = obstacles[index].id;
    if (obsTopElements[id]) obsTopElements[id].remove();
    if (obsSideElements[id]) obsSideElements[id].remove();
    delete obsTopElements[id];
    delete obsSideElements[id];
    obstacles.splice(index, 1);
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
    // X -> left, Z -> top (Z=2 is top, Z=0 is bottom)
    // ----------------------------------
    playerTopEl.style.left = `${player.x * CELL_SIZE}px`;
    playerTopEl.style.top = `${(2 - player.z) * CELL_SIZE}px`;

    // ----------------------------------
    // SIDE VIEW (ヨコ) projection: Z vs Y
    // Z -> left (Z=0 is left, Z=2 is right), Y -> top
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

    // Advance backgrounds visually relative to the score progression step (1 turn = 1 move)
    const scrTopBg = document.querySelector('#screen-top .grid-bg');
    if(scrTopBg) scrTopBg.style.backgroundPosition = `-2px ${-2 + (score * CELL_SIZE)}px`;
    
    const scrSideBg = document.querySelector('#screen-side .grid-bg');
    if(scrSideBg) scrSideBg.style.backgroundPosition = `${-2 - (score * CELL_SIZE)}px -2px`;
}

window.addEventListener('keydown', (e) => {
    if (isGameOver) return;

    let moved = false;
    let isZMove = false;

    // TOP VIEW (タテ): WASD
    // A/D move X. W/S move Z (Forward/Backward on the Top-down screen)
    if (e.key === 'a' || e.key === 'A') { player.x = Math.max(0, player.x - 1); moved = true; }
    if (e.key === 'd' || e.key === 'D') { player.x = Math.min(2, player.x + 1); moved = true; }
    if (e.key === 'w' || e.key === 'W') { player.z = Math.min(2, player.z + 1); moved = true; isZMove = true; }
    if (e.key === 's' || e.key === 'S') { player.z = Math.max(0, player.z - 1); moved = true; isZMove = true; }

    // SIDE VIEW (ヨコ): Arrows
    // Up/Down move Y. Left/Right move Z (Forward/Backward on the Side screen)
    if (e.key === 'ArrowUp') { player.y = Math.min(2, player.y + 1); moved = true; }
    if (e.key === 'ArrowDown') { player.y = Math.max(0, player.y - 1); moved = true; }
    if (e.key === 'ArrowLeft') { player.z = Math.max(0, player.z - 1); moved = true; isZMove = true; }
    if (e.key === 'ArrowRight') { player.z = Math.min(2, player.z + 1); moved = true; isZMove = true; }

    if (moved) {
        // If player moved along the Z axis, we DON'T move the obstacles 
        // to prevent double-stepping. If player dodged in X/Y, obstacles move closer.
        gameStep(isZMove);
    }
});

restartBtn.addEventListener('click', init);

// Initial start
init();
