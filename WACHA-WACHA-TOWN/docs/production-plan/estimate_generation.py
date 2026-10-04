"""Estimate new base sheets using verified browser formats and existing originals."""
from pathlib import Path
import json
import math

ROOT=Path(__file__).resolve().parent
inventory=json.loads((ROOT/'existing-assets.json').read_text())
ledger=json.loads((ROOT/'production-ledger.json').read_text())
existing=inventory['summary']
stage_people=ledger['totals']['exclusive_characters']
common_capacity=ledger['totals']['common_characters']
new_common=max(0,common_capacity-existing['people'])
scenarios=[]
for per in [10,8,5]:
    stage_calls=sum(math.ceil(s['exclusive']/per) for s in ledger['stages'])
    common_calls=math.ceil(new_common/per)
    scenarios.append(dict(people_per_sheet=per,stage_base_calls=stage_calls,
        additional_common_base_calls=common_calls,expanded_base_calls=stage_calls+common_calls,
        stage_base_calls_with_30_to_60_percent_reserve=[math.ceil(stage_calls*1.3),math.ceil(stage_calls*1.6)],
        expanded_base_calls_with_30_to_60_percent_reserve=[math.ceil((stage_calls+common_calls)*1.3),math.ceil((stage_calls+common_calls)*1.6)]))
assert existing['base_characters']==250 and existing['people']==232 and existing['animals']==18
assert stage_people==2400 and new_common==1668
assert [s['stage_base_calls'] for s in scenarios]==[240,312,480]
assert [s['expanded_base_calls'] for s in scenarios]==[407,521,814]
data=dict(date='2026-10-04',basis='現行ブラウザのコマ分けと原画を活用。新規ベースを追加生成する。',
    verified_existing=existing,stage_new_people=stage_people,common_capacity_proposal=common_capacity,
    existing_people_credited_to_common=existing['people'],additional_common_people_if_expanded=new_common,
    new_people_if_expanded=stage_people+new_common,scenarios=scenarios,total_game_calls=None,
    total_game_formula='新規基本シート＋役割別の追加差分＋背景・部材・乗り物・環境等の不足分＋AIによる修正・再生成',
    exclusions=['役割別の追加ポーズ','不足する背景・建物・前景・小物','追加の動物・鳥・風船・乗り物','AIによる修正と不採用の生成'],
    notes=['250既存ベースを0から作り直さない','旧8方向・1人46点・全員3動作12コマの前提を撤回',
        '170種類17採用シートという実績は総呼出回数を証明しない','通常10体、詳細が必要なシートは5〜8体など個別に調整',
        '人物4300人は以前の拡張提案。人物232人と動物18種を二重計上しない','全体総回数は配置に必要な不足差分の確定後に算定'])
