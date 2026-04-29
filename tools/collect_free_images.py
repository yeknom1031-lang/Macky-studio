#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import mimetypes
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
BASE_DIR = ROOT / "assets" / "free-images"
META_DIR = BASE_DIR / "_meta"

USER_AGENT = "MackyStudioImageCollector/1.0 (+local script)"
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

EXT_MAP = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
}


@dataclass(frozen=True)
class Item:
    requested_name: str
    canonical_name: str
    category: str
    query_en: str
    query_ja: str
    photo_like_cg_ok: bool = False


ITEMS: list[Item] = [
    Item("鉛筆", "pencil", "01_school_life", "pencil stationery isolated no people", "鉛筆 文房具"),
    Item("ノート", "notebook", "01_school_life", "school notebook isolated no people", "学習ノート"),
    Item("定規", "ruler", "01_school_life", "ruler isolated no people", "定規"),
    Item("水筒", "water-bottle", "01_school_life", "kids water bottle isolated no people", "子ども用 水筒"),
    Item("上履き", "indoor-school-shoes", "01_school_life", "japanese school indoor shoes isolated no people", "上履き"),
    Item("チョーク", "chalk", "01_school_life", "classroom chalk isolated no people", "チョーク"),
    Item("黒板消し", "blackboard-eraser", "01_school_life", "blackboard eraser isolated no people", "黒板消し"),
    Item("コンパス", "drawing-compass", "01_school_life", "drawing compass tool isolated no people", "製図用コンパス"),
    Item("絵の具", "paint-set", "01_school_life", "watercolor paint set isolated no people", "絵の具セット"),
    Item("虫メガネ", "magnifying-glass", "01_school_life", "magnifying glass isolated no people", "虫メガネ"),
    Item("磁石", "bar-magnet", "01_school_life", "bar magnet isolated no people", "棒磁石"),
    Item("時計", "classroom-clock", "01_school_life", "classroom wall clock no people", "壁掛け時計 学校"),
    Item("お弁当箱", "lunch-box", "01_school_life", "kids lunch box isolated no people", "子ども お弁当箱"),
    Item("タオル", "towel", "01_school_life", "face towel isolated no people", "フェイスタオル"),
    Item("歯ブラシ", "toothbrush", "01_school_life", "kids toothbrush isolated no people", "子ども 歯ブラシ"),
    Item("リモコン", "remote-control", "01_school_life", "tv remote control isolated no people", "テレビ リモコン"),
    Item("フライパン", "frying-pan", "01_school_life", "frying pan isolated no people", "フライパン"),
    Item("お皿", "plate", "01_school_life", "white dinner plate isolated no people", "白い 平皿"),
    Item("宿題のプリント", "homework-worksheet", "01_school_life", "blank worksheet paper isolated no people", "宿題 プリント"),
    Item("パパの靴", "mens-shoes", "01_school_life", "men shoes isolated no people", "男性用 革靴"),
    Item("消しゴム", "eraser", "01_school_life", "eraser stationery isolated no people", "消しゴム 文具"),
    Item("ランドセル", "randoseru", "01_school_life", "randoseru school bag isolated no people", "ランドセル"),
    Item("デニム", "denim-jeans", "01_school_life", "denim jeans isolated no people", "デニム パンツ"),
    Item("回し車", "exercise-wheel", "02_desk_gaming_pet", "small pet exercise wheel isolated no people", "小動物 回し車"),
    Item("キューブのタイマー", "speedcubing-timer", "02_desk_gaming_pet", "speedcubing timer isolated no people", "スピードキューブ タイマー"),
    Item("コントローラー", "gaming-controller", "02_desk_gaming_pet", "game controller isolated no people", "ゲーム コントローラー"),
    Item("ゲームのコントローラー", "gaming-controller", "02_desk_gaming_pet", "game controller isolated no people", "ゲーム コントローラー"),
    Item("イヤホン", "earphones", "02_desk_gaming_pet", "wired earphones isolated no people", "有線 イヤホン"),
    Item("マイク", "microphone", "02_desk_gaming_pet", "desktop microphone isolated no people", "卓上 マイク"),
    Item("ゲーミングチェア", "gaming-chair", "02_desk_gaming_pet", "gaming chair isolated no people", "ゲーミングチェア"),
    Item("マウスパッド", "mouse-pad", "02_desk_gaming_pet", "desk mouse pad isolated no people", "マウスパッド"),
    Item("漫画", "manga-books", "02_desk_gaming_pet", "manga books stack no people", "漫画 単行本"),
    Item("ポスター", "poster", "02_desk_gaming_pet", "blank poster on wall no people", "ポスター 壁"),
    Item("スナック菓子", "snack-bag", "02_desk_gaming_pet", "snack bag isolated no people", "スナック菓子"),
    Item("空き缶", "empty-can", "02_desk_gaming_pet", "empty soda can isolated no people", "空き缶"),
    Item("充電器", "charger", "02_desk_gaming_pet", "usb charger adapter isolated no people", "USB 充電器"),
    Item("ルービックキューブ", "rubiks-cube", "02_desk_gaming_pet", "rubiks cube isolated no people", "ルービックキューブ"),
    Item("モルモットのおやつ", "guinea-pig-treats", "02_desk_gaming_pet", "guinea pig treats isolated no people", "モルモット おやつ"),
    Item("ゲーミングPC", "gaming-pc", "02_desk_gaming_pet", "gaming pc setup no people", "ゲーミングPC"),
    Item("モニター", "monitor", "03_electronics_space_music", "lcd monitor isolated no people", "液晶モニター"),
    Item("マザーボード", "motherboard", "03_electronics_space_music", "motherboard pcb isolated no people", "マザーボード"),
    Item("USBメモリ", "usb-flash-drive", "03_electronics_space_music", "usb flash drive isolated no people", "USBメモリ"),
    Item("はんだ", "solder-wire", "03_electronics_space_music", "solder wire isolated no people", "はんだ 線材"),
    Item("モーター", "dc-motor", "03_electronics_space_music", "dc motor isolated no people", "DCモーター"),
    Item("歯車", "gear", "03_electronics_space_music", "metal gear isolated no people", "金属歯車"),
    Item("ネジ", "screw", "03_electronics_space_music", "machine screw isolated no people", "精密ネジ"),
    Item("電池", "aa-battery", "03_electronics_space_music", "aa battery isolated no people", "乾電池 単3"),
    Item("センサー", "sensor-module", "03_electronics_space_music", "sensor module isolated no people", "電子センサー モジュール"),
    Item("レーザー", "laser-module", "03_electronics_space_music", "laser module isolated no people", "レーザーモジュール"),
    Item("ドローン", "drone", "03_electronics_space_music", "quadcopter drone isolated no people", "小型ドローン"),
    Item("VRゴーグル", "vr-headset", "03_electronics_space_music", "vr headset isolated no people", "VRヘッドセット"),
    Item("トランシーバー", "walkie-talkie", "03_electronics_space_music", "walkie talkie isolated no people", "トランシーバー"),
    Item("ロボット", "robot", "03_electronics_space_music", "humanoid robot isolated no people", "ロボット", True),
    Item("人工衛星", "satellite", "03_electronics_space_music", "satellite in orbit no people", "人工衛星", True),
    Item("ロケット", "rocket", "03_electronics_space_music", "rocket isolated no people", "打ち上げロケット"),
    Item("宇宙服", "spacesuit", "03_electronics_space_music", "spacesuit isolated no people", "宇宙服"),
    Item("望遠鏡", "telescope", "03_electronics_space_music", "astronomical telescope no people", "天体望遠鏡"),
    Item("シンセサイザー", "synthesizer", "03_electronics_space_music", "analog synthesizer isolated no people", "シンセサイザー"),
    Item("ケーブル", "audio-cable", "03_electronics_space_music", "audio cable isolated no people", "オーディオケーブル"),
    Item("MIDIキーボード", "midi-keyboard", "03_electronics_space_music", "midi keyboard controller isolated no people", "MIDIキーボード"),
    Item("はんだごて", "soldering-iron", "03_electronics_space_music", "soldering iron isolated no people", "はんだごて"),
    Item("3Dプリンター", "3d-printer", "03_electronics_space_music", "3d printer isolated no people", "3Dプリンター"),
    Item("ブロック", "game-block", "04_game_gimmicks_ui", "game block icon no people", "ゲーム ブロック", True),
    Item("トゲ", "spike-trap", "04_game_gimmicks_ui", "spike trap icon no people", "ゲーム トゲ", True),
    Item("ジャンプ台", "jump-pad", "04_game_gimmicks_ui", "jump pad icon no people", "ジャンプ台 ギミック", True),
    Item("ポータル", "portal", "04_game_gimmicks_ui", "portal gate icon no people", "ポータル", True),
    Item("コイン", "coin", "04_game_gimmicks_ui", "game coin icon no people", "ゲーム コイン", True),
    Item("スター", "star", "04_game_gimmicks_ui", "collectible star icon no people", "スター 収集アイテム", True),
    Item("鍵", "key", "04_game_gimmicks_ui", "game key icon no people", "ゲーム 鍵", True),
    Item("宝箱", "treasure-chest", "04_game_gimmicks_ui", "treasure chest icon no people", "宝箱", True),
    Item("回復のポーション", "health-potion", "04_game_gimmicks_ui", "health potion icon no people", "回復 ポーション", True),
    Item("毒消し", "antidote", "04_game_gimmicks_ui", "antidote item icon no people", "毒消し アイテム", True),
    Item("セーブデータ", "save-point", "04_game_gimmicks_ui", "save point icon no people", "セーブポイント", True),
    Item("ワープゲート", "warp-gate", "04_game_gimmicks_ui", "warp gate icon no people", "ワープゲート", True),
    Item("隠し通路", "secret-passage", "04_game_gimmicks_ui", "secret passage game art no people", "隠し通路", True),
    Item("ボスの扉", "boss-door", "04_game_gimmicks_ui", "boss door icon no people", "ボスの扉", True),
    Item("スコアボード", "scoreboard", "04_game_gimmicks_ui", "scoreboard game ui no people", "スコアボード", True),
    Item("経験値", "xp-bar", "04_game_gimmicks_ui", "xp bar ui no people", "経験値バー", True),
    Item("レベルアップの音", "level-up-sound", "04_game_gimmicks_ui", "level up sound icon no people", "レベルアップ 音", True),
    Item("バグ技の裏道", "glitch-route", "04_game_gimmicks_ui", "glitch route game map no people", "バグ技 裏道", True),
    Item("魔法陣", "magic-circle", "04_game_gimmicks_ui", "magic circle no people", "魔法陣", True),
    Item("クリスタル", "crystal", "04_game_gimmicks_ui", "crystal collectible no people", "クリスタル", True),
    Item("魔法の杖", "magic-wand", "05_fantasy_items", "magic wand no people", "魔法の杖", True),
    Item("魔法の本", "magic-book", "05_fantasy_items", "grimoire book no people", "魔導書", True),
    Item("聖杯", "holy-grail", "05_fantasy_items", "holy grail no people", "聖杯", True),
    Item("エリクサー", "elixir", "05_fantasy_items", "elixir potion bottle no people", "エリクサー", True),
    Item("ドラゴンのウロコ", "dragon-scale", "05_fantasy_items", "dragon scale no people", "ドラゴンのウロコ", True),
    Item("フェニックスの羽", "phoenix-feather", "05_fantasy_items", "phoenix feather no people", "フェニックスの羽", True),
    Item("妖精の粉", "fairy-dust", "05_fantasy_items", "fairy dust no people", "妖精の粉", True),
    Item("魔石", "magic-stone", "05_fantasy_items", "magic crystal stone no people", "魔石", True),
    Item("マント", "cloak", "05_fantasy_items", "cloak isolated no people", "マント", True),
    Item("よろい", "armor", "05_fantasy_items", "armor isolated no people", "鎧", True),
    Item("たて", "shield", "05_fantasy_items", "shield isolated no people", "盾", True),
    Item("かぶと", "helmet", "05_fantasy_items", "helmet isolated no people", "兜", True),
    Item("弓矢", "bow-and-arrow", "05_fantasy_items", "bow and arrow isolated no people", "弓矢", True),
    Item("短剣", "dagger", "05_fantasy_items", "dagger isolated no people", "短剣", True),
    Item("ヤリ", "spear", "05_fantasy_items", "spear isolated no people", "槍", True),
    Item("オノ", "battle-axe", "05_fantasy_items", "battle axe isolated no people", "斧", True),
    Item("魔法のランプ", "magic-lamp", "05_fantasy_items", "magic lamp no people", "魔法のランプ", True),
    Item("ビームソード", "beam-sword", "05_fantasy_items", "beam sword no people", "ビームソード", True),
    Item("透明マント", "invisibility-cloak", "05_fantasy_items", "invisibility cloak no people", "透明マント", True),
    Item("世界樹の葉", "yggdrasil-leaf", "05_fantasy_items", "fantasy leaf no people", "世界樹の葉", True),
    Item("勇者の剣", "hero-sword", "05_fantasy_items", "hero sword no people", "勇者の剣", True),
    Item("魔法のリング", "magic-ring", "05_fantasy_items", "magic ring isolated no people", "魔法のリング", True),
    Item("天馬の羽", "pegasus-feather", "05_fantasy_items", "pegasus feather no people", "天馬の羽", True),
    Item("竜のキバ", "dragon-fang", "05_fantasy_items", "dragon fang no people", "竜のキバ", True),
    Item("幻のメダル", "legendary-medal", "05_fantasy_items", "fantasy medal no people", "幻のメダル", True),
    Item("エクスカリバー（伝説の剣）", "excalibur", "05_fantasy_items", "excalibur sword no people", "エクスカリバー", True),
    Item("賢者の石（魔法のアイテム）", "philosophers-stone", "05_fantasy_items", "philosophers stone no people", "賢者の石", True),
    Item("オリハルコン（幻の金属）", "orichalcum", "05_fantasy_items", "orichalcum fantasy metal no people", "オリハルコン", True),
    Item("タイムマシン", "time-machine", "06_sf_specials", "time machine no people", "タイムマシン", True),
    Item("ヒーローのサポートアイテム", "hero-support-item", "06_sf_specials", "hero gadget no people", "ヒーロー ガジェット", True),
    Item("空飛ぶじゅうたん", "flying-carpet", "06_sf_specials", "flying carpet no people", "空飛ぶじゅうたん", True),
]


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)


