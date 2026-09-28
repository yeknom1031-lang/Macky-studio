# v1.1 画像生成素材の制作記録

2026-09-28。**組み込みの image_gen ツール**を使用（CLI / API キー方式は未使用）。2 枚とも生成画像であり、実在する場所を撮影した写真や、実物を計測した PBR スキャンではありません。

保存先：

- `/Users/makibook/Macky-studio/WHITE-ROOM/assets/materials/ivory-terrazzo-v2.png` — 床用の白い石材。
- `/Users/makibook/Macky-studio/WHITE-ROOM/assets/materials/chalk-concrete-v2.png` — 壁・柱・構造物用の白いコンクリート。

生成元ファイルは Codex の生成画像フォルダにも保持しています。ゲームは上記のプロジェクト内コピーを参照します。`surface_v2.gdshader` がワールド座標で表面に貼り、微小な凹凸、粗さ、床目地、濡れ具合を計算します。法線・粗さは実物の測定値ではなく、生成画像からの視覚的な近似です。

## 床の最終プロンプト

```text
Use case: photorealistic-natural. Asset type: seamless physically based 3D game material base-color texture, a single 2048x2048 square. A real close orthographic flat scan of very pale ivory-white polished architectural terrazzo/microcement flooring. Extremely fine white stone aggregate and tiny light warm-grey mineral pores at a believable scale, subtle trowel variations, faint worn scuffs, the appearance of an expensive old sterile research facility. Low contrast, almost entirely off-white, not grey or colorful. The entire image must be only this continuous uniform floor surface with no tiles, no grout lines, no borders, no vignette. Seamless left/right and top/bottom repeating texture. Uniform diffuse cross-polarized illumination: absolutely no directional shadows, reflected light, specular highlights, room context or perspective. This will be applied directly to a walkable 3D floor, not used as a concept illustration. No text, watermark or objects.
```

## 壁の最終プロンプト

```text
Use case: photorealistic-natural. Asset type: seamless 2048x2048 square base-color material texture for a realistic 3D environment. A straight-on cross-polarized material scan of warm chalk-white painted cast concrete, a real white institutional architecture wall. Tiny pinholes, extremely subtle vertical formwork impressions, paint stipple, occasional almost invisible pale mineral streaks. Fine-scale detail, overall 90% off-white, realistic subdued imperfection. Entire image covered by one continuous flat surface, fully seamless repeat horizontally and vertically. No grout grid, no cracks, no text, no perspective, no cast shadows, no vignette, no room or objects, no baked-in highlights. This is a game texture to be tiled on large 3D walls, not a photograph of a room.
```

## 3D 描画

局所照明と影、SDFGI の間接光、ReflectionProbe と SSR、薄いボリューム霧、時間方向のアンチエイリアシングを組み合わせています。生成画像だけで写実性を作るのではなく、形状と照明の陰影が成立するよう部屋を再構成しています。

実装時の参照：[Godot SDFGI ドキュメント](https://docs.godotengine.org/en/stable/tutorials/3d/global_illumination/using_sdfgi.html)、[Environment](https://docs.godotengine.org/en/stable/classes/class_environment.html)。
