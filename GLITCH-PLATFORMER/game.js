const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Constants
const GRAVITY = 0.65;
const JUMP_FORCE = -17;
const MOVE_SPEED = 6;
const WIDTH = 800;
const HEIGHT = 600;
const TILE_SIZE = 80;
const HITBOX_PAD_X = 15; // 左右15pxずつの余裕
const HITBOX_PAD_Y = 10; // 上下10pxずつの余裕

canvas.width = WIDTH;
canvas.height = HEIGHT;

// Rules have been removed. The focus is now on hunting monsters.

// Classes
class Player {
    constructor() { 
        this.reset(); 
        this.facing = 1; 
        this.animTimer = 0; 
        this.stoppedTimer = 0; 
        this.updateWeaponUI();
    }
    updateWeaponUI() {
        const textMap = { 'handgun': 'ハンドガン', 'smg': 'サブマシンガン', 'shotgun': 'ショットガン', 'pulse': 'パルスキャノン', 'sniper': '対物スナイパー', 'launcher': '重火器ランチャー', 'rail': 'プラズマレールガン' };
        const el = document.getElementById('equipped-weapon-text');
        this.weapon = localStorage.getItem('equippedWeapon') || 'handgun';
        this.speedMult = parseFloat(localStorage.getItem('speedMult') || '1.0');
        this.hasDoubleJump = localStorage.getItem('hasDoubleJump') === 'true';
        this.hasShield = localStorage.getItem('hasShield') === 'true';
        if (el) el.innerText = textMap[this.weapon] || this.weapon;
    }
    reset() { 
        this.x = 100; this.y = 400; this.vx = 0; this.vy = 0; this.onGround = false; this.dead = false; this.distance = 0; this.stoppedTimer = 0; 
        this.jumps = 0; this.invuln = 0;
    }
    update(elapsed) {
        if (this.dead || isGameOver || !isGameStarted) return;
        
        // 猶予期間（開始1秒間）はルール違反を無視する
        const isGracePeriod = elapsed < 1.0;

        if (keys['ArrowRight']) { this.vx = MOVE_SPEED * this.speedMult; }
        else if (keys['ArrowLeft']) { this.vx = -MOVE_SPEED * this.speedMult; }
        else { this.vx = 0; }

        if (keys['ArrowUp'] && !this.upPressed) {
            if (this.onGround) {
                this.vy = JUMP_FORCE; this.onGround = false; this.jumps = 1;
            } else if (this.hasDoubleJump && this.jumps < 2) {
                this.vy = JUMP_FORCE * 0.9; this.jumps = 2;
                spawnParticles(this.x + TILE_SIZE/2, this.y + TILE_SIZE, '#ffffff', 10); // ジャンプ煙
            }
        }
        this.upPressed = keys['ArrowUp'];
        if (this.invuln > 0) this.invuln--;
        this.vy += GRAVITY; this.x += this.vx; this.y += this.vy;
        this.onGround = false;
        platforms.forEach(p => {
            const px_mid = this.x + TILE_SIZE/2;
            // 境界値を正確に (= を追加)
            if (px_mid >= p.x && px_mid < p.x + p.w) {
                let surfaceY = p.y;
                if (p.isSlope) {
                    let progress = (px_mid - p.x) / p.w;
                    surfaceY = p.y + (p.y2 - p.y) * progress;
                }
                
                // 接地判定をより寛容にし、坂道での「引っ掛かり」や「埋まり」を解消
                const feetY = this.y + TILE_SIZE;
                const threshold = Math.max(25, this.vy + 15);
                if (feetY > surfaceY - 20 && feetY < surfaceY + threshold) {
                    this.y = surfaceY - TILE_SIZE;
                    this.vy = 0; this.onGround = true;
                    this.jumps = 0; // 接地したらジャンプ回数をリセット
                }
            }
        });
        if (this.y > HEIGHT) death('排気坑へ転落');
        if (this.x < 0) this.x = 0;
        
        // 射撃 (装備中の武器に応じた挙動)
        if ((mouseIsDown || keys['Space']) && !this.shootCooldown) {
            const scrollOffset = this.x - 100;
            const px = this.x - scrollOffset + TILE_SIZE/2;
            const py = this.y + TILE_SIZE/2;
            const angle = Math.atan2(mouseY - py, mouseX - px);
            const bSpeed = 16;
            
            if (this.weapon === 'shotgun') {
                for (let i = -1; i <= 1; i++) {
                    const a = angle + i * 0.2;
                    projectiles.push(new Projectile(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, Math.cos(a) * bSpeed, Math.sin(a) * bSpeed, 'player', 'shotgun'));
                }
                this.shootCooldown = 50;
                playShootSound('shotgun');
            } else if (this.weapon === 'smg') {
                projectiles.push(new Projectile(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, Math.cos(angle) * 18, Math.sin(angle) * 18, 'player', 'smg'));
                this.shootCooldown = 12; // 高速連射
                playShootSound('smg');
            } else if (this.weapon === 'pulse') {
                projectiles.push(new Projectile(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, Math.cos(angle) * 20, Math.sin(angle) * 20, 'player', 'pulse'));
                this.shootCooldown = 40;
                playShootSound('pulse');
            } else if (this.weapon === 'sniper') {
                projectiles.push(new Projectile(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, Math.cos(angle) * 40, Math.sin(angle) * 40, 'player', 'sniper'));
                this.shootCooldown = 80;
                playShootSound('sniper');
            } else if (this.weapon === 'launcher') {
                const p = new Projectile(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, Math.cos(angle) * 12, Math.sin(angle) * 12 - 5, 'player', 'launcher');
                p.gravity = 0.2; // 放物線
                projectiles.push(p);
                this.shootCooldown = 120;
                playShootSound('launcher');
            } else if (this.weapon === 'rail') {
                projectiles.push(new Projectile(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, Math.cos(angle) * 50, Math.sin(angle) * 50, 'player', 'rail'));
                this.shootCooldown = 60;
                playShootSound('rail');
            } else {
                // デフォルト: ハンドガン
                projectiles.push(new Projectile(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, Math.cos(angle) * bSpeed, Math.sin(angle) * bSpeed, 'player', 'handgun'));
                this.shootCooldown = 35;
                playShootSound('handgun');
            }
        }
        if (this.shootCooldown > 0) this.shootCooldown--;

        this.distance = Math.max(this.distance, Math.floor(this.x / 10));
        if (this.distance >= targetDistance) win();
    }
    draw() {
        const scrollOffset = this.x - 100;
        ctx.save();
        ctx.translate(this.x - scrollOffset + TILE_SIZE/2, this.y + TILE_SIZE/2);
        if (this.vx > 0) this.facing = 1; else if (this.vx < 0) this.facing = -1;
        ctx.scale(this.facing, 1);
        
        // 停止制限時に震える演出 (猶予1秒の間)
        if (this.stoppedTimer > 0) {
            ctx.translate((Math.random() - 0.5) * this.stoppedTimer * 10, (Math.random() - 0.5) * this.stoppedTimer * 10);
        }

        ctx.imageSmoothingEnabled = false;
        
        // 被ダメージ時の点滅
        if (this.invuln > 0 && Math.floor(Date.now()/50) % 2 === 0) ctx.globalAlpha = 0.3;
        
        if (Math.abs(this.vx) > 0) { 
            this.animTimer += 0.18;
            // 身体の微妙な上下動
            ctx.translate(0, Math.abs(Math.sin(this.animTimer * 3)) * -2);
        } else {
            this.animTimer = 0;
        }

        // === 足のアニメーション（プログラム描画） ===
        if (Math.abs(this.vx) > 0) {
            const legSwing = Math.sin(this.animTimer * 6) * 10; // 足の前後の振り幅
            const legLift = Math.abs(Math.cos(this.animTimer * 6)) * 6; // 足の上下

            ctx.fillStyle = '#2a1f1a'; // 暗い茶色（ブーツの色）
            // 左足
            ctx.save();
            ctx.translate(-10, TILE_SIZE/2 - 8);
            ctx.fillRect(legSwing - 6, -legLift, 12, 14);
            // ブーツの底
            ctx.fillStyle = '#1a1210';
            ctx.fillRect(legSwing - 7, 14 - legLift - 2, 14, 4);
            ctx.restore();

            // 右足（位相をずらす）
            const legSwing2 = Math.sin(this.animTimer * 6 + Math.PI) * 10;
            const legLift2 = Math.abs(Math.cos(this.animTimer * 6 + Math.PI)) * 6;
            ctx.fillStyle = '#2a1f1a';
            ctx.save();
            ctx.translate(10, TILE_SIZE/2 - 8);
            ctx.fillRect(legSwing2 - 6, -legLift2, 12, 14);
            ctx.fillStyle = '#1a1210';
            ctx.fillRect(legSwing2 - 7, 14 - legLift2 - 2, 14, 4);
            ctx.restore();
        }

        // === キツネ本体の描画（画像） ===
        if (playerImg && playerImg.complete) {
            ctx.drawImage(playerImg, -TILE_SIZE/2, -TILE_SIZE * 0.55, TILE_SIZE, TILE_SIZE);
        } else { 
            ctx.fillStyle = '#00f2ff'; 
            ctx.fillRect(-TILE_SIZE/2, -TILE_SIZE/2, TILE_SIZE, TILE_SIZE); 
        }
        
        ctx.restore(); // facing scale を解除

        // === 銃の描画（マウス方向を向く・スプライト画像） ===
        const px = this.x - scrollOffset + TILE_SIZE/2;
        const py = this.y + TILE_SIZE/2;
        const gunAngle = Math.atan2(mouseY - py, mouseX - px);
        
        // 武器タイプに応じた画像を選択
        const w = this.weapon || 'handgun';
        const gunImg = gunImages[w];
        
        if (gunImg && gunImg.complete) {
            ctx.save();
            ctx.translate(px, py - 5);
            ctx.rotate(gunAngle);
            // マウスが左側にある場合は銃を上下反転
            if (Math.abs(gunAngle) > Math.PI / 2) {
                ctx.scale(1, -1);
            }
            const gunW = 45;
            const gunH = 25;
            ctx.drawImage(gunImg, 5, -gunH/2, gunW, gunH);
            ctx.restore();
        }
        
        // 銃口の方向ガイド（エイムドット）
        ctx.save();
        ctx.translate(px + Math.cos(gunAngle) * 55, py - 5 + Math.sin(gunAngle) * 55);
        ctx.fillStyle = '#00f2ff';
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        // バリア表示
        if (this.hasShield) {
            ctx.save();
            ctx.strokeStyle = '#00f2ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(px, py, TILE_SIZE / 1.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(0, 242, 255, 0.1)';
            ctx.fill();
            ctx.restore();
        }
    }
}

