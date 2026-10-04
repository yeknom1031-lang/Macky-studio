# Irodory Lounge 制作記録（2026-10-04）

内蔵 ImageGen を使用。CLI・外部画像サービスは使用していません。生成画像の内容は変更せず、配布サイズに合わせてsipsで縮小・形式変換しました。ロゴは従来の生成素材を再利用し、幅1080pxの表示用PNGを追加しています。

保存先はすべて `/Users/makibook/Macky-studio/FOUR-COLOR-OTHELLO/src/assets/`。配布HTMLへ各画像を一度だけ埋め込み、CSS変数で再利用するため外部通信は不要です。ホームの盤面写真は装飾です。対局中のマス・石・色・ストックは実際のゲーム状態に基づいて描画します。

| 保存ファイル | 用途 |
|---|---|
| lounge-hero.jpg | ホームのラウンジと盤面写真 |
| lounge-table.jpg | 対局画面の卓上背景 |
| felt-material.jpg | 全ボード共通の細かなフェルトの質感 |
| victory-seal.png | 勝利画面の透過メダル |
| irodory-logo-web.png | 既存ロゴの軽量版。新規生成ではありません |

## 最終生成プロンプト

### lounge-hero

`transparent_background: false`

```text
Use case: product-mockup. Asset type: landscape hero background art for a premium Japanese four-color reversi browser game Irodory. Create a cinematic photorealistic luxury board game product photograph, 1536x1024 landscape. On the RIGHT TWO THIRDS of the image is a substantial square emerald green 8 by 8 reversi board at an elegant three-quarter angle, framed in smoked walnut with slender satin brass inlay. Integrated recessed stone storage troughs on ALL FOUR edges, each neatly filled with stacked thick round playing discs, one trough ruby red, one cobalt blue, one warm golden yellow, one jade green. A small elegant arrangement of the same four colors of round solid thick polished resin discs sits in the middle of the gridded board. Discs have realistic broad softbox highlights and subtly beveled edges, never glowing or translucent. Warm light from upper left and a very subtle cool green rim light reveal tactile materials. Board rests on a dark charcoal walnut table in a private evening games lounge. Background softly out of focus; no other furniture clutter. The LEFT THIRD should be calm very dark near-black green negative space for real HTML buttons and logo overlay; bottom and top edges gently fade into darkness. Extraordinary industrial design, expensive tabletop craftsmanship, realistic scale, physically plausible soft shadows, tasteful editorial product campaign, clear board silhouette. No text, no letters, no logo, no UI, no humans, no floating stones, no sparkles, no chess pieces, no checkers pieces with crowns.
```

### lounge-table

`transparent_background: false`

```text
Use case: photorealistic-natural. Asset type: landscape subtle tabletop background texture for the actual playing screen of a luxury board game. A perfectly overhead photograph of a large empty dark smoked walnut game table, with an inset charcoal green fine suede playing mat filling the central 75 percent, its seam understated and its edges near the image borders. Warm grazing light from upper left shows tiny natural fibers and elegant dark wood grain around the margins; center has smooth soft illumination, corners darken gently. Deep forest green, charcoal black, muted brown, restrained antique bronze. Wide landscape 1536x1024. High-end luxury tabletop product photograph. The center is EMPTY and visually calm because a live playable board will be drawn over it in HTML. No game board, no grid, no discs, no stones, no props, no cards, no text, no logos, no ornate patterns, no glitter. Texture fine and understated, bright enough to distinguish material but dark enough to not distract.
```

### victory-seal

`transparent_background: true`

```text
Use case: product-mockup. Asset type: transparent cutout trophy emblem for the victory screen of Irodory, a four-color reversi game. A beautifully crafted small circular medal, upright facing camera with slight three-quarter depth, its fine brushed champagne-gold rim enclosed in a pair of restrained gold laurel branches. In the center four thick polished playing discs arranged in a precise two by two square: ruby red, cobalt blue, warm golden yellow, jade green. Solid resin opaque colors and soft studio highlights, smooth bevel, realistic luxury tabletop materials. A tiny four-point engraved star at top of the rim is the only motif. Sophisticated iconic silhouette, 3D product render, centered with generous transparent margin. NO letters, NO words, NO numbers, NO background, NO floor, NO fake transparency checkerboard, NO glow cloud, NO hanging ribbon, no pedestal. Actual transparent alpha background.
```

### felt-material

`transparent_background: false`

```text
Use case: photorealistic-natural. Asset type: square seamless material texture for the playing surface of a premium reversi board, one texture only. Perfectly overhead macro photograph of pristine very fine dark emerald green billiard felt / suede, tight short microfibers, tasteful expensive material with subtle soft irregular natural grain. Flat even diffuse illumination, no directional shadow, no vignette, low contrast. Color dark forest green, not neon, with enough brightness to see fine textile detail. Uniform uninterrupted texture edge to edge. 1024 square. No objects, no wood, no seams, no edges, no grid, no markings, no text, no logo, no border. Actual finely woven suede surface, not clouds, not leather, no coarse speckles. Intended as a background below live interactive game grid cells.
```

