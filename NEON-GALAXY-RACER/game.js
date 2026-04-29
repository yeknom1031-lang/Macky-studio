const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score-value');
const finalScoreEl = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-button');
const restartBtn = document.getElementById('restart-button');
const countdownScreen = document.getElementById('countdown-screen');
const countdownNumberEl = document.getElementById('countdown-number');

// Game State
let gameState = 'START'; // START, COUNTDOWN, PLAYING, GAMEOVER
let score = 0;
let distance = 0;
let countdownValue = 3;
let speed = 0; // Current speed based on mashing
let baseSpeed = 0;
let friction = 0.98; // Speed decay
let mashPower = 1.2; // Speed per click
let goalDistance = 5000;
let frameCount = 0;
let obstacles = [];
let npcs = [];
let gimmicks = [];
let lastObstacleSpawn = 0;
let lastGimmickSpawn = 0;
let isVictory = false;
let lastMathForkDistance = 0;
let stunTimer = 0;
 // Spider webs, etc.

// Player
const player = {
    x: 0,
    y: 0,
    w: 30,
    h: 30,
    targetX: 0,
    color: '#333333'
};

// Road dimensions
const roadWidth = 400;

class NPC {
    constructor(id) {
        this.id = id;
        this.reset();
        this.color = `hsl(${200 + id * 40}, 70%, 50%)`;
    }
    reset() {
        const roadLeft = (canvas.width - roadWidth) / 2;
        this.x = roadLeft + (roadWidth / 4) * (this.id + 1);
        this.y = canvas.height - 150;
        this.targetX = this.x;
        this.w = 30;
        this.h = 30;
        this.distance = 0;
        this.speed = 4 + Math.random() * 2; // Fixed speed for robots
        this.active = true;
    }
    update() {
        if (!this.active) return;
        
        this.distance += this.speed;

        // Relative Y position based on player's progress
        this.y = (canvas.height - 150) - (this.distance - distance);
        
        // NPC AI to avoid obstacles
        let threat = null;
        obstacles.forEach(obs => {
            // Only avoid if it's on their relative screen position
            if (obs.y < this.y && obs.y > this.y - 100) {
                if (this.x + this.w > obs.x - 5 && this.x - this.w < obs.x + obs.w + 5) {
                    threat = obs;
                }
            }
        });

        if (threat) {
            if (this.x < threat.x + threat.w/2) this.targetX -= 4;
            else this.targetX += 4;
        }

        const roadLeft = (canvas.width - roadWidth) / 2;
        const roadRight = (canvas.width + roadWidth) / 2;
        if (this.targetX < roadLeft + this.w/2) this.targetX = roadLeft + this.w/2;
        if (this.targetX > roadRight - this.w/2) this.targetX = roadRight - this.w/2;

        this.x += (this.targetX - this.x) * 0.1;

        // NPC Collision with Obstacles
        obstacles.forEach(obs => {
            if (this.x + 10 > obs.x && this.x - 10 < obs.x + obs.w &&
                this.y + 10 > obs.y && this.y - 30 < obs.y + obs.h) {
                this.active = false;
            }
        });
    }
    draw() {
        if (!this.active) return;
        if (this.y < -50 || this.y > canvas.height + 50) return; // Cull if offscreen

        const bob = Math.sin((frameCount + this.id * 10) * 0.2) * 5;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y + bob - 20, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(this.x - 8, this.y + bob - 10, 16, 25);
        ctx.fillRect(this.x - 6, this.y + bob + 15, 5, 10);
        ctx.fillRect(this.x + 1, this.y + bob + 15, 5, 10);
    }
}

// Initial NPCs
for (let i = 0; i < 3; i++) npcs.push(new NPC(i));

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.x = canvas.width / 2;
    player.y = canvas.height - 150;
    player.targetX = player.x;
}

window.addEventListener('resize', resize);
resize();

// Controls
canvas.addEventListener('mousemove', (e) => {
    if (gameState !== 'PLAYING') return;
    const roadLeft = (canvas.width - roadWidth) / 2;
    const roadRight = (canvas.width + roadWidth) / 2;
    let newX = e.clientX;
    // Keep within road
    if (newX < roadLeft + player.w/2) newX = roadLeft + player.w/2;
    if (newX > roadRight - player.w/2) newX = roadRight - player.w/2;
    player.targetX = newX;
});

