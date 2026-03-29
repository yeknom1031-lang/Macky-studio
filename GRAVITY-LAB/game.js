const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const stageNumber = document.getElementById('stage-number');
const gravityLabel = document.getElementById('gravity-label');
const stateLabel = document.getElementById('state-label');
const messageOverlay = document.getElementById('message-overlay');
const messageTitle = document.getElementById('message-title');
const messageBody = document.getElementById('message-body');
const startButton = document.getElementById('start-button');
const switchButtons = [...document.querySelectorAll('.gravity-switch')];

const TILE = 56;
const PLAYER_SIZE = 34;
const ACCELERATION = 1800;
const MAX_SPEED = 620;
const BOUNCE_DAMPING = 0.18;
const PARTICLE_COUNT = 18;

const DIRECTIONS = {
    up: { x: 0, y: -1, label: 'UP', arrow: '↑' },
    down: { x: 0, y: 1, label: 'DOWN', arrow: '↓' },
    left: { x: -1, y: 0, label: 'LEFT', arrow: '←' },
    right: { x: 1, y: 0, label: 'RIGHT', arrow: '→' }
};

const stages = [
    {
        name: 'BOOT SEQUENCE',
        hint: 'まずは下と右を使ってコアまで滑り込みます。',
        map: [
            '####################',
            '#S......#.........G#',
            '#.###...#...####...#',
            '#...#..............#',
            '#...#..######..##..#',
            '#...........#......#',
            '#..####.....#......#',
            '#...........#......#',
            '#......##..........#',
            '#.........X........#',
            '#..................#',
            '####################'
        ]
    },
    {
        name: 'RED CHAMBER',
        hint: '危険物の列は、横重力でかわしてから落とし込みます。',
        map: [
            '####################',
            '#S......#.........G#',
            '#.####..#.######...#',
            '#....#..#......#...#',
            '#.X..#..#.XXXX.#...#',
            '#....#..#......#...#',
            '#....#..####...#...#',
            '#....#.........#...#',
            '#....######.####...#',
            '#..................#',
            '#..................#',
            '####################'
        ]
    },
    {
        name: 'CROSS CURRENT',
        hint: '縦横を交互に切り替えると迷路を抜けられます。',
        map: [
            '####################',
            '#S....#............#',
            '#.###.#.#########..#',
            '#...#.#.......#....#',
            '###.#.#####.#.#.####',
            '#...#.....#.#.#....#',
            '#.#######.#.#.###..#',
            '#.......#.#.#...#..#',
            '#.#####.#.#.###.#..#',
            '#.....#...#...#...G#',
            '#.....XXXXX...#....#',
            '####################'
        ]
    },
    {
        name: 'FALLING FORK',
        hint: '赤い床に落ちないよう、左壁と天井を使って向きを整えます。',
        map: [
            '####################',
            '#S.................#',
            '#.######.#########.#',
            '#......#.....#.....#',
            '#.XXXX.#####.#.###.#',
            '#......#.....#...#.#',
            '######.#.#######.#.#',
            '#......#.........#.#',
            '#.#############..#.#',
            '#...............##G#',
            '#..................#',
            '####################'
        ]
    },
    {
        name: 'WALL DANCER',
        hint: 'ゴールの手前は上重力で減速し、右重力で押し込みます。',
        map: [
            '####################',
            '#S........#.......G#',
            '#.######..#.######.#',
            '#.#....#..#.#......#',
            '#.#.XX.#..#.#.####.#',
            '#.#....#....#.#....#',
            '#.####.######.#.##.#',
            '#......#......#....#',
            '#.######.#########.#',
            '#..................#',
            '#..................#',
            '####################'
        ]
    },
    {
        name: 'CORE VAULT',
        hint: '最後は四方向を全部使います。勢いがつき過ぎたら壁で止めましょう。',
        map: [
            '####################',
            '#S.....#...........#',
            '#.###..#.#########.#',
            '#...#..#.....#.....#',
            '###.#.#####.#.#.##.#',
            '#...#.....#.#.#..#.#',
            '#.#######.#.#.##.#.#',
            '#.#.....#.#.#....#.#',
            '#.#.XXX.#.#.######.#',
            '#.#.....#.#........#',
            '#.#######.#######.G#',
            '####################'
        ]
    }
];