def fetch_bytes(url: str) -> tuple[bytes, str]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as response:
        mime = response.headers.get_content_type()
        return response.read(), mime


def safe_slug(text: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return text or "item"


def api_query(text: str) -> str:
    query = text
    for token in [" isolated", " no people", " photo", " product", " real", " close-up"]:
        query = query.replace(token, "")
    return " ".join(query.split())


def looks_like_people(text: str) -> bool:
    lowered = re.sub(r"[^a-z0-9 ]+", " ", text.lower())
    tokens = set(lowered.split())
    return bool(tokens & PEOPLE_TERMS)


def guess_extension(url: str, mime: str) -> str:
    path = urllib.parse.urlparse(url).path
    ext = Path(path).suffix.lower()
    if ext in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}:
        return ".jpg" if ext == ".jpeg" else ext
    if mime in EXT_MAP:
        return EXT_MAP[mime]
    guessed = mimetypes.guess_extension(mime or "")
    if guessed == ".jpe":
        return ".jpg"
    return guessed or ".jpg"


def is_supported_extension(url: str) -> bool:
    ext = Path(urllib.parse.urlparse(url).path).suffix.lower()
    if not ext:
        return True
    return ext in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}


def ensure_dirs() -> None:
    for name in [
        "01_school_life",
        "02_desk_gaming_pet",
        "03_electronics_space_music",
        "04_game_gimmicks_ui",
        "05_fantasy_items",
        "06_sf_specials",
        "_meta",
    ]:
        (BASE_DIR / name).mkdir(parents=True, exist_ok=True)


