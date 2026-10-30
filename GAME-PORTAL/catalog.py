"""Discover local releases, not backups, build tools or design previews."""
import hashlib
import html
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
# directory | display title | category | description | optional actual screenshot
ROWS = '''
KOMOREBI-SURVIVAL|KOMOREBI SURVIVAL|冒険・探索|森を歩き、洞窟を探し、自由に暮らす。|qa/terrain-blend/verified.png
SKY-VOYAGER|雲海の航海者|冒険・探索|空の島をめぐる、剣と飛行船の冒険。|qa/combat-final-20261023.png
TOWER-TOGETHER-3D|つみあげラボ|パズル・テーブル|素材を積んで、高さに挑戦。ひとりでも、ふたりでも。|home-preview.png
KUKU-JACKPOT|九九ビート大放送！|リズム|22のミニゲームで、九九のリズムにのろう。|qa/festival-home-1280.png
KOMOREBI-PHOTO|WILDLIGHT — 大自然の写真帖|冒険・探索|野生動物と季節の風景を、写真に残そう。|qa/forest-final.png
KOMOREBI-PHOTO-NEW|EMBERBOUND — 五つの封石|冒険・探索|資源を集め、装備を作り、守護者に挑む。|qa/forest-final.png
WACHA-WACHA-TOWN|わちゃわちゃタウン|パズル・テーブル|にぎやかな24の街で、お目当ての住人を探そう。|test-results/01-home.png
YURUMON-MARCH|ゆるモン大行進|バトル|小さな仲間を召喚して、絵本の世界を冒険。|
SURVIVAL-ANIMALS|どうぶつと しまのたび|冒険・探索|動物を仲間にして、6つの島を探索しよう。|test-results/title.png
WHITE-ROOM|WHITE ROOM — 白の境界|冒険・探索|観測記録を読み解き、白い部屋の謎を解く。|screenshots/v5/route.png
LAST-PLATFORM|終電のあと|冒険・探索|深夜の駅に潜む異変を見抜き、出口を目指す。|screenshots/platform.png
MEDAL-LOUNGE|MEDAL LOUNGE|パズル・テーブル|きらめくメダルゲームのラウンジへ。|screenshots/v5-jackpot.png
PICO-ATELIER|PICO ATELIER 3D|パズル・テーブル|数字を手がかりに、立体ピクロスのかたちを見つけよう。|
FOUR-COLOR-OTHELLO|Irodory — 4色オセロ|パズル・テーブル|自分の色ではさんで、盤面を彩るオセロ。|
BOMB-STUDIO|BOMB! STUDIO|バトル|爆弾バトルも、ステージづくりも楽しもう。|
WILDCRAFT|WILDCRAFT|つくる・育てる|ブロックの世界を探索して、自分だけの拠点を作る。|
SKY-BUILDER-3D|SKY BUILDER 3D|つくる・育てる|空に広がる、自由な3D建築遊び。|
BLOCKBOUND|CUBERIA — キューブリア|つくる・育てる|キューブの世界へ飛び込もう。|
STAGE-MAKER-WORK|ステージメーカー|つくる・育てる|仕掛けを並べて、つくったステージで遊ぼう。|
SHOP-KEEPER-STORY|まちの店長ストーリー|つくる・育てる|お店を育てる、小さな店長の物語。|
MAGMA-ESCAPE|MAGMA ESCAPE|アクション|迫るマグマから逃げる、サバイバルアスレチック。|
TOILET-60|あと60秒で限界です。|アクション|混雑する迷路を抜け、制限時間内にたどり着け！|test-results/theme-4.png
GD-COMPLETE|Geometry Dash|リズム|リズムに合わせて、障害物を飛び越えよう。|
GD-PRACTICE|GD Practice|リズム|難しいジャンプを繰り返し練習。|
KENNEY-PULSE-DASH|Kenney Pulse Dash|リズム|タイミングを合わせて駆け抜けるダッシュゲーム。|
neon-dash|Neon Dash|リズム|ネオンのコースを、リズムにのって走ろう。|
ABSTRACT-RIFT-RUNNER|Abstract Rift Runner|アクション|幾何学の世界を走り抜ける。ブラウザ版。|
3D-AVOID-GAME|3D AVOID|アクション|立体空間で、迫る障害物をかわそう。|
CUBE-SURVIVAL|CUBE SURVIVAL|冒険・探索|小島の夜を生き抜く、キューブのサバイバル。|
CRAZY-MUSCLE-LAUNCHER|ハイパーマッスル宇宙飛翔|アクション|マッスルパワーで、宇宙の彼方まで飛んでいけ！|
MUSCLE-BATTLE-RUNNER|マッスル・バトル・ランナー3D|バトル|走って、鍛えて、バトルに挑む。|
KEYBOARD-CHAOS-FIGHTER|キーボードカオスファイター|バトル|キーボードを駆使して、カオスな技を繰り出そう。|
GLITCH-PLATFORMER|MONSTER HARVEST|アクション|不穏な工業地帯を進むプラットフォーマー。|
GRAVITY-LAB|GRAVITY LAB|アクション|重力を操る実験室で、ゴールへの道を探そう。|
FLOOR-COMMAND|FLOOR//COMMAND|アクション|指示に合わせて動く、ゆか体操ゲーム。|
NEON-GALAXY-RACER|NEON GALAXY RACER|アクション|ネオンの世界を駆け抜けるランナー。|
NEON-MAZE|ネオンメイズ|パズル・テーブル|光る迷路をくぐり抜け、出口を目指そう。|
SIMPLE-RUNNER|SIMPLE RUNNER|アクション|シンプル操作で、どこまで走れる？|
SUPER-PLATFORMER|スーパー・プラットフォーマー|アクション|ジャンプをつないで、ステージを攻略。|
SUPER-SKY-DROP|SUPER SKY DROP|アクション|空からの落下チャレンジに挑戦。|
TSUMIKI-TOWER-3D|TSUMIKI TOWER 3D|パズル・テーブル|バランスを見極めて、積み木を高く積もう。|
ARCHIVE-GACHA|画像ガチャ図鑑|コレクション|ガチャを引いて、画像コレクションを集めよう。|
'''
META = {r[0]:r[1:] for line in ROWS.strip().splitlines() if (r:=line.split('|'))}
NATIVE = {
 'WHITE-ROOM': 'build/WHITE ROOM.app',
 'LAST-PLATFORM': 'build/終電のあと.app',
 'MEDAL-LOUNGE': 'build/v5/MEDAL LOUNGE.app',
}
FILE_ENTRIES = {
 'FOUR-COLOR-OTHELLO': 'Irodory.html', 'TOILET-60': 'index.html',
 'WACHA-WACHA-TOWN': 'index.html', 'WILDCRAFT': 'index.html',
 'BOMB-STUDIO': 'index.html',
 'ARCHIVE-GACHA': 'index.html',
}
PORTS = {'KOMOREBI-PHOTO':4186,'KOMOREBI-PHOTO-NEW':4196,'KOMOREBI-SURVIVAL':4197,
 'SKY-VOYAGER':4477,'YURUMON-MARCH':4178,'MAGMA-ESCAPE':4188,'KUKU-JACKPOT':4177}