const game = {
    currentStageIndex: 0,
    state: 'intro',
    gravityX: 0,
    gravityY: 1,
    lastTime: 0,
    particles: [],
    flashTimer: 0,
    player: {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: PLAYER_SIZE,
        angle: 0,
        trail: []
    },
    goal: null,
    solids: [],
    hazards: [],
    spawn: null
};

function parseStage(stageIndex) {
    const stage = stages[stageIndex];
    game.solids = [];
    game.hazards = [];
    game.goal = null;
    game.spawn = null;
    const sourceRows = stage.map.length;
    const sourceCols = Math.max(...stage.map.map((row) => row.length));
    const innerRows = Math.max(1, sourceRows - 2);
    const innerCols = Math.max(1, sourceCols - 2);
    const squareInnerSize = Math.max(innerRows, innerCols);
    const boardSize = squareInnerSize + 2;
    const padTop = Math.floor((squareInnerSize - innerRows) / 2);
    const padLeft = Math.floor((squareInnerSize - innerCols) / 2);
    const boardOffsetX = Math.round((canvas.width - boardSize * TILE) / 2);
    const boardOffsetY = Math.round((canvas.height - boardSize * TILE) / 2);

    for (let rowIndex = 0; rowIndex < boardSize; rowIndex += 1) {
        for (let colIndex = 0; colIndex < boardSize; colIndex += 1) {
            const isOuterBorder =
                rowIndex === 0 ||
                colIndex === 0 ||
                rowIndex === boardSize - 1 ||
                colIndex === boardSize - 1;

            let cell = '#';
            if (!isOuterBorder) {
                const squareInnerRow = rowIndex - 1;
                const squareInnerCol = colIndex - 1;
                const sourceRowIndex = squareInnerRow - padTop + 1;
                const sourceColIndex = squareInnerCol - padLeft + 1;
                const sourceRow = stage.map[sourceRowIndex];

                if (
                    sourceRowIndex >= 1 &&
                    sourceRowIndex <= sourceRows - 2 &&
                    sourceColIndex >= 1 &&
                    sourceColIndex <= sourceCols - 2
                ) {
                    cell = sourceRow?.[sourceColIndex] ?? '.';
                } else {
                    // Fill expanded area by reusing the original wall rhythm.
                    const templateRowIndex =
                        ((squareInnerRow - padTop) % innerRows + innerRows) % innerRows + 1;
                    const templateColIndex =
                        ((squareInnerCol - padLeft) % innerCols + innerCols) % innerCols + 1;
                    const templateCell = stage.map[templateRowIndex]?.[templateColIndex] ?? '.';
                    cell = templateCell === '#' ? '#' : '.';
                }
            }

            const x = boardOffsetX + colIndex * TILE;
            const y = boardOffsetY + rowIndex * TILE;

            if (cell === '#') {
                game.solids.push({ x, y, width: TILE, height: TILE });
            } else if (cell === 'X') {
                game.hazards.push({ x, y, width: TILE, height: TILE });
            } else if (cell === 'G') {
                game.goal = { x, y, width: TILE, height: TILE };
            } else if (cell === 'S') {
                game.spawn = {
                    x: x + (TILE - PLAYER_SIZE) / 2,
                    y: y + (TILE - PLAYER_SIZE) / 2
                };
            }
        }
    }
}

function setMessage(title, body, buttonText = 'START') {
    messageTitle.textContent = title;
    messageBody.textContent = body;
    startButton.textContent = buttonText;
    messageOverlay.classList.remove('hidden');
}

function hideMessage() {
    messageOverlay.classList.add('hidden');
}

function getGravityInfo() {
    const x = game.gravityX;
    const y = game.gravityY;

    if (x === 0 && y === 0) return { label: 'ZERO', arrow: '○' };
    if (x === 0 && y === -1) return { label: 'UP', arrow: '↑' };
    if (x === 0 && y === 1) return { label: 'DOWN', arrow: '↓' };
    if (x === -1 && y === 0) return { label: 'LEFT', arrow: '←' };
    if (x === 1 && y === 0) return { label: 'RIGHT', arrow: '→' };
    if (x === -1 && y === -1) return { label: 'UP-LEFT', arrow: '↖' };
    if (x === 1 && y === -1) return { label: 'UP-RIGHT', arrow: '↗' };
    if (x === -1 && y === 1) return { label: 'DOWN-LEFT', arrow: '↙' };
    return { label: 'DOWN-RIGHT', arrow: '↘' };
}