def search_openverse(item: Item) -> Iterable[dict]:
    params = {
        "q": api_query(item.query_en),
        "license_type": "commercial",
        "mature": "false",
        "page_size": "20",
        "extension": "jpg,png,webp",
        "filter_dead": "true",
    }
    url = OPENVERSE_API + "?" + urllib.parse.urlencode(params)
    payload = fetch_json(url)
    for result in payload.get("results", []):
        text = " ".join(
            str(result.get(field, "")) for field in ["title", "creator", "tags"]
        )
        if looks_like_people(text):
            continue
        url_candidate = result.get("url")
        if not url_candidate:
            continue
        if not is_supported_extension(url_candidate):
            continue
        yield {
            "source_page": result.get("foreign_landing_url") or result.get("detail_url") or "",
            "download_url": url_candidate,
            "source_domain": f"openverse:{result.get('source', 'unknown')}",
            "license_note": f"{result.get('license','unknown')} {result.get('license_version','')}".strip(),
            "title": result.get("title", ""),
        }


def search_wikimedia(item: Item) -> Iterable[dict]:
    search_term = api_query(item.query_en)
    search_params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": search_term,
        "gsrnamespace": "6",
        "gsrlimit": "8",
        "prop": "imageinfo|info",
        "iiprop": "url|extmetadata",
        "inprop": "url",
    }
    url = WIKIMEDIA_API + "?" + urllib.parse.urlencode(search_params)
    payload = fetch_json(url)
    pages = payload.get("query", {}).get("pages", {})
    for page in pages.values():
        title = page.get("title", "")
        if looks_like_people(title):
            continue
        imageinfo = page.get("imageinfo", [])
        if not imageinfo:
            continue
        info = imageinfo[0]
        extmeta = info.get("extmetadata", {})
        license_short = extmeta.get("LicenseShortName", {}).get("value", "Wikimedia Commons")
        artist = extmeta.get("Artist", {}).get("value", "")
        description = extmeta.get("ImageDescription", {}).get("value", "")
        if looks_like_people(f"{title} {artist} {description}"):
            continue
        download_url = info.get("url")
        if not download_url:
            continue
        if not is_supported_extension(download_url):
            continue
        yield {
            "source_page": page.get("fullurl", ""),
            "download_url": download_url,
            "source_domain": "commons.wikimedia.org",
            "license_note": re.sub(r"<[^>]+>", "", license_short),
            "title": title,
        }


