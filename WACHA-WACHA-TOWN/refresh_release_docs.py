"""Update release facts from local build and test reports; never infer completion."""
import argparse
from collections import Counter
from datetime import datetime
import json
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
        if issues:
            raise SystemExit('公開済みとは記載できません。未充足: ' + '、'.join(issues))
    now = datetime.now().astimezone().isoformat(timespec='seconds')
    status = '24ステージ版を公開済み' if released else '24ステージ版を制作・検証中'
    summary = dict(at=now, released=released, status=status, saved=len(saved), planned=len(jobs),
                   generated=report.get('generated', 0), characters=report.get('characters', 0),
                   playableStages=len(playable), browserStages=browser_count, simulationStages=simulation_count,
                   physicalControllerTested=False, appVersion=packaged.get('appVersion') if released else None)
    (DOCS / 'release-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    limits = '''実装はブラウザ版を拡張しています。Godotへの移植ではありません。新規人物は歩行4コマ＋主要動作4コマ、動物も8コマ、乗り物と環境は各2ポーズを移動・揺れと組み合わせます。250役割には役割別の原画を割り当て、経路・設備・会話・追跡・乗車などの制御を共有します。3Dの街ではなく、背景から測定した通行領域と設備の前後関係を持つ2Dの街です。

Switch互換コントローラーは、ブラウザのGamepad APIで認識される機種を対象にしています。自動テストでは接続・移動・切断・再接続を模擬入力で確認しました。物理コントローラーそのものは未確認です。'''
    base = report.get('characters', 0)
    planned = len(jobs)
    overlap = max((r.get('stats', {}).get('maxOverlap', 0) for r in simulation.get('results', [])), default=0)
    checks = f"探索・写真操作{len(browser.get('checks', []))}項目、2人対戦{len(duo.get('checks', []))}項目、写真の描画{len(photo.get('checks', []))}項目を自動確認済みです。" if browser and duo and photo else '探索・2人対戦・写真の検証は各レポートの確認範囲を参照してください。'
    status_md = f'''# 実装状況と収録内容

更新：{now}。**{status}。** この章は原画ファイル・ビルド結果・検証レポートから生成しています。後続の制作計画は設計時の仕様・候補も含むため、実装済みの範囲はこちらを参照してください。

| 項目 | 現在確認できる状態 |
| --- | --- |
| 新規生成原画の保存 | {len(saved):,} / {planned:,}枚（補修を含む採用用原本。過去の全試行回数ではありません） |
| ゲーム用素材への組み込み | {report.get('generated', 0):,}枚 |
| 収録デザイン | {base:,} / 4,396種類。人物4,300＋動物96{'を収録' if released else 'を目標'} |
| 遊べるステージ | {len(playable)} / 24 |
| 全ステージの描画検証 | {browser_count} / 24（自動操作したChrome） |
| 180秒シミュレーション | {simulation_count} / 24 |
| 配布アプリ | {'バージョン2.0へ更新済み。ネット接続とプレビューサーバーは不要' if released else '旧版を保持。全24ステージの検証後に更新'} |

## 素材の内訳

人物シート407枚（専用240枚＋共通167枚）、新背景17枚、ステージごとの設備・乗り物・環境セット24枚、動物シート16枚が基本です。不足した人物と問題のあるコマだけを補う修正シートを別途加え、現在の発注単位は合計{planned:,}枚です。保存済みの種類別内訳は人物{counts['people']:,}枚（人物補完を含む）、背景{counts['background']:,}枚、セット{counts['set']:,}枚、動物{counts['animals']:,}枚、コマ補修{counts['patches']:,}枚です。

{'最終検品では欠けていた人物6人を補完し、20コマを生成画像で修正しました。95行の列境界を実測して切り出しを調整しています。元のPNGは上書きせず保持しています。' if artwork.get('status') == 'verified' else '人物・コマの補修内容は最終検品レポートへ記録します。'}

既存250ベース（人物232＋動物18）は再利用します。追加は人物4,068＋動物78で、色違いは作りません。各ステージ専用100人と共通住民・動物を組み合わせ、同一場面には同じデザインを重複配置しません。動物の一部の配役名は、既存の原画の実際の姿に合わせて調整しています。

原画、生成指示、保存元、切り出し範囲はそれぞれ `assets/production/source/`、`jobs.json` と `animal-jobs.json` と `repairs.json`、`receipts/`、実行データの `sourceMetadata` に記録します。画像の生成成功と、ゲームへの組み込み・検証完了を分けて管理しています。

## 操作と実装方式

[遊び方](../遊び方.html)に写真、2人対戦、広い街の操作をまとめています。探索時間は180秒、撮影回数は0回から開始し、各ステージ5人のカメラマンを1人ずつ発見すると1回ずつ増えます。枠をドラッグして撮り、3秒後に写真を確認します。

{limits}

## 確認結果の保存先

{checks} {'全24ステージを各180秒進め、測定した胴体の重なりは最長' + format(overlap, '.1f') + '秒でした。乗客と地上人物の重なりも判定対象です。' if simulation_count == 24 else ''} {'配布したMacアプリもネット接続を無効にして開き、最後の街の2,000体を読み込めること、外部通信要求とJavaScript例外が0件であることを確認しました。' if released else ''}

- `assets/production/build-report.json`：素材不足とステージ成立条件。
- `assets/production/review/artwork-completion.json`：{artwork.get('generatedImages', 0):,}枚の原画検品・補修・再利用の実績。
- `assets/production/review/browser-report.json`：写真・タッチ・勝敗表示。
- `assets/production/review/duo-browser-report.json`：2人対戦・切断・専用画面。
- `assets/production/review/photo-browser-report.json`：撮影時の対象だけを、乗車中も全身・前景の手前に描画。
- `assets/production/review/stages-browser-report.json`：ステージごとの人数・描画・読み込み時間。
- `assets/production/review/all-stages-simulation.json`：180秒間の移動・重なり・イベント。
- `assets/production/package-report.json`：配布アプリの保存先・容量・収録数。
- `assets/production/review/offline-browser-report.json`：ネット接続なしで配布アプリを開き、最後の街2,000体を読み込む検証。

テストの速度はその検証環境の値であり、すべての端末の動作速度を保証する値ではありません。未記録の項目は未確認です。
'''
    (DOCS / 'IMPLEMENTATION_STATUS.md').write_text(status_md)
    stages_table = '\n'.join(f"| {i+1:02} | {s['name']} | {s['pop']:,} | {s['area']}倍 |" for i, s in enumerate(manifest['stages']))
    readme = f'''# わちゃわちゃタウン

街で働いたり遊んだりする住人の中から、見本と同じ相手を3分以内に探すゲームです。

**{status}。** 収録デザイン{base:,} / 4,396種類、原画保存{len(saved):,} / {planned:,}枚、遊べる街{len(playable)} / 24。[実装状況と検証結果](docs/production-plan/IMPLEMENTATION_STATUS.md)で現在の状態を確認できます。

## 開く

{'デスクトップの「わちゃわちゃタウン.app」をダブルクリックすると、24ステージ版がGoogle Chromeで開きます。' if released else 'デスクトップの「わちゃわちゃタウン.app」とルートのindex.htmlは、検証完了まで旧7ステージ版を保持します。制作中の拡張版は expedition/index.html から確認できます。'} ゲーム本体はローカルに保存され、Codex終了後・Mac再起動後もネット接続なしで開けます。

- [24ステージ版を開く](expedition/index.html)
- [遊び方](docs/遊び方.html)
- [画像制作計画と実装状況](docs/production-plan/画像制作計画.html)
- [旧7ステージ版の仕様](docs/archive/7-stage-README.md)

## 24の街を探す

各街の専用人物100人に、場所に合った共通の住人と動物が加わります。最初の7ステージは500体、後半は街も人数も増え、最後は面積6倍・2,000体です。広い場所では画面をドラッグして移動し、ホイールやピンチで拡大します。同じ場面に同じデザインは1体だけ。色違いの水増しはありません。

左上の見本を押すと、探索画面のまま顔や服を大きく確認できます。正解は「みーつけた！」、お手つきは「お手つき！ −3秒」と表示します。Escか右上の一時停止ボタンで、残り時間と撮影済み写真を確認できます。

## 写真はカメラマンから

最初の撮影回数は0回です。街の5人のカメラマンを見つけると、1人につき1回ずつ撮影できます。同じカメラマンからは1回だけ。1ゲーム最大5枚です。

1. 右下のカメラ、またはCキーで撮影枠を出す。
2. 枠の中をドラッグして位置を決める。枠は画面面積の約10％。
3. もう一度カメラ、またはCキーを押して撮る。
4. 3秒後、撮影した瞬間の写真が開く。探す相手以外の人物・動物は写らない。
5. 写真を閉じ、街で本人を見つけてクリックする。

範囲に本人がいないと風景だけになります。写真を押してもクリアにはなりません。現像・閲覧中も街と時計は進み、一時停止中は両方止まります。×かEscで撮影を中止すると回数を消費しません。

## ふたりでかくれんぼ

1. Switch互換コントローラーをMacへ接続し、ボタンを押す。
2. タイトル画面で「ふたりでかくれんぼ」を選ぶ。
3. 探す人はマウスで移動・写真・タッチ。隠れる人は左スティックで対象を動かす。
4. 隠れる人は設定した行動ボタンで、近くの設備・乗り物を使う／離れる。

広い街では「隠れる人の画面を開く」を押し、別のディスプレイへ移して遊びます。探す側の画面が相手へ勝手に追従することはありません。コントローラーの接続や専用画面が切れると、両者と時計を停止します。再接続して続けられます。

接続認識はGamepad APIを使います。ボタン位置が違う場合はタイトル画面の「行動ボタン」で選択します。実機のSwitch互換コントローラーは未検証で、接続・移動・切断・再接続は模擬入力による自動テストを行っています。

## 街の一覧

| ステージ | 場所 | 住人・動物 | 面積 |
| --- | --- | ---: | ---: |
{stages_table}

## 素材と開発

{limits.split('Switch互換')[0].strip()}

既存250ベースと旧原本を保持し、新規人物4,068・動物78を追加します。人物は専用2,400種類＋共通1,900種類、動物は96デザインです。原画は `assets/production/`、実行用の圧縮画像は `expedition/images/` に分けて保存します。必要な画像を読み込み、画面外の描画を省略します。

```sh
python3 build_expedition.py --release
node --test tests/expedition.test.cjs
RELEASE_QA=1 node tests/all-stages.cjs
node tests/browser-expedition.cjs
node tests/browser-duo.cjs
node tests/browser-photo.cjs
RELEASE_QA=1 node tests/browser-stages.cjs
python3 package_mac.py --check
python3 package_mac.py
node tests/browser-offline.cjs
python3 refresh_release_docs.py --released
node docs/production-plan/build_reader.mjs
```

画像のビルドはPillow・NumPy、ブラウザテストはPlaywright・Google Chrome、計画HTMLの更新はmarkedを使用します。素材が足りない状態ではリリース用ビルドとアプリ更新を中止します。`package_mac.py` は既存アプリを保持して新しいファイルをコピーし、すべて揃ってから置き換えます。
'''
    (ROOT / 'README.md').write_text(readme)
    completion = released
    check = lambda done: 'x' if done else ' '
    implementation = f'''# 24ステージ拡張の実装記録

着手：2026-10-04。更新：{now}。**{status}。** 旧版の原本・生成済み250デザインを保持して拡張しています。

## 確認状況

- [{check(base == 4396)}] 既存250ベースを再利用し、人物4,300＋動物96を収録。色違いを廃止。
- [{check(len(playable) == 24)}] 24ステージすべてに専用100人、カメラマン5人、背景とセットを用意。
- [{check(not report.get('missing', [1]) and not report.get('errors', [1]))}] 発注原画を保存してゲーム用画像へ組み込み。
- [{check(bool(browser) and not browser.get('errors', [1]))}] 500体、写真0→5、10％枠のドラッグ、3秒現像、お手つき・正解表示をブラウザで検証。
- [{check(bool(duo) and not duo.get('errors', [1]))}] 2人対戦、移動、切断・再接続、広い街の専用画面を模擬Gamepadで検証。
- [{check(simulation_count == 24)}] 全24ステージを各180秒シミュレーションし、移動・水域・3秒未満の重なり・イベントを検証。
- [{check(browser_count == 24 and not stages.get('errors', [1]))}] 全24ステージの表示・人数・素材読込・描画時間をブラウザで検証。
- [{check(completion)}] オフラインMacアプリを更新し、24ステージ版を公開。

物理コントローラーによる実機検証は未実施です。画像検品とゲームの自動テストは別の工程として記録します。制作計画のすべての細部を個別実装したことを、この一覧だけで意味しません。

[収録内容・生成枚数・検証結果](docs/production-plan/IMPLEMENTATION_STATUS.md)と[遊び方](docs/遊び方.html)を参照してください。生成成功の記録は `assets/production/receipts/`、原画は `source/`、修正割り当ては `repairs.json` に残します。
'''
    (ROOT / 'IMPLEMENTATION.md').write_text(implementation)
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--released', action='store_true', help='Mark released only after all factual release checks pass.')
    refresh(parser.parse_args().released)
