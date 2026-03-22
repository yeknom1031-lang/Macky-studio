const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameInfo = document.getElementById('game-info');
const deathScreen = document.getElementById('death-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const scoreValue = document.getElementById('score-value');
const progressBar = document.getElementById('progress-bar');
const finalProgress = document.getElementById('final-progress');

// Constants
const GRAVITY = 0.8;
const JUMP_FORCE = -15; // -12から-15に強化（ブロック2マス分飛べる強さ）
const SPEED = 10; // 6から10にスピードアップ
const PLAYER_SIZE = 60; // 40から60へ拡大
const GROUND_Y = 0.8; 

// Game State
let gameState = 'START';
let score = 0;
let distance = 0;
let obstacles = [];
let particles = [];
let animationId;
let lastTime = 0;
let isInputActive = false; 

// Audio Setup
const bgm = new Audio('music.mp3');
bgm.loop = true;
bgm.volume = 0.5;

// Player Object
const player = {
    x: 100,
    y: 0,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    dy: 0,
    isJumping: false,
    rotation: 0,
    mode: 'cube', // 'cube' or 'ship'
    
    reset() {
        this.y = canvas.height * GROUND_Y - this.height;
        this.dy = 0;
        this.isJumping = false;
        this.rotation = 0;
        this.mode = 'cube';
    },

    update() {
        if (this.mode === 'cube') {
            // Gravity
            this.dy += GRAVITY;
            this.y += this.dy;

            // Ground collision
            const groundLevel = canvas.height * GROUND_Y - this.height;
            if (this.y > groundLevel) {
                this.y = groundLevel;
                this.dy = 0;
                this.isJumping = false;
                this.rotation = Math.round(this.rotation / (Math.PI / 2)) * (Math.PI / 2);
            }

            if (this.isJumping) {
                this.rotation += 0.1;
            }
        } else if (this.mode === 'ship') {
            // Ship Physics: Fly up when input is active
            if (isInputActive) {
                this.dy -= 0.6; // Upward force
            } else {
                this.dy += 0.6; // Downward gravity
            }

            // Cap velocity
            if (this.dy > 6) this.dy = 6;
            if (this.dy < -6) this.dy = -6;

            this.y += this.dy;

            // Rotate based on velocity
            this.rotation = this.dy * 0.05;

            // Constrain within vertical bounds
            const groundLevel = canvas.height * GROUND_Y - this.height;
            const topLevel = 0;
            if (this.y > groundLevel) {
                this.y = groundLevel;
                this.dy = 0;
            }
            if (this.y < topLevel) {
                this.y = topLevel;
                this.dy = 0;
            }
        }
    },

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f2ff';
        ctx.fillStyle = '#00f2ff';

        if (this.mode === 'cube') {
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(-this.width / 2 + 10, -this.height / 2 + 10, this.width - 20, this.height - 20);
        } else if (this.mode === 'ship') {
            // Draw Ship shape
            ctx.beginPath();
            ctx.moveTo(-this.width / 2, 0);
            ctx.lineTo(-this.width / 2 - 10, 15);
            ctx.lineTo(this.width / 2, 0);
            ctx.lineTo(-this.width / 2 - 10, -15);
            ctx.closePath();
            ctx.fill();
            
            // Cockpit
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(-5, -5, 10, 10);
        }
        
        ctx.restore();
    },

    jump() {
        if (this.mode === 'cube' && !this.isJumping) {
            this.dy = JUMP_FORCE;
            this.isJumping = true;
        }
    }
};

// Obstacle Classes
class Spike {
    constructor(x) {
        this.x = x;
        this.width = 60; // 40から60へ拡大
        this.height = 60; // 40から60へ拡大
        this.type = 'spike';
    }

    draw() {
        const y = canvas.height * GROUND_Y;
        ctx.beginPath();
        ctx.moveTo(this.x - distance, y);
        ctx.lineTo(this.x - distance + this.width / 2, y - this.height);
        ctx.lineTo(this.x - distance + this.width, y);
        ctx.closePath();
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff007f';
        ctx.fillStyle = '#ff007f';
        ctx.fill();
    }
}

class Block {
    constructor(x, yOffset = 0) {
        this.x = x;
        this.width = 60; // 40から60へ拡大
        this.height = 60; // 40から60へ拡大
        this.yOffset = yOffset;
        this.type = 'block';
    }

    draw() {
        const y = canvas.height * GROUND_Y - this.height - this.yOffset;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#39ff14';
        ctx.fillStyle = '#39ff14';
        ctx.fillRect(this.x - distance, y, this.width, this.height);
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - distance, y, this.width, this.height);
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 5 + 2;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // gravity
        this.life -= 0.02;
    }

    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

class Portal {
    constructor(x, targetMode) {
        this.x = x;
        this.width = 60;
        this.height = canvas.height; // 画面全体の高さにする
        this.targetMode = targetMode;
        this.type = 'portal';
        this.activated = false;
    }

    draw() {
        const y = 0; // 上端から
        ctx.save();
        ctx.shadowBlur = 30;
        ctx.shadowColor = this.targetMode === 'ship' ? '#ff9900' : '#00f2ff';
        
        // グラデーションでゲートを表現
        const grad = ctx.createLinearGradient(this.x - distance, 0, this.x - distance + this.width, 0);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.5, this.targetMode === 'ship' ? 'rgba(255, 153, 0, 0.8)' : 'rgba(0, 242, 255, 0.8)');
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.fillRect(this.x - distance, y, this.width, this.height);
        
        // 中央にラインを描画
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(this.x - distance + this.width / 2, 0);
        ctx.lineTo(this.x - distance + this.width / 2, this.height);
        ctx.stroke();
        ctx.restore();
    }
}