function updateStatus() {
    stageNumber.textContent = `${game.currentStageIndex + 1} / ${stages.length}`;
    gravityLabel.textContent = getGravityInfo().label;

    if (game.state === 'playing') {
        stateLabel.textContent = stages[game.currentStageIndex].name;
    } else if (game.state === 'intro') {
        stateLabel.textContent = 'READY';
    } else if (game.state === 'cleared') {
        stateLabel.textContent = 'CLEAR';
    } else if (game.state === 'completed') {
        stateLabel.textContent = 'COMPLETE';
    } else {
        stateLabel.textContent = 'RESET';
    }
}

function updateSwitchButtons() {
    switchButtons.forEach((button) => {
        const direction = DIRECTIONS[button.dataset.direction];
        const isActive =
            (direction.x !== 0 && game.gravityX === direction.x) ||
            (direction.y !== 0 && game.gravityY === direction.y);
        button.classList.toggle('active', isActive);
    });
}

function resetPlayerVelocity() {
    game.player.vx *= 0.4;
    game.player.vy *= 0.4;
}

function loadStage(stageIndex) {
    game.currentStageIndex = stageIndex;
    parseStage(stageIndex);
    game.gravityX = 0;
    game.gravityY = 1;
    game.player.x = game.spawn.x;
    game.player.y = game.spawn.y;
    game.player.vx = 0;
    game.player.vy = 0;
    game.player.angle = 0;
    game.player.trail = [];
    game.particles = [];
    game.flashTimer = 0;
    updateSwitchButtons();
    updateStatus();
}

function spawnBurst(x, y, color) {
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
        game.particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 260,
            vy: (Math.random() - 0.5) * 260,
            life: 0.9 + Math.random() * 0.4,
            radius: 2 + Math.random() * 4,
            color
        });
    }
}

function restartStage() {
    const stage = stages[game.currentStageIndex];
    loadStage(game.currentStageIndex);
    game.state = 'intro';
    setMessage(stage.name, stage.hint, 'TRY AGAIN');
}

function setGravity(direction) {
    if (!DIRECTIONS[direction] || game.state !== 'playing') {
        return;
    }

    const vector = DIRECTIONS[direction];
    if (vector.x !== 0) {
        game.gravityX = game.gravityX === vector.x ? 0 : vector.x;
    }
    if (vector.y !== 0) {
        game.gravityY = game.gravityY === vector.y ? 0 : vector.y;
    }

    resetPlayerVelocity();
    spawnBurst(
        game.player.x + game.player.size / 2,
        game.player.y + game.player.size / 2,
        game.gravityX === 0 && game.gravityY === 0 ? '#d9ecff' : '#73f7ff'
    );
    updateSwitchButtons();
    updateStatus();
}

