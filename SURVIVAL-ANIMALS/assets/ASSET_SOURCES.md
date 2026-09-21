# Asset sources and licenses

This file is the provenance ledger for third-party assets used by **SURVIVAL ANIMALS**. Only assets that allow free use in games are admitted to `runtime/`.

## Kenney Nature Kit 2.1

- Creator: Kenney
- Source: <https://kenney.nl/assets/nature-kit>
- License: Creative Commons Zero (CC0 1.0)
- Commercial use: Allowed
- Attribution: Not required
- Original archive: `kenney_nature-kit.zip`
- SHA-256: `fa7974a0d342bfe63c38664ba9f8ec1a4aab8ea25f099bdc56870e33588c4d9d`
- Imported selection: 21 GLB environment models in `runtime/environment/`
- Intended use: island vegetation, rocks, cliffs, ruins, bridges, campfire, and canoe

The downloaded archive includes its original `License.txt`. The full archive and unpacked vendor copy are retained locally but excluded from Git; only the selected runtime models are versioned.

## Kenney Survival Kit 2.0

- Creator: Kenney
- Source: <https://kenney.nl/assets/survival-kit>
- License: Creative Commons Zero (CC0 1.0)
- Commercial use: Allowed
- Attribution: Not required
- Original archive: `kenney_survival-kit.zip`
- SHA-256: `c3586341b5932c87eb43d75d915434f47daed168b17ed36a03e8ca9977c7443e`
- Imported selection: 15 GLB prop models in `runtime/props/`
- Intended use: tools, resources, crafting stations, storage, shelters, and modular base pieces

The downloaded archive includes its original `License.txt`. The full archive and unpacked vendor copy are retained locally but excluded from Git; only the selected runtime models are versioned.

## Quaternius Ultimate Animated Animal Pack

- Creator: Quaternius
- Source page: <https://quaternius.com/packs/ultimateanimatedanimals.html>
- Official public files: <https://drive.google.com/drive/folders/1uJ3N5HfB7jKTseJUNQr3N4YaN0UuEtHk?usp=sharing>
- License: Creative Commons Zero (CC0 1.0), as declared on the source page
- Commercial use: Allowed
- Attribution: Not required
- Imported selection: Fox, Stag, Bull, and Wolf
- Format: Embedded-buffer glTF 2.0
- Animation count: Fox 12, Stag 13, Bull 13, Wolf 12
- Intended use: temporary animated bases for Emberfox, Leafhorn, the moss creature, and nocturnal enemies

Selected-file SHA-256 values:

```text
Bull.gltf  535da2992eb125d517725159a2eddeb520b72595bcb3021985fc43d2c84bff76
Fox.gltf   2f36e3c9c75ecddda85c5f9944e98ee1e88e7c679a546534aff1cea8ecde64c7
Stag.gltf  170b964909d16d1ab4d428b1d714f25016913d32481acd9c3d62923192583be6
Wolf.gltf  cc02e9d128b5715f352ee8bea086f97a35f1d875d240de99b0f9f2775c37d415
```

## Asset policy

- Keep source URLs, license terms, version/date, and checksums in this ledger.
- Do not import assets with unclear ownership or a non-commercial restriction.
- Do not redistribute paid or restricted source packages.
- Prefer GLB/glTF for Three.js runtime use.
- Treat third-party creatures as base meshes: customize materials, silhouettes, attachments, effects, and names before final release.
- Keep raw downloads out of Git and version only the assets actually used by the game.