def save_result(item: Item, rank: int, result: dict) -> dict:
    data, mime = fetch_bytes(result["download_url"])
    if not mime.startswith("image/"):
        raise ValueError(f"unsupported mime: {mime}")
    ext = guess_extension(result["download_url"], mime)
    relative_path = Path(item.category) / f"{item.canonical_name}__{rank:02d}{ext}"
    destination = BASE_DIR / relative_path
    destination.write_bytes(data)
    return {
        "requested_name": item.requested_name,
        "canonical_name": item.canonical_name,
        "category": item.category,
        "file_path": str(relative_path),
        "source_page": result["source_page"],
        "source_domain": result["source_domain"],
        "license_note": result["license_note"],
        "contains_people": "no",
        "format": ext.lstrip("."),
    }


def collect_item(item: Item, target_count: int) -> tuple[list[dict], dict | None]:
    found: list[dict] = []
    seen_urls: set[str] = set()
    search_terms = [item.query_en]
    for source in (search_openverse, search_wikimedia):
        try:
            for result in source(item):
                download_url = result["download_url"]
                if download_url in seen_urls:
                    continue
                seen_urls.add(download_url)
                try:
                    entry = save_result(item, len(found) + 1, result)
                    found.append(entry)
                    if len(found) >= target_count:
                        return found, None
                except Exception:
                    continue
        except Exception:
            continue
        time.sleep(0.2)
    reason = "not enough people-free results"
    return found, {
        "requested_name": item.requested_name,
        "canonical_name": item.canonical_name,
        "reason": reason,
        "searched_terms": " | ".join(search_terms),
    }


