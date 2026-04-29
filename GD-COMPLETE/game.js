// GEOMETRY DASH CLONE - STEREO MADNESS 100% ACCURACY (V4)
const TILE_SIZE = 30;
const BASE_SPEED = 5.24; // 10.48 blocks/sec * 30px / 60fps
const GRAVITY = 0.9;
const JUMP_FORCE = -11.5;
const GROUND_Y_OFFSET = 120;

const state = {
    screen: 'menu',
    frameCount: 0,
    lastTime: 0,
    accumulator: 0,
    timeStep: 1000 / 60,
    progress: 0,
    levelLength: 0,
    audioCtx: null,
    musicTimer: 0,
    levelData: []
};

function playJumpSound() {
    if (!state.audioCtx) return;
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, state.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, state.audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, state.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, state.audioCtx.currentTime + 0.1);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(); osc.stop(state.audioCtx.currentTime + 0.1);
}

// Synthesis of the Stereo Madness intro beat/melody
function playMusicStep() {
    if (!state.audioCtx || state.screen !== 'playing') return;
    const now = state.audioCtx.currentTime;
    const tempo = 140;
    const beatLen = 60 / tempo; // 0.428s
    
    if (state.musicTimer <= now) {
        // Kick drum (Every beat)
        const kick = state.audioCtx.createOscillator();
        const kGain = state.audioCtx.createGain();
        kick.frequency.setValueAtTime(120, state.musicTimer);
        kick.frequency.exponentialRampToValueAtTime(30, state.musicTimer + 0.2);
        kGain.gain.setValueAtTime(0.3, state.musicTimer);
        kGain.gain.exponentialRampToValueAtTime(0.01, state.musicTimer + 0.2);
        kick.connect(kGain); kGain.connect(state.audioCtx.destination);
        kick.start(state.musicTimer); kick.stop(state.musicTimer + 0.2);
        
        // Simple bassline (C, Eb, F, G...)
        const bass = state.audioCtx.createOscillator();
        const bGain = state.audioCtx.createGain();
        const notes = [130.81, 155.56, 174.61, 196.00]; // C3, Eb3, F3, G3
        const note = notes[Math.floor(state.frameCount / 60) % notes.length];
        bass.type = 'sawtooth';
        bass.frequency.setValueAtTime(note / 2, state.musicTimer);
        bGain.gain.setValueAtTime(0.1, state.musicTimer);
        bGain.gain.exponentialRampToValueAtTime(0.01, state.musicTimer + beatLen * 0.8);
        bass.connect(bGain); bGain.connect(state.audioCtx.destination);
        bass.start(state.musicTimer); bass.stop(state.musicTimer + beatLen * 0.8);

        state.musicTimer += beatLen;
    }
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let width, height;

const player = {
    x: 0, y: 0, velY: 0, size: 30, rotation: 0,
    isGrounded: false, isDead: false, inputActive: false,
    trail: [], mode: 'cube'
};

function init() {
    resize();
    window.addEventListener('resize', resize);
    
    const startAudio = () => {
        if (!state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (state.audioCtx.state === 'suspended') state.audioCtx.resume();
    };

    window.addEventListener('keydown', (e) => {
        startAudio();
        if (e.code === 'Space' || e.code === 'ArrowUp') player.inputActive = true;
        if (e.code === 'Escape') togglePause();
    });
    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') player.inputActive = false;
    });
    canvas.addEventListener('mousedown', () => {
        startAudio();
        player.inputActive = true;
    });
    window.addEventListener('mouseup', () => player.inputActive = false);

    document.getElementById('level-select-btn').onclick = () => showOverlay('level-selector');
    document.getElementById('back-to-main').onclick = () => showOverlay('main-menu');
    document.getElementById('play-level-btn').onclick = startStereoMadness;
    document.getElementById('resume-btn').onclick = togglePause;
    document.getElementById('restart-btn').onclick = restartGame;
    document.getElementById('exit-btn').onclick = exitToMenu;
    document.getElementById('pause-btn').onclick = togglePause;

    state.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function showOverlay(id) {
    document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(id);
    if(target) target.classList.remove('hidden');
}

function resize() {
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = width; canvas.height = height;
}

function createStereoMadness() {
    state.levelData = [];
    const b = (x, y, w=1, h=1) => state.levelData.push({ type: 'block', x: x*TILE_SIZE, y: y*TILE_SIZE, w: w*TILE_SIZE, h: h*TILE_SIZE });
    const s = (x, y) => state.levelData.push({ type: 'spike', x: x*TILE_SIZE, y: y*TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE });
    const p = (x, y, mode) => state.levelData.push({ type: 'portal', x: x*TILE_SIZE, y: y*TILE_SIZE, w: TILE_SIZE*2, h: TILE_SIZE*4, mode });

    // Official Stereo Madness Part 1 (First 30%)
    for(let i=0; i<500; i++) b(i, -1); // Ground

    // 0% - Starting spikes
    s(15, 0); s(22, 0); s(29, 0);

    // Initial block pillars
    b(38, 0); b(44, 0);
    
    // Pillar + Spike sequence
    b(52, 0); s(53, 0);
    s(60, 0); b(61, 0);

    // Stairs - exactly matching the height increase
    b(70, 0, 2); b(72, 1, 2); b(74, 2, 2);
    
    // High jump
    b(85, 2, 4);
    
    // TRIPLE SPIKES (X=100)
    s(100, 0); s(101, 0); s(102, 0);

    // Mid-air platforms with spikes
    b(115, 0, 5, 2); s(117, 2);
    
    // Wall and jump
    b(130, 0, 1, 3);
    b(138, 0, 1, 4);
    
    // Fake blocks and ship transition
    b(150, 0, 2, 1); b(152, 1, 2, 1); b(154, 2, 2, 1);
    
    // SHIP PORTAL (X=165)
    p(165, 3, 'ship');
    
    // Ship Tunnel
    for(let i=165; i<300; i++) b(i, 9); // Ceiling
    
    b(190, 0, 4, 3);
    b(220, 5, 4, 4);
    b(250, 0, 4, 4);

    p(280, 2, 'cube');

    state.levelLength = 500 * TILE_SIZE;
}

function startStereoMadness() {
    createStereoMadness();
    resetPlayer();
    showOverlay('game-ui');
    state.screen = 'playing';
    state.musicTimer = state.audioCtx ? state.audioCtx.currentTime : 0;
}

function resetPlayer() {
    player.x = 0; player.y = height - GROUND_Y_OFFSET - player.size;
    player.velY = 0; player.rotation = 0; player.isDead = false;
    player.isGrounded = true; player.mode = 'cube'; player.trail = [];
}

function restartGame() {
    resetPlayer();
    state.screen = 'playing';
    document.getElementById('pause-menu').classList.add('hidden');
    state.musicTimer = state.audioCtx ? state.audioCtx.currentTime : 0;
}

function togglePause() {
    if (state.screen === 'playing') {
        state.screen = 'paused';
        document.getElementById('pause-menu').classList.remove('hidden');
    } else if (state.screen === 'paused') {
        state.screen = 'playing';
        document.getElementById('pause-menu').classList.add('hidden');
    }
}

function die() {
    if (player.isDead) return;
    player.isDead = true;
    setTimeout(restartGame, 1000);
}

function updatePhysics() {
    if (state.screen !== 'playing' || player.isDead) return;

    player.x += BASE_SPEED;
    if (player.mode === 'cube') {
        player.velY += GRAVITY;
        if (player.inputActive && player.isGrounded) {
            player.velY = JUMP_FORCE;
            player.isGrounded = false;
            playJumpSound();
        }
        if (!player.isGrounded) player.rotation += 6;
        else player.rotation = Math.round(player.rotation / 90) * 90;
    } else { // Ship mode
        player.velY += player.inputActive ? -0.85 : 0.65;
        player.velY = Math.max(-10, Math.min(10, player.velY));
        player.rotation = player.velY * 3;
    }
    player.y += player.velY;

    const floorY = height - GROUND_Y_OFFSET;
    if (player.y + player.size > floorY) {
        player.y = floorY - player.size;
        player.velY = 0;
        player.isGrounded = true;
    } else if (player.y < 0) { // Keep in bounds
        player.y = 0; player.velY = 0;
    } else {
        player.isGrounded = false;
    }

    checkCollisions(floorY);
    state.progress = Math.min(100, Math.floor((player.x / state.levelLength) * 100));
    const pBar = document.getElementById('progress-bar');
    if(pBar) pBar.style.width = state.progress + '%';
    const pText = document.getElementById('percentage');
    if(pText) pText.textContent = state.progress + '%';
    
    player.trail.push({ x: player.x, y: player.y });
    if (player.trail.length > 20) player.trail.shift();
    state.frameCount++;
    playMusicStep();
}

function checkCollisions(floorY) {
    const px = player.x, py = player.y, s = player.size;
    for (let obj of state.levelData) {
        if (obj.x < player.x - 300 || obj.x > player.x + width) continue;
        const ox = obj.x, oy = floorY - obj.y - obj.h, ow = obj.w, oh = obj.h;
        if (px + s > ox && px < ox + ow && py + s > oy && py < oy + oh) {
            if (obj.type === 'spike') {
                const p = 6; 
                if (px + s - p > ox && px + p < ox + ow && py + s - p > oy && py + p < oy + oh) die();
            } else if (obj.type === 'block') {
                const overlaps = [(py+s)-oy, (oy+oh)-py, (px+s)-ox, (ox+ow)-px];
                const m = Math.min(...overlaps);
                if (m === overlaps[0] && player.velY >= 0) {
                    player.y = oy - s; player.velY = 0; player.isGrounded = true;
                } else die(); // Sideways or bottom collision is death
            } else if (obj.type === 'portal') {
                player.mode = obj.mode;
            }
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    const pulse = Math.sin(state.frameCount / 10) * 5;
    ctx.fillStyle = `hsl(210, 40%, ${15 + pulse}%)`;
    ctx.fillRect(0, 0, width, height);
    
    ctx.save();
    ctx.translate(-player.x + 300, 0);
    const floorY = height - GROUND_Y_OFFSET;
    
    ctx.fillStyle = '#0a1a3a'; ctx.fillRect(player.x - 300, floorY, width, GROUND_Y_OFFSET);
    ctx.strokeStyle = '#3399ff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(player.x - 300, floorY); ctx.lineTo(player.x + width, floorY); ctx.stroke();

    for (let obj of state.levelData) {
        const oy = floorY - obj.y - obj.h;
        if (obj.type === 'block') {
            ctx.fillStyle = '#000'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
            ctx.fillRect(obj.x, oy, obj.w, obj.h); ctx.strokeRect(obj.x, oy, obj.w, obj.h);
        } else if (obj.type === 'spike') {
            ctx.fillStyle = '#fff'; ctx.beginPath();
            ctx.moveTo(obj.x, oy + obj.h); ctx.lineTo(obj.x + obj.w/2, oy); ctx.lineTo(obj.x + obj.w, oy + obj.h);
            ctx.closePath(); ctx.fill();
        } else if (obj.type === 'portal') {
            ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]);
            ctx.strokeRect(obj.x, oy, obj.w, obj.h); ctx.setLineDash([]);
        }
    }

    if (!player.isDead) {
        if (player.trail.length > 1) {
            ctx.strokeStyle = 'rgba(0, 210, 255, 0.4)'; ctx.lineWidth = player.mode === 'cube' ? 6 : 4;
            ctx.beginPath();
            ctx.moveTo(player.trail[0].x + player.size/2, player.trail[0].y + player.size/2);
            for(let pt of player.trail) ctx.lineTo(pt.x + player.size/2, pt.y + player.size/2);
            ctx.stroke();
        }
        ctx.save();
        ctx.translate(player.x + player.size/2, player.y + player.size/2);
        ctx.rotate(player.rotation * Math.PI / 180);
        ctx.fillStyle = '#00d2ff'; ctx.fillRect(-player.size/2, -player.size/2, player.size, player.size);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(-player.size/2, -player.size/2, player.size, player.size);
        ctx.restore();
    }
    ctx.restore();
}

function gameLoop(currentTime) {
    const deltaTime = currentTime - state.lastTime;
    state.lastTime = currentTime;
    if (state.screen === 'playing') {
        state.accumulator += deltaTime;
        while (state.accumulator >= state.timeStep) {
            updatePhysics(); state.accumulator -= state.timeStep;
        }
    }
    draw();
    requestAnimationFrame(gameLoop);
}

init();