class Enemy {
    constructor(x, y, type = 'ground') { 
        this.x = x; this.y = y; this.vx = type === 'drone' ? -4 : -2.5; 
        this.type = type;
        this.dead = false; 
        this.animTimer = Math.random()*10;
        this.baseY = y;
    }
    update() {
        if (isGameOver || !isGameStarted || this.dead) return;
        this.x += this.vx;
        if (this.type === 'ground') {
            const px_mid = this.x + TILE_SIZE/2;
            const dist = Math.abs(this.x - player.x);
            if (dist < 1000) {
                this.vx = (player.x > this.x ? 7.5 : -7.5);
            }
            
            // 地面の敵の接地判定をプレイヤー同様に強化（坂道対応）
            let onPlatform = false;
            platforms.forEach(p => {
                if (px_mid >= p.x && px_mid < p.x + p.w) {
                    let surfaceY = p.y;
                    if (p.isSlope) {
                        let progress = (px_mid - p.x) / p.w;
                        surfaceY = p.y + (p.y2 - p.y) * progress;
                    }
                    const feetY = this.y + TILE_SIZE;
                    if (feetY > surfaceY - 30 && feetY < surfaceY + 30) {
                        this.y = surfaceY - TILE_SIZE;
                        onPlatform = true;
                    }
                }
            });

            if (!onPlatform) {
                this.vx *= -1;
                this.x += this.vx * 3;
            }
        } else {
            // ドローンは空中を浮遊し、射撃攻撃を行う
            this.y = this.baseY + Math.sin(this.animTimer) * 30;
            if (Math.abs(this.x - player.x) < 800 && Math.random() > 0.98) this.vx *= -1; 

            // ドローンの射撃
            this.shootCooldown = (this.shootCooldown || 0) - 1;
            if (this.shootCooldown <= 0 && Math.abs(this.x - player.x) < 500 && !this.dead) {
                let vx = this.x > player.x ? -6 : 6;
                projectiles.push(new Projectile(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, vx, 0, 'enemy'));
                this.shootCooldown = 150 + Math.random() * 100;
            }
        }
    }
    draw(scrollOffset) {
        if (this.dead) return;
        ctx.save();
        ctx.translate(this.x - scrollOffset + TILE_SIZE/2, this.y + TILE_SIZE/2);
        
        let sx = this.vx > 0 ? 1 : -1;
        let sy = 1;
        
        this.animTimer += 0.15;
        if (this.type === 'drone') {
            ctx.rotate(Math.sin(this.animTimer * 2) * 0.1);
        } else {
            ctx.translate(0, Math.sin(this.animTimer) * 4);
        }

        ctx.scale(sx, sy);
        ctx.imageSmoothingEnabled = false;
        let img = this.type === 'drone' ? enemy2Img : enemyImg;
        if (img && img.complete) ctx.drawImage(img, -TILE_SIZE/2, -TILE_SIZE/2, TILE_SIZE, TILE_SIZE);
        else { ctx.fillStyle = this.type === 'drone' ? '#00ffcc' : '#ff003c'; ctx.fillRect(-TILE_SIZE/2, -TILE_SIZE/2, TILE_SIZE, TILE_SIZE); }
        ctx.restore();
    }
}
class Projectile {
    constructor(x, y, vx, vy, owner = 'player', type = 'handgun') {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.owner = owner; this.type = type; this.active = true;
        this.gravity = 0;
    }
    update() {
        this.vy += this.gravity;
        this.x += this.vx; this.y += this.vy;
        if (Math.abs(this.x - player.x) > 1000) this.active = false;
    }
    draw(scrollOffset) {
        ctx.save();
        ctx.translate(this.x - scrollOffset, this.y);
        ctx.rotate(Math.atan2(this.vy, this.vx)); 
        if (this.owner === 'player') {
            if (this.type === 'pulse') {
                ctx.fillStyle = '#00f2ff'; ctx.shadowBlur = 15; ctx.shadowColor = '#00f2ff';
                ctx.fillRect(-15, -4, 30, 8);
            } else if (this.type === 'smg') {
                ctx.fillStyle = '#ffaa00'; ctx.shadowBlur = 5; ctx.shadowColor = '#ffaa00';
                ctx.fillRect(-5, -1.5, 10, 3);
            } else if (this.type === 'shotgun') {
                ctx.fillStyle = '#ff3300'; ctx.shadowBlur = 8; ctx.shadowColor = '#ff3300';
                ctx.fillRect(-8, -3, 16, 6);
            } else if (this.type === 'sniper') {
                ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 4; ctx.shadowColor = '#fff';
                ctx.fillRect(-20, -1.5, 40, 3);
            } else if (this.type === 'launcher') {
                ctx.fillStyle = '#333'; ctx.shadowBlur = 5; ctx.shadowColor = '#000';
                ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
            } else if (this.type === 'rail') {
                ctx.fillStyle = '#00ffcc'; ctx.shadowBlur = 20; ctx.shadowColor = '#00ffcc';
                ctx.fillRect(-30, -3, 60, 6);
            } else {
                ctx.fillStyle = '#FFD700'; ctx.shadowBlur = 5; ctx.shadowColor = '#FFA500';
                ctx.fillRect(-6, -2, 12, 4);
            }
        } else {
            ctx.fillStyle = '#ff4400';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0000';
            ctx.fillRect(-10, -2, 20, 4);
        }
        ctx.restore();
    }
}

