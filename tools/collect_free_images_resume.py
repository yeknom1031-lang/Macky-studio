#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import mimetypes
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE_DIR = ROOT / "assets" / "free-images"
META_DIR = BASE_DIR / "_meta"
REQUESTED_CSV = META_DIR / "requested_items.csv"
MANIFEST_CSV = META_DIR / "manifest.csv"
MISSING_CSV = META_DIR / "missing.csv"

USER_AGENT = "MackyStudioImageCollectorResume/1.0"
OPENVERSE_API = "https://api.openverse.org/v1/images/"
WIKIMEDIA_API = "https://commons.wikimedia.org/w/api.php"

PEOPLE_TERMS = {
    "people",
    "person",
    "man",
    "woman",
    "boy",
    "girl",
    "child",
    "children",
    "kid",
    "kids",
    "human",
    "portrait",
    "selfie",
    "hand",
    "hands",
    "wearing",
    "holding",
    "face",
    "adult",
    "teen",
}

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}

QUERY_ALIASES: dict[str, list[str]] = {
    "frying-pan": ["skillet", "frying pan top view", "pan kitchenware"],
    "plate": ["dinner plate", "ceramic plate", "dish plate"],
    "homework-worksheet": ["worksheet", "notebook paper", "school worksheet"],
    "mens-shoes": ["men shoes", "dress shoes", "leather shoes"],
    "eraser": ["rubber eraser", "stationery eraser", "pink eraser"],
    "randoseru": ["randoseru", "japanese school backpack", "school bag"],
    "denim-jeans": ["jeans", "denim pants", "blue jeans"],
    "exercise-wheel": ["hamster wheel", "pet wheel", "small animal wheel"],
    "speedcubing-timer": ["stackmat timer", "cube timer", "speed cube timer"],
    "gaming-controller": ["gamepad", "video game controller", "joystick controller"],
    "earphones": ["earbuds", "wired earphones", "earphone cable"],
    "microphone": ["studio microphone", "condenser microphone", "desk microphone"],
    "gaming-chair": ["office gaming chair", "computer chair", "pc chair"],
    "mouse-pad": ["mouse mat", "desk mat", "gaming mousepad"],
    "manga-books": ["comic books", "comic volume", "book stack"],
    "poster": ["poster mockup", "wall poster", "print poster"],
    "snack-bag": ["chips bag", "snack package", "food packet"],
    "charger": ["usb charger", "power adapter", "phone charger"],
    "guinea-pig-treats": ["guinea pig food", "pellet food", "pet treats"],
    "gaming-pc": ["desktop computer tower", "pc case", "gaming desktop"],
    "monitor": ["computer monitor", "lcd monitor", "display screen"],
    "motherboard": ["motherboard pcb", "computer motherboard", "mainboard"],
    "solder-wire": ["solder reel", "tin wire", "soldering wire"],
    "dc-motor": ["electric motor", "dc motor", "small motor"],
    "gear": ["metal gear", "gear wheel", "cogwheel"],
    "screw": ["metal screw", "machine screw", "screw macro"],
    "aa-battery": ["battery", "aa battery", "alkaline battery"],
    "sensor-module": ["electronic sensor", "sensor board", "sensor module"],
    "laser-module": ["laser diode", "laser module", "laser pointer module"],
    "drone": ["quadcopter", "drone aircraft", "uav drone"],
    "vr-headset": ["vr headset", "virtual reality headset", "head mounted display"],
    "walkie-talkie": ["walkie talkie", "handheld radio", "two way radio"],
    "satellite": ["space satellite", "communication satellite", "satellite in orbit"],
    "telescope": ["astronomical telescope", "observatory telescope", "refractor telescope"],
    "synthesizer": ["music synthesizer", "analog synth", "keyboard synthesizer"],
    "midi-keyboard": ["midi keyboard", "keyboard controller", "midi controller"],
    "soldering-iron": ["soldering iron", "solder station", "electronics iron"],
    "3d-printer": ["3d printer", "fdm printer", "printer machine"],
    "game-block": ["game block icon", "pixel block", "tile block"],
    "spike-trap": ["spike icon", "trap spike", "game trap"],
    "jump-pad": ["jump pad", "bounce pad", "springboard game"],
    "portal": ["portal gate", "teleport portal", "magic portal"],
    "coin": ["gold coin icon", "game coin", "treasure coin"],
    "star": ["star icon", "collectible star", "gold star"],
    "key": ["key icon", "old key", "treasure key"],
    "treasure-chest": ["treasure chest", "chest icon", "loot chest"],
    "health-potion": ["health potion", "red potion bottle", "potion icon"],
    "antidote": ["antidote potion", "medicine bottle", "antidote icon"],
    "save-point": ["save point icon", "save icon", "checkpoint icon"],
    "warp-gate": ["warp gate", "teleport gate", "gate portal"],
    "secret-passage": ["secret passage", "hidden passage", "hidden door"],
    "boss-door": ["castle door", "dungeon door", "boss gate"],
    "scoreboard": ["scoreboard", "score board", "game scoreboard"],
    "xp-bar": ["xp bar", "experience bar", "level bar ui"],
    "level-up-sound": ["sound icon", "speaker icon", "audio level icon"],
    "glitch-route": ["game map route", "maze path", "secret route map"],
    "crystal": ["magic crystal", "gem crystal", "crystal shard"],
    "holy-grail": ["holy grail", "gold chalice", "goblet"],
    "elixir": ["elixir bottle", "magic potion", "fantasy bottle"],
    "dragon-scale": ["dragon scale texture", "reptile scale", "fantasy scale"],
    "phoenix-feather": ["phoenix feather", "fire feather", "bird feather"],
    "fairy-dust": ["fairy dust", "sparkle dust", "glitter particles"],
    "magic-stone": ["magic stone", "rune stone", "enchanted gem"],
    "cloak": ["fantasy cloak", "hooded cloak", "cape cloth"],
    "shield": ["medieval shield", "round shield", "fantasy shield"],
    "helmet": ["medieval helmet", "armor helmet", "knight helmet"],
    "bow-and-arrow": ["bow and arrow", "archery bow", "quiver arrow"],
    "dagger": ["dagger", "short blade", "knife fantasy"],
    "spear": ["spear weapon", "lance spear", "polearm"],
    "battle-axe": ["battle axe", "axe weapon", "war axe"],
    "beam-sword": ["energy sword", "laser sword", "sci fi sword"],
    "yggdrasil-leaf": ["fantasy leaf", "tree leaf illustration", "mythic leaf"],
    "hero-sword": ["hero sword", "legendary sword", "fantasy sword"],
    "magic-ring": ["magic ring", "jewel ring", "fantasy ring"],
    "pegasus-feather": ["pegasus feather", "white feather", "mythic feather"],
    "dragon-fang": ["dragon fang", "tooth fang", "monster fang"],
    "legendary-medal": ["medal", "gold medal", "fantasy medal"],
    "orichalcum": ["orichalcum", "fantasy metal", "rare metal ingot"],
    "hero-support-item": ["superhero gadget", "hero utility tool", "sci fi gadget"],
    "flying-carpet": ["flying carpet", "magic carpet", "ornament carpet"],
}


