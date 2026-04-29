const TILE_SIZE = 60;
const BASE_SPEED_DEFAULT = 10.3857; 
const GRAVITY_DEFAULT = 1.8;      
const JUMP_FORCE_DEFAULT = -23.6; 

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menuOverlay = document.getElementById('menu-overlay');
const gameUI = document.getElementById('game-ui');
const modeDisplay = document.getElementById('mode-display');
const backToMenuBtn = document.getElementById('back-to-menu');
const modeButtons = document.querySelectorAll('.mode-btn');

const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const closeSettingsBtn = document.getElementById('close-settings');
const miniToggle = document.getElementById('mini-toggle');
const invertToggle = document.getElementById('invert-toggle');
const dualToggle = document.getElementById('dual-toggle');
const p2Toggle = document.getElementById('p2-toggle');
const speedSelect = document.getElementById('speed-select');

let width, height, isPlaying = false, currentMode = 'cube', frameCount = 0;
let accumulator = 0, lastTime = 0;
const fixedTimeStep = 1000 / 60;

const gameSettings = { isMini: false, startInverted: false, isDual: false, is2Player: false, speedMultiplier: 1.0 };

let players = [];

function createPlayer(id, inverted) {
    return {
        id, x: 350, y: 0, 
        visualSize: TILE_SIZE, hitboxSize: TILE_SIZE,
        velY: 0, isGrounded: false, rotation: 0, 
        gravityDir: inverted ? -1 : 1, 
        isHolding: false, robotJumpTimer: 0, 
        inputReady: false, // 今回の修正：一回のクリックで一回のアクションを保証するフラグ
        trail: []
    };
}