// Level Generation
function generateLevel() {
    obstacles = [];
    let currentX = 800;
    
    // Cube section
    for (let i = 0; i < 15; i++) {
        if (Math.random() < 0.5) obstacles.push(new Spike(currentX));
        else obstacles.push(new Block(currentX));
        currentX += 300 + Math.random() * 200;
    }

    // Portal to Ship
    obstacles.push(new Portal(currentX, 'ship'));
    currentX += 500;

    // Ship section (Higher difficulty obstacles)
    for (let i = 0; i < 20; i++) {
        const h = Math.random() * 200;
        obstacles.push(new Spike(currentX)); // Ground spike
        obstacles.push(new Block(currentX, 150 + h)); // Ceiling block
        currentX += 400;
    }

    // Portal back to Cube
    obstacles.push(new Portal(currentX, 'cube'));
    currentX += 500;

    // Final Cube section
    for (let i = 0; i < 20; i++) {
        obstacles.push(new Spike(currentX));
        currentX += 350;
    }
}

// Background
function drawBackground() {
    // Parralax stars/dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 50; i++) {
        const x = (i * 100 - (distance * 0.2)) % canvas.width;
        const y = (i * 70) % canvas.height;
        ctx.beginPath();
        ctx.arc(x < 0 ? x + canvas.width : x, y, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Ground line
    const groundY = canvas.height * GROUND_Y;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.3)';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Grid effect
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
        const x = (i - (distance % 40));
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, groundY);
        ctx.stroke();
    }
}

// Collision Detection
function checkCollision() {
    const py = player.y;
    const px = player.x;

    for (const obs of obstacles) {
        const ox = obs.x - distance;
        let oy;
        
        if (obs.type === 'spike') {
            oy = canvas.height * GROUND_Y - obs.height;
            // Narrower collision for spike
            if (px + player.width - 10 > ox + 10 && 
                px + 10 < ox + obs.width - 10 && 
                py + player.height > oy) {
                return true;
            }
        } else if (obs.type === 'block') {
            oy = canvas.height * GROUND_Y - obs.height - obs.yOffset;
            if (px + player.width > ox && 
                px < ox + obs.width && 
                py + player.height > oy &&
                py < oy + obs.height) {
                
                // If hitting from top, land on it
                if (player.dy > 0 && py + player.height < oy + 20) {
                    player.y = oy - player.height;
                    player.dy = 0;
                    player.isJumping = false;
                    player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
                } else {
                    // Hitting from side
                    return true;
                }
            }
        } else if (obs.type === 'portal') {
            const ox = obs.x - distance;
            if (px + player.width > ox && px < ox + obs.width && !obs.activated) {
                player.mode = obs.targetMode;
                obs.activated = true; 
            }
        }
    }
    return false;
}

function explode() {
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(player.x + 20, player.y + 20, '#00f2ff'));
    }
    gameState = 'DEAD';
    bgm.pause();
    bgm.currentTime = 0; // 曲を最初に戻す
    deathScreen.classList.remove('hidden');
    gameInfo.classList.add('hidden');
    const prog = Math.min(100, Math.floor(distance / 200));
    finalProgress.innerText = `記録: ${prog}%`;
}

// Game Loop
function update(time) {
    if (gameState !== 'PLAYING') return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawBackground();

    distance += SPEED;
    
    // 長押しによる自動ジャンプ
    if (isInputActive) {
        player.jump();
    }

    player.update();
    player.draw();

    obstacles.forEach(obs => {
        if (obs.x - distance + obs.width > 0 && obs.x - distance < canvas.width) {
            obs.draw();
        }
    });

    // Score / Progress
    const prog = Math.min(100, Math.floor(distance / 200));
    scoreValue.innerText = `${prog}%`;
    progressBar.style.width = `${prog}%`;

    if (checkCollision()) {
        explode();
    }

    if (prog >= 100) {
        gameState = 'WIN';
        alert('勝利！おめでとうございます！');
        resetGame();
    }

    animationId = requestAnimationFrame(update);
}

function updateParticles() {
    if (gameState !== 'DEAD') return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.update();
        p.draw();
    });

    if (particles.length > 0) {
        requestAnimationFrame(updateParticles);
    }
}

function resize() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    player.reset();
}

function startGame() {
    gameState = 'PLAYING';
    bgm.play().catch(e => console.log("Audio play blocked until user interaction"));
    distance = 0;
    obstacles = [];
    particles = [];
    generateLevel();
    player.reset();
    
    startScreen.classList.add('hidden');
    deathScreen.classList.add('hidden');
    gameInfo.classList.remove('hidden');
    
    lastTime = performance.now();
    requestAnimationFrame(update);
}

function resetGame() {
    gameState = 'START';
    startScreen.classList.remove('hidden');
    deathScreen.classList.add('hidden');
    gameInfo.classList.add('hidden');
}

// Event Listeners
window.addEventListener('resize', resize);

const handleInputStart = (e) => {
    if (e.code === 'Space' || e.type === 'mousedown') {
        isInputActive = true;
        if (gameState === 'START') startGame();
        else if (gameState === 'DEAD' && particles.length === 0) startGame();
    }
};

const handleInputEnd = (e) => {
    if (e.code === 'Space' || e.type === 'mouseup' || e.type === 'mouseleave') {
        isInputActive = false;
    }
};

window.addEventListener('keydown', handleInputStart);
window.addEventListener('keyup', handleInputEnd);
canvas.addEventListener('mousedown', handleInputStart);
window.addEventListener('mouseup', handleInputEnd);
window.addEventListener('mouseleave', handleInputEnd);

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

// Init
resize();
resetGame();