@dataclass
class ItemGroup:
    canonical_name: str
    category: str
    query_en: str
    query_ja: str
    requested_names: list[str]


def uniq(seq: list[str]) -> list[str]:
    seen = set()
    out = []
    for s in seq:
        key = s.strip()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(key)
    return out


def clean_query(query: str) -> str:
    text = query
    for token in [" isolated", " no people", " product", " photo", " real", " close-up"]:
        text = text.replace(token, "")
    return " ".join(text.split())


def query_candidates(group: ItemGroup) -> list[str]:
    canonical = group.canonical_name.replace("-", " ")
    requested = group.requested_names[0]
    q_en = clean_query(group.query_en)
    q_ja = clean_query(group.query_ja)
    parts = [p for p in canonical.split() if p not in {"game", "icon", "no", "people"}]
    coarse = " ".join(parts[:2]) if parts else canonical
    aliases = QUERY_ALIASES.get(group.canonical_name, [])
    token_fallback = []
    for source in [canonical, q_en]:
        for t in re.split(r"[^a-z0-9]+", source.lower()):
            if len(t) >= 4 and t not in {"icon", "game", "people"}:
                token_fallback.append(t)
    return uniq([q_en, q_ja, canonical, requested, coarse, *aliases, *token_fallback])


def looks_like_people(text: str) -> bool:
    tokens = set(re.sub(r"[^a-z0-9 ]+", " ", text.lower()).split())
    return bool(tokens & PEOPLE_TERMS)


def guess_ext(url: str, mime: str) -> str:
    ext = Path(urllib.parse.urlparse(url).path).suffix.lower()
    if ext in IMAGE_EXTS:
        return ".jpg" if ext == ".jpeg" else ext
    by_mime = mimetypes.guess_extension(mime or "")
    if by_mime in IMAGE_EXTS:
        return ".jpg" if by_mime == ".jpe" else by_mime
    return ".jpg"


