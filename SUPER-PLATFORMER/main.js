const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ゲームの定数（設定）
const TILE_SIZE = 40;
const GRAVITY = 0.5;
const JUMP_POWER = -10;
const SPEED = 4;
const MAX_FALL_SPEED = 12;

// マップデータ（'.' = 空白, '1' = ブロック, 'S' = スタート, 'G' = ゴール）
const levelData = [
    "....................................................................................................",
    "....................................................................................................",
    "....................................................................................................",
    "....................................................................................................",
    "....................................................................................................",
    "....................................................................................................",
    ".........................1111.......................................................................",
    "..............................................111...................................................",
    "...................................11.....................................1.........................",
    ".............111........................................111...........111...........G...............",
    "....................................................................11111.........111...............",
    "...........................1......................................1111111.......11111...............",
    "..S....1...................1..................11.......11.......111111111.....1111111...............",
    "111111111111111111111111...11111111...11111111111111111111111111111111111111111111111111111111111111",
    "111111111111111111111111...11111111...11111111111111111111111111111111111111111111111111111111111111"
];

let player = {
    x: 0,
    y: 0,
    width: 30,
    height: 30,
    vx: 0,
    vy: 0,
    onGround: false,
    color: "#e74c3c" // マリオっぽい赤色
};

let camera = { x: 0 };
let gameState = "playing"; // "playing", "clear", "gameover"

// キーボードの入力状態を管理
const keys = {
    left: false,
    right: false,
    up: false
};

window.addEventListener("keydown", (e) => {
    if (e.code === "ArrowLeft") keys.left = true;
    if (e.code === "ArrowRight") keys.right = true;
    if (e.code === "ArrowUp" || e.code === "Space") keys.up = true;
});

window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft") keys.left = false;
    if (e.code === "ArrowRight") keys.right = false;
    if (e.code === "ArrowUp" || e.code === "Space") keys.up = false;
});

// マップからスタート位置を探す関数
function initGame() {
    for (let y = 0; y < levelData.length; y++) {
        for (let x = 0; x < levelData[y].length; x++) {
            if (levelData[y][x] === 'S') {
                // プレイヤーの初期位置をセット（ブロックの中央に配置）
                player.x = x * TILE_SIZE + (TILE_SIZE - player.width) / 2;
                player.y = y * TILE_SIZE + (TILE_SIZE - player.height);
                player.vx = 0;
                player.vy = 0;
            }
        }
    }
    gameState = "playing";
}

// 当たり判定のチェック（プレイヤーの座標とマップのブロックが重なっているか）
function checkCollision(x, y) {
    // プレイヤーの四隅の座標を計算
    const left = Math.floor(x / TILE_SIZE);
    const right = Math.floor((x + player.width - 0.1) / TILE_SIZE); // -0.1 は隣のブロックに引っかからないための微調整
    const top = Math.floor(y / TILE_SIZE);
    const bottom = Math.floor((y + player.height - 0.1) / TILE_SIZE);

    for (let row = top; row <= bottom; row++) {
        for (let col = left; col <= right; col++) {
            if (levelData[row] && levelData[row][col]) {
                const tile = levelData[row][col];
                if (tile === '1') {
                    return { collision: true, type: 'block', row, col };
                } else if (tile === 'G') {
                    return { collision: true, type: 'goal' };
                }
            }
        }
    }
    return { collision: false };
}

// ゲームの更新処理（毎フレーム呼ばれる）
function update() {
    if (gameState !== "playing") return;

    // 左右の移動
    if (keys.left) {
        player.vx = -SPEED;
    } else if (keys.right) {
        player.vx = SPEED;
    } else {
        player.vx = 0; // キーを離したら止まる
    }

    // ジャンプ
    if (keys.up && player.onGround) {
        player.vy = JUMP_POWER;
        player.onGround = false;
    }

    // 重力をかける
    player.vy += GRAVITY;
    if (player.vy > MAX_FALL_SPEED) {
        player.vy = MAX_FALL_SPEED;
    }

    // X軸の移動と当たり判定
    player.x += player.vx;
    let colX = checkCollision(player.x, player.y);
    if (colX.collision) {
        if (colX.type === 'goal') {
            initGame(); // ゴールに触れたら最初から
        } else {
            // ブロックにぶつかったら、めり込まないように位置を戻す
            if (player.vx > 0) {
                player.x = colX.col * TILE_SIZE - player.width;
            } else if (player.vx < 0) {
                player.x = (colX.col + 1) * TILE_SIZE;
            }
            player.vx = 0;
        }
    }

    // 画面の左端から出ないようにする
    if (player.x < 0) player.x = 0;

    // Y軸の移動と当たり判定
    player.y += player.vy;
    player.onGround = false; // 一旦空中にいるとする
    let colY = checkCollision(player.x, player.y);
    
    if (colY.collision) {
        if (colY.type === 'goal') {
            initGame(); // ゴールに触れたら最初から
        } else {
            if (player.vy > 0) { // 下に落ちていてぶつかった＝着地した
                player.y = colY.row * TILE_SIZE - player.height;
                player.onGround = true;
                player.vy = 0;
            } else if (player.vy < 0) { // 上にジャンプしてぶつかった＝天井に頭をぶつけた
                player.y = (colY.row + 1) * TILE_SIZE;
                player.vy = 0;
            }
        }
    }

    // 穴に落ちた場合のリセット判定
    if (player.y > levelData.length * TILE_SIZE) {
        initGame(); // 落ちたら最初から
    }

    // カメラの更新（プレイヤーを中心に画面をスクロール）
    camera.x = player.x - canvas.width / 2 + player.width / 2;
    // カメラがマップの左端を超えないように制限
    if (camera.x < 0) camera.x = 0;
    // 右端の制限
    const maxCameraX = levelData[0].length * TILE_SIZE - canvas.width;
    if (camera.x > maxCameraX) camera.x = maxCameraX;
}

// 描画処理
function draw() {
    // 背景のクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // カメラの位置に合わせて描画位置をずらす
    ctx.translate(-camera.x, 0);

    // マップの描画
    for (let y = 0; y < levelData.length; y++) {
        for (let x = 0; x < levelData[y].length; x++) {
            const tile = levelData[y][x];
            
            // 描画範囲外のブロックは描画しない（処理を軽くするため）
            const tileX = x * TILE_SIZE;
            if (tileX + TILE_SIZE < camera.x || tileX > camera.x + canvas.width) {
                continue;
            }

            if (tile === '1') {
                // ブロックの描画（レンガっぽい色）
                ctx.fillStyle = "#8B4513";
                ctx.fillRect(tileX, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                // ブロックの枠線
                ctx.strokeStyle = "#5C2E0A";
                ctx.lineWidth = 2;
                ctx.strokeRect(tileX, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else if (tile === 'G') {
                // ゴールの描画（金色）
                ctx.fillStyle = "#FFD700";
                ctx.fillRect(tileX, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // プレイヤーの描画
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    // プレイヤーの目（進行方向を向くようにしたいけど、一旦シンプルに）
    ctx.fillStyle = "white";
    ctx.fillRect(player.x + 20, player.y + 5, 6, 6);
    ctx.fillStyle = "black";
    ctx.fillRect(player.x + 22, player.y + 7, 3, 3);

    ctx.restore(); // 画面のずれを元に戻す
}

// ゲームのメインループ
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// ゲーム開始
initGame();
loop();