// Global Vars
let player = new Player(), platforms = [], enemies = [], projectiles = [], keys = {};
let mouseX = 0, mouseY = 0, mouseIsDown = false;
let isGameOver = false, isWin = false, isGameStarted = false;
let corpseCount = parseInt(localStorage.getItem('corpseCount') || '0');
let currentStage = 1, targetDistance = 1000000;
let playerImg = null, enemyImg = null, enemy2Img = null, devilHandImg = null, enemyCorpseImg = null;
let gunImages = {};
let particles = [];
let screenSplatters = [];
let worldSplats = [];
let deadEnemyCorpses = []; // 地面に残る死体

function updateCorpseUI() {
    const el1 = document.getElementById('corpse-text');
    const el2 = document.getElementById('shop-corpse-val');
    if (el1) el1.innerText = corpseCount;
    if (el2) el2.innerText = corpseCount;
}

function processImage(imgB64, callback, mode = 'green') {
    const img = new Image();
    img.src = imgB64;
    img.onload = () => {
        try {
            const c = document.createElement('canvas');
            c.width = img.width; c.height = img.height;
            const x = c.getContext('2d');
            x.drawImage(img, 0, 0);
            const data = x.getImageData(0,0,c.width,c.height);
            for(let i=0; i<data.data.length; i+=4) {
                const r = data.data[i], g = data.data[i+1], b = data.data[i+2];
                
                let shouldRemove = false;
                
                if (mode === 'green') {
                    // グリーンバックのみ除去（銃などの暗い色を残す）
                    shouldRemove = (g > 150 && r < 120 && b < 120);
                } else {
                    // 白系、灰色系、薄い青系、緑を全て透明化（キャラ・敵用）
                    const isWhite = r > 180 && g > 180 && b > 180;
                    const isGray = Math.abs(r-g) < 15 && Math.abs(g-b) < 15 && r > 120;
                    const isLightBlue = (r > 160 && g > 180 && b > 200) || (b > r + 10 && b > g + 10 && r > 120);
                    const isGreenScreen = g > 180 && r < 100 && b < 100;
                    shouldRemove = isWhite || isGray || isLightBlue || isGreenScreen;
                }
                
                if (shouldRemove) {
                    data.data[i+3] = 0;
                }
            }
            x.putImageData(data, 0, 0);
            const out = new Image();
            out.src = c.toDataURL();
            out.onload = () => callback(out);
        } catch (e) {
            console.warn("Transparency processing failed", e);
            callback(img);
        }
    };
    img.onerror = () => {
        console.error("Failed to load sprite data");
    };
}