def fetch_json(url: str, retries: int = 4) -> dict:
    wait = 0.8
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in {429, 500, 502, 503, 504} and i < retries - 1:
                time.sleep(wait)
                wait *= 1.8
                continue
            raise
        except Exception:
            if i < retries - 1:
                time.sleep(wait)
                wait *= 1.5
                continue
            raise
    return {}


def fetch_bytes(url: str, retries: int = 3) -> tuple[bytes, str]:
    wait = 0.7
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read(), r.headers.get_content_type()
        except Exception:
            if i < retries - 1:
                time.sleep(wait)
                wait *= 1.7
                continue
            raise
    raise RuntimeError("download failed")


def read_item_groups() -> list[ItemGroup]:
    by_key: dict[tuple[str, str], ItemGroup] = {}
    with REQUESTED_CSV.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = (row["canonical_name"], row["category"])
            if key not in by_key:
                by_key[key] = ItemGroup(
                    canonical_name=row["canonical_name"],
                    category=row["category"],
                    query_en=row["query_en"],
                    query_ja=row["query_ja"],
                    requested_names=[row["requested_name"]],
                )
            else:
                by_key[key].requested_names.append(row["requested_name"])
    return list(by_key.values())


def existing_files_for(group: ItemGroup) -> list[Path]:
    dir_path = BASE_DIR / group.category
    dir_path.mkdir(parents=True, exist_ok=True)
    pattern = f"{group.canonical_name}__*"
    files = [p for p in dir_path.glob(pattern) if p.suffix.lower() in IMAGE_EXTS]
    return sorted(files)


def search_openverse(query: str) -> list[dict]:
    out = []
    seen = set()
    for page in (1, 2, 3):
        params = {
            "q": clean_query(query),
            "mature": "false",
            "page_size": "25",
            "extension": "jpg,png,webp",
            "filter_dead": "true",
            "page": str(page),
        }
        url = OPENVERSE_API + "?" + urllib.parse.urlencode(params)
        data = fetch_json(url)
        for r in data.get("results", []):
            text = f"{r.get('title','')} {r.get('creator','')} {r.get('tags','')}"
            if looks_like_people(text):
                continue
            urls = [r.get("url"), r.get("thumbnail")]
            for u in urls:
                if not u or u in seen:
                    continue
                ext = Path(urllib.parse.urlparse(u).path).suffix.lower()
                if ext and ext not in IMAGE_EXTS:
                    continue
                seen.add(u)
                out.append(
                    {
                        "download_url": u,
                        "source_page": r.get("foreign_landing_url") or r.get("detail_url") or "",
                        "source_domain": f"openverse:{r.get('source','unknown')}",
                        "license_note": f"{r.get('license','unknown')} {r.get('license_version','')}".strip(),
                    }
                )
                break
    return out


def search_wikimedia(query: str) -> list[dict]:
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": clean_query(query),
        "gsrnamespace": "6",
        "gsrlimit": "20",
        "prop": "imageinfo|info",
        "iiprop": "url|extmetadata",
        "inprop": "url",
    }
    url = WIKIMEDIA_API + "?" + urllib.parse.urlencode(params)
    data = fetch_json(url)
    pages = data.get("query", {}).get("pages", {})
    out = []
    for p in pages.values():
        title = p.get("title", "")
        ii = p.get("imageinfo", [])
        if not ii:
            continue
        info = ii[0]
        dl = info.get("url")
        if not dl:
            continue
        ext = Path(urllib.parse.urlparse(dl).path).suffix.lower()
        if ext and ext not in IMAGE_EXTS:
            continue
        extmeta = info.get("extmetadata", {})
        desc = extmeta.get("ImageDescription", {}).get("value", "")
        artist = extmeta.get("Artist", {}).get("value", "")
        text = re.sub(r"<[^>]+>", " ", f"{title} {desc} {artist}")
        if looks_like_people(text):
            continue
        license_note = extmeta.get("LicenseShortName", {}).get("value", "Wikimedia Commons")
        out.append(
            {
                "download_url": dl,
                "source_page": p.get("fullurl", ""),
                "source_domain": "commons.wikimedia.org",
                "license_note": re.sub(r"<[^>]+>", "", license_note),
            }
        )
    return out


