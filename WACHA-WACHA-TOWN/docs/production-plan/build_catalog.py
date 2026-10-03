"""Build planning ledgers and a readable appendix. Does not generate game assets."""
from pathlib import Path
import json
import math
from catalog_source import STAGES, ROLE_GROUPS, COMMON_COHORTS

ROOT = Path(__file__).resolve().parent
STATUS = "未生成の制作指示"
roles = []
for group, names in ROLE_GROUPS.items():
    for name in names.split("|"):
        roles.append(dict(id=f"R{len(roles)+1:03}", group=group, name=name,
            delivery="開始・主動作・終了・中断復帰を含む絵コンテ1式。使用する設備と相手を併記。",
            status=STATUS))
role_by_num = {i+1:r for i,r in enumerate(roles)}

BODIES = ["背が高く細身", "小柄で丸みのある体格", "肩幅が広くがっしり", "背が高くお腹に丸みがある", "小柄で細身",
          "長い胴と短い脚", "脚が長く肩が細い", "大柄で肩がなだらか", "中背で腰幅が広い", "中背で筋肉質"]
HEADS = ["大きな巻き髪", "短い縮れ髪", "高いお団子", "横に張るボブ", "長い三つ編み", "片側へ流した前髪", "短髪と丸いひげ", "細い髪束のポニーテール", "丸い帽子と短髪", "幅広帽と波打つ髪",
         "角形眼鏡と刈り上げ", "丸眼鏡と耳の見える髪", "長い口ひげと短髪", "頭頂の薄い髪と丸い耳", "高い帽子と細いひげ", "編み込みをまとめた髪", "短い坊主頭", "大きな耳当て帽", "額を出したウェーブ", "左右に分けた低い髪束"]
CUTS = ["短い上着と幅広の裾", "長い前開き上着", "角のあるベストと細い裾", "丸い襟とふくらんだ袖", "斜めの前合わせと太い袖", "高い襟と細い袖", "肩布と短い上着", "腰を絞った上着と広い裾", "大きな襟と丈の短い上着", "丸いベストと長い裾",
        "裾が二つに分かれた上着", "首元を留めたケープ", "胸ポケットが張り出す上着", "大きな袖口と直線的な裾", "細長い襟と巻いた袖", "肩に継ぎ目のある作業着", "前掛けを折り返した服", "背面に大きなひだのある服", "短いマントと幅広の袖", "縦長のベストと丸い裾",
        "腰帯と段のある裾", "片肩の布と丸い襟", "大きな折襟と短い袖", "襟なしの箱形上着"]
AGES = ["若い成人", "中年", "年配の成人", "若い成人", "中年", "高齢者"]

