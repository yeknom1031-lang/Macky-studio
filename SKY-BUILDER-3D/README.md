# SKY BUILDER 3D

空に浮かぶコースを遊び、その場で作り変えられる3Dアクションゲームです。

## 起動

Macでは `PLAY.command` をダブルクリックするだけで起動できます。初回だけmacOSの確認が表示された場合は、右クリックして「開く」を選んでください。

ターミナルから起動する場合は、このフォルダで次を実行し、表示されたURLをブラウザで開きます。

```bash
python3 -m http.server 8765
```

- 移動: WASD / 矢印キー
- ジャンプ: Space
- カメラ: マウスドラッグ
- モード切替: 画面上部、または E
- 編集: 左クリックで配置、右クリックで削除

コースはブラウザの `localStorage` に保存されます。

## 素材

Kenney Platformer Kit、Impact Sounds、Interface Soundsを使用しています。詳細は `ASSET_CREDITS.md` を参照してください。