const clouds = [];
for (let i = 0; i < 5; i++) clouds.push({ x: Math.random() * WIDTH, y: Math.random() * 200 + 50, speed: Math.random() * 0.5 + 0.2, w: Math.random() * 100 + 50 });

function initLevel() {
    // 状態リセット
    player.x = 100; player.y = 400; player.vx = 0; player.vy = 0; player.distance = 0;
    player.dead = false; isGameOver = false; isWin = false;
    particles = []; screenSplatters = []; worldSplats = [];
    deadEnemyCorpses = []; projectiles = [];

    const createPlatform = (x, y, w, h, isSlope = false, y2 = 0) => {
        const pebbles = [];
        for (let i = 0; i < Math.min(w / 30, 500); i++) {
            pebbles.push({
                lx: Math.random() * w, ly: Math.random() * 50 + 20,
                sw: Math.random() * 10 + 5, sh: Math.random() * 3 + 2,
                color: '#5D4037'
            });
        }
        return { x, y, w, h, pebbles, isSlope, y2 };
    };

    platforms = [];
    let curX = -500;
    let curY = 500;
    enemies = [];

    for(let i=0; i<100; i++) {
        // 平地
        let w = 600 + Math.random() * 400;
        platforms.push(createPlatform(curX, curY, w, 600 - curY));
        
        // 敵の配置
        if (i > 0) {
            enemies.push(new Enemy(curX + w/2, curY - TILE_SIZE, 'ground'));
            if (Math.random() > 0.5) enemies.push(new Enemy(curX + w/2 + 200, curY - 250, 'drone'));
        }
        
        curX += w;
        
        // 坂道
        let sw = 300 + Math.random() * 200;
        let nextY = Math.max(250, Math.min(550, curY + (Math.random() - 0.5) * 300));
        platforms.push(createPlatform(curX, curY, sw, 600, true, nextY));
        curX += sw;
        curY = nextY;
    }
}

