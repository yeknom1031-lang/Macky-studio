# わちゃわちゃタウン：画像素材

生成方式: built-in image_gen

- festival-crowd-concept.png: 群衆入り完成イメージ。人数は厳密に計数していません。
- festival-background.png: 人物を取り除いた背景素材。
- characters-walk-sheet.png: 4種類 × 6ポーズの歩行素材シート、1536 × 1024、透過PNG。セルの目安は256 × 256。実装前に各フレームの足元と位置合わせ、歩行ループ調整が必要です。

これらは静止画像素材です。500人の独立した移動・描画・タッチ判定はゲーム側で実装します。

## 使用プロンプト

### 群衆入りイメージ

Use case: stylized-concept
Asset type: full-screen key art and visual target for a cute animated hidden-person game, landscape 16:9, highest available detail.
Primary request: Create a beautiful, incredibly dense, readable seek-and-find Japanese festival town illustration with approximately 500 tiny adorable original human characters. The game is called Wacha Wacha Town but DO NOT render any text or UI.
Scene: high oblique overhead view, entire image filled with a sprawling whimsical town festival, winding intersecting pedestrian streets, colorful food stalls, toy shops, little canals and bridges, pocket gardens, parasols, a small carousel, many small props and charming visual jokes. No sky, no horizon, no empty margins. Wide streets and plazas packed with little people, many traversable connecting routes.
People: hundreds of individually legible cute 2.5-head-tall chibi humans with diverse hairstyles, skin tones, ages, outfits and hats; walking, waving, dancing, shopping. Distributed throughout entire map, consistently tiny scale. Do not replace people with dots or abstract marks. Hidden among them one original target: a child wearing a lemon-yellow beret with a leaf ornament, teal overalls, cream shirt and coral-red tiny backpack. Target same scale as crowd, not highlighted, not centered. A handful of similar colored outfits provide decoys.
Style: polished hand-drawn 2D casual-game art, warm thin cocoa-brown outlines, clean solid pastel colors, light cel shading, cream cobblestones, coral and turquoise accents. Precise charming toy-like buildings and richly detailed tiny characters. Cohesive game-ready illustration, not photorealistic or 3D.
Constraints: no text, no logos, no watermark, no HUD, no borders, no inset portraits, no existing franchise characters, no red-white striped search hero. This is a STATIC visual reference for a later animated game.

### 背景

Use case: precise-object-edit
Asset type: clean game background plate for an animated hidden-person game.
Input image: edit target.
Remove ALL human characters and ALL living animals from the supplied festival town image, filling their former areas naturally with continuous cobblestones, bridges, canal water or shop interior as appropriate. Keep the exact same landscape composition, camera, buildings, stalls, carousel structure and its inanimate ride horses, trees, bridges, canal, props, palette and hand-drawn line style. Remove human riders too. This background will have animated character sprites overlaid later, so it must contain ZERO people. Preserve the dense architectural charm and tiny decorative details. No text, no UI, no legend, no borders. Preserve image aspect ratio.

### 背景の仕上げ

Use case: precise-object-edit. Edit the supplied game background ONLY to remove every remaining living human character. There are still visible people working inside the shops (especially upper left shop, left food stalls and upper right balcony) and several child riders sitting ON the carousel horses at the CENTER. Remove every child rider, face, head, torso, arm and leg on the carousel and reconstruct empty saddles and poles. Keep inanimate carousel HORSES themselves. Empty every shop of humanoid shopkeepers, replacing them with shelves/products. Keep the architecture, empty streets, plants, canal, colors, dimensions, perspective, linework and all other scenery exactly the same. Decorative animal statues and koi fish can remain. No new characters. No text. The result is an EMPTY TOWN BACKGROUND ready for independently animated people to be added by game code.

### キャラクター素材

Use case: stylized-concept
Asset type: character animation source sprite sheet for the same cute hidden-person game.
Input image: STYLE REFERENCE ONLY, do not recreate the town.
Create a clean 6-column by 4-row sprite sheet on a genuinely transparent alpha background, landscape. Exactly 24 full-body chibi human sprites, one per equal cell, generous empty separation, absolutely no overlaps, no cutoffs, no grid lines or labels. Match the provided town illustration's warm cocoa-brown fine outlines, cute 2.5-head proportions, pastel flat colors and gentle cel shading. Slight overhead three-quarter camera appropriate for the town.
Each row depicts ONE consistent character in SIX successive walking-cycle poses facing right, same clothes/body/scale across all six frames. Feet share same baseline within each row, same centered pivot. Clear changing arm and leg positions.
Row 1: original target child, lemon-yellow beret with tiny green leaf ornament, short brown hair, cream shirt, teal overalls, coral-red small backpack, brown shoes.
Row 2: woman with dark bob hair, coral dress, cream sunhat, small tote.
Row 3: older man with gray hair, round glasses, sky-blue shirt, navy trousers.
Row 4: child with dark curly hair, lavender hoodie, ochre shorts, white sneakers.
No scenery, no ground, no drop shadows, no text, no watermark. These are sprite source frames, not a finished animated file.