function intersects(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function resolveAxis(axis, dt) {
    const player = game.player;
    const velocityKey = axis === 'x' ? 'vx' : 'vy';
    const positionKey = axis === 'x' ? 'x' : 'y';
    const sizeKey = axis === 'x' ? 'width' : 'height';

    const rect = {
        x: player.x,
        y: player.y,
        width: player.size,
        height: player.size
    };

    rect[positionKey] += player[velocityKey] * dt;

    let collided = false;

    for (const solid of game.solids) {
        if (!intersects(rect, solid)) {
            continue;
        }

        collided = true;
        if (player[velocityKey] > 0) {
            rect[positionKey] = solid[positionKey] - rect[sizeKey];
        } else if (player[velocityKey] < 0) {
            rect[positionKey] = solid[positionKey] + solid[sizeKey];
        }
        player[velocityKey] *= -BOUNCE_DAMPING;
    }

    player[positionKey] = rect[positionKey];
    return collided;
}

function completeStage() {
    spawnBurst(game.player.x + game.player.size / 2, game.player.y + game.player.size / 2, '#ffcf5a');

    if (game.currentStageIndex === stages.length - 1) {
        game.state = 'completed';
        updateStatus();
        setMessage('全ステージクリア！', '重力ラボを突破しました。もう一度遊ぶときは START で最初から挑戦できます。', 'PLAY AGAIN');
        return;
    }

    game.state = 'cleared';
    updateStatus();
    setMessage(
        `STAGE ${game.currentStageIndex + 1} CLEAR`,
        `${stages[game.currentStageIndex + 1].name} へ進みます。${stages[game.currentStageIndex + 1].hint}`,
        'NEXT STAGE'
    );
}

function update(dt) {
    if (game.state !== 'playing') {
        updateParticles(dt);
        return;
    }

    game.player.vx += game.gravityX * ACCELERATION * dt;
    game.player.vy += game.gravityY * ACCELERATION * dt;
    game.player.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, game.player.vx));
    game.player.vy = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, game.player.vy));

    resolveAxis('x', dt);
    resolveAxis('y', dt);

    game.player.angle = Math.atan2(game.player.vy, game.player.vx) + Math.PI / 4;
    game.player.trail.push({
        x: game.player.x + game.player.size / 2,
        y: game.player.y + game.player.size / 2,
        life: 0.45
    });
    if (game.player.trail.length > 12) {
        game.player.trail.shift();
    }
    game.player.trail.forEach((point) => {
        point.life -= dt;
    });
    game.player.trail = game.player.trail.filter((point) => point.life > 0);

    const playerRect = {
        x: game.player.x,
        y: game.player.y,
        width: game.player.size,
        height: game.player.size
    };

    if (game.hazards.some((hazard) => intersects(playerRect, hazard))) {
        game.state = 'failed';
        updateStatus();
        spawnBurst(game.player.x + game.player.size / 2, game.player.y + game.player.size / 2, '#ff6b6b');
        setMessage('システム破損', '赤い危険物に接触しました。ステージを最初からやり直します。', 'RESTART');
        return;
    }

    if (game.goal && intersects(playerRect, game.goal)) {
        completeStage();
    }

    updateParticles(dt);
    if (game.flashTimer > 0) {
        game.flashTimer = Math.max(0, game.flashTimer - dt);
    }
}

function updateParticles(dt) {
    game.particles.forEach((particle) => {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.life -= dt * 1.3;
    });
    game.particles = game.particles.filter((particle) => particle.life > 0);
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#091320');
    gradient.addColorStop(1, '#143050');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += TILE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += TILE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawStageFrame() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    ctx.restore();
}

function drawSolids() {
    game.solids.forEach((solid) => {
        const gradient = ctx.createLinearGradient(solid.x, solid.y, solid.x + solid.width, solid.y + solid.height);
        gradient.addColorStop(0, '#1d3955');
        gradient.addColorStop(1, '#2d5678');
        ctx.fillStyle = gradient;
        ctx.fillRect(solid.x, solid.y, solid.width, solid.height);

        ctx.strokeStyle = 'rgba(115, 247, 255, 0.14)';
        ctx.lineWidth = 2;
        ctx.strokeRect(solid.x + 1, solid.y + 1, solid.width - 2, solid.height - 2);
    });
}