function startGame() {
    initAudio(); 
    isGameStarted = true;
    document.getElementById('menu-overlay').classList.remove('visible');
    initLevel();
}

function restart() {
    isGameOver = false; isWin = false;
    player.reset(); initLevel();
    document.getElementById('game-over-overlay').classList.remove('visible');
}

function goToTitle() {
    isGameStarted = false;
    isGameOver = false;
    document.getElementById('game-over-overlay').classList.remove('visible');
    document.getElementById('menu-overlay').classList.add('visible');
}

function openShop() {
    isGameStarted = false; 
    document.getElementById('menu-overlay').classList.remove('visible');
    document.getElementById('shop-overlay').classList.add('visible');
    updateCorpseUI();
}

function closeShop() {
    document.getElementById('shop-overlay').classList.remove('visible');
    document.getElementById('menu-overlay').classList.add('visible');
}

let audioCtx = null;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSplatSound() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.4, t);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    masterGain.connect(audioCtx.destination);

    // --- レイヤー1: 異常な「悲鳴」 (FM合成による不協和音) ---
    const carrier = audioCtx.createOscillator();
    const modulator = audioCtx.createOscillator();
    const modGain = audioCtx.createGain();

    carrier.type = 'sawtooth';
    modulator.type = 'square';
    
    const baseFreq = 200 + Math.random() * 600;
    carrier.frequency.setValueAtTime(baseFreq, t);
    carrier.frequency.exponentialRampToValueAtTime(20, t + 0.3);
    
    modulator.frequency.setValueAtTime(baseFreq * 1.5, t);
    modGain.gain.setValueAtTime(baseFreq * 2, t);
    
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(masterGain);
    
    modulator.start(t); carrier.start(t);
    modulator.stop(t + 0.3); carrier.stop(t + 0.3);

    // --- レイヤー2: デジタル・クラッシュ (不鮮明なビットノイズ) ---
    const crushBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
    const data = crushBuffer.getChannelData(0);
    for (let i = 0; i < crushBuffer.length; i++) {
        // 矩形波に近い歪んだノイズ
        data[i] = Math.sin(i / 5) * (Math.random() > 0.8 ? 1 : -1) * 0.5;
    }
    const crush = audioCtx.createBufferSource();
    crush.buffer = crushBuffer;
    const lowPass = audioCtx.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.setValueAtTime(2000, t);
    lowPass.frequency.exponentialRampToValueAtTime(100, t + 0.1);
    
    crush.connect(lowPass);
    lowPass.connect(masterGain);
    crush.start(t);

    // --- レイヤー3: 残留ノイズ (短い絶叫の後味) ---
    const echo = audioCtx.createOscillator();
    echo.type = 'sine';
    echo.frequency.setValueAtTime(30, t);
    echo.frequency.linearRampToValueAtTime(5000, t + 0.05); // 急激な上昇
    const echoGain = audioCtx.createGain();
    echoGain.gain.setValueAtTime(0.1, t);
    echoGain.gain.linearRampToValueAtTime(0, t + 0.05);
    echo.connect(echoGain);
    echoGain.connect(masterGain);
    echo.start(t); echo.stop(t + 0.05);
}

