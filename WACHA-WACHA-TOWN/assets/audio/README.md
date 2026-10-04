# 街の音

24ステージで、7曲のBGM・実録のざわめき・鳥・波・風・機械・駅の音を組み合わせます。BGM、環境音、短い演出音を合わせて24個の Ogg Vorbis ファイル、約14.1MiBです。`stage-mapping.json` に各ステージの組み合わせを保存しています。

音量は55%から始まり、音量・ミュート設定を保存します。最初のユーザー操作で再生を許可し、ステージ開始時にフェードインします。一時停止で再生位置を保ち、退出・ページ離脱では全音源を停止します。音は探索側の画面だけで再生します。インターネットへの接続は必要ありません。

## 利用条件

`CREDITS.html` が配布用のクレジットです。12の配布セットを作者の公開ページで確認し、CC0、CC BY 3.0、CC BY 4.0のいずれかで利用しています。CC BYの音源には作者名・作品名・元URL・ライセンス・加工内容を併記しています。各素材の条件は該当する音源に適用され、ゲーム全体に同じライセンスを設定するものではありません。

- `sources.json`: 作者、配布元、ダウンロードURL、ライセンス、原本SHA-256。
- `licenses/`: 確認時の作者配布ページ、同梱ライセンス。ページ保存は制作時の証跡で、配布ゲームには入れません。
- `tracks.json`: 利用したアーカイブ内ファイル、切り出し・音量調整・変換内容、配布ファイルSHA-256。
- `runtime/`: ゲームに同梱する加工済み音源。

## 再生成

原本ダウンロードはGitに含めません。`python3 assets/audio/fetch_sources.py` で台帳のSHA-256に一致する原本を復元できます。不一致の場合は置き換えず停止します。FFmpegを利用できる環境で `WACHA_FFMPEG=/path/to/ffmpeg python3 assets/audio/build_audio.py` を実行すると、記録された部分のみ切り出し、Oggに変換します。`python3 assets/audio/build_credits.py` はクレジットとステージ割当表を更新します。

## 組み込みと検証

`src/expedition-audio.js` は `window.Wacha24Sound` を公開します。`unlock()`、`start(stageIndex)`、`play(name)`、`setPaused(bool)`、`stop()`、`setMuted(bool)`、`setVolume(0..1)` をゲーム画面から呼び出します。初回の `unlock()` は実際のクリック・タップのイベント内で呼び出します。対応する短い音は `countdown/start/wrong/photographer/found/lost/shutter/develop/click` です。

ビルダーがモジュール、`runtime/*.ogg`、`CREDITS.html` を `expedition/` 以下にコピーします。音はHTMLAudioElementで再生するため、ローカルのfile URLでも利用できます。

`node --test tests/audio.test.cjs` は音源整合性とライセンス台帳を検証します。Playwrightが利用できる環境で `node tests/browser-audio.cjs` は通信を遮断したChromeを起動し、24ステージの実音源再生、全24音源デコード、非ゼロPCMとanalyser信号、音量・停止・再開・設定保存を検証します。音質の主観評価や全端末での再生保証を自動テストが行うものではありません。