def next_rank(files: list[Path], canonical_name: str) -> int:
    max_rank = 0
    for f in files:
        m = re.search(rf"{re.escape(canonical_name)}__(\d+)", f.stem)
        if m:
            max_rank = max(max_rank, int(m.group(1)))
    return max_rank + 1


def build_manifest_row(group: ItemGroup, rel_path: Path, source: dict, fmt: str) -> dict:
    return {
        "requested_name": group.requested_names[0],
        "canonical_name": group.canonical_name,
        "category": group.category,
        "file_path": str(rel_path),
        "source_page": source.get("source_page", ""),
        "source_domain": source.get("source_domain", ""),
        "license_note": source.get("license_note", ""),
        "contains_people": "no",
        "format": fmt,
    }


def unknown_manifest_row(group: ItemGroup, rel_path: Path) -> dict:
    return {
        "requested_name": group.requested_names[0],
        "canonical_name": group.canonical_name,
        "category": group.category,
        "file_path": str(rel_path),
        "source_page": "",
        "source_domain": "unknown",
        "license_note": "unknown (existing file)",
        "contains_people": "no",
        "format": rel_path.suffix.lstrip(".").lower() or "jpg",
    }


def existing_manifest_map() -> dict[str, dict]:
    out: dict[str, dict] = {}
    if not MANIFEST_CSV.exists():
        return out
    with MANIFEST_CSV.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            out[row["file_path"]] = row
    return out


def write_csv(path: Path, fieldnames: list[str], rows: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    argv = sys.argv[1:]
    finalize_only = "--finalize-only" in set(argv)
    max_groups = None
    for arg in argv:
        if arg.startswith("--max-groups="):
            max_groups = max(1, int(arg.split("=", 1)[1]))
    target = 2
    groups = read_item_groups()
    BASE_DIR.mkdir(parents=True, exist_ok=True)
    META_DIR.mkdir(parents=True, exist_ok=True)
    manifest_map = existing_manifest_map()
    downloaded = 0

    if not finalize_only:
        processed_groups = 0
        for group in groups:
            if max_groups is not None and processed_groups >= max_groups:
                break
            files = existing_files_for(group)
            need = max(0, target - len(files))
            if need == 0:
                continue

            processed_groups += 1
            seen_urls = set()
            candidates = []
            for query in query_candidates(group):
                try:
                    candidates.extend(search_wikimedia(query))
                except Exception:
                    pass
                if len(candidates) < 14:
                    try:
                        candidates.extend(search_openverse(query))
                    except Exception:
                        pass
                if len(candidates) >= 40:
                    break

            rank = next_rank(files, group.canonical_name)
            for c in candidates:
                if need <= 0:
                    break
                url = c["download_url"]
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                try:
                    data, mime = fetch_bytes(url)
                    if not mime.startswith("image/"):
                        continue
                    ext = guess_ext(url, mime)
                    rel = Path(group.category) / f"{group.canonical_name}__{rank:02d}{ext}"
                    dst = BASE_DIR / rel
                    if dst.exists() and dst.stat().st_size > 0:
                        rank += 1
                        continue
                    dst.write_bytes(data)
                    manifest_map[str(rel)] = build_manifest_row(group, rel, c, ext.lstrip("."))
                    rank += 1
                    need -= 1
                    downloaded += 1
                except Exception:
                    continue
            time.sleep(0.18)

    # Include pre-existing files that had no metadata rows.
    for group in groups:
        for f in existing_files_for(group):
            rel = f.relative_to(BASE_DIR)
            key = str(rel)
            if key not in manifest_map:
                manifest_map[key] = unknown_manifest_row(group, rel)

    all_rows = sorted(manifest_map.values(), key=lambda r: r["file_path"])
    write_csv(
        MANIFEST_CSV,
        [
            "requested_name",
            "canonical_name",
            "category",
            "file_path",
            "source_page",
            "source_domain",
            "license_note",
            "contains_people",
            "format",
        ],
        all_rows,
    )

    missing_rows = []
    for group in groups:
        count = len(existing_files_for(group))
        if count >= target:
            continue
        for requested_name in group.requested_names:
            missing_rows.append(
                {
                    "requested_name": requested_name,
                    "canonical_name": group.canonical_name,
                    "reason": f"only {count}/{target} images found",
                    "searched_terms": f"{group.query_en} | {group.query_ja}",
                }
            )

    write_csv(MISSING_CSV, ["requested_name", "canonical_name", "reason", "searched_terms"], missing_rows)
    print(f"downloaded {downloaded}")
    print(f"manifest_rows {len(all_rows)}")
    print(f"missing_rows {len(missing_rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