def write_csv(path: Path, fieldnames: list[str], rows: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_readme() -> None:
    content = """# Free Images

This folder stores free-to-reuse images collected for the requested item list.

Rules:
- Exclude images containing people, faces, hands, or worn products.
- Prefer object-only photographs for real items.
- Allow people-free photo-like CG for fantasy, game UI, or impossible-to-photograph items.
- Keep source URL and license note in `_meta/manifest.csv`.
- Record missing items in `_meta/missing.csv`.
"""
    (META_DIR / "README.md").write_text(content, encoding="utf-8")


def write_aliases() -> None:
    rows = []
    for item in ITEMS:
        rows.append(
            {
                "requested_name": item.requested_name,
                "canonical_name": item.canonical_name,
                "category": item.category,
                "query_ja": item.query_ja,
                "query_en": item.query_en,
                "photo_like_cg_ok": "yes" if item.photo_like_cg_ok else "no",
            }
        )
    write_csv(
        META_DIR / "requested_items.csv",
        ["requested_name", "canonical_name", "category", "query_ja", "query_en", "photo_like_cg_ok"],
        rows,
    )


def main() -> int:
    target_count = 2
    limit: int | None = None
    if len(sys.argv) > 1:
        target_count = max(1, min(3, int(sys.argv[1])))
    if len(sys.argv) > 2:
        limit = max(1, int(sys.argv[2]))
    ensure_dirs()
    write_readme()
    write_aliases()
    manifest_rows: list[dict] = []
    missing_rows: list[dict] = []
    items = ITEMS[:limit] if limit else ITEMS
    for item in items:
        print(f"collecting {item.requested_name} -> {item.canonical_name}", flush=True)
        rows, missing = collect_item(item, target_count)
        manifest_rows.extend(rows)
        if missing:
            missing_rows.append(missing)
    write_csv(
        META_DIR / "manifest.csv",
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
        manifest_rows,
    )
    write_csv(
        META_DIR / "missing.csv",
        ["requested_name", "canonical_name", "reason", "searched_terms"],
        missing_rows,
    )
    print(f"saved {len(manifest_rows)} files")
    print(f"missing {len(missing_rows)} items")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