function playShootSound(type = 'default') {
    if (!audioCtx) return;
    
    // ハンドガン: ユーザー指定のMP3ファイルを再生
    if (type === 'handgun') {
        if (typeof HANDGUN_SFX_B64 !== 'undefined') {
            const audio = new Audio(HANDGUN_SFX_B64);
            audio.volume = 1.0;
            audio.play().catch(() => {});
        }
        return;
    }
    
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    
    if (type === 'smg') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);
        g.gain.setValueAtTime(0.15, t);
    } else if (type === 'shotgun') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 0.2);
        g.gain.setValueAtTime(0.6, t);
    } else if (type === 'pulse') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(2000, t + 0.1);
        g.gain.setValueAtTime(0.5, t);
    } else if (type === 'sniper') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);
        g.gain.setValueAtTime(0.6, t);
    } else if (type === 'launcher') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(10, t + 0.3);
        g.gain.setValueAtTime(0.7, t);
    } else if (type === 'rail') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2000, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);
        g.gain.setValueAtTime(0.1, t);
    } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        g.gain.setValueAtTime(0.1, t);
    }
    
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(t); osc.stop(t + 0.15);
}

function spawnParticles(x, y, color, count = 20) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
            life: 1.0, color, size: Math.random() * 5 + 2
        });
    }
}

function spawnBlood(x, y) {
    playSplatSound();
    // 工業的パーティクル (黒い油と火花)
    for (let i = 0; i < 35; i++) {
        const isSpark = Math.random() > 0.8;
        particles.push({
            x: x + TILE_SIZE/2, y: y + TILE_SIZE/2,
            vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15 - 5,
            life: 1.5, 
            color: isSpark ? '#ffaa00' : (Math.random() > 0.5 ? '#111111' : '#333333'),
            size: isSpark ? 2 + Math.random() * 2 : 4 + Math.random() * 4
        });
    }

    // 地面の不規則な血溜まり (頂点データを事前に計算)
    const worldRadii = [];
    for(let a=0; a<8; a++) worldRadii.push(0.7 + Math.random() * 0.6);
    worldSplats.push({ 
        x: x + 10, y: y + TILE_SIZE - 5, 
        baseSize: 30 + Math.random()*40,
        radii: worldRadii 
    });

    // 画面の不規則なスプラッター (頂点データを事前に計算)
    for (let i = 0; i < 3; i++) {
        const screenRadii = [];
        for(let a=0; a<12; a++) screenRadii.push(0.5 + Math.random() * 1.0);
        screenSplatters.push({
            x: Math.random() * WIDTH, y: Math.random() * HEIGHT,
            size: 40 + Math.random() * 80,
            life: 1.0, radii: screenRadii
        });
    }
}

function buyItem(name, cost) {
    if (corpseCount >= cost) {
        corpseCount -= cost;
        localStorage.setItem('corpseCount', corpseCount);
        document.getElementById('shop-corpse-val').innerText = corpseCount;
        document.getElementById('corpse-text').innerText = corpseCount;
        
             if (name === 'サブマシンガン' || name === 'マシンガン') player.weapon = 'smg';
        else if (name === 'ショットガン') player.weapon = 'shotgun';
        else if (name === 'パルスキャノン') player.weapon = 'pulse';
        else if (name === '対物スナイパー') player.weapon = 'sniper';
        else if (name === '重火器ランチャー') player.weapon = 'launcher';
        else if (name === 'プラズマレールガン') player.weapon = 'rail';
        else if (name === '高出力モーター') { player.speedMult = 1.5; localStorage.setItem('speedMult', '1.5'); }
        else if (name === '2段ジャンプ機能') { player.hasDoubleJump = true; localStorage.setItem('hasDoubleJump', 'true'); }
        else if (name === '緊急バリア') { player.hasShield = true; localStorage.setItem('hasShield', 'true'); }
        
        localStorage.setItem('equippedWeapon', player.weapon);
        player.updateWeaponUI();
        alert(name + ' を導入した！');
    } else {
        alert('亡骸が足りない。もっと命を収穫してこい。');
    }
}

function closeShop() {
    document.getElementById('shop-overlay').classList.remove('visible');
    document.getElementById('menu-overlay').classList.add('visible');
}

function death(msg) {
    if (isGameOver || isWin) return;
    
    if (player.hasShield && player.invuln <= 0) { // invulnが0の時のみシールド発動
        player.hasShield = false;
        localStorage.setItem('hasShield', 'false');
        player.invuln = 120; // 2s無敵
        spawnParticles(player.x + TILE_SIZE/2, player.y + TILE_SIZE/2, '#00f2ff', 30);
        return;
    }
    if (player.invuln > 0) return;

    isGameOver = true;
    document.getElementById('death-reason').innerText = '原因: ' + msg;
    document.getElementById('final-score-val').innerText = player.distance;
    document.getElementById('game-over-overlay').classList.add('visible');
}

