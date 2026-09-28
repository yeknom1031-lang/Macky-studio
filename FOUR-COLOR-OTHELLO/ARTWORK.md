# 背景素材の制作記録

- 用途: ホーム・対局画面の背景に使う卓上テクスチャ。
- 保存ファイル: `src/assets/table-atmosphere.jpg`（1672 × 941 px）。
- 生成方法: 内蔵 imagegen。1枚を生成し、JPEGへ形式変換して使用。CLI・外部画像サービス・外部読み込みは不使用。
- 配布HTMLには画像データを埋め込んでいるため、ネット接続なしでも表示できます。
- 駒、ボード、収納、色や枚数の変化はHTML/CSSによる実際のゲーム画面です。背景画像に盤面や文字は含めていません。

## 使用した最終プロンプト

```text
Use case: photorealistic-natural
Asset type: premium four-color Othello browser-game background texture, one landscape raster image, 16:9 at approximately 1536px wide.
Primary request: Create an entirely empty tactile tabletop surface with cinematic AAA tabletop-game atmosphere, viewed perfectly straight from above.
Scene/backdrop: a pristine dark fine-grained felt-leather tabletop filling the whole frame, no horizon or visible table perimeter.
Style/medium: photorealistic macro material photography with refined subtle detail and low contrast.
Composition/framing: landscape 16:9, uninterrupted empty surface across the entire image with ample quiet negative space for an actual interactive board and UI to be composited later.
Lighting/mood: broad soft pool of subdued green-tinted studio light toward right center, subtle restrained warm champagne illumination toward upper left, deeply darkened edges; luxurious, calm, cinematic.
Color palette: deep charcoal, obsidian black and emerald with restrained warm champagne light.
Materials/textures: extremely fine tactile grain, soft matte felt-leather texture, clean pristine surface, restrained low contrast.
Constraints: exactly one image. The whole image must remain an empty surface. No board, no discs, no game pieces, no objects, no characters, no symbols, no text, no logos, no borders, no UI, no watermark.
```