function drawHazards() {
    game.hazards.forEach((hazard) => {
        const padding = 8;
        const x = hazard.x + padding;
        const y = hazard.y + padding;
        const width = hazard.width - padding * 2;
        const height = hazard.height - padding * 2;
        const spikeWidth = width / 3;

        ctx.fillStyle = '#ff6b6b';
        for (let i = 0; i < 3; i += 1) {
            ctx.beginPath();
            ctx.moveTo(x + spikeWidth * i, y + height);
            ctx.lineTo(x + spikeWidth * i + spikeWidth / 2, y);
            ctx.lineTo(x + spikeWidth * (i + 1), y + height);
            ctx.closePath();
            ctx.fill();
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.strokeRect(hazard.x + 6, hazard.y + 6, hazard.width - 12, hazard.height - 12);
    });
}

function drawGoal() {
    if (!game.goal) {
        return;
    }

    const centerX = game.goal.x + game.goal.width / 2;
    const centerY = game.goal.y + game.goal.height / 2;
    const pulse = 12 + Math.sin(performance.now() / 180) * 5;

    ctx.save();
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#ffcf5a';
    ctx.fillStyle = 'rgba(255, 207, 90, 0.26)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffcf5a';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawTrail() {
    game.player.trail.forEach((point) => {
        ctx.save();
        ctx.globalAlpha = point.life * 1.4;
        ctx.fillStyle = '#73f7ff';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8 * point.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawPlayer() {
    const centerX = game.player.x + game.player.size / 2;
    const centerY = game.player.y + game.player.size / 2;

    drawTrail();

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(game.player.angle);
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#73f7ff';

    ctx.fillStyle = '#73f7ff';
    ctx.fillRect(-game.player.size / 2, -game.player.size / 2, game.player.size, game.player.size);

    ctx.fillStyle = '#081018';
    ctx.fillRect(-7, -7, 14, 14);

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(-game.player.size / 2 + 3, -game.player.size / 2 + 3, game.player.size - 6, game.player.size - 6);
    ctx.restore();
}

function drawGravityArrow() {
    const gravity = getGravityInfo();
    ctx.save();
    ctx.translate(canvas.width - 96, 86);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#c8ff64';
    ctx.font = '700 42px Chakra Petch';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(gravity.arrow, 0, 4);
    ctx.restore();
}

function drawParticles() {
    game.particles.forEach((particle) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, particle.life);
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawStageText() {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '700 26px Chakra Petch';
    ctx.fillText(stages[game.currentStageIndex].name, 32, 42);

    ctx.fillStyle = 'rgba(217, 236, 255, 0.68)';
    ctx.font = '500 18px Chakra Petch';
    ctx.fillText(stages[game.currentStageIndex].hint, 32, 68);
    ctx.restore();
}

function render() {
    drawBackground();
    drawStageFrame();
    drawSolids();
    drawHazards();
    drawGoal();
    drawPlayer();
    drawParticles();
    drawGravityArrow();
    drawStageText();
}

function loop(timestamp) {
    const delta = Math.min(0.033, (timestamp - game.lastTime) / 1000 || 0);
    game.lastTime = timestamp;
    update(delta);
    render();
    requestAnimationFrame(loop);
}

function beginPlayFromOverlay() {
    if (game.state === 'completed') {
        loadStage(0);
    } else if (game.state === 'cleared') {
        loadStage(game.currentStageIndex + 1);
    } else if (game.state === 'failed') {
        loadStage(game.currentStageIndex);
    }

    game.state = 'playing';
    hideMessage();
    updateStatus();
}

function handleKeydown(event) {
    const key = event.key.toLowerCase();
    const directionFromKey = {
        arrowup: 'up',
        w: 'up',
        arrowdown: 'down',
        s: 'down',
        arrowleft: 'left',
        a: 'left',
        arrowright: 'right',
        d: 'right'
    }[key];

    if (directionFromKey) {
        event.preventDefault();
        if (event.repeat) {
            return;
        }
        if (game.state === 'playing') {
            setGravity(directionFromKey);
        }
        return;
    }

    if (key === 'r') {
        restartStage();
        return;
    }

    if (key === 'enter') {
        beginPlayFromOverlay();
    }
}

function attachControls() {
    switchButtons.forEach((button) => {
        button.addEventListener('click', () => {
            if (game.state === 'playing') {
                setGravity(button.dataset.direction);
            }
        });
    });

    startButton.addEventListener('click', beginPlayFromOverlay);
    window.addEventListener('keydown', handleKeydown);
}

function resizeCanvas() {
    const frame = canvas.parentElement;
    const availableWidth = frame.clientWidth;
    const availableHeight = frame.clientHeight;
    const aspect = 1;

    let width = availableWidth;
    let height = width / aspect;

    if (height > availableHeight) {
        height = availableHeight;
        width = height * aspect;
    }

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
}

function init() {
    loadStage(0);
    setMessage(stages[0].name, stages[0].hint, 'START');
    attachControls();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    requestAnimationFrame(loop);
}

init();