function win() {
    if (isWin) return;
    isWin = true;
    alert('おめでとう！クリアしました！');
    location.reload();
}

function gameLoop() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    // Industry Sky (Smoggy soot-filled atmosphere)
    const g = ctx.createLinearGradient(0, 0, 0, HEIGHT); g.addColorStop(0, '#2d2a22'); g.addColorStop(1, '#4b443c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
    // Industrial Smog (formerly clouds)
    ctx.fillStyle = 'rgba(60, 60, 60, 0.7)';
    clouds.forEach(c => { c.x -= c.speed; if (c.x + c.w < 0) c.x = WIDTH; ctx.beginPath(); ctx.arc(c.x, c.y, c.w/3, 0, Math.PI*2); ctx.fill(); });

    if (!isGameStarted) {
        requestAnimationFrame(gameLoop);
        return;
    }

    if (!isGameOver && !isWin) {
        player.update(0);
    }

    const scroll = player.x - 100;
    platforms.forEach(p => { 
        ctx.fillStyle = '#3E2723'; 
        if (p.isSlope) {
            ctx.beginPath();
            ctx.moveTo(p.x - scroll, p.y);
            ctx.lineTo(p.x + p.w - scroll, p.y2);
            ctx.lineTo(p.x + p.w - scroll, HEIGHT);
            ctx.lineTo(p.x - scroll, HEIGHT);
            ctx.fill();
        } else {
            ctx.fillRect(p.x - scroll, p.y, p.w, HEIGHT - p.y); 
        }
        
        // 装飾 (坂道の場合はスキップ)
        if (!p.isSlope && p.pebbles) {
            p.pebbles.forEach(peb => {
                ctx.fillStyle = peb.color;
                ctx.fillRect(p.x - scroll + peb.lx, p.y + peb.ly, peb.sw, peb.sh);
            });
        }

        // 天面
    ctx.fillStyle = '#2E3B2E'; 
    if (p.isSlope) {
        ctx.beginPath();
        ctx.lineWidth = 15;
        ctx.strokeStyle = '#2E3B2E';
        ctx.moveTo(p.x - scroll, p.y + 7);
        ctx.lineTo(p.x + p.w - scroll, p.y2 + 7);
        ctx.stroke();
    } else {
        ctx.fillRect(p.x - scroll, p.y, p.w, 15); 
    }
    
    // 足場の底が画面外まで隠れるように描画
    if (!p.isSlope) {
        ctx.fillStyle = '#111'; // 暗い影
        ctx.fillRect(p.x - scroll, p.y + 15, p.w, 10);
    }
});

    // 亡骸（地面に残る死体）の描画
    deadEnemyCorpses.forEach(c => {
        if (enemyCorpseImg && enemyCorpseImg.complete) {
            ctx.drawImage(enemyCorpseImg, c.x - scroll, c.y, TILE_SIZE, TILE_SIZE);
        }
    });

    // 弾丸の更新と描画
    projectiles = projectiles.filter(p => p.active);
    projectiles.forEach(p => {
        p.update();
        p.draw(scroll);

        // 当たり判定
        if (p.owner === 'player') {
            enemies.forEach(e => {
                const dist = Math.sqrt((p.x - (e.x + TILE_SIZE/2))**2 + (p.y - (e.y + TILE_SIZE/2))**2);
                if (!e.dead && dist < 50) {
                    if (p.type === 'launcher') {
                        // 爆発範囲ダメージ
                        enemies.forEach(e2 => {
                            const d2 = Math.sqrt((e.x - e2.x)**2 + (e.y - e2.y)**2);
                            if (!e2.dead && d2 < 200) {
                                e2.dead = true; spawnBlood(e2.x, e2.y); corpseCount++;
                            }
                        });
                        spawnParticles(e.x + TILE_SIZE/2, e.y + TILE_SIZE/2, '#ff4400', 50); // 爆発
                    } else {
                        e.dead = true; spawnBlood(e.x, e.y); corpseCount++;
                    }
                    p.active = false;
                    localStorage.setItem('corpseCount', corpseCount);
                    updateCorpseUI();
                }
            });
        } else {
            if (!player.dead && Math.abs(p.x - (player.x + TILE_SIZE/2)) < 30 && Math.abs(p.y - (player.y + TILE_SIZE/2)) < 30) {
                death('敵の攻撃による被弾'); p.active = false;
            }
        }
    });

    // 敵の更新と描画
    enemies.forEach(e => {
        if (e.x - scroll > -TILE_SIZE && e.x - scroll < WIDTH + TILE_SIZE) {
            e.update();
            e.draw(scroll);
            
            // 死んでいる敵との当たり判定はスキップする
            if (e.dead) return;

            const px = player.x + HITBOX_PAD_X, pw = TILE_SIZE - (HITBOX_PAD_X * 2), py = player.y + HITBOX_PAD_Y, ph = TILE_SIZE - HITBOX_PAD_Y;
            const ex = e.x + HITBOX_PAD_X, ew = TILE_SIZE - (HITBOX_PAD_X * 2), ey = e.y + HITBOX_PAD_Y, eh = TILE_SIZE - HITBOX_PAD_Y;

            if (!player.dead && px < ex + ew && px + pw > ex && py < ey + eh && py + ph > ey) {
                if (player.vy > 0 && py + ph < ey + (eh / 2)) { 
                    // ジャンプ攻撃（踏みつけ）
                    e.dead = true;
                    deadEnemyCorpses.push({ x: e.x, y: e.y + 10 });
                    player.vy = -12; 
                    corpseCount++; 
                    spawnBlood(e.x, e.y); 
                    localStorage.setItem('corpseCount', corpseCount);
                    updateCorpseUI();
                }
                else death('変異種による致命的接触');
            }
        }
    });

    // プレイヤーの描画を実行
    player.draw();
    
    // パーティクル描画 (血飛沫)
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.life -= 0.02;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.min(1.0, p.life);
        const s = p.size || 4;
        ctx.fillRect(p.x - scroll, p.y, s, s);
    });
    ctx.globalAlpha = 1.0;

    // 画面スプラッター (レンズに付着)
    screenSplatters = screenSplatters.filter(s => s.life > 0.1);
    screenSplatters.forEach(s => {
        s.life -= 0.002;
        ctx.save();
        ctx.globalAlpha = s.life;
        ctx.fillStyle = '#111111';
        ctx.beginPath();
        // 事前に用意したユニークな形状を描画
        s.radii.forEach((r, i) => {
            let ang = (i / s.radii.length) * Math.PI * 2;
            let currentSize = r * s.size;
            ctx.lineTo(s.x + Math.cos(ang) * currentSize, s.y + Math.sin(ang) * currentSize);
        });
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    });
    ctx.globalAlpha = 1.0;

    // UI
    document.getElementById('score-text').innerText = player.distance + ' / ' + targetDistance + 'm';
    document.getElementById('corpse-text').innerText = corpseCount;
    document.getElementById('menu-title').innerText = 'ST' + currentStage + ' MONSTER HARVEST';
    if (!isWin) requestAnimationFrame(gameLoop);
}

