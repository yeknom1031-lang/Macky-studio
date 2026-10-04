"""Inventory existing browser assets for reuse. Does not modify or generate images."""
from pathlib import Path
from collections import Counter
import ast
import json
import re
import struct

ROOT = Path(__file__).resolve().parent
GAME = ROOT.parent.parent
ASSETS = GAME/'assets'
meta=json.loads((ASSETS/'sprite-meta.json').read_text())
atlas=json.loads((ASSETS/'runtime/atlas-meta.json').read_text())
source_code=(GAME/'src/core.js').read_text()
initial_names=ast.literal_eval(re.search(r'const CHARACTERS=(\[[^;]+\]);',source_code).group(1))
profiles=json.loads((ASSETS/'diversity/catalog.json').read_text())+json.loads((ASSETS/'expansion/catalog.json').read_text())
characters=[]
for i,c in enumerate(meta['characters']):
    profile=profiles[i-16] if i>=16 else {}
    source=ASSETS/(c['source']+'.png')
    assert source.is_file()
    width,height=struct.unpack('>II',source.read_bytes()[16:24])
    unique=len({(f['x'],f['y'],f['w'],f['h']) for f in c['frames']})
    characters.append(dict(id=f'EX{i+1:03}',legacy_base_index=i,name=profile.get('name',initial_names[i] if i<16 else ''),
        animal=bool(profile.get('animal',False)),action=profile.get('action','既存の歩行'),
        source=str(source.relative_to(GAME)),source_width=width,source_height=height,row=c['row'],
        source_frames=c['source_frames'],active_unique_frames=unique,playback_slots=len(c['frames']),
        source_clip_counts=c.get('source_clip_counts'),clips=c.get('clips',{'walk':[0,15]}),
        status='生成済み・再利用対象',reuse='原本と既存コマを維持。必要な役割差分のみ別シートで追加。色違いは新ベースに数えない。'))
backgrounds=[]
for number,slug in enumerate(['festival','garden','seaside','sweets','autumn','snow','lantern'],1):
    file=ASSETS/f'{number:02}-{slug}.png'
    assert file.is_file()
    backgrounds.append(dict(id=f'EX-BG{number:02}',source=str(file.relative_to(GAME)),status='生成済み・原本を再利用'))
sources=Counter(c['source'] for c in characters)
summary=dict(base_characters=len(characters),people=sum(not c['animal'] for c in characters),animals=sum(c['animal'] for c in characters),
    source_sheets=len(sources),expansion_characters=170,expansion_sheets=17,typical_walk_frames=4,typical_action_frames=4,
    typical_rows=10,playback_slots=15,atlas_unique_frames=atlas['uniqueFrames'],backgrounds=len(backgrounds))
assert summary['base_characters']==250 and summary['people']==232 and summary['animals']==18
assert summary['source_sheets']==29 and sum(c['active_unique_frames'] for c in characters)==atlas['uniqueFrames']
data=dict(date='2026-10-04',policy='ブラウザ版の既存画像・コマ分けを再利用し、同形式で新ベースを多数生成する。追加生成を止めない。',
    summary=summary,characters=characters,backgrounds=backgrounds,source_sheets=dict(sources))
(ROOT/'existing-assets.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
lines=['# ブラウザ版の素材を活かして新しいベースを増やす','',
'2026年10月4日更新。既存画像を再利用し、ブラウザ版のコマ分け・コマ数を基本に新しいベースキャラクターを多数生成する。追加生成を行わないという解釈を訂正する。全員に8方向や大量の新規コマを義務付ける旧案は採用しない。','',
'## 確認した現行の形式','',
'| 項目 | 現物とメタデータで確認した内容 |','| --- | --- |',
'| 既存ベース | 250種類。人物232種類と動物18種類 |',
'| キャラクター原本 | 29ファイル。原本を保存し、既存の切り出し情報を引き継ぐ |',
'| 直近の追加170種類 | 17枚の透過シート。基本は10行×8列で、1行に1体 |',
'| 1体の基本コマ | 歩行4コマ＋専用動作4コマ。フェンシング1体は専用動作3コマ |',
'| 再生時の枠 | 15枠。歩行5枠、ジェスチャー5枠、専用動作5枠。ジェスチャーと動作は原画を共有する場合がある |',
'| 初期16種類・旧64種類 | 既存の異なるコマ構成をそのまま維持。一律8コマへ減らさない |',
'| 実行時画像 | 2,543枚の異なる切り出しフレーム。15枠すべてが異なる新規原画という意味ではない |',
'| 既存背景 | 7枚の原本を活用。前景分離や拡張で足りない部分は追加生成する |','',
'17枚は現在採用されているシート数。過去の失敗・修正を含む総生成回数を17回と断定する数字ではない。現在の追加シートの原本は1,122×1,402pxで、1体8コマ・1シート10体の構成を確認した。','',
'## 新規制作の規則','',
'1. 新しいベースも基本は1行1体、歩行4コマ＋主要動作4コマ。10体を1シートにまとめる。顔や体形や衣装の形で別人にし、色違いで人数を増やさない。',
'2. 同じ絵柄と縮尺、透過背景、列の動作順を引き継ぐ。コマ境界は生成後に実測し、人物ID・行・切り出し矩形・動作を記録する。',
'3. 会話、店での受け渡し、乗降、カメラマンの券の受け渡しなど、既存の専用動作だけで不足する箇所に差分を追加する。全員へ同じ数の差分を発注しない。',
'4. 大きな道具や複雑な動作は1枚の人数を減らす、補助列を作る、別シートにする。既存の顔と服を参照し、必要部分を直す。',
'5. 移動速度、停止、方向転換、会話のタイミング、密度の調整、背景との接触位置はゲーム側でも調整する。すべてを新しい絵で解決しない。',
'6. 旧画像の一括再生成は行わない。原本を上書きせず、追加画像と更新した切り出し情報を別管理する。','',
'## 既存人物と制作台帳の対応','',
'EXで始まるIDが生成済みベースの固定ID。計画書のSで始まるステージ専用枠は追加制作する候補、Gで始まる共通住民の1,900枠は以前に提案した拡張枠である。共通枠へはまず既存人物232人を割り当て、名前や顔を新しい候補へ置き換えて作り直すことを避ける。動物18種類は動物枠で活用し、人物数へ二重計上しない。具体的な配置と役割の対応は制作時に決める。','',
'ステージ専用100人×24＝2,400人を新規制作する基本シートは、10人／枚なら240枚分。共通枠の規模を含む試算は生成回数の章を参照。追加差分・背景・環境と、失敗や修正の分は別に積み上げる。','',
'## 生成済み250種類の一覧','',
'以下は制作前の人物案ではなく、ファイルの存在を確認した既存ベース。元デザインを再利用する対象であり、全ての新しい役割に必要な絵が既に揃っているという意味ではない。','',
'| 固定ID | 名前 | 区分 | 原本 | 行 | 使用中の異なるコマ |','| --- | --- | --- | --- | --- | --- |']
for c in characters:
    lines.append(f"| {c['id']} | {c['name']} | {'動物' if c['animal'] else '人物'} | {c['source']} | {c['row']+1} | {c['active_unique_frames']} |")
lines.extend(['','原本の行は読みやすい1始まりで表示。JSON内のrowとゲーム内のbase indexは既存実装に合わせて0始まり。',''])
(ROOT/'EXISTING_FORMAT.md').write_text('\n'.join(lines))
print(json.dumps(summary,ensure_ascii=False,indent=2))
