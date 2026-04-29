document.addEventListener('DOMContentLoaded', () => {
    const gridElement = document.getElementById('grid');
    const statusElement = document.getElementById('status');
    let gridSize = 3; // 幅と高さのマス目の数

    // プレイヤーの位置とゴール、障害物の設定
    let playerPos = { x: 0, y: 1 };
    let obstacles = [];
    let goalPos = { x: 2, y: 1 };
    let level = 1;
    let isGameOver = false;
    let isMoving = false; // 移動アニメーション中の入力をブロックするためのフラグ
    let playerElement;
    
    // アイテムの管理
    let reverseItems = [];
    let reversedControls = false;
    let sizeItems = [];
    let playerMode = 'normal'; // 'normal', 'mini', 'big'

    // 幅優先探索（BFS）でクリア可能か判定する関数
    function isSolvable(startX, startY, goalX, goalY, size, obsList) {
        const queue = [{x: startX, y: startY}];
        const visited = new Set();
        visited.add(`${startX},${startY}`);
        
        const obsSet = new Set(obsList.map(o => `${o.x},${o.y}`));
        const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
        
        while (queue.length > 0) {
            const current = queue.shift();
            if (current.x === goalX && current.y === goalY) return true;
            
            for (let [dx, dy] of dirs) {
                let nx = current.x + dx;
                let ny = current.y + dy;
                
                if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                    let key = `${nx},${ny}`;
                    if (!visited.has(key) && !obsSet.has(key)) {
                        visited.add(key);
                        queue.push({x: nx, y: ny});
                    }
                }
            }
        }
        return false;
    }

    // --- 画面切り替えとセーブデータの管理 ---
    const homeScreen = document.getElementById('home-screen');
    const stageSelectScreen = document.getElementById('stage-select-screen');
    const gameScreen = document.getElementById('game-screen');
    const editorScreen = document.getElementById('editor-screen'); // エディター画面
    
    // クリア履歴をブラウザに保存（初期はレベル1）
    let maxUnlockedLevel = parseInt(localStorage.getItem('neonMazeMaxLevel')) || 1;
    const TOTAL_STAGES = 30; // ステージ選択画面に表示するステージ数
    
    // カスタムステージ（エディター）用変数
    let isCustomLevel = false;
    let customData = null;

    function showScreen(screen) {
        homeScreen.classList.remove('active');
        homeScreen.classList.add('hidden');
        stageSelectScreen.classList.remove('active');
        stageSelectScreen.classList.add('hidden');
        gameScreen.classList.remove('active');
        gameScreen.classList.add('hidden');
        editorScreen.classList.remove('active');
        editorScreen.classList.add('hidden');
        
        screen.classList.remove('hidden');
        screen.classList.add('active');
    }

    // ホーム画面のボタン設定
    document.getElementById('btn-start').addEventListener('click', () => {
        isCustomLevel = false;
        showScreen(gameScreen);
        level = maxUnlockedLevel; // 最新のアンロック済ステージから再開
        initGame();
    });

    document.getElementById('btn-stages').addEventListener('click', () => {
        renderStageSelect();
        showScreen(stageSelectScreen);
    });

    document.getElementById('btn-editor').addEventListener('click', () => {
        initEditor();
        showScreen(editorScreen);
    });

    document.getElementById('btn-back-home').addEventListener('click', () => {
        showScreen(homeScreen);
    });

    document.getElementById('btn-back-home-editor').addEventListener('click', () => {
        showScreen(homeScreen);
    });

    document.getElementById('btn-back-stage').addEventListener('click', () => {
        isGameOver = true; // 戻る時はゲーム中断状態にする
        showScreen(homeScreen);
    });

    function renderStageSelect() {
        const stageGrid = document.getElementById('stage-grid');
        stageGrid.innerHTML = '';
        
        for (let i = 1; i <= TOTAL_STAGES; i++) {
            const btn = document.createElement('button');
            btn.classList.add('stage-btn');
            btn.textContent = i;
            
            // クリア済みのステージは色を変える
            if (i < maxUnlockedLevel) {
                btn.classList.add('cleared');
            }
            
            // まだ到達していないステージはロックする
            if (i > maxUnlockedLevel) {
                btn.disabled = true;
            } else {
                btn.addEventListener('click', () => {
                    level = i;
                    showScreen(gameScreen);
                    initGame();
                });
            }
            
            stageGrid.appendChild(btn);
        }
    }

    function initGame() {
        isGameOver = false;
        isMoving = false;
        loadLevel();
    }

    function loadLevel() {
        if (isCustomLevel && customData) {
            // エディタで作られたカスタムステージを読み込む
            gridSize = customData.gridSize;
            gridElement.style.setProperty('--grid-size', gridSize);
            playerPos = { x: customData.playerPos.x, y: customData.playerPos.y };
            goalPos = { x: customData.goalPos.x, y: customData.goalPos.y };
            obstacles = JSON.parse(JSON.stringify(customData.obstacles));
            reverseItems = JSON.parse(JSON.stringify(customData.reverseItems));
            sizeItems = JSON.parse(JSON.stringify(customData.sizeItems || []));
            reversedControls = false;
            playerMode = 'normal';
            if (playerElement) {
                playerElement.classList.remove('reversed');
                playerElement.classList.remove('mode-mini');
                playerElement.classList.remove('mode-big');
            }
            statusElement.textContent = `カスタムステージ (テストプレイ)`;
            renderGrid();
            return;
        }

        // --- 通常のゲーム用のステージ自動生成 ---
        // レベルに応じてグリッドサイズを拡大 (例: レベル3ごとに1マス増える)
        gridSize = 3 + Math.floor((level - 1) / 3);
        // 最大でも例えば8x8くらいまでに抑える (画面に収めるため)
        if (gridSize > 8) gridSize = 8;

        // CSS側にグリッドの変数を渡す
        gridElement.style.setProperty('--grid-size', gridSize);

        // プレイヤーの位置をリセット（一番左の真ん中あたり）
        playerPos = { x: 0, y: Math.floor(gridSize / 2) };
        reversedControls = false;
        playerMode = 'normal';
        if (playerElement) {
            playerElement.classList.remove('reversed');
            playerElement.classList.remove('mode-mini');
            playerElement.classList.remove('mode-big');
        }
        
        // ゴールは常に一番右の列のランダムな位置に配置
        goalPos = { x: gridSize - 1, y: Math.floor(Math.random() * gridSize) };

        // クリア可能な障害物パターンが見つかるまでランダムに試す
        let obstacleCount = Math.floor(gridSize * gridSize * 0.3) + Math.floor(level / 2); 
        const maxObstacles = Math.floor(gridSize * gridSize * 0.4);
        if (obstacleCount > maxObstacles) obstacleCount = maxObstacles;

        let valid = false;
        while (!valid) {
            obstacles = [];
            for (let i = 0; i < obstacleCount; i++) {
                let ox = Math.floor(Math.random() * gridSize);
                let oy = Math.floor(Math.random() * gridSize);
                
                // スタート・ゴール、およびスタートのすぐ右には置かない
                if (ox === playerPos.x && oy === playerPos.y) continue;
                if (ox === goalPos.x && oy === goalPos.y) continue;
                if (ox === playerPos.x + 1 && oy === playerPos.y) continue; // 初期位置が詰むのを防ぐ
                
                // 重複していなければ追加
                if (!obstacles.some(o => o.x === ox && o.y === oy)) {
                    obstacles.push({x: ox, y: oy});
                }
            }
            // ちゃんと解ける道があるか確認する
            valid = isSolvable(playerPos.x, playerPos.y, goalPos.x, goalPos.y, gridSize, obstacles);
        }

        // 紫のアイテム（操作反転）の生成（レベル2以降でランダム出現）
        reverseItems = [];
        if (level >= 2) {
            let maxReverse = level > 4 ? 2 : 1; 
            for (let i = 0; i < maxReverse; i++) {
                let placed = false;
                let tries = 0;
                // 最大50回試行して、空いている場所に配置する
                while (!placed && tries < 50) {
                    let rx = Math.floor(Math.random() * gridSize);
                    let ry = Math.floor(Math.random() * gridSize);
                    
                    let isStart = (rx === playerPos.x && ry === playerPos.y);
                    let isGoal = (rx === goalPos.x && ry === goalPos.y);
                    let isObs = obstacles.some(o => o.x === rx && o.y === ry);
                    let isRev = reverseItems.some(o => o.x === rx && o.y === ry);
                    
                    if (!isStart && !isGoal && !isObs && !isRev) {
                        reverseItems.push({x: rx, y: ry});
                        placed = true;
                    }
                    tries++;
                }
            }
        }

        // 自動生成時もランダムでサイズ変更アイテムを出す (レベル4以降)
        sizeItems = [];
        if (level >= 4 && !isCustomLevel) {
            if (Math.random() < 0.5) {
                let rx = Math.floor(Math.random() * gridSize);
                let ry = Math.floor(Math.random() * gridSize);
                // 配置条件を簡易チェック
                if (!(rx === playerPos.x && ry === playerPos.y) && !(rx === goalPos.x && ry === goalPos.y)) {
                    const type = Math.random() < 0.5 ? 'mini' : 'big';
                    sizeItems.push({x: rx, y: ry, type: type});
                }
            }
        }

        statusElement.textContent = `レベル ${level}`;
        renderGrid();
    }

    function renderGrid() {
        gridElement.innerHTML = '';
        gridElement.parentElement.classList.remove('game-over-shake');

        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');

                // ゴールの描画
                if (goalPos.x === x && goalPos.y === y) {
                    cell.classList.add('goal');
                } 
                // 障害物の描画
                else {
                    const isObstacle = obstacles.some(obs => obs.x === x && obs.y === y);
                    if (isObstacle) {
                        cell.classList.add('obstacle');
                    } else {
                        // 特殊アイテムの描画
                        const isReverse = reverseItems.some(item => item.x === x && item.y === y);
                        const sizeItem = sizeItems.find(item => item.x === x && item.y === y);
                        
                        if (isReverse) {
                            cell.classList.add('reverse');
                        } else if (sizeItem) {
                            cell.classList.add(`item-${sizeItem.type}`);
                        }
                    }
                }

                gridElement.appendChild(cell);
            }
        }

        // 独立したプレイヤー要素を作成
        playerElement = document.createElement('div');
        playerElement.classList.add('player');
        gridElement.appendChild(playerElement);

        updatePlayerPosition();
    }

    function updatePlayerPosition() {
        const cellX = Math.floor(playerPos.x);
        const cellY = Math.floor(playerPos.y);
        const targetCellIndex = cellY * gridSize + cellX;
        
        // 実際のHTML要素の位置を計算してアニメーションさせます
        const cells = gridElement.querySelectorAll('.cell');
        const targetCell = cells[targetCellIndex];

        if (targetCell) {
            let pWidth = targetCell.offsetWidth;
            let pHeight = targetCell.offsetHeight;
            let pLeft = targetCell.offsetLeft;
            let pTop = targetCell.offsetTop;
            
            // マス内での端数の位置（0.0 や 0.5 など）
            const fracX = playerPos.x - cellX;
            const fracY = playerPos.y - cellY;

            if (playerMode === 'mini') {
                // 1/4のサイズ（面積が1/4になるように縦横半分）しつつ見栄えの余白（85%）をつける
                pWidth = targetCell.offsetWidth * 0.5 * 0.85; 
                pHeight = targetCell.offsetHeight * 0.5 * 0.85;
                
                // フラクショナルな移動量分ずらす
                pLeft += fracX * targetCell.offsetWidth + targetCell.offsetWidth * 0.5 * 0.075;
                pTop += fracY * targetCell.offsetHeight + targetCell.offsetHeight * 0.5 * 0.075;
            } else if (playerMode === 'big') {
                pWidth = targetCell.offsetWidth * 1.7;
                pHeight = targetCell.offsetHeight * 1.7;
                
                // 中央からハミ出すようにマイナスのオフセットを入れる
                pLeft -= targetCell.offsetWidth * 0.35;
                pTop -= targetCell.offsetHeight * 0.35;
            } else {
                pWidth = targetCell.offsetWidth * 0.85;
                pHeight = targetCell.offsetHeight * 0.85;
                
                pLeft += targetCell.offsetWidth * 0.075;
                pTop += targetCell.offsetHeight * 0.075;
            }

            playerElement.style.width = pWidth + 'px';
            playerElement.style.height = pHeight + 'px';
            playerElement.style.transform = `translate(${pLeft}px, ${pTop}px)`;
        }
    }

    function movePlayer(dx, dy) {
        if (isGameOver || isMoving) return; // ゲームオーバー時や移動アニメーション中はキー入力を無視

        // 紫アイテムの効果：操作が反転している場合は移動方向を逆にする
        if (reversedControls) {
            dx = -dx;
            dy = -dy;
        }

        // ミニモードの時は1回の移動量が半分（0.5）になる
        let step = playerMode === 'mini' ? 0.5 : 1;
        const newX = playerPos.x + dx * step;
        const newY = playerPos.y + dy * step;

        // 外側の壁のチェック
        const maxLimit = gridSize - step;
        if (newX < 0 || newX > maxLimit || newY < 0 || newY > maxLimit) {
            return;
        }

        // 移動をロック
        isMoving = true;

        // 位置を更新
        playerPos.x = newX;
        playerPos.y = newY;

        updatePlayerPosition();
        
        // アニメーションを少し待ってから当たり判定を行う
        setTimeout(() => {
            checkCollision();
            isMoving = false; // アニメーション終了（当たり判定完了）で次の入力を許可
        }, 150); // 移動アニメーションの時間により判定
    }

    function checkCollision() {
        const cellX = Math.floor(playerPos.x);
        const cellY = Math.floor(playerPos.y);

        // 赤い障害物に当たったかチェック
        const hitObstacle = obstacles.some(obs => obs.x === cellX && obs.y === cellY);
        if (hitObstacle) {
            gameOver();
            return;
        }

        // 紫アイテムの獲得判定
        const hitReverseIndex = reverseItems.findIndex(item => item.x === cellX && item.y === cellY);
        if (hitReverseIndex > -1) {
            // アイテムを消費
            reverseItems.splice(hitReverseIndex, 1); 
            // 操作を反転
            reversedControls = !reversedControls; 
            
            // プレイヤー自身も少し紫色にして見た目で反転中だと分かりやすくする
            if (reversedControls) {
                playerElement.classList.add('reversed');
            } else {
                playerElement.classList.remove('reversed');
            }
            
            // 画面上から紫マスの色（クラス）を普通のマスに戻す
            const cells = gridElement.querySelectorAll('.cell');
            const targetCellIndex = cellY * gridSize + cellX;
            const targetCell = cells[targetCellIndex];
            if (targetCell) {
                targetCell.classList.remove('reverse');
            }
        }

        // サイズ変更アイテムの獲得判定
        const hitSizeIndex = sizeItems.findIndex(item => item.x === cellX && item.y === cellY);
        if (hitSizeIndex > -1) {
            const pickedType = sizeItems[hitSizeIndex].type;
            sizeItems.splice(hitSizeIndex, 1);
            playerMode = pickedType;
            
            // ノーマルやビッグに戻った場合は、マスの中心（整数座標）に強制スナップさせる
            if (playerMode !== 'mini') {
                playerPos.x = cellX;
                playerPos.y = cellY;
            }
            
            playerElement.classList.remove('mode-mini', 'mode-big');
            if (playerMode !== 'normal') {
                playerElement.classList.add(`mode-${playerMode}`);
            }
            
            // マスからアイテムを取り除く
            const cells = gridElement.querySelectorAll('.cell');
            const targetCellIndex = cellY * gridSize + cellX;
            const targetCell = cells[targetCellIndex];
            if (targetCell) {
                targetCell.classList.remove('item-mini', 'item-big', 'item-normal');
            }
            
            // 見た目のサイズと位置を更新
            updatePlayerPosition();
        }

        // 緑のゴールに到達したかチェック
        if (cellX === goalPos.x && cellY === goalPos.y) {
            levelClear();
            return;
        }
    }

    function gameOver() {
        isGameOver = true;
        statusElement.textContent = 'ゲームオーバー！ スペースキーでやり直し';
        statusElement.style.color = '#ef4444'; // 赤色に変更
        gridElement.parentElement.classList.add('game-over-shake'); // 画面を揺らす
    }

    function levelClear() {
        isGameOver = true;

        if (isCustomLevel) {
            statusElement.style.color = '#10b981';
            statusElement.textContent = 'カスタムステージクリア！';
            setTimeout(() => {
                showScreen(editorScreen); // エディターに戻る
            }, 1500);
            return;
        }

        level++;
        
        // セーブデータの更新
        if (level > maxUnlockedLevel) {
            maxUnlockedLevel = level;
            localStorage.setItem('neonMazeMaxLevel', maxUnlockedLevel);
        }

        statusElement.style.color = '#10b981'; // 緑色に変更
        statusElement.textContent = 'クリア！ 次のレベルへ...';
        
        // 1秒後に次のレベルを読み込む
        setTimeout(() => {
            isGameOver = false;
            statusElement.style.color = '#94a3b8'; // 元の色に戻す
            loadLevel();
        }, 1000);
    }

    // キーボードの入力を受け取る
    window.addEventListener('keydown', (e) => {
        // デフォルトのスクロール動作を防ぐ（矢印キーやスペースキーで画面が動かないようにする）
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
            e.preventDefault();
        }

        if (isGameOver) {
            // ゲームオーバー時にスペースキーでリトライ
            if (e.code === 'Space' && statusElement.textContent.includes('ゲームオーバー')) {
                statusElement.style.color = '#94a3b8';
                initGame();
            }
            return;
        }

        const code = e.code;
        const key = e.key;

        if (code === 'ArrowUp' || key === 'ArrowUp' || code === 'KeyW' || key === 'w' || key === 'W') {
            movePlayer(0, -1);
        } else if (code === 'ArrowDown' || key === 'ArrowDown' || code === 'KeyS' || key === 's' || key === 'S') {
            movePlayer(0, 1);
        } else if (code === 'ArrowLeft' || key === 'ArrowLeft' || code === 'KeyA' || key === 'a' || key === 'A') {
            movePlayer(-1, 0);
        } else if (code === 'ArrowRight' || key === 'ArrowRight' || code === 'KeyD' || key === 'd' || key === 'D') {
            movePlayer(1, 0);
        }
    });

    // スワイプ（タッチ操作）の対応
    let touchStartX = 0;
    let touchStartY = 0;

    window.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, {passive: false});

    window.addEventListener('touchend', (e) => {
        if (isGameOver) {
            // ゲームオーバー時に画面タップでリトライ
            if (statusElement.textContent.includes('ゲームオーバー')) {
                statusElement.style.color = '#94a3b8';
                initGame();
            }
            return;
        }

        let touchEndX = e.changedTouches[0].screenX;
        let touchEndY = e.changedTouches[0].screenY;
        
        let dx = touchEndX - touchStartX;
        let dy = touchEndY - touchStartY;
        
        // スワイプの距離が短い場合は無視する
        if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;

        if (Math.abs(dx) > Math.abs(dy)) {
            // 左右のスワイプ
            if (dx > 0) movePlayer(1, 0);
            else movePlayer(-1, 0);
        } else {
            // 上下のスワイプ
            if (dy > 0) movePlayer(0, 1);
            else movePlayer(0, -1);
        }
    });

    // --- エディター機能の実装 ---
    let editorGridSize = 5;
    let currentEditorTool = 'obstacle';
    let editorData = {
        playerPos: { x: 0, y: 0 },
        goalPos: { x: 4, y: 4 },
        obstacles: [],
        reverseItems: [],
        sizeItems: []
    };

    function initEditor() {
        editorGridSize = 5;
        editorData = {
            playerPos: { x: 0, y: 0 },
            goalPos: { x: editorGridSize - 1, y: editorGridSize - 1 },
            obstacles: [],
            reverseItems: [],
            sizeItems: []
        };
        document.getElementById('editor-size-display').textContent = `サイズ: ${editorGridSize}x${editorGridSize}`;
        updateEditorGrid();
    }

    // サイズ変更ボタン
    document.getElementById('btn-editor-size-down').addEventListener('click', () => {
        if (editorGridSize > 3) {
            editorGridSize--;
            document.getElementById('editor-size-display').textContent = `サイズ: ${editorGridSize}x${editorGridSize}`;
            fixEditorBounds();
            updateEditorGrid();
        }
    });

    document.getElementById('btn-editor-size-up').addEventListener('click', () => {
        if (editorGridSize < 8) {
            editorGridSize++;
            document.getElementById('editor-size-display').textContent = `サイズ: ${editorGridSize}x${editorGridSize}`;
            updateEditorGrid();
        }
    });

    function fixEditorBounds() {
        if (editorData.playerPos.x >= editorGridSize) editorData.playerPos.x = editorGridSize - 1;
        if (editorData.playerPos.y >= editorGridSize) editorData.playerPos.y = editorGridSize - 1;
        if (editorData.goalPos.x >= editorGridSize) editorData.goalPos.x = editorGridSize - 1;
        if (editorData.goalPos.y >= editorGridSize) editorData.goalPos.y = editorGridSize - 1;
        
        editorData.obstacles = editorData.obstacles.filter(o => o.x < editorGridSize && o.y < editorGridSize);
        editorData.reverseItems = editorData.reverseItems.filter(o => o.x < editorGridSize && o.y < editorGridSize);
        editorData.sizeItems = editorData.sizeItems.filter(o => o.x < editorGridSize && o.y < editorGridSize);
    }

    // ツールパレット選択
    const tools = document.querySelectorAll('.palette-tool');
    tools.forEach(toolBtn => {
        toolBtn.addEventListener('click', (e) => {
            tools.forEach(btn => btn.classList.remove('selected'));
            e.target.classList.add('selected');
            currentEditorTool = e.target.getAttribute('data-tool');
        });
    });

    // テストプレイ開始
    document.getElementById('btn-editor-play').addEventListener('click', () => {
        isCustomLevel = true;
        customData = {
            gridSize: editorGridSize,
            playerPos: { x: editorData.playerPos.x, y: editorData.playerPos.y },
            goalPos: { x: editorData.goalPos.x, y: editorData.goalPos.y },
            obstacles: JSON.parse(JSON.stringify(editorData.obstacles)),
            reverseItems: JSON.parse(JSON.stringify(editorData.reverseItems)),
            sizeItems: JSON.parse(JSON.stringify(editorData.sizeItems))
        };
        showScreen(gameScreen);
        initGame();
    });

    function updateEditorGrid() {
        const grid = document.getElementById('editor-grid');
        grid.style.setProperty('--grid-size', editorGridSize);
        grid.innerHTML = '';
        
        let isMouseDown = false;
        grid.onmousedown = () => isMouseDown = true;
        grid.onmouseup = () => isMouseDown = false;
        grid.onmouseleave = () => isMouseDown = false;

        for (let y = 0; y < editorGridSize; y++) {
            for (let x = 0; x < editorGridSize; x++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                
                // 表示の適用
                if (editorData.goalPos.x === x && editorData.goalPos.y === y) {
                    cell.classList.add('goal');
                } else if (editorData.playerPos.x === x && editorData.playerPos.y === y) {
                    cell.style.backgroundColor = '#38bdf8';
                    cell.style.boxShadow = '0 0 15px #38bdf8, inset 0 0 10px rgba(255,255,255,0.5)';
                    cell.style.transform = 'scale(0.85)';
                    cell.style.borderRadius = '12px';
                    cell.style.position = 'absolute';
                    cell.style.width = '100%';
                    cell.style.height = '100%';
                    cell.style.top = '0';
                    cell.style.left = '0';
                    cell.style.zIndex = '5';
                } else if (editorData.obstacles.some(o => o.x === x && o.y === y)) {
                    cell.classList.add('obstacle');
                } else if (editorData.reverseItems.some(o => o.x === x && o.y === y)) {
                    cell.classList.add('reverse');
                } else {
                    const sItem = editorData.sizeItems.find(o => o.x === x && o.y === y);
                    if (sItem) {
                        cell.classList.add(`item-${sItem.type}`);
                    }
                }
                
                // イベントの設定
                cell.addEventListener('mousedown', (e) => {
                    e.preventDefault(); // ドラッグ選択を防ぐ
                    applyToolToEditor(x, y);
                });
                cell.addEventListener('mouseenter', (e) => {
                    if (isMouseDown && (currentEditorTool === 'obstacle' || currentEditorTool === 'reverse' || currentEditorTool === 'erase')) {
                        applyToolToEditor(x, y);
                    }
                });
                
                // 背景用のセルの上に重ねるため、コンテナでラップするか簡略表示
                const wrapper = document.createElement('div');
                wrapper.style.position = 'relative';
                wrapper.style.width = '100%';
                wrapper.style.height = '100%';
                wrapper.appendChild(cell);
                
                grid.appendChild(wrapper);
            }
        }
    }

    function applyToolToEditor(x, y) {
        // 同じマスにある他のアイテムをすべて消去する共通関数
        const clearCell = (cx, cy) => {
            editorData.obstacles = editorData.obstacles.filter(o => o.x !== cx || o.y !== cy);
            editorData.reverseItems = editorData.reverseItems.filter(o => o.x !== cx || o.y !== cy);
            editorData.sizeItems = editorData.sizeItems.filter(o => o.x !== cx || o.y !== cy);
        };

        if (currentEditorTool === 'player') {
            editorData.playerPos = {x, y};
            clearCell(x, y);
        } else if (currentEditorTool === 'goal') {
            editorData.goalPos = {x, y};
            clearCell(x, y);
        } else if (currentEditorTool === 'erase') {
            if (editorData.playerPos.x === x && editorData.playerPos.y === y) return;
            if (editorData.goalPos.x === x && editorData.goalPos.y === y) return;
            clearCell(x, y);
        } else {
            // 他のアイテム類を配置する場合
            if (editorData.playerPos.x === x && editorData.playerPos.y === y) return;
            if (editorData.goalPos.x === x && editorData.goalPos.y === y) return;
            
            clearCell(x, y);

            if (currentEditorTool === 'obstacle') {
                editorData.obstacles.push({x, y});
            } else if (currentEditorTool === 'reverse') {
                editorData.reverseItems.push({x, y});
            } else if (currentEditorTool.startsWith('item-')) {
                const type = currentEditorTool.replace('item-', '');
                editorData.sizeItems.push({x, y, type: type});
            }
        }
        
        updateEditorGrid();
    }

    // 最初にホーム画面を表示
    showScreen(homeScreen);
});