def brief(seed, role, stage=None, child=False):
    body = BODIES[seed % len(BODIES)]
    head = HEADS[(seed // 10) % len(HEADS)]
    cut = CUTS[(seed // 200) % len(CUTS)]
    age = "子ども" if child else AGES[(seed // 7) % len(AGES)]
    if child:
        head = ["短いはね髪", "小さな三つ編み", "丸い帽子", "ふわふわの短髪", "耳が見えるボブ"][seed % 5]
        body = ["小柄で細身", "小柄で丸みのある体格", "背の高い子どもの体格"][seed % 3]
    if role == 103:
        body = "自走用車いすを使う成人。車輪と足台が見える姿勢"
    place = f"{stage}の素材・気候に合う服と道具" if stage else "多くの街へ自然に参加できる日常着。場所に合う役割だけを割り当てる"
    return f"{age}／{body}／{head}／{cut}。{place}。顔と衣装を独立して描き、輪郭3点以上で他者と区別する。"

def action_ids(primary, photo=False, child=False):
    if photo:
        return ["R200", "R201", "R202"]
    # Profession-specific action + natural idle/social activity, never 250 actions per character.
    pool = [98, 96, 97, 61, 74, 39, 100] if not child else [98, 97, 61, 203, 205, 206, 214]
    values = [primary]
    for r in pool[primary % len(pool):] + pool[:primary % len(pool)]:
        if r not in values:
            values.append(r)
        if len(values) == 3:
            break
    return [f"R{r:03}" for r in values]

characters = []
assets = []
stage_summary = []
def asset(asset_id, stage, kind, name, spec, quantity=1):
    assets.append(dict(id=asset_id,stage=stage,kind=kind,name=name,quantity=quantity,
                       spec=spec,status=STATUS))

GENERIC_PROPS = "ベンチ|椅子|小机|長机|柵|低い塀|花鉢|植栽箱|街灯|案内板枠|道具棚|収納箱|買い物かご|紙袋|布袋|コップ|皿|トレー|水差し|バケツ|ほうき|手桶|梯子|脚立|物干し竿|カーテン|日よけ|入口扉|窓|手すり|踏み台|荷札|時計枠|玄関マット|飾り旗|腰掛け石".split("|")
for si, s in enumerate(STAGES, 1):
    sid = f"S{si:02}"
    groups = [x.split(":",1) for x in s["cast"].split("|")]
    for gi, (r, job) in enumerate(groups):
        r = int(r)
        for vi in range(5):
            n = gi*5+vi+1
            seed = ((si-1)*100+n-1)*37 % 4800
            c = dict(id=f"{sid}-C{n:03}", stage=sid, name=f"{job} {vi+1}",
                design=brief(seed,r,s["name"]), role=f"R{r:03}", actions=action_ids(r),
                photographer=False, status=STATUS,
                placement=f"{job}用の設備を持つ専用拠点。{role_by_num[r]['name']}の接触点を指定する。",
                identity_note="属性は外見から推測させず人物設定で管理する。")
            characters.append(c)
    for pi in range(5):
        n=96+pi
        seed=((si-1)*100+n-1)*37 % 4800
        camera = ["二眼レフと胸の券入れ", "望遠カメラと腰の券入れ", "小型カメラと角形の券ケース", "折り畳み三脚と肩の券入れ", "箱形カメラと横長の券ケース"][pi]
        design = brief(seed,200,s["name"]) + f" {camera}。"
        if pi==4:
            design += "この人は車いすを使う。膝上のカメラ台と手の届く券入れを専用設計。段差のない撮影地点に配置。"
        characters.append(dict(id=f"{sid}-C{n:03}",stage=sid,name=f"{s['name']}のカメラマン {pi+1}",
            design=design,role="R200",actions=action_ids(200,photo=True),photographer=True,
            placement=f"{s['name']}の撮影地点{pi+1}。5人を別の地区に分散し、捜索対象にはしない。",
            identity_note="5人の型を他ステージへ着せ替え流用せず、顔と体形から新規制作。",status=STATUS))

    area=s["area"]
    terrain=math.ceil(area*12)
    buildings=math.ceil(math.sqrt(area)*8)
    sites=math.ceil(area*12)
    props=48+math.ceil((area-1)*12)
    stage_summary.append(dict(id=sid,name=s["name"],area=area,population=s["pop"],
        exclusive=100,common=s["pop"]-100,photographers=5,terrain=terrain,
        buildings=buildings,sites=sites,props=props,vehicles=4,environment=8,events=6))
    for j,label in enumerate(["全景構図","色と光","歩ける領域の参照図","階層と遮蔽の参照図","生活拠点の配置","人物を置いた近景検証"],1):
        asset(f"{sid}-CON{j:02}",sid,"設計画",label,"背景の絵を生成後、経路や床の線は設計で重ねる。機能データは別途作成。")
    for j in range(1,terrain+1):
        asset(f"{sid}-GND{j:03}",sid,"地形",f"地形区画{j}","地面と水面を分離。隣接区画の境界・道幅・光を連続させる。",2)
    zones=s["zones"].split("|")
    for j in range(buildings):
        name=zones[j] if j<len(zones) else f"外周地区{j-len(zones)+1}の建物"
        asset(f"{sid}-BLD{j+1:03}",sid,"建物",name,"奥・床・手前・屋根・灯りの5パーツ群。2階のある建物は階段と上下階の床を個別指定。",5)
    for j in range(sites):
        job=groups[j%len(groups)][1]
        asset(f"{sid}-SITE{j+1:03}",sid,"生活拠点",f"{job}の拠点{j//len(groups)+1}","人物とは別に設備の空状態・使用状態・前後部材・接触図を納品。複数職種で共有する場合も定員を指定。")
    # Guarantee all nineteen professions have a declared interaction site; share infrastructure where appropriate.
    for j in range(sites,len(groups)):
        asset(f"{sid}-ROLE-SITE{j+1:02}",sid,"役割接地図",groups[j][1],"既存生活拠点内の別位置として設計し、必要設備と床・手の接点を追加。")
    local=s["props"].split("|")
    prop_names=local+GENERIC_PROPS
    for j in range(props):
        name=prop_names[j] if j<len(prop_names) else f"外周地区{(j-len(prop_names))//12+1}の{GENERIC_PROPS[(j-len(prop_names))%len(GENERIC_PROPS)]}"
        asset(f"{sid}-PROP{j+1:03}",sid,"小物",name,"場所の材質と縮尺に合う独立原画。使う道具は保持・設置・使用前後を追加。動作で変わらない小物を不要に複製しない。")
    for kind,field,prefix,spec in [
        ("乗り物","vehicles","VEH","構造図、4方向、車体奥と手前、座席、扉、可動部、乗降位置。乗客は人物原画を参照。"),
        ("環境","env","ENV","静止原画と動く部位、主動作と変化、前後レイヤー。動物は生物台帳の原画を参照して重複計上しない。"),
        ("イベント","events","EVT","開始前・開始・進行・終了・復帰の絵コンテ。人物・設備・道具は既存IDを参照し、固有の効果だけ追加生成。")]:
        for j,name in enumerate(s[field].split("|"),1):
            asset(f"{sid}-{prefix}{j:02}",sid,kind,name,spec)

cohort_roles=[
list(range(15,21))+list(range(37,43))+[50,53], [73,74,75,76,134,150,220,250],
[37,38,39,40,41,61,62,90,100], [75,93,151,156,160,164,166,167,184,185],
list(range(61,106)), list(range(1,61)), list(range(106,151)), [47,48,83,84,85,131,136,154,171,172,173],
list(range(186,193))+[219], list(range(193,221)), [61,74,97,98,100,101,102,203,205,206,207,209,210,211,212,214,215],
[80,81,141,142,143,144,145,174,175,176,177,178,179,180,181,182,183],
list(range(221,251)), [221,222,223,224,240,241,243], list(range(151,186)),
[61,62,90,91,92,98,103,104,168,169,170,205,206,207,208],
[77,78,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,133,134,135,198,199],
[75,76,150,220,241,242,249,250], list(range(1,251))]
cohort_roles = [[r for r in rr if r != 202] for rr in cohort_roles]
safe_child=[61,74,97,98,203,205,206,207,209,210,211,212,214,215]
for gi,cohort in enumerate(COMMON_COHORTS):
    for j in range(100):
        n=gi*100+j+1
        child=gi==10 and j<30
        primary=(safe_child[j%len(safe_child)] if child else cohort_roles[gi][j%len(cohort_roles[gi])])
        seed=(2400+n-1)*37%4800
        ident="設定上の性別や関係性を別途記録し、外見だけで推測させない。"
        if gi==18 and j in (2,7,15,24,36,41,58,63,74,87):
            ident="LGBTQ+の住人として日常の仕事・趣味・家族関係を設定する。虹色衣装や特定体形を必須にしない。"
        characters.append(dict(id=f"G-C{n:04}",stage="COMMON",name=f"{cohort} {j+1} — {role_by_num[primary]['name']}",
            design=brief(seed,primary,child=child),role=f"R{primary:03}",actions=action_ids(primary,child=child),
            photographer=False,placement="そのステージで役割が成立する設備と道だけに配置。",identity_note=ident,status=STATUS))

ANIMAL_GROUPS={
"犬":"短足で長胴のダックス|立ち耳で巻き尾の柴犬|細い脚と細長い顔のウィペット|大きな胸と短い鼻のブルドッグ|毛量の多い牧羊犬|小さな鼻と丸いカットのプードル|長い耳と大きな足のバセット|大柄で厚い被毛の山岳犬",
"猫":"丸顔で耳の折れた猫|大きな耳と短い被毛の猫|細長い顔と長い脚の猫|長毛で胸の飾り毛がある猫|短い尾と丸い胴の猫|細い体と縮れ毛の猫|大きな体と四角い顎の猫|小柄で大きな目の猫",
"鳥":"カモメ|アジサシ|ハト|スズメ|ツバメ|カラス|ムクドリ|メジロ|シジュウカラ|フクロウ|ミミズク|オウム|インコ|カワセミ|サギ|フラミンゴ|ペリカン|カモ|ガチョウ|ニワトリ|ヒヨコ|ペンギン|キツツキ|ハチドリ",
"陸上小動物":"リス|シマリス|ハリネズミ|ウサギ|垂れ耳ウサギ|モルモット|ハムスター|フェレット|ミーアキャット|プレーリードッグ|チンチラ|ヤマネ|カピバラ|ラッコ|カワウソ|ビーバー",
"水辺の生き物":"カエル|アマガエル|陸ガメ|海ガメ|ヤドカリ|カニ|エビ|タコ|イカ|クラゲ|タツノオトシゴ|チンアナゴ|エイ|丸い熱帯魚|細長い川魚|大きなコイ",
"昆虫":"大きな羽の蝶|細い羽の蝶|ミツバチ|てんとう虫|トンボ|カブトムシ|クワガタ|ホタル",
"大型動物":"ウマ|ロバ|ラクダ|アルパカ|ヤギ|ヒツジ|ウシ|ゾウ",
"空想動物":"小さな丸翼の竜|細長い耳の雲うさぎ|木の枝角を持つ小鹿|紙の羽の鳥|歯車脚の小鳥|花びらのたてがみを持つ獣|葉の背びれを持つ魚|大きなヒレで浮かぶ空の魚"
}
animals=[]
for group,names in ANIMAL_GROUPS.items():
    for name in names.split("|"):
        aid=f"AN{len(animals)+1:03}"
        motion = "羽ばたく・滑空・旋回・着地・歩く・羽繕い" if group=="鳥" else "休む・ゆっくり移動・速く移動・食事や手入れ・遊ぶか反応・場所に入るか出る"
        animals.append(dict(id=aid,group=group,name=name,actions=motion, status=STATUS,
            note="種の骨格に合わせた動作に置換。色違いを別種として数えない。個体として同じ場面に出すのは1体まで。"))

for c in characters:
    asset(c["id"],c["stage"],"人物",c["name"],"デザイン1、8方向、パーツ指示1、3動作×12主要ポーズを初期枠とする。表情・補修は追加。",46)
for r in roles:
    asset(r["id"],"COMMON","役割",r["name"],r["delivery"])
for j,name in enumerate("標準|小刻み|長い歩幅|低い重心|胸を張る|背中を丸める|高齢者のゆったりした歩き|杖|自走車いす|電動車いす|歩行器|小さな子ども|弾む歩き|片手の荷物|両手の荷物|重い荷物|傘|長い衣装|乗降直後|疲れた歩き".split("|"),1):
    asset(f"MOVE{j:02}","COMMON","共通移動",name,"待機・開始・継続・加減速・方向転換・停止の6区間、8方向。人物の骨格へ調整するための動作参考。")
for a in animals:
    asset(a["id"],"COMMON","動物",a["name"],"原型・方向別原画・6動作。背景環境セットから参照。")
for j in range(1,13):
    asset(f"STYLE{j:02}","COMMON","画風基準",["構図と視点","人物縮尺","輪郭","明暗","材質","昼の光","夜の光","接地影","通常サイズの識別","拡大時の品質","動作の連続性","群衆の見え方"][j-1],"採用基準となる画像。以後の全生成で参照。")
for j,name in enumerate("フィルム券表|フィルム券裏|券入れ開|券入れ閉|獲得の光|カメラ機能の絵|現像中の装飾|現像完了の装飾|写真縁の装飾|履歴写真の台紙|使用済み券の小物|空の券入れ".split("|"),1):
    asset(f"PHOTO{j:02}","COMMON","写真機能",name,"0〜5の数字、枠、入力位置はコードと文字で描く。原画に数字を焼き込まない。")
ui=["タイトル原画"]+[f"{s['name']}の選択表紙" for s in STAGES]+["探索成功","探索時間切れ","対戦で発見","対戦で逃げ切り","マウス操作の絵","コントローラー操作の絵","接続確認の絵"]
for j,name in enumerate(ui,1):
    asset(f"UI{j:02}","COMMON","画面と案内",name,"文字は別レイヤー。ゲーム中の常設UIを増やさず、必要な時だけ表示。")

data=dict(version="2026-10-03",status="画像未生成・ゲーム未実装の制作計画",stages=stage_summary,
    roles=roles,characters=characters,animals=animals,assets=assets,
    totals=dict(stages=len(STAGES),exclusive_characters=2400,common_characters=1900,
        characters=len(characters),photographers=sum(c['photographer'] for c in characters),
        roles=len(roles),animals=len(animals),character_key_images=len(characters)*46,
        character_action_clips=len(characters)*3,animal_clips=len(animals)*6,
        asset_records=len(assets),terrain=sum(x['terrain'] for x in stage_summary),
        buildings=sum(x['buildings'] for x in stage_summary),sites=sum(x['sites'] for x in stage_summary),
        props=sum(x['props'] for x in stage_summary),vehicles=96,environment=192,events=144))

# Ledger integrity, not runtime game tests.
assert len(STAGES)==24 and len(roles)==250 and len(characters)==4300 and len(animals)==96
assert len({a['id'] for a in assets})==len(assets)
assert len({c['id'] for c in characters})==4300
for si in range(1,25):
    cc=[c for c in characters if c['stage']==f"S{si:02}"]
    assert len(cc)==100 and sum(c['photographer'] for c in cc)==5
    assert len(set(c['design'] for c in cc))==100
    assert len(STAGES[si-1]['cast'].split('|'))==19
    assert len(STAGES[si-1]['env'].split('|'))==8
    assert len(STAGES[si-1]['events'].split('|'))==6
used={r for c in characters for r in c['actions']}
assert {r['id'] for r in roles} <= used
assert all(len(c['actions'])==3 and len(set(c['actions']))==3 for c in characters)
assert len(ui)==32
(ROOT/'production-ledger.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

lines=["# 全24ステージと250役割の制作付録", "", "この付録は画像生成の発注枠。人物番号は別々に描くデザインを表し、色違いを意味しない。実画像はまだ生成していない。", "", "## ステージの規模と素材数", "", "面積は現行1マップを1とした倍率。縦横両方をこの数だけ拡大する意味ではない。生活拠点は複数職種が時間を分けて利用できる。", "", "| 番号 | ステージ | 面積 | 人数 | 地形区画 | 建物 | 生活拠点 | 小物 |", "| --- | --- | --- | --- | --- | --- | --- | --- |"]
for s in stage_summary:
    lines.append(f"| {s['id']} | {s['name']} | {s['area']}倍 | {s['population']} | {s['terrain']} | {s['buildings']} | {s['sites']} | {s['props']} |")
lines.extend(["",f"合計：地形{data['totals']['terrain']}区画、建物{data['totals']['buildings']}式、生活拠点{data['totals']['sites']}式、小物{data['totals']['props']}点。乗り物96式、環境192式、イベント144本。これらは異なる単位のため、単純合計を生成枚数にしない。", ""])
for si,s in enumerate(STAGES,1):
    sid=f"S{si:02}"
    lines.extend([f"## {sid} {s['name']}","",f"面積{s['area']}倍、{s['pop']}人。専用100人＋共通{s['pop']-100}人。専用100人のうち5人がカメラマン。", "",f"**場所**：{'、'.join(s['zones'].split('|'))}。", "", "| 専用人物の枠 | 配役 | 主な動作 |", "| --- | --- | --- |"])
    for gi,pair in enumerate(s['cast'].split('|')):
        r,job=pair.split(':',1)
        lines.append(f"| C{gi*5+1:03}〜C{gi*5+5:03} 各別人 | {job} | {role_by_num[int(r)]['name']} |")
    lines.append("| C096〜C100 各別人 | このステージのカメラマン5人 | 撮影、写真確認、券の受け渡し |")
    lines.extend(["",f"**代表小物12点**：{'、'.join(s['props'].split('|'))}。残りは場所に合う家具・道具・前景を素材台帳で指定。", "",f"**乗り物4式**：{'、'.join(s['vehicles'].split('|'))}。", "",f"**環境8式**：{'、'.join(s['env'].split('|'))}。", "", "**イベント6本**：",""])
    for evt in s['events'].split('|'): lines.append(f"- {evt}。開始・進行・終了・復帰の絵コンテと必要な固有素材を用意。")
    lines.extend(["", "各配役5人は、顔・体格・髪や帽子・服の形・道具の持ち方で別人にする。職種が同じでも共通の人体原画の配色替えにしない。詳細は人物台帳の各IDを参照。",""])
lines.extend(["## 共通住民1900人の制作枠","", "全て提案枠。各区分100人。職業や行動の絵を背景に合わせて選び、同じ場面に同じ人物を重複させない。", "", "| IDの範囲 | 住民区分 | 人数 |", "| --- | --- | --- |"])
for i,name in enumerate(COMMON_COHORTS):
    lines.append(f"| G-C{i*100+1:04}〜G-C{(i+1)*100:04} | {name} | 100 |")
lines.extend(["", "## 全250種類の役割と動作", "", "各行は独立した行動仕様。人物の人数を表さない。全行に、始める・続ける・終える・中断から戻る絵コンテと、接触位置の資料を作る。専用人物と共通住民の動作へ割り当て、全250種類を台帳上で使用する。", ""])
for group in ROLE_GROUPS:
    lines.extend([f"### {group}","", "| ID | 動作 |", "| --- | --- |"])
    for r in roles:
        if r['group']==group: lines.append(f"| {r['id']} | {r['name']} |")
    lines.append("")
lines.extend(["## 全96種類の動物デザイン", "", "原画と動きは種の構造に合わせる。背景で使う生物はこの原画を参照し、同じ原画を新規納品数として二度数えない。", "", "| ID | 区分 | デザイン |", "| --- | --- | --- |"])
for a in animals: lines.append(f"| {a['id']} | {a['group']} | {a['name']} |")
lines.extend(["", "## 人物と素材の個別台帳", "", "人物4,300人と全素材枠は、同じフォルダーの production-ledger.json に格納。読みやすい計画書HTMLでは人物の特徴・役割・素材を検索できる。台帳は全て未生成状態で、候補画像・検品済み画像の存在を示さない。",""])
(ROOT/'CATALOG.md').write_text('\n'.join(lines))
print(json.dumps(data['totals'],ensure_ascii=False,indent=2))
