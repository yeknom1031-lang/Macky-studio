"""Update release facts from local build and test reports; never infer completion."""
import argparse
from collections import Counter
from datetime import datetime
import json
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROD = ROOT / 'assets/production'
DOCS = ROOT / 'docs/production-plan'


def read(path, default=None):
    return json.loads(path.read_text()) if path.exists() else ({} if default is None else default)


def refresh(released=False):
    report = read(PROD / 'build-report.json')
    manifest = read(PROD / 'jobs.json')
    animal_plan = read(PROD / 'animal-jobs.json')
    jobs = manifest.get('jobs', []) + animal_plan.get('jobs', []) + read(PROD / 'repairs.json').get('jobs', [])
    saved = [job for job in jobs if (PROD / 'source' / (job['id'] + '.png')).exists()]
    counts = Counter(job['kind'] for job in saved)
    review = PROD / 'review'
    browser = read(review / 'browser-report.json')
    duo = read(review / 'duo-browser-report.json')
    photo = read(review / 'photo-browser-report.json')
    artwork = read(review / 'artwork-completion.json')
    stages = read(review / 'stages-browser-report.json')
    simulation = read(review / 'all-stages-simulation.json')
    offline = read(review / 'offline-browser-report.json')
    packaged = read(PROD / 'package-report.json')
    quality = PROD / 'quality'
    quality_ids = [f'S{i:02}-background' for i in range(1, 25)] + [f'S{i:02}-detail-{n}' for i in range(12, 25) for n in range(4)]
    quality_saved = [key for key in quality_ids if (quality / 'source' / (key + '.png')).is_file() and (quality / 'receipts' / (key.replace('-background', '') + '.json')).is_file()]
    runtime_data = json.loads((ROOT / 'expedition/data.js').read_text().split('=', 1)[1].rstrip(';\n'))
    quality_used = sum(bool(s.get('openBuildings')) + len(s.get('backgroundTiles', [])) for s in runtime_data['stages'])
    living = read(review / 'living-town-qa.json')
    living_count = sum(bool(s.get('livingTown')) and bool(s.get('activityAreas')) for s in runtime_data['stages'])
    living_ok = living.get('sourceSHA') == hashlib.sha256((ROOT / 'src/expedition-core.js').read_bytes()).hexdigest() and living.get('dataSHA') == hashlib.sha256((ROOT / 'expedition/data.js').read_bytes()).hexdigest() and living.get('passed') is True and len(living.get('stages', [])) == 24 and all(s.get('passed') is True for s in living['stages'])
    audio = read(review / 'audio-browser-report.json')
    tracks = read(ROOT / 'assets/audio/tracks.json', [])
    qa = read(review / 'release-qa-summary.json')
    hashed_files = ['expedition-core.js', 'expedition-app.js', 'expedition-render.js', 'expedition-input.js', 'expedition-audio.js', 'data.js']
    qa_current = qa.get('version') == '2.2' and bool(qa.get('passed')) and all(qa.get('codeHashes', {}).get(name) == hashlib.sha256((ROOT / ('expedition' if name == 'data.js' else 'src') / name).read_bytes()).hexdigest() for name in hashed_files)
    from runtime_image_integrity import artwork_fingerprints
    images = artwork_fingerprints(ROOT / 'expedition')
    qa_current = qa_current and qa.get('imageFingerprint') == images['fingerprint'] and qa.get('imageFileCount') == images['fileCount']
    audio_ok = len(audio.get('stages', [])) == 24 and len(audio.get('signals', [])) == 24 and all(r.get('passed') for r in audio.get('results', [])) and all(r.get('signalPeak', 0) > 0 for r in audio.get('signals', [])) and not audio.get('errors', [1])
    animation = PROD / 'animation-expansion'
    animation_saved = [f'A{i:04}' for i in range(1,801) if (animation / 'source' / f'A{i:04}.png').is_file() and (animation / 'receipts' / f'A{i:04}.json').is_file()]
    animation_status = runtime_data.get('animationExpansion', {})
    animation_audit = read(animation / 'review/archive-audit.json')
    animation_audit_current = animation_audit.get('passed') and animation_audit.get('dataSHA') == hashlib.sha256((ROOT / 'expedition/data.js').read_bytes()).hexdigest()
    clip_counts = Counter(name for c in runtime_data['characters'] for name in c.get('clips', {}))
    scenery_objects = sum(len(stage.get('animatedScenery', [])) for stage in runtime_data['stages'])
    saved_total = len(saved) + len(quality_saved) + len(animation_saved)
    planned_total = len(jobs) + len(quality_ids) + 800
    playable = report.get('playableStages', [])
    browser_count = len(stages.get('results', []))
    simulation_count = len(simulation.get('results', []))
    if released:
        issues = []
        if len(playable) != 24 or report.get('characters') != 4396 or report.get('missing', [1]) or report.get('errors', [1]):
            issues.append('24ステージ・4,396種類の完全なビルド')
        if len(saved) != len(jobs):
            issues.append('全発注原画の保存')
        if not browser or browser.get('errors', [1]) or not duo or duo.get('errors', [1]):
            issues.append('探索と2人対戦のブラウザ検証')
        if not photo.get('fullBody') or photo.get('errors', [1]) or photo.get('mismatched', 1):
            issues.append('写真で対象の全身が見える描画検証')
        if artwork.get('status') != 'verified' or artwork.get('generatedImages') != report.get('generated'):
            issues.append('最終原画の検品')
        if browser_count != 24 or stages.get('errors', [1]):
            issues.append('全24ステージのブラウザ検証')
        if simulation_count != 24 or simulation.get('durationPerStage') != 180 or any(r.get('stats', {}).get('maxOverlap', 3) >= 3 for r in simulation.get('results', [])):
            issues.append('全24ステージの180秒シミュレーション')
        if packaged.get('stages') != 24 or packaged.get('characters') != 4396 or not Path(packaged.get('entry', '/missing')).is_file():
            issues.append('オフラインMacアプリの更新')
        if not offline.get('offline') or offline.get('errors', [1]) or offline.get('networkRequests', [1]) or offline.get('entry') != packaged.get('entry'):
            issues.append('配布アプリのオフライン起動検証')
        if len(quality_saved) != len(quality_ids) or quality_used != len(quality_ids):
            issues.append('新全景24枚・広い街の詳細52枚の保存と組込み')
        if living_count != 24 or not living_ok:
            issues.append('全24ステージの新しい室内・庭・2階の移動領域と生活行動の検証')
        if not audio_ok:
            issues.append('24音源・24ステージのオフライン再生と非ゼロ音声信号')
        if len(animation_saved) != 800 or not animation_audit_current or scenery_objects != 288:
            issues.append('追加800回の原画保存・採否監査と288環境アニメの組込み')
        if not qa_current:
            issues.append('現在の5モジュールとステージデータに一致する最終QA')
        if any(offline.get('codeHashes', {}).get(name) != qa.get('codeHashes', {}).get(name) for name in hashed_files):
            issues.append('最終QAと配布アプリ内のモジュール・データの一致')
        if any(record.get('imageFingerprint') != images['fingerprint'] or record.get('imageFileCount') != images['fileCount'] for record in (offline, packaged)):
            issues.append('最終の目視検証と配布アプリ内の全画像の一致')
        if packaged.get('appVersion') != '2.2' or offline.get('appVersion') != '2.2':
            issues.append('v2.2配布アプリとオフライン起動の確認')
        if issues:
            raise SystemExit('公開済みとは記載できません。未充足: ' + '、'.join(issues))
    now = datetime.now().astimezone().isoformat(timespec='seconds')
    status = '24ステージ版 v2.2を公開済み' if released else '24ステージ版 v2.2を制作・検証中'
    summary = dict(at=now, released=released, status=status, saved=saved_total, planned=planned_total,
                   animationSaved=len(animation_saved), animationPlanned=800, animationUsedSheets=animation_status.get('accepted', 0), animationClips=dict(clip_counts), sceneryObjects=scenery_objects, originalMaterialFallbackClips=animation_audit.get('originalMaterialFallbackClips') if animation_audit_current else None, baseSaved=len(saved), basePlanned=len(jobs), qualitySaved=len(quality_saved), qualityPlanned=len(quality_ids), qualityUsed=quality_used, audioTracks=len(tracks), audioChecks=len(audio.get('results', [])), livingStages=living_count, livingVerified=living_ok, currentQA=qa_current,
                   generated=report.get('generated', 0) + quality_used + len(animation_saved), baseGenerated=report.get('generated', 0), characters=report.get('characters', 0),
                   playableStages=len(playable), browserStages=browser_count, simulationStages=simulation_count,
                   physicalControllerTested=False, appVersion=packaged.get('appVersion') if released else None)
    (DOCS / 'release-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    limits = '''ブラウザ版の2D描画を拡張しています。人物の基本素材は歩行4コマ＋主要動作4コマで、動物も8コマです。v2.2では後ろ向き歩行・階段の上り下りを各4コマ、設備での仕事を8コマ、環境の動きを8コマで追加します。採用した追加動作がない人物には、従来の歩行・仕事の絵を使用します。車いすやスポーツ用具の移動は、その場所と動作に合わせて制御します。既存の乗り物・環境素材も保持します。250役割には役割別の原画を割り当て、経路・設備・会話・追跡・乗車などの制御を共有します。背景から測定した通行領域と設備の前後関係を持つ2Dの街です。

Switch互換コントローラーは、ブラウザのGamepad APIで認識される機種を対象にしています。自動テストでは接続・移動・切断・再接続を模擬入力で確認しました。物理コントローラーそのものは未確認です。入力を検出すると対象の操作を引き継ぎ、8秒無操作または切断で自動移動に戻ります。ゲームと時計はそのまま続きます。'''
    if released:
        limits = limits.replace('追加します。', '追加しました。')
    base = report.get('characters', 0)
    planned = len(jobs)
    overlap = max((r.get('stats', {}).get('maxOverlap', 0) for r in simulation.get('results', [])), default=0)
    checks = f"探索・写真操作{len(browser.get('checks', []))}項目、2人対戦{len(duo.get('checks', []))}項目、写真の描画{len(photo.get('checks', []))}項目を自動確認済みです。" if browser and duo and photo else '探索・2人対戦・写真の検証は各レポートの確認範囲を参照してください。'
    status_md = f'''# 実装状況と収録内容

更新：{now}。**{status}。** この章は原画ファイル・ビルド結果・検証レポートから生成しています。{'最終QAは現在のコード・背景と一致しています。' if qa_current else 'v2.2の最終QA更新前です。保存済みの旧検証結果を新仕様の完了とは扱いません。'}後続の制作計画は設計時の仕様・候補も含むため、実装済みの範囲はこちらを参照してください。

| 項目 | 現在確認できる状態 |
| --- | --- |
| 新規生成原画の保存 | {saved_total:,} / {planned_total:,}枚（補修と保存済み旧背景を含む原本。過去の全試行回数ではありません） |
| 追加アニメの生成原画 | {len(animation_saved):,} / 800枚を保存。環境{scenery_objects}個、人物の追加動作{sum(clip_counts.values()):,}件を組込み |
| 基本素材のビルド | {report.get('generated', 0):,} / {len(jobs):,}枚 |
| 開放的な室内・庭・2階の新背景 | {len(quality_saved):,} / {len(quality_ids):,}枚を保存、{quality_used:,}枚を組込み |
| 室内・庭・2階での生活行動 | {living_count} / 24街に実装。{'新経路と行動の検証済み' if living_ok else '最終検証待ち'} |
| BGM・環境音・効果音 | {len(tracks)}音源、24ステージに割当。ブラウザ音声検証{len(audio.get('results', []))}項目 |
| 収録デザイン | {base:,} / 4,396種類。人物4,300＋動物96{'を収録' if released else 'を目標'} |
| 遊べるステージ | {len(playable)} / 24 |
| 全ステージの描画検証 | {browser_count} / 24（自動操作したChrome） |
| 180秒シミュレーション | {simulation_count} / 24 |
| 配布アプリ | {'バージョン2.2へ更新済み。ネット接続とプレビューサーバーは不要' if released else '配布済み版を保持。v2.2の全24ステージ検証後に更新'} |

## 素材の内訳

人物シート407枚（専用240枚＋共通167枚）、新背景17枚、ステージごとの設備・乗り物・環境セット24枚、動物シート16枚が基本です。不足した人物と問題のあるコマだけを補う修正シートを別途加え、基本素材の発注単位は合計{planned:,}枚です。保存済みの種類別内訳は人物{counts['people']:,}枚（人物補完を含む）、背景{counts['background']:,}枚、セット{counts['set']:,}枚、動物{counts['animals']:,}枚、コマ補修{counts['patches']:,}枚です。

{'基本素材の検品では欠けていた人物6人を補完し、20コマを生成画像で修正しました。95行の列境界を実測して切り出しを調整しています。元のPNGは上書きせず保持しています。' if artwork.get('status') == 'verified' else '人物・コマの補修内容は最終検品レポートへ記録します。'}

既存250ベース（人物232＋動物18）は再利用します。追加は人物4,068＋動物78で、色違いは作りません。各ステージ専用100人と共通住民・動物を組み合わせ、同一場面には同じデザインを重複配置しません。動物の一部の配役名は、既存の原画の実際の姿に合わせて調整しています。

前版v2.1で室内・庭・2階・階段が見える全景24枚を新規生成し、第12〜24ステージには拡大用の詳細画像を4枚ずつ追加し、約3,040px相当の横幅で表示します。生成元は1672×941で、4K生成とは区別しています。追加76枚のうち{len(quality_saved)}枚を保存し、{quality_used}枚を組み込み済みです。旧背景も保存したままです。原画と生成記録は `assets/production/quality/` に分けています。

追加アニメは800回の生成枠を使い、原画・指示・実行記録・保存元・SHAを `assets/production/animation-expansion/` に保持します。全画像の採否をコマ単位で確認し、持ち物や顔が変わる行・動作は採用しません。生成した回数と採用数は別に数えます。現在の実行データには後ろ向き歩行{clip_counts['walkBack']:,}人、上り{clip_counts['stairUp']:,}人、下り{clip_counts['stairDown']:,}人、追加の仕事動作{clip_counts['roleWork']:,}人、環境{scenery_objects}個を収録しています。{'追加clipが未採用で従来素材を使う動作は' + format(animation_audit['originalMaterialFallbackClips'], ',') + '件です。車いす等の地上移動のため使わない階段動作' + str(animation_audit['omittedGroundOnlyStairClips']) + '件は別に数えています。' if animation_audit_current else '採用と従来素材を使う動作の最終内訳は監査待ちです。'}

原画、生成指示、保存元、切り出し範囲はそれぞれ `assets/production/source/`、`jobs.json` と `animal-jobs.json` と `repairs.json`、`receipts/`、実行データの `sourceMetadata` に記録します。画像の生成成功と、ゲームへの組み込み・検証完了を分けて管理しています。

## 操作と実装方式

[遊び方](../遊び方.html)に写真、2人対戦、広い街の操作をまとめています。探索時間は180秒、撮影回数は0回から開始し、各ステージ5人のカメラマンを1人ずつ発見すると1回ずつ増えます。枠をドラッグして撮り、3秒後に写真を確認します。開始前に3・2・1を表示し、探索中は残り時間と「街を出る」を常に表示します。モード選択はなく、コントローラーの入力で途中から操作に参加できます。補助画面は任意です。

{limits}

## 街の音

無料公開された12セットから7曲のBGM、ざわめき・鳥・波・風・駅・機械などの環境音、操作の効果音を選び、合計24音源（約14.1 MiB）を同梱します。24ステージごとに組み合わせを変え、フェード・ループ・一時停止・退出時の停止に対応しています。音量とミュートを保存します。通信なしで再生でき、作者・元URL・CC0/CC BYの条件・加工内容を[音のクレジット](../../expedition/audio/CREDITS.html)にまとめています。

## 確認結果の保存先

{checks} {'全24ステージを各180秒進め、測定した胴体の重なりは最長' + format(overlap, '.1f') + '秒でした。乗客と地上人物の重なりも判定対象です。' if simulation_count == 24 else ''} {'配布したMacアプリもネット接続を無効にして開き、最後の街の2,000体を読み込めること、外部通信要求とJavaScript例外が0件であることを確認しました。' if released else ''}

- `assets/production/animation-expansion/review/archive-audit.json`：800回の原画・生成記録・SHA、採用動作と従来素材の区別。
- `assets/production/animation-expansion/review/scenery-runtime-placement.json`：24街で追加アニメと住人を実表示した画像・目視確認。
- `assets/production/build-report.json`：素材不足とステージ成立条件。
- `assets/production/review/artwork-completion.json`：{artwork.get('generatedImages', 0):,}枚の原画検品・補修・再利用の実績。
- `assets/production/review/browser-report.json`：写真・タッチ・勝敗表示。
- `assets/production/review/duo-browser-report.json`：2人対戦・切断・専用画面。
- `assets/production/review/photo-browser-report.json`：撮影時の対象だけを、乗車中も全身・前景の手前に描画。
- `assets/production/review/stages-browser-report.json`：ステージごとの人数・描画・読み込み時間。
- `assets/production/review/all-stages-simulation.json`：180秒間の移動・重なり・イベント。
- `assets/production/review/living-town-qa.json`：全24ステージの活動領域・2階・経路到達性・街路以外の滞在と仕事。
- `assets/production/review/audio-browser-report.json`：全24ステージ再生、24音源デコード、非ゼロPCM・analyser信号、音量・ミュート・停止・再開・設定保存。
- `assets/production/review/release-qa-summary.json`：現在のコードとデータのハッシュ、最終QAの集約。
- `assets/production/package-report.json`：配布アプリの保存先・容量・収録数。
- `assets/production/review/offline-browser-report.json`：ネット接続なしで配布アプリを開き、最後の街2,000体を読み込む検証。

テストの速度はその検証環境の値であり、すべての端末の動作速度を保証する値ではありません。未記録の項目は未確認です。
'''
    (DOCS / 'IMPLEMENTATION_STATUS.md').write_text('\n'.join(line.rstrip() for line in status_md.splitlines()) + '\n')
    stages_table = '\n'.join(f"| {i+1:02} | {s['name']} | {s['pop']:,} | {s['area']}倍 |" for i, s in enumerate(manifest['stages']))
    readme = f'''# わちゃわちゃタウン

街で働いたり遊んだりする住人の中から、見本と同じ相手を3分以内に探すゲームです。

**{status}。** 収録デザイン{base:,} / 4,396種類、原画保存{saved_total:,} / {planned_total:,}枚、遊べる街{len(playable)} / 24。[実装状況と検証結果](docs/production-plan/IMPLEMENTATION_STATUS.md)で現在の状態を確認できます。

## 開く

{'デスクトップの「わちゃわちゃタウン.app」をダブルクリックすると、24ステージ版がGoogle Chromeで開きます。' if released else 'デスクトップの「わちゃわちゃタウン.app」は配布済み版を保持しています。制作中のv2.2は expedition/index.html から確認できます。'} ゲーム本体はローカルに保存され、Codex終了後・Mac再起動後もネット接続なしで開けます。

- [24ステージ版を開く](expedition/index.html)
- [遊び方](docs/遊び方.html)
- [画像制作計画と実装状況](docs/production-plan/画像制作計画.html)
- [旧7ステージ版の仕様](docs/archive/7-stage-README.md)

## 24の街を探す

各街の専用人物100人に、場所に合った共通の住人と動物が加わります。最初の7ステージは500体、後半は街も人数も増え、最後は面積6倍・2,000体です。室内・庭・2階・階段が見える全景24枚と、広い街の拡大用画像52枚を収録しています。v2.2では追加800回の画像生成で、後ろ向き歩行・階段の上り下り・設備での仕事・街の小物アニメを{'加えました' if released else '制作しています'}。広い場所では画面をドラッグして移動し、ホイールやピンチで拡大します。同じ場面に同じデザインは1体だけ。色違いの水増しはありません。

左上の見本を押すと、探索画面のまま顔や服を大きく確認できます。正解は「みーつけた！」、お手つきは「お手つき！ −3秒」と表示します。残り時間は常に表示します。開始前は3・2・1のカウントダウン。Esc・Pキー・一時停止ボタンで休憩でき、「街を出る」で街の一覧へ戻れます。一時停止中の「ゲームを終了」でも終了できます。

## 写真はカメラマンから

最初の撮影回数は0回です。街の5人のカメラマンを見つけると、1人につき1回ずつ撮影できます。同じカメラマンからは1回だけ。1ゲーム最大5枚です。

1. 右下のカメラ、またはCキーで撮影枠を出す。
2. 枠の中をドラッグして位置を決める。枠は画面面積の約10％。
3. もう一度カメラ、またはCキーを押して撮る。
4. 3秒後、撮影した瞬間の写真が開く。探す相手以外の人物・動物は写らない。
5. 写真を閉じ、街で本人を見つけてクリックする。

範囲に本人がいないと風景だけになります。写真を押してもクリアにはなりません。現像・閲覧中も街と時計は進み、一時停止中は両方止まります。×かEscで撮影を中止すると回数を消費しません。

## ふたりでかくれんぼ

1. Switch互換コントローラーをMacへ接続する。
2. 遊びたい街を開き、ゲーム画面を一度クリックする。
3. スティック・十字キー・ボタンを動かすと、探される人の操作に参加できる。
4. 探す人はマウスで移動・写真・タッチ。隠れる人は左スティックか十字キーで移動し、行動ボタンで設備・乗り物を使う／離れる。

モード選択はありません。8秒操作しないと本人が自動で行動し、再び操作すれば引き継げます。コントローラーが切断されてもゲームは続きます。広い街の「操作する人の補助画面」は任意で、別のディスプレイでも使えます。閉じてもメイン画面で続けられ、探す側の画面が相手へ勝手に追従することもありません。

接続認識はGamepad APIを使います。反応がない場合はゲーム画面をクリックし、「接続を確認」を押してください。行動ボタンは下・右・左・上から選べます。物理コントローラーは未検証で、模擬入力による自動テストを行っています。

## 音楽と街のざわめき

7曲のBGMに、ざわめき・鳥・波・風・駅・工房などを街に合わせて重ねます。タイトル画面と一時停止の音量・音ON/OFFで調整できます。音量とミュートの設定は保存されます。音源もゲームに同梱するため、ネット接続は不要です。[作者・音源の利用条件](expedition/audio/CREDITS.html)を同梱しています。

## 街の一覧

| ステージ | 場所 | 住人・動物 | 面積 |
| --- | --- | ---: | ---: |
{stages_table}

## 素材と開発

{limits.split('Switch互換')[0].strip()}

既存250ベースと旧原本を保持し、新規人物4,068・動物78を{'追加しました' if released else '追加します'}。人物は専用2,400種類＋共通1,900種類、動物は96デザインです。原画は `assets/production/`、実行用の圧縮画像は `expedition/images/` に分けて保存します。必要な画像を読み込み、画面外の描画を省略します。

```sh
python3 build_expedition.py --release
node --test tests/expedition.test.cjs tests/floor-escape.test.cjs tests/ride-habitats.test.cjs tests/movement-lifecycle.test.cjs tests/crowd-priority.test.cjs tests/wheelchair-mobility.test.cjs tests/sports-mobility.test.cjs tests/animation-motion.test.cjs tests/input.test.cjs tests/audio.test.cjs
RELEASE_QA=1 node tests/all-stages.cjs
node tests/browser-expedition.cjs
node tests/browser-duo.cjs
node tests/browser-photo.cjs
node tests/browser-audio.cjs
RELEASE_QA=1 node tests/browser-stages.cjs
node tests/browser-living-town.cjs
node tests/browser-animation.cjs
node tests/browser-scenery-placement.cjs
python3 verify_animation_archive.py
python3 verify_release.py
python3 package_mac.py --check
python3 package_mac.py
node tests/browser-offline.cjs
python3 refresh_release_docs.py --released
node docs/production-plan/build_reader.mjs
python3 package_mac.py
QA_RELEASED_GUIDE=1 node tests/browser-offline.cjs
```

画像のビルドはPillow・NumPy、ブラウザテストはPlaywright・Google Chrome、計画HTMLの更新はmarkedを使用します。素材が足りない状態ではリリース用ビルドとアプリ更新を中止します。`package_mac.py` は既存アプリを保持して新しいファイルをコピーし、すべて揃ってから置き換えます。
'''
    (ROOT / 'README.md').write_text('\n'.join(line.rstrip() for line in readme.splitlines()) + '\n')
    guide_path = ROOT / 'docs/遊び方.html'
    guide_status = ('24ステージ版 v2.2を収録しています。音楽と新しい街の画像もアプリに入っているため、追加のダウンロードは不要です。' if released else '制作中の拡張版と配布済み版は、更新の時点で内容が異なる場合があります。最新の収録状況は制作計画の「実装状況」を参照してください。')
    guide_text = re.sub(r'<p id="release-status">.*?</p>', '<p id="release-status">' + guide_status + '</p>', guide_path.read_text())
    guide_text = guide_text.replace('24ステージ版 v2.1の遊び方', '24ステージ版 v2.2の遊び方')
    guide_path.write_text(guide_text)
    completion = released
    check = lambda done: 'x' if done else ' '
    implementation = f'''# 24ステージ拡張の実装記録

着手：2026-10-04。更新：{now}。**{status}。** 旧版の原本・生成済み250デザインを保持して拡張しています。

## 確認状況

- [{check(base == 4396)}] 既存250ベースを再利用し、人物4,300＋動物96を収録。色違いを廃止。
- [{check(len(playable) == 24)}] 24ステージすべてに専用100人、カメラマン5人、背景とセットを用意。
- [{check(not report.get('missing', [1]) and not report.get('errors', [1]))}] 発注原画を保存してゲーム用画像へ組み込み。
- [{check(bool(browser) and not browser.get('errors', [1]))}] 500体、写真0→5、10％枠のドラッグ、3秒現像、お手つき・正解表示をブラウザで検証。
- [{check(bool(duo) and not duo.get('errors', [1]))}] コントローラー自動参加、8秒無操作でAIへ復帰、切断中の継続、任意の補助画面を模擬Gamepadで検証。
- [{check(simulation_count == 24)}] 全24ステージを各180秒シミュレーションし、移動・水域・3秒未満の重なり・イベントを検証。
- [{check(browser_count == 24 and not stages.get('errors', [1]))}] 全24ステージの表示・人数・素材読込・描画時間をブラウザで検証。
- [{check(len(quality_saved) == 76 and quality_used == 76)}] 室内・庭・2階・階段の新全景24枚と、広い街の詳細52枚を組込み。
- [{check(living_count == 24 and living_ok)}] 室内・庭・2階を含む生活領域と経路到達性を全24ステージで検証。
- [{check(audio_ok)}] 24ステージのBGM・環境音・効果音を同梱し、通信なしの実再生・非ゼロ音声信号を確認。
- [{check(len(animation_saved) == 800)}] 追加800回の画像生成原画と実行記録を保存。
- [{check(bool(animation_audit_current))}] 採用動作と従来素材の区別を監査し、288環境アニメを24街へ配置。
- [{check(completion)}] オフラインMacアプリを更新し、24ステージ版を公開。

物理コントローラーによる実機検証は未実施です。画像検品とゲームの自動テストは別の工程として記録します。制作計画のすべての細部を個別実装したことを、この一覧だけで意味しません。

[収録内容・生成枚数・検証結果](docs/production-plan/IMPLEMENTATION_STATUS.md)と[遊び方](docs/遊び方.html)を参照してください。生成成功の記録は `assets/production/receipts/`、原画は `source/`、修正割り当ては `repairs.json` に残します。
'''
    (ROOT / 'IMPLEMENTATION.md').write_text('\n'.join(line.rstrip() for line in implementation.splitlines()) + '\n')
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--released', action='store_true', help='Mark released only after all factual release checks pass.')
    refresh(parser.parse_args().released)