EXCLUDE = {'assets','output','tools','concept-art','GAME-PORTAL','非公開'}

def discover():
    games=[]
    for folder in sorted(ROOT.iterdir()):
        if not folder.is_dir() or folder.name.startswith('.') or folder.name in EXCLUDE:
            continue
        key=folder.name
        entry=next((folder/x for x in ('index.html','dist/index.html') if (folder/x).is_file()),None)
        kind='web'
        if key in NATIVE:
            entry=folder/NATIVE[key]; kind='app'
        elif key in FILE_ENTRIES:
            entry=folder/FILE_ENTRIES[key]; kind='file'
        if entry is None:
            continue
        fallback=key
        if entry.is_file() and key not in META:
            with entry.open(errors='replace') as f: match=re.search(r'<title>(.*?)</title>',f.read(65536),re.S)
            if match:fallback=html.unescape(match[1]).strip()
        title,category,description,cover=META.get(key,[fallback,'その他','クリックしてゲームを開く。',''])
        games.append(make(key,title,category,description,entry,kind,folder/cover if cover else None))
    extras=[
      ('medal-party','MEDAL LOUNGE — Party Fever','パズル・テーブル','パーティーモードで楽しむ、もうひとつのメダルラウンジ。','MEDAL-LOUNGE/build/v7/MEDAL LOUNGE.app','app','MEDAL-LOUNGE/screenshots/v6-party-jackpot.png',['--party']),
      ('pico-2d','PICO ATELIER 2D','パズル・テーブル','24問の平面ピクロス。じっくり解いて絵を完成。','PICO-ATELIER/dist/2d.html','web',None,[]),
      ('rift-maker','Abstract Rift Maker','つくる・育てる','Godot版のステージメーカーで遊ぶ。','ABSTRACT-RIFT-RUNNER/godot/project.godot','godot',None,[]),
      ('falling-classic','Falling Game','アクション','「非公開」フォルダに保存された、初期の落下ゲーム。','非公開/falling_game 2.html','file',None,[]),
    ]
    for key,title,cat,desc,path,kind,cover,args in extras:
        if (ROOT/path).exists():
            games.append(make(key,title,cat,desc,ROOT/path,kind,ROOT/cover if cover else None,args))
    return games

def godot_binary():
    import shutil
    candidates=[Path('/Applications/Godot.app/Contents/MacOS/Godot'),Path.home()/'Desktop/マッキー最強/Godot.app/Contents/MacOS/Godot',Path('/private/tmp/godot-4.7.2/Godot.app/Contents/MacOS/Godot')]
    return next((str(p) for p in candidates if p.is_file()),shutil.which('godot'))

def make(key,title,category,description,entry,kind,cover=None,args=None):
    custom=Path(__file__).parent/'assets'/f'{key}.png'
    if custom.is_file():cover=custom
    if cover and not cover.is_file():cover=None
    return dict(id=key,title=title,category=category,description=description,kind=kind,
      entry=str(entry),cover=str(cover) if cover else None,args=args or [],
      available=entry.exists() and (kind!='godot' or bool(godot_binary())),
      port=PORTS.get(key,48000+int(hashlib.sha256(key.encode()).hexdigest()[:8],16)%10000),
      order=list(META).index(key) if key in META else 100)