// Events
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (WIDTH / rect.width);
    mouseY = (e.clientY - rect.top) * (HEIGHT / rect.height);
});
canvas.addEventListener('mousedown', () => mouseIsDown = true);
window.addEventListener('mouseup', () => mouseIsDown = false);

document.getElementById('restart-btn').addEventListener('click', restart);
document.getElementById('to-title-btn').addEventListener('click', goToTitle);
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('shop-btn').addEventListener('click', openShop);
document.getElementById('shop-close-btn').addEventListener('click', closeShop);

// Load Assets from globally defined constants in external scripts
let readyCount = 0;
function checkReady() {
    readyCount++;
    if (readyCount >= 5) { // spritesheet1, enemy1, enemy2, corpse, devilhand
        requestAnimationFrame(gameLoop);
    }
}

if (typeof PLAYER_B64 !== 'undefined') processImage(PLAYER_B64, (img) => { playerImg = img; checkReady(); }, 'white');
if (typeof ENEMY_B64 !== 'undefined') processImage(ENEMY_B64, (img) => { enemyImg = img; checkReady(); }, 'white');
if (typeof ENEMY2_B64 !== 'undefined') processImage(ENEMY2_B64, (img) => { enemy2Img = img; checkReady(); }, 'white');
if (typeof ENEMY_CORPSE_B64 !== 'undefined') processImage(ENEMY_CORPSE_B64, (img) => { enemyCorpseImg = img; checkReady(); }, 'white');
if (typeof DEVIL_HAND_B64 !== 'undefined') processImage(DEVIL_HAND_B64, (img) => { devilHandImg = img; checkReady(); }, 'white');

// 銃画像の読み込み（ゲーム開始を待たない）
const gunTypes = ['handgun', 'smg', 'shotgun', 'sniper', 'launcher', 'rail', 'pulse'];
gunTypes.forEach(type => {
    const constName = 'GUN_' + type.toUpperCase() + '_B64';
    if (typeof window[constName] !== 'undefined') {
        processImage(window[constName], (img) => { gunImages[type] = img; }, 'green');
    }
});

updateCorpseUI();