function init() {
    resize();
    window.addEventListener('resize', resize);
    const handleKeyDown = (e) => {
        if (!isPlaying) return;
        const targetIdx = gameSettings.is2Player ? 1 : 0;
        if (e.code === 'Space' || e.code === 'ArrowUp') handleInputStart(targetIdx);
    };
    const handleKeyUp = (e) => {
        const targetIdx = gameSettings.is2Player ? 1 : 0;
        if (e.code === 'Space' || e.code === 'ArrowUp') handleInputEnd(targetIdx);
    };
    const handleMouseDown = (e) => { if (!isPlaying) return; handleInputStart(0); };
    const handleMouseUp = (e) => handleInputEnd(0);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', (e) => { if (isPlaying) { e.preventDefault(); handleInputStart(0); } });
    canvas.addEventListener('touchend', () => handleInputEnd(0));
    window.addEventListener('blur', () => players.forEach((_, i) => handleInputEnd(i)));
    window.addEventListener('contextmenu', (e) => { if (isPlaying) e.preventDefault(); });

    modeButtons.forEach(btn => btn.addEventListener('click', () => startLevel(btn.dataset.mode)));
    backToMenuBtn.addEventListener('click', () => { isPlaying = false; players.forEach((_, i) => handleInputEnd(i)); menuOverlay.classList.remove('hidden'); gameUI.classList.add('hidden'); });
    settingsBtn.addEventListener('click', () => settingsPanel.classList.remove('hidden'));
    closeSettingsBtn.addEventListener('click', () => settingsPanel.classList.add('hidden'));
    
    miniToggle.addEventListener('change', (e) => { gameSettings.isMini = e.target.checked; if (isPlaying) updatePlayerSizes(); });
    invertToggle.addEventListener('change', (e) => gameSettings.startInverted = e.target.checked);
    dualToggle.addEventListener('change', (e) => { gameSettings.isDual = e.target.checked; if (isPlaying) updateDualState(); });
    p2Toggle.addEventListener('change', (e) => gameSettings.is2Player = e.target.checked);
    speedSelect.addEventListener('change', (e) => gameSettings.speedMultiplier = parseFloat(e.target.value));

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function resize() {
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = width; canvas.height = height;
}

function updateDualState() {
    if (gameSettings.isDual && players.length < 2) {
        const p1 = players[0];
        const p2 = createPlayer(2, p1.gravityDir === 1);
        players.push(p2);
        updatePlayerSizes();
    } else if (!gameSettings.isDual && players.length > 1) {
        players.splice(1, 1);
    }
}

function updatePlayerSizes() {
    const floorY = height - 80;
    players.forEach(p => {
        p.visualSize = gameSettings.isMini ? TILE_SIZE / 2 : TILE_SIZE;
        p.hitboxSize = p.visualSize; 
        if (p.isGrounded) p.y = (floorY - p.visualSize / 2);
    });
}

function startLevel(mode) {
    currentMode = mode; isPlaying = true;
    menuOverlay.classList.add('hidden'); gameUI.classList.remove('hidden');
    modeDisplay.textContent = `Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
    players = [createPlayer(1, gameSettings.startInverted)];
    if (gameSettings.isDual) players.push(createPlayer(2, !gameSettings.startInverted));
    updatePlayerSizes();
    players.forEach(p => { 
        p.y = p.gravityDir === 1 ? (height - 80 - p.visualSize / 2) : (50 + p.visualSize / 2); 
    });
    frameCount = 0;
}

function handleInputStart(playerIdx) {
    if (!isPlaying) return;
    const targetPlayers = gameSettings.is2Player ? [players[playerIdx]] : players;
    targetPlayers.forEach(p => {
        if (!p) return;
        p.isHolding = true;
        p.inputReady = true; // 新しくアクションボタンが押されたことを記録
        
        const miniM = gameSettings.isMini ? 1.4 : 1.0; 
        switch (currentMode) {
            case 'cube': if (p.isGrounded) { p.velY = -23.6 * p.gravityDir; p.isGrounded = false; } break;
            case 'ball': if (p.isGrounded) { p.gravityDir *= -1; p.isGrounded = false; p.inputReady = false; } break;
            case 'ufo':  p.velY = -21.0 * miniM * p.gravityDir; p.inputReady = false; break; 
            case 'robot': if (p.isGrounded) { p.velY = -18.0 * p.gravityDir; p.robotJumpTimer = 15; p.isGrounded = false; p.inputReady = false; } break;
            case 'spider': if (p.isGrounded) { p.gravityDir *= -1; p.isGrounded = false; p.inputReady = false; } break;
            case 'swing': p.gravityDir *= -1; p.isGrounded = false; p.inputReady = false; break;
        }
    });
}

function handleInputEnd(playerIdx) {
    const targetPlayers = gameSettings.is2Player ? [players[playerIdx]] : players;
    targetPlayers.forEach(p => { if (p) { p.isHolding = false; p.robotJumpTimer = 0; p.inputReady = false; } });
}

function physicsUpdate() {
    if (!isPlaying) return;
    const floorY = height - 80, ceilingY = 50;
    const speedM = gameSettings.speedMultiplier;
    const miniM = gameSettings.isMini ? 1.5 : 1.0;
    const curBaseSpeed = BASE_SPEED_DEFAULT * speedM;
    
    players.forEach(p => {
        switch (currentMode) {
            case 'cube':
                // キューブのみ：押しっぱなしで連続ジャンプ可能
                if (p.isGrounded && p.isHolding) { p.velY = -23.6 * p.gravityDir; p.isGrounded = false; }
                p.velY += (GRAVITY_DEFAULT * miniM) * p.gravityDir; break;
            case 'ship':
                const shipMiniG = gameSettings.isMini ? 1.2 : 1.0;
                const baseShipG = 0.75 * shipMiniG;
                // 下降力と上昇力を全く同じにするための計算
                // 離している時: +baseShipG, 押している時: -baseShipG
                const currentForce = p.isHolding ? -baseShipG : baseShipG;
                p.velY += currentForce * p.gravityDir;
                p.velY *= 0.95; 
                p.y += p.velY;
                p.rotation = p.velY * 2;
                break;
            case 'ball':
                // ボール：押しっぱなしでも一度着地したら、次のクリックが必要
                if (p.isGrounded && p.isHolding && p.inputReady) { p.gravityDir *= -1; p.isGrounded = false; p.inputReady = false; }
                p.velY += (1.2 * miniM) * p.gravityDir; break;
            case 'ufo': p.velY += (GRAVITY_DEFAULT * miniM) * p.gravityDir; break;
            case 'wave':
                let waveVY = curBaseSpeed; if (gameSettings.isMini) waveVY *= 2.0;
                p.velY = (p.isHolding ? -waveVY : waveVY) * p.gravityDir; break;
            case 'robot':
                // ロボット：単発ジャンプ & タメ
                if (p.isGrounded && p.isHolding && p.inputReady) { 
                    p.velY = -18.0 * p.gravityDir; p.robotJumpTimer = 15; p.isGrounded = false; p.inputReady = false; 
                }
                p.velY += (GRAVITY_DEFAULT * miniM) * p.gravityDir;
                if (p.isHolding && p.robotJumpTimer > 0) { p.velY -= 1.4 * p.gravityDir; p.robotJumpTimer--; } break;
            case 'spider':
                // スパイダー：単発テレポート
                if (p.isGrounded && p.isHolding && p.inputReady) { p.gravityDir *= -1; p.isGrounded = false; p.inputReady = false; }
                p.velY = 250.0 * p.gravityDir; break;
            case 'swing':
                const swingG = 0.5 * miniM * p.gravityDir;
                p.velY += swingG; p.velY *= 0.96; break;
        }
        
        p.y += p.velY;
        p.isGrounded = false;
        
        if (p.gravityDir === 1) {
            if (p.y >= floorY - p.visualSize / 2) { p.y = floorY - p.visualSize / 2; p.velY = 0; p.isGrounded = true; }
            else if (p.y <= ceilingY + p.visualSize / 2) { p.y = ceilingY + p.visualSize / 2; p.velY = 0; }
        } else {
            if (p.y <= ceilingY + p.visualSize / 2) { p.y = ceilingY + p.visualSize / 2; p.velY = 0; p.isGrounded = true; }
            else if (p.y >= floorY - p.visualSize / 2) { p.y = floorY - p.visualSize / 2; p.velY = 0; }
        }

        if (currentMode === 'cube') {
            if (p.isGrounded) p.rotation = Math.round(p.rotation / 90) * 90;
            else p.rotation += 6.75 * p.gravityDir;
        } else if (['ship', 'ufo', 'swing'].includes(currentMode)) {
            p.rotation = p.velY * 2;
        } else if (currentMode === 'ball') {
            if (!p.isGrounded) p.rotation += 8 * p.gravityDir;
        } else if (currentMode === 'wave') {
            const angle = gameSettings.isMini ? 63.4 : 45;
            p.rotation = p.velY * p.gravityDir > 0 ? angle : -angle;
        } else if (currentMode === 'robot') {
            if (p.isGrounded) p.rotation = 0;
        }

        p.trail.push({ f: frameCount, y: p.y });
        if (p.trail.length > 50) p.trail.shift();
    });
    frameCount += curBaseSpeed;
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    drawGrid();
    if (!isPlaying || players.length === 0) return;
    const floorY = height - 80, ceilingY = 50;
    players.forEach(p => {
        if (p.trail.length > 1) {
            ctx.strokeStyle = p.id === 1 ? '#00ffff' : '#ff00ff';
            ctx.lineWidth = currentMode === 'wave' ? 4 : 2.5;
            ctx.beginPath();
            for (let i = 0; i < p.trail.length; i++) {
                const tx = p.x - (frameCount - p.trail[i].f);
                i === 0 ? ctx.moveTo(tx, p.trail[i].y) : ctx.lineTo(tx, p.trail[i].y);
            }
            ctx.stroke();
        }
        
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation * Math.PI / 180);
        if (p.gravityDir === -1) ctx.scale(1, -1);
        drawPlayerIcon(p.id === 2, p.visualSize);
        ctx.restore();
        
        ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 2;
        let pSize = currentMode === 'wave' ? p.visualSize * 0.35 : p.visualSize;
        let hRY = p.y;
        if (currentMode === 'wave') {
            const offset = (p.visualSize - pSize) / 2;
            hRY += offset * p.gravityDir;
        }
        ctx.strokeRect(p.x - pSize/2, hRY - pSize/2, pSize, pSize);
        ctx.beginPath();
        ctx.moveTo(p.x - 5, hRY); ctx.lineTo(p.x + 5, hRY);
        ctx.moveTo(p.x, hRY - 5); ctx.lineTo(p.x, hRY + 5);
        ctx.stroke();
    });
    ctx.strokeStyle = '#22aaff'; ctx.lineWidth = 4; ctx.shadowBlur = 10; ctx.shadowColor = '#00ffff';
    ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(width, floorY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, ceilingY); ctx.lineTo(width, ceilingY); ctx.stroke();
}

function drawPlayerIcon(isDual, visualSize) {
    ctx.fillStyle = isDual ? '#ff00ff' : '#00ffff';
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    const s = visualSize, h = s / 2;
    switch (currentMode) {
        case 'cube': ctx.fillRect(-h, -h, s, s); ctx.strokeRect(-h, -h, s, s); break;
        case 'ship': ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(h, -h/2); ctx.lineTo(h, h/2); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
        case 'ball': ctx.beginPath(); ctx.arc(0, 0, h, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); break;
        case 'ufo': ctx.beginPath(); ctx.ellipse(0, 0, h, h/2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); break;
        case 'wave': 
            ctx.beginPath(); 
            ctx.moveTo(-h - h/3, h); ctx.lineTo(h - h/3, 0); ctx.lineTo(-h - h/3, -h); 
            ctx.closePath(); ctx.fill(); ctx.stroke(); break;
        case 'robot': ctx.fillRect(-h/2, -h, h, s); ctx.strokeRect(-h/2, -h, h, s); break;
        case 'spider': ctx.fillRect(-h/2, -h/4, h, h/2); ctx.strokeRect(-h/2, -h/4, h, h/2); break;
        case 'swing': ctx.beginPath(); ctx.moveTo(-h, -h/4); ctx.lineTo(h, -h/2); ctx.lineTo(h, h/2); ctx.lineTo(-h, h/4); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    }
}

function drawGrid() {
    const gridSize = TILE_SIZE, offsetX = -(frameCount % gridSize), floorY = height - 80;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; ctx.lineWidth = 1;
    for (let x = offsetX; x < width; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = floorY; y > 0; y -= gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
}

function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    accumulator += deltaTime;
    while (accumulator >= fixedTimeStep) { physicsUpdate(); accumulator -= fixedTimeStep; }
    draw();
    requestAnimationFrame(gameLoop);
}
init();