(ROOT/'generation-estimate.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
lines=['# ブラウザ版の形式で追加生成する回数','',
'2026年10月4日改訂。既存250ベースを再利用し、これまでのブラウザ版と同じコマ構成で新しいベースを増やす。追加画像は多数生成する。新規生成を止める解釈を訂正し、8方向や1人46点を全員へ課す以前の試算を置き換える。','',
'**ステージ専用の新規2,400人は、現行と同じ10体／シートなら基本240枚分。人物4,300人まで増やす拡張案を維持する場合も、既存232人を再利用するため、新規4,068人の基本シートは407枚分となる。**','',
'これは人物の基本シートだけの数字。役割ごとの追加差分、背景・部材・環境・乗り物、修正や不採用を含むゲーム全体の総回数は、まだ確定していない。','',
'## 1 現物で確認した生成形式','',
'直近の170種類は、17枚の透過シートに収録されている。基本は10行×8列で、1行1体、前半4コマが歩行、後半4コマが専用動作。原本は1,122×1,402px。フェンシング1体は専用動作3コマという例外もある。','',
'ゲーム内の15再生枠は、歩行5枠・ジェスチャー5枠・専用動作5枠へコマを割り当てたもの。全15枠を別々に生成する数え方はしない。初期16種類と旧64種類は現在の異なるコマ構成を維持する。','',
'この実績は採用されたシート数で、失敗と修正を含む過去の総生成回数ではない。1回で1枚のシートが採用できた場合の初回計算として使う。','',
'## 2 新しい基本シートの試算','',
'| 1シートの人数 | 新規2,400人の専用分 | 共通枠の不足1,668人を追加 | 拡張案の新規4,068人分 |','| --- | --- | --- | --- |']
for s in scenarios:
    lines.append(f"| {s['people_per_sheet']}体 | {s['stage_base_calls']:,}枚分 | {s['additional_common_base_calls']:,}枚分 | **{s['expanded_base_calls']:,}枚分** |")
lines.extend(['','10体は現行の標準構成。8体・5体は、大きい道具や細かい仕事で1枚あたりの人数を減らす場合の比較値。全シートを一律に10体または5体へ固定するものではない。8体案ではステージごとに100÷8を切り上げるため、24ステージで312枚となる。','',
'人物4,300人はユーザー指定の人数ではなく、以前の計画で提案した専用2,400人＋共通1,900人の枠。既存250ベースのうち18種類は動物なので、人物枠に充てるのは232人。新規共通人物は1,900−232＝1,668人となる。動物18種類も捨てずに動物枠で再利用する。','',
'ステージ専用2,400人を10体ずつ作る計算は24×10＝240枚。共通不足分は1,668÷10を切り上げて167枚。合計407枚。既存の人物が共通枠の候補名や設定と違う場合、既存の顔を描き直すのでなく、配役側を調整する。','',
'## 3 役割ごとの追加分を別に数える','',
'基本シートに入るのは歩行と主要動作。店の受け渡し、窓から身を乗り出す、釣り、乗降、カメラマンの券など、必要な絵が足りない場合だけ追加する。コマ数・人数・列の構成は対象ごとに決める。','',
'| 対象 | 追加生成の数え方 |','| --- | --- |',
'| 既存の歩行や身振りで成立 | 追加0回。再生順、速度、停止、配置を調整 |',
'| 人物10体に4コマずつ新しい動作が必要 | 10行×4列の追加シートが成立すれば1枚分。難しければ分割 |',
'| 手元が細かい5体に4コマずつ必要 | 5体の追加シートを1枚分として見積もる |',
'| 1体だけ道具や手が不正確 | その人物や部分の修正を1回ずつ加算。他の完成人物を再生成しない |',
'| 2階、椅子、乗り物との接触 | 足りない姿・前後部材を列挙してから数える |','',
'例はまとめ方を示す算数で、実際の追加対象が確定した数ではない。「250役割×全人物×一定コマ」を機械的に生成する計画にはしない。','',
'## 4 背景と環境の扱い','',
'既存7背景と既存小物を活用する。追加17ステージの原画、後半の広いフィールド、窓や手すりの前後関係など不足する部分は生成する。切り出し、同じ部材の配置替え、既存キャラの動作と背景を合わせる作業は、その都度新しい画像生成1回には数えない。','',
'以前の地形754区画・建物302式・生活拠点754式などは配置と検証の枠。必要な新規原画数は再利用範囲で変わるため、全枠を別画像として生成する5,967回の旧見積もりは撤回する。鳥・風船・雲なども追加画像を作り、動かす位置や速度・揺れはゲーム側の制御と組み合わせる。','',
'**全体の回数＝新規基本シート＋役割別差分＋背景・部材・環境などの不足原画＋AIによる修正・再生成。** 新規基本シート以外は、対象を対応付けてから数える。現時点で全体を240回や407回と断定しない。','',
'## 5 修正分と見積もりの更新','',
'参考として基本シートだけに30〜60％の再生成分を置くと、専用2,400人は312〜384回、4,300人の拡張案は530〜652回になる。これはまだ未測定の予備率であり、役割差分と背景などを含む総額・総回数ではない。','',
'既存の絵柄、切り出し方、コマ数を引き継ぎ、通常のシートと複雑なシートを分けて、採用率・修正回数・見分けやすさを測定する。新規のキャラクターを数で増やしながら、必要な場面の絵だけを補う。','',
'## 6 今回の修正範囲','',
'追加生成0回という方針は採用しない。24ステージ、各100人、250役割、色違い廃止、撮影回数をカメラマンから得る仕組み、2人対戦は維持する。今回は計画と試算を修正しており、新しい画像の生成やゲーム本体の変更は実行していない。',''])
(ROOT/'GENERATION_ESTIMATE.md').write_text('\n'.join(lines))
print(json.dumps(dict(existing=existing,stage_people=stage_people,new_common=new_common,scenarios=scenarios,total_game_calls=None),ensure_ascii=False,indent=2))