canvas.addEventListener('mousedown', () => {
    if (gameState === 'PLAYING' && stunTimer <= 0) speed += mashPower;
});
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'PLAYING' && stunTimer <= 0) speed += mashPower;
});

// For touch/keyboard
window.addEventListener('keydown', (e) => {
    if (gameState !== 'PLAYING') return;
    const step = 40;
    if (e.key === 'ArrowLeft' || e.key === 'a') player.targetX -= step;
    if (e.key === 'ArrowRight' || e.key === 'd') player.targetX += step;
    
    const roadLeft = (canvas.width - roadWidth) / 2;
    const roadRight = (canvas.width + roadWidth) / 2;
    if (player.targetX < roadLeft + player.w/2) player.targetX = roadLeft + player.w/2;
    if (player.targetX > roadRight - player.w/2) player.targetX = roadRight - player.w/2;
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

function startGame() {
    gameState = 'COUNTDOWN';
    score = 0;
    distance = 0;
    speed = 0;
    obstacles = [];
    gimmicks = [];
    lastObstacleSpawn = 0;
    lastGimmickSpawn = 0;
    lastMathForkDistance = 0;
    stunTimer = 0;
    npcs.forEach(npc => npc.reset());
    countdownValue = 3;
    
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    countdownScreen.classList.add('active');
    countdownNumberEl.textContent = countdownValue;
    
    const cdInterval = setInterval(() => {
        countdownValue--;
        if (countdownValue > 0) {
            countdownNumberEl.textContent = countdownValue;
        } else {
            clearInterval(cdInterval);
            countdownScreen.classList.remove('active');
            gameState = 'PLAYING';
        }
    }, 1000);

    requestAnimationFrame(update);
}

function victory() {
    gameState = 'GAMEOVER';
    isVictory = true;
    
    // Calculate Rank
    let rank = 1;
    npcs.forEach(npc => {
        if (npc.distance > distance) {
            rank++;
        }
    });

    gameOverScreen.classList.add('active');
    const title = gameOverScreen.querySelector('h2');
    title.textContent = "GOAL!!";
    title.style.color = "#4cd964";
    
    const rankText = rank === 1 ? "🥇 優勝！" : `${rank}位入賞`;
    finalScoreEl.innerHTML = `${rankText}<br><span style="font-size: 0.8em; opacity: 0.7;">記録: SUCCESS</span>`;
}

function gameOver() {
    gameState = 'GAMEOVER';
    isVictory = false;
    gameOverScreen.classList.add('active');
    gameOverScreen.querySelector('h2').textContent = "Game Over";
    gameOverScreen.querySelector('h2').style.color = "#ff5c5c";
    finalScoreEl.textContent = Math.floor(distance / 10);
}


function drawRoad() {
    const roadLeft = (canvas.width - roadWidth) / 2;
    
    // Draw Ground
    ctx.fillStyle = '#f0f2f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Goal behavior
    const distToGoal = goalDistance - distance;
    
    function renderSingleRoad(xOffset) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(xOffset, 0, roadWidth, canvas.height);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(xOffset, 0); ctx.lineTo(xOffset, canvas.height);
        ctx.moveTo(xOffset + roadWidth, 0); ctx.lineTo(xOffset + roadWidth, canvas.height);
        ctx.stroke();
        ctx.setLineDash([40, 40]);
        ctx.lineDashOffset = -distance;
        ctx.beginPath();
        ctx.moveTo(xOffset + roadWidth / 2, 0); ctx.lineTo(xOffset + roadWidth / 2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Fork visualization
    let currentFork = gimmicks.find(g => g.type === 'FORK' && g.y > -500 && g.y < canvas.height + 500);

    if (currentFork) {
        // Draw Two Roads
        const gap = 100;
        const subRoadW = (roadWidth / 2) + 20;
        
        function renderHalf(xOffset, side) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(xOffset, 0, subRoadW, canvas.height);
            
            // Road edges
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(xOffset, 0); ctx.lineTo(xOffset, canvas.height);
            ctx.moveTo(xOffset + subRoadW, 0); ctx.lineTo(xOffset + subRoadW, canvas.height);
            ctx.stroke();

            // Dead End Wall for incorrect side
            const wallY = currentFork.y + 600;
            if (side !== currentFork.correctSide) {
                ctx.fillStyle = '#ff5c5c';
                ctx.fillRect(xOffset, wallY, subRoadW, 40);
                ctx.fillStyle = 'white';
                ctx.font = 'bold 15px Inter';
                ctx.textAlign = 'center';
                ctx.fillText("DEAD END", xOffset + subRoadW/2, wallY + 25);
            }

            // Dashed lines for sub-roads
            ctx.strokeStyle = '#e0e0e0';
            ctx.setLineDash([20, 20]);
            ctx.lineDashOffset = -distance;
            ctx.beginPath();
            ctx.moveTo(xOffset + subRoadW / 2, 0);
            ctx.lineTo(xOffset + subRoadW / 2, canvas.height);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        renderHalf(roadLeft - 50, 'LEFT');
        renderHalf(roadLeft + roadWidth/2 + 30, 'RIGHT');

        // Central wall (physical barrier)
        ctx.fillStyle = '#333'; // Make it darker and more visible
        ctx.fillRect(canvas.width/2 - 5, 0, 10, canvas.height);

    } else {
        renderSingleRoad(roadLeft);
    }

    // Draw Goal Line
    if (distToGoal < canvas.height && distToGoal > -100) {
        ctx.fillStyle = '#333';
        ctx.fillRect(roadLeft, (canvas.height - 150) - distToGoal, roadWidth, 50);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Inter';
        ctx.textAlign = 'center';
        ctx.fillText("FINISH", roadLeft + roadWidth / 2, (canvas.height - 150) - distToGoal + 35);
    }

}

function update() {
    if (gameState === 'GAMEOVER' || gameState === 'START') return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f0f2f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawRoad();

    if (gameState === 'COUNTDOWN') {
        const bob = Math.sin(frameCount * 0.2) * 5;
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(player.x, player.y + bob - 20, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(player.x - 8, player.y + bob - 10, 16, 25);
        ctx.fillRect(player.x - 6, player.y + bob + 15, 5, 10);
        ctx.fillRect(player.x + 1, player.y + bob + 15, 5, 10);
        
        npcs.forEach(npc => npc.draw());

        frameCount++;
        requestAnimationFrame(update);
        return;
    }

    frameCount++;
    
    // Stun logic
    if (stunTimer > 0) {
        stunTimer--;
        speed = 1; // Creep forward
    } else {
        speed *= friction; 
    }

    distance += speed; 
    scoreEl.textContent = Math.floor(Math.max(0, (goalDistance - distance) / 10)) + "m";

    // Goal check
    if (distance >= goalDistance) {
        victory();
    }

    // Update NPCs
    npcs.forEach(npc => {
        npc.update();
        npc.draw();
    });

    // Player smoothing
    player.x += (player.targetX - player.x) * 0.15;

    // Draw Player
    const bob = Math.sin(distance * 0.2) * 5;
    ctx.fillStyle = player.color;
    // Head
    ctx.beginPath();
    ctx.arc(player.x, player.y + bob - 20, 8, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.fillRect(player.x - 8, player.y + bob - 10, 16, 25);
    // Legs
    const legBob = Math.sin(frameCount * 0.2) * 10;
    ctx.fillRect(player.x - 6, player.y + bob + 15, 5, 10 + legBob);
    ctx.fillRect(player.x + 1, player.y + bob + 15, 5, 10 - legBob);

    // Spawn Obstacles (Based on Distance, not time)
    if (distance - lastObstacleSpawn > 400) {
        const roadLeft = (canvas.width - roadWidth) / 2;
        obstacles.push({
            x: roadLeft + Math.random() * (roadWidth - 60),
            y: -100,
            w: 60,
            h: 30
        });
        lastObstacleSpawn = distance;
    }

    // Update & Draw Obstacles
    obstacles.forEach((obs, index) => {
        obs.y += speed;
        ctx.fillStyle = '#ff5c5c';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

        // Collision Check
        if (player.x + 10 > obs.x && 
            player.x - 10 < obs.x + obs.w &&
            player.y + 10 > obs.y &&
            player.y - 30 < obs.y + obs.h) {
            gameOver();
        }

        if (obs.y > canvas.height) obstacles.splice(index, 1);
    });

    // Spawn Gimmicks (Webs every 800 units)
    if (distance - lastGimmickSpawn > 800) {
        const roadLeft = (canvas.width - roadWidth) / 2;
        gimmicks.push({
            type: 'WEB',
            x: roadLeft + Math.random() * (roadWidth - 50),
            y: -100,
            w: 50,
            h: 50
        });
        lastGimmickSpawn = distance;
    }

    // Spawn Math Fork (every 1500 units)
    if (distance - lastMathForkDistance > 1500 && distance < goalDistance - 800) {
        const a = Math.floor(Math.random() * 9) + 1;
        const b = Math.floor(Math.random() * 9) + 1;
        const correct = a + b;
        const wrong = correct + (Math.random() > 0.5 ? 1 : -1);
        const correctOnLeft = Math.random() > 0.5;

        gimmicks.push({
            type: 'FORK',
            question: `${a} + ${b} = ?`,
            leftAns: correctOnLeft ? correct : wrong,
            rightAns: correctOnLeft ? wrong : correct,
            correctSide: correctOnLeft ? 'LEFT' : 'RIGHT',
            y: -150, // Start above screen
            w: roadWidth,
            h: 100,
            triggered: false
        });
        lastMathForkDistance = distance;
    }

    // Update & Draw Gimmicks
    gimmicks.forEach((g, index) => {
        g.y += speed;
        const roadLeft = (canvas.width - roadWidth) / 2;

        if (g.type === 'FORK') {
            // Visualize Fork
            ctx.fillStyle = '#333';
            ctx.fillRect(roadLeft, g.y, roadWidth, 10); // Fork line

            ctx.fillStyle = '#007aff';
            ctx.font = 'bold 30px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(g.question, canvas.width / 2, g.y - 40);

            // Left Answer
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            const leftX = roadLeft - 50;
            const rightX = roadLeft + roadWidth/2 + 30;
            const subW = roadWidth/2 + 20;

            ctx.fillRect(leftX, g.y + 10, subW, 80);
            ctx.fillStyle = '#333';
            ctx.fillText(g.leftAns, leftX + subW/2, g.y + 60);

            // Right Answer
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillRect(rightX, g.y + 10, subW, 80);
            ctx.fillStyle = '#333';
            ctx.fillText(g.rightAns, rightX + subW/2, g.y + 60);

            // Constraint: Can't cross center wall (Ironclad)
            const wallLeft = canvas.width/2 - 20; // Expanded hitzone
            const wallRight = canvas.width/2 + 20;
            
            if (player.x < canvas.width/2) {
                // Stay on Left
                if (player.targetX > wallLeft) player.targetX = wallLeft;
                if (player.x > wallLeft) player.x = wallLeft;
            } else {
                // Stay on Right
                if (player.targetX < wallRight) player.targetX = wallRight;
                if (player.x < wallRight) player.x = wallRight;
            }

            // Dead End Logic
            const wallY = g.y + 600;
            const playerOnLeft = player.x < canvas.width / 2;
            const playerSide = playerOnLeft ? 'LEFT' : 'RIGHT';
            
            if (playerSide !== g.correctSide && player.y < wallY + 40 && player.y + 30 > wallY) {
                // Correctly hit the wall
                stunTimer = 120; // Stunned/Stuck
                speed = -2; // Bounce back slightly
            }
        } else if (g.type === 'WEB') {
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for(let i=0; i<8; i++){
                ctx.moveTo(g.x + 25, g.y + 25);
                ctx.lineTo(g.x + 25 + Math.cos(i) * 25, g.y + 25 + Math.sin(i) * 25);
            }
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(g.x + 25, g.y + 25, 15, 0, Math.PI * 2);
            ctx.stroke();

            if (player.x + 10 > g.x && player.x - 10 < g.x + g.w &&
                player.y + 10 > g.y && player.y - 30 < g.y + g.h) {
                speed *= 0.7;
                gimmicks.splice(index, 1);
            }
        }

        // Remove condition
        const removeY = g.type === 'FORK' ? canvas.height + 1000 : canvas.height;
        if (g.y > removeY) gimmicks.splice(index, 1);
    });


    requestAnimationFrame(update);
}

// Initial draw
ctx.fillStyle = '#f0f2f5';
ctx.fillRect(0, 0, canvas.width, canvas.height);
drawRoad();
