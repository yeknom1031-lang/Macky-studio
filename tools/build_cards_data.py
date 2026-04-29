#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = ROOT / "assets"
GAME_DIR = ROOT / "ARCHIVE-GACHA"
OUTPUT_PATH = GAME_DIR / "cards-data.js"

MANIFEST_PATH = ASSETS_DIR / "free-images" / "_meta" / "manifest.csv"
FREE_IMAGES_ROOT = ASSETS_DIR / "free-images"
LEGACY_ROOT = ASSETS_DIR / "free-images.partial-bad"
TEST_ROOT = ASSETS_DIR / "free-images.test-run-2"

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary", "mythic"]
TARGET_CELESTIAL_PERCENT = 0.2
TARGET_SINGULARITY_PERCENT = 0.000001


def pick_by_profile(score: int, profile: dict[str, int]) -> str:
    threshold = 0
    for rarity in ["mythic", "legendary", "epic", "rare", "uncommon", "common"]:
        threshold += profile[rarity]
        if score < threshold:
            return rarity
    return "common"


def rarity_from_seed(seed: str, category: str) -> str:
    # Category-driven baseline, with deterministic variation for texture.
    score = int(hashlib.md5(seed.encode("utf-8")).hexdigest()[:8], 16) % 1000
    if category.startswith("06_"):
        profile = {
            "mythic": 140,
            "legendary": 200,
            "epic": 240,
            "rare": 200,
            "uncommon": 140,
            "common": 80,
        }
        return pick_by_profile(score, profile)
    if category.startswith("05_"):
        profile = {
            "mythic": 100,
            "legendary": 180,
            "epic": 260,
            "rare": 240,
            "uncommon": 140,
            "common": 80,
        }
        return pick_by_profile(score, profile)
    if category.startswith("04_"):
        profile = {
            "mythic": 60,
            "legendary": 140,
            "epic": 280,
            "rare": 260,
            "uncommon": 160,
            "common": 100,
        }
        return pick_by_profile(score, profile)
    if category.startswith("03_"):
        profile = {
            "mythic": 30,
            "legendary": 100,
            "epic": 220,
            "rare": 300,
            "uncommon": 200,
            "common": 150,
        }
        return pick_by_profile(score, profile)
    profile = {
        "mythic": 10,
        "legendary": 40,
        "epic": 120,
        "rare": 280,
        "uncommon": 300,
        "common": 250,
    }
    return pick_by_profile(score, profile)


def weight_for(rarity: str) -> int:
    if rarity == "common":
        return 22
    if rarity == "uncommon":
        return 17
    if rarity == "legendary":
        return 5
    if rarity == "mythic":
        return 3
    if rarity == "epic":
        return 8
    return 12


def series_label(category: str) -> str:
    if category.startswith("01_"):
        return "学校・生活"
    if category.startswith("02_"):
        return "デスク・ゲーム"
    if category.startswith("03_"):
        return "電子・宇宙"
    if category.startswith("04_"):
        return "ゲームギミック"
    if category.startswith("05_"):
        return "ファンタジー"
    if category.startswith("06_"):
        return "SF・特殊"
    return "収集画像"


def load_manifest_cards() -> list[dict]:
    if not MANIFEST_PATH.exists():
        return []

    with MANIFEST_PATH.open("r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    rows = [r for r in rows if r.get("file_path")]
    rows.sort(key=lambda r: (r["category"], r["canonical_name"], r["file_path"]))
    totals = Counter(r["canonical_name"] for r in rows)
    seen_idx = defaultdict(int)

    cards: list[dict] = []
    for row in rows:
        rel = Path(row["file_path"])
        full = FREE_IMAGES_ROOT / rel
        if not full.exists() or full.suffix.lower() not in IMAGE_EXTS:
            continue

        canonical = row["canonical_name"]
        seen_idx[canonical] += 1
        idx = seen_idx[canonical]
        base_name = row.get("requested_name", canonical)
        name = f"{base_name} {idx:02d}" if totals[canonical] > 1 else base_name
        card_id = f"{canonical}-{idx:02d}"
        rarity = rarity_from_seed(card_id, row["category"])
        cards.append(
            {
                "id": card_id,
                "name": name,
                "series": series_label(row["category"]),
                "src": f"../assets/free-images/{rel.as_posix()}",
                "rarity": rarity,
                "weight": weight_for(rarity),
            }
        )
    return cards


def load_extra_cards(base_dir: Path, series: str, prefix: str) -> list[dict]:
    if not base_dir.exists():
        return []
    files = sorted(
        p for p in base_dir.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )
    cards = []
    for i, file in enumerate(files, 1):
        card_id = f"{prefix}-{i:02d}"
        rarity = rarity_from_seed(card_id, "06_legacy")
        cards.append(
            {
                "id": card_id,
                "name": f"{series}カード {i:02d}",
                "series": series,
                "src": f"../assets/{base_dir.name}/{file.relative_to(base_dir).as_posix()}",
                "rarity": rarity,
                "weight": weight_for(rarity),
            }
        )
    return cards


def pick_first_by_rarity(cards: list[dict], rarities: list[str], excluded: set[str]) -> dict | None:
    for rarity in rarities:
        pool = sorted(
            [c for c in cards if c["rarity"] == rarity and c["id"] not in excluded],
            key=lambda c: c["id"],
        )
        if pool:
            return pool[0]
    return None


def apply_ultra_rare_tiers(cards: list[dict]) -> None:
    if not cards:
        return

    excluded: set[str] = set()
    celestial = pick_first_by_rarity(cards, ["mythic", "legendary", "epic"], excluded)
    if celestial:
        celestial["rarity"] = "celestial"
        excluded.add(celestial["id"])

    singularity = pick_first_by_rarity(cards, ["legendary", "mythic", "epic", "rare"], excluded)
    if singularity:
        singularity["rarity"] = "singularity"
        excluded.add(singularity["id"])

    if not excluded:
        return

    base_total = sum(float(c["weight"]) for c in cards if c["id"] not in excluded)
    r_cel = TARGET_CELESTIAL_PERCENT / 100.0 if celestial else 0.0
    r_sin = TARGET_SINGULARITY_PERCENT / 100.0 if singularity else 0.0
    denom = max(1e-12, 1.0 - r_cel - r_sin)
    total = base_total / denom

    if celestial:
        celestial["weight"] = round(total * r_cel, 8)
    if singularity:
        singularity["weight"] = round(total * r_sin, 12)


def main() -> int:
    cards = []
    cards.extend(load_manifest_cards())
    cards.extend(load_extra_cards(LEGACY_ROOT, "旧アーカイブ", "legacy"))
    cards.extend(load_extra_cards(TEST_ROOT, "テストアーカイブ", "test"))
    apply_ultra_rare_tiers(cards)

    payload = "window.CARD_POOL = " + json.dumps(cards, ensure_ascii=False, indent=2) + ";\n"
    OUTPUT_PATH.write_text(payload, encoding="utf-8")
    print(f"cards: {len(cards)}")
    print(f"output: {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
