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

## Irodory ロゴ（2026-09-28）

- 保存ファイル: `src/assets/irodory-logo.png`（2172 × 724 px、透過PNG）。
- 内蔵 ImageGen で１枚生成。４色の駒とシャンパンゴールドのワードマーク。
- 正確な表記 `Irodory` と透明な背景を確認。生成結果をそのまま使用しています。
- ホーム・対局ヘッダー・開始演出で共用。HTML内のCSSに画像を１回だけ埋め込み、ネット接続なしで表示します。

### ロゴの生成プロンプト

```text
Use case: logo-brand
Asset type: one transparent PNG logo for a premium four-color Othello browser game.
Primary request: A premium cinematic tabletop game brand logo, a sophisticated highly legible custom wordmark reading exactly "Irodory".
Text (verbatim): "Irodory" — capital I followed by lowercase r o d o r y. Spell exactly I-r-o-d-o-r-y. No other text.
Scene/backdrop: Genuine fully transparent alpha background. Output an isolated logo cutout with actual transparent pixels surrounding and between the logo elements; no rendered checkerboard and no opaque backdrop.
Subject: A horizontal lockup with a compact emblem on the left and the Irodory wordmark on the right. The emblem consists of exactly four polished Othello discs: one deep red, one sapphire blue, one warm yellow/gold, and one emerald green.
Style/medium: Sophisticated modern game logo with clean silhouette, luxurious but restrained. Ivory/champagne-metal lettering with subtle refined bevel, polished game discs with controlled highlights.
Composition/framing: Wide horizontal approximately 3:1 visual ratio, tightly composed with modest clear padding around the entire mark. Strong letter shapes and clear spacing readable both large and very small on a dark emerald screen or dark gameplay HUD.
Lighting/mood: Refined cinematic tabletop lighting on the logo objects only, understated premium finish.
Constraints: Exact spelling and capitalization, emblem left, wordmark right, four colored discs only, genuine transparent alpha background.
Avoid: Childish design, excessive glow, ornate details that hurt small-size legibility, slogan, additional text, watermarks, UI, mockup, frame, opaque dark backdrop, checkerboard background.
```
