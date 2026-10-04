"""Build the current production plan from the asset and cheer catalogs."""
from pathlib import Path
import json
import html

ROOT = Path(__file__).resolve().parent
WEB = ROOT.parents[1] / 'KUKU-JACKPOT/designs/20-minigames'
plan = json.loads((WEB / 'production-plan.json').read_text())
cheers = json.loads((WEB / 'cheers-100.json').read_text())
assert sum(x['calls'] for x in plan['budget']['allocations']) == 500
assert sum(x['newProductionCalls'] for x in plan['phases']) == 354
assert len(cheers['clips']) == len({x['text'] for x in cheers['clips']}) == 100

def p(text): return {'type':'p','text':text}
def h(text): return {'type':'h','text':text}
def table(headers, rows, widths, **kwargs):
    return {'type':'table','headers':headers,'rows':rows,'widths':widths,**kwargs}

data = json.loads((ROOT / 'plan-content.json').read_text())
data['pages'] = [page for page in data['pages'] if not page.get('additionId','').startswith('production-')]
for block in data['pages'][0]['blocks']:
    if block['type'] == 'table':
        for row in block['rows']:
            if row[0] == '完成版の構想': row[1] = '画面化した21種類を制作対象とする。全81式に対応し、アニメーションと掛け声100台詞を共通化。'
            if row[0] == '音と画像': row[1] = '画像生成は既存分込み最大500回。数字・キャラ・装置を動く部品に分け、曲と九九音声に合わせる。'

data['pages'][6]['blocks'][0] = p('段ごとの音楽モチーフを9種用意し、現行の21ゲームへ編曲して使う。下表は初期の世界観と候補ゲームを示す。現在の制作対象と各ゲームの動きは、追加の制作計画にまとめる。BPMは試作で調整する設計値。')
data['pages'][6]['blocks'][-1] = p('先にジャックポットと九九の森の2本で、曲、発話、動く素材、掛け声を完成させる。9つのモチーフから21本へ展開し、同じ九九を別の曲や場面でも思い出せるようにする。旧30本構想は候補資料とし、今回の500回枠には追加しない。')
data['pages'][7]['title'] = '7 初期ミニゲーム候補 前半15本'
data['pages'][8]['title'] = '8 初期ミニゲーム候補 後半15本'

budget_rows = [[x['label'],str(x['calls']),x['purpose']] for x in plan['budget']['allocations']]
data['pages'][9] = {'title':'9 画像生成500回の配分','blocks':[
    p('画像生成・編集の呼び出しは、既存分も含め最大500回とする。現存26素材を暫定26回、新規制作354回、修正予備120回に配分する。採用画像や完成したコマの数と、生成回数は別に記録する。'),
    table(['用途','回数','使い方'],budget_rows+[ ['合計','500','予備も上限の内数。余った枠を使い切る必要はない。'] ],[43,17,112],center=[1],size=8.5),
    h('量産前に過去分を照合する'),
    p('既存26は、世界観1点・初期試作3点・画面案22点からの暫定値で、失敗や不採用の全履歴を確認した数ではない。追加の過去呼び出しは予備枠から差し引き、不足なら制作枠も減らす。474回を確定した残高とは扱わない。'),
    h('1回の数え方と素材台帳'),
    p('再生成・画像編集・失敗した呼び出しも1回に数える。複数コマのシートは1回、切り抜き・位置合わせ・圧縮・ゲームでの再生は回数外。実行前に枠を予約し、目的、キャラ、状態、参照、結果、原本、採否、再試行元を残す。')
]}
data['pages'][11] = {'title':'11 段階ごとの制作計画','blocks':[
    p('現在の制作対象は21ゲーム。最初から全素材を生成せず、まず2本を完成品質の見本にする。下の回数は新規制作354回の配分であり、修正予備120回と既存26回は別に確保する。'),
    table(['段階と新規枠','成果物','次へ進む条件'],[[str(x['id'])+'段階 '+str(x['newProductionCalls'])+'回',x['deliverable'],x['gate']] for x in plan['phases']],[31,88,53]),
    h('最初に完成させるもの'),
    p('ジャックポットの回転リール、生成数字1テーマ、鳥・狼・ウサギの動き、九九の森の交代と口パク、掛け声25台詞を音楽に合わせる。最初の80回は共通素材を含む制作枠で、追加の80回を意味しない。'),
    h('100台詞を音にする順序'),
    p('まず12台詞で声と演技を試聴し、25台詞を2ゲームへ入れる。その後、残り75台詞を作って100本を完成させる。話者違いで同文を増やす場合は別テイクとして管理し、100種類の台詞数には加えない。'),
    h('修正と品質の判断'),
    p('数字の読みやすさ、顔と衣装の一貫性、ループのつなぎ目、発話と口の動き、音の重なり、実機の動作を確認する。崩れる動作は決めポーズとパーツ変形へ組み直す。生成回数を増やすだけで品質が上がるとは扱わない。'),
    p('制作日数は最初の2本の実績から見積もり直す。画像500回は画像の利用枠であり、音声合成の回数や完成WAV本数とは別に管理する。')
]}
for block in data['pages'][13]['blocks']:
    if block['type']=='p' and block['text'].startswith('7×4〜7×9'):
        block['text']='既存のジャックポットを動く数字とリールで磨き、九九の森を第2の完成見本にする。掛け声25本までを実際のBGMに合わせて確認する。画像と声の量産は、この2本で操作・同期・正しい九九の聞き取りを確認してから進める。'
for block in data['pages'][15]['blocks']:
    if block['type']=='p' and block['text'].startswith('発言の話し声'):
        block['text']='発言・正しい九九・掛け声を別ファイルにし、共通の音声時計で進める。正しい九九を先に聞かせ、残った枠に短い「ナイス」などを入れる。収まらなければ省略し、長い台詞は節目の専用小節へ置く。最初は2人の声から作る。マイク認識は不要。'

data['pages'] += [
 {'additionId':'production-slot','title':'追加制作 スロットと数字を動かす','blocks':[
    p('数字は生成した0〜9の絵を組み合わせて表示する。スロットは筐体、数字タイル、リール帯、窓のマスク、反射、レバーに分け、数字が窓の中を流れて減速する構造にする。'),
    table(['動き','見え方と処理'],plan['slot']['sequence'],[29,143]),
    h('かわいい数字を正確に使う'),
    p('クリームのぷっくりチップ、ゼリー数字、森の木製数字の3テーマを各0〜9で制作する。6記号を2テーマ、短い判定文字6種と合わせて48回。桁ごとの高さ・基線・余白をそろえ、0と6、6と9、1と7が小さくても読めるか確認する。'),
    p('問題、答え、選択値は数値データとして保持し、その値から画像を選ぶ。画面読み上げ用の正確な文字列も残す。星やドーナツの数量は部品を必要な数だけ置いて検証する。'),
    h('停止の気持ちよさと九九の正解'),
    p('選択肢を読む時間を確保し、初級では答えの選択と停止の拍を分ける。入力で確定した値の位置へリールを減速させ、小さく弾んで止める。誤答を当たり演出で正解に差し替えない。'),
    p('回転位置も音声の時刻から求め、一時停止や復帰でずれないようにする。動きを控えめにする設定では揺れと回転量を小さくする。')
 ]},
 {'additionId':'production-animation','title':'追加制作 キャラクターのアニメーション','blocks':[
    p('主要15体を、基準画30回、基本7状態105回、特別リアクション30回の枠で制作する。まず鳥・狼・ウサギで方法を確かめてから、他のキャラへ広げる。'),
    p('主要キャラ：'+'、'.join(plan['cast'])+'。魚、靴下、寿司などは各ゲームの動く小道具として制作する。'),
    table(['状態','動きの作り方'],[[x['name'],x['description']] for x in plan['states']],[37,135]),
    h('決めポーズとパーツを組み合わせる'),
    p(plan['animation']['method']+' '+plan['animation']['frames']),
    h('透過素材の基準'),
    p('足元中央を基準点にし、耳・手・しっぽを含む共通余白を取る。口は閉じる・小さく開く・大きく開くの3形、目も3状態を用意する。発話区間にだけ口を動かし、終われば閉じる。'),
    p('1コマ256〜512pxを初期目安にする。原画と実行用素材を分け、必要な舞台だけを先読みする。顔・服・手足の数、透明な縁、待機ループの接続を確認してから組み込む。')
 ]},
 {'additionId':'production-motion','title':'追加制作 21ゲームの動きの割り当て','blocks':[
    p('すべてスマホ横向きの1画面で完結する。背景、キャラ、操作対象、数字、成功演出を分け、問題を読む間は動きを抑え、決める拍に主役を動かす。'),
    table(['ゲーム','動くものと決め瞬間'],[[f"{x['id']:02d} {x['name']}",x['action']] for x in plan['motion']],[42,130],size=8.5),
    p('装置と小道具63回は21本×3回の初期枠。ゲームごとに同じ素材を作り直さず、共通数字、口・目、成功演出を再利用する。')
 ]},
 {'additionId':'production-voice','title':'追加制作 掛け声100種の再生設計','blocks':[
    p('掛け声は異なる台詞を100種類用意する。九九の問題・答えの音声とは別に、正解、ナイス、やったー、惜しい、次いくよーなどで場面を盛り上げる。後続5ページが全100台詞の制作台本。'),
    table(['分類','台詞数'],[[x['name'],str(x['count'])] for x in cheers['categories']],[137,35],center=[1]),
    h('正しい九九を聞き取れる順番にする'),
    p('問題と正答の読み上げ、必要なカウントを最優先にする。結果では正しい九九を先に聞かせ、実測尺に100msの余裕を加えて収まる掛け声を選ぶ。長い台詞は前奏、終奏、事前に設けた1小節で使う。'),
    h('状況に合う声を選ぶ'),
    p('正誤、連続数、キャラクター、残り時間で候補を絞り、その中から選ぶ。正解とリズムの成功を混同しない。同じ台詞は直近10回から除外し、候補不足なら無音の回を作る。1問は最大1本、8問では開始・終了を含め6〜10本を試遊の目安にする。'),
    h('声と表情を一緒に扱う'),
    p('採用台詞のID、話者、条件、実測尺、口の動く区間、テイクを記録する。BGM・九九音声・掛け声・効果音を別音量にし、一時停止や再挑戦では古い声の予約を捨てる。100台詞はまず各1話者で計100本を目標にする。')
 ]}
]
for start in range(0,100,20):
    clips=cheers['clips'][start:start+20]
    data['pages'].append({'additionId':f'production-cheers-{start+1}', 'title':f'掛け声台本 {start+1}から{start+20}', 'blocks':[
        p('台詞と使用条件の計画。音声ファイルは未生成。分類：'+clips[0]['categoryName']+'／'+clips[-1]['categoryName']+'。'),
        table(['ID','台詞','使うとき'],[[x['id'],x['text'],x['guard']] for x in clips],[17,80,75],size=9),
        p('キャラ割り当て・演技・実測尺は cheers-100.json で管理する。台詞を鳴らす前に条件と空き時間を確認する。')
    ]})
(ROOT/'plan-content.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

# Update the forest concept and links while preserving its original design prompts.
forest_path=WEB/'forest-plan.json'
forest=json.loads(forest_path.read_text())
forest['plan']['productionPlan']='production-plan.json'
forest['plan']['cheersCatalog']='cheers-100.json'
forest['plan']['cheersRule']=plan['voice']['forestTiming']
forest['plan']['animationStrategy']=plan['animation']['method']
forest_path.write_text(json.dumps(forest,ensure_ascii=False,indent=2)+'\n')
prompts_path=WEB/'prompts.json';prompts=json.loads(prompts_path.read_text())
prompts['productionPlan']='production-plan.json'
prompts['games']=[forest if x['id']==21 else x for x in prompts['games']]
prompts_path.write_text(json.dumps(prompts,ensure_ascii=False,indent=2)+'\n')

forest_html=WEB/'forest-plan.html';s=forest_html.read_text()
link='<p class="status"><a href="production-plan.html">制作計画を更新：画像生成500回・動く数字とキャラ・掛け声100台詞 →</a></p>'
if link not in s:s=s.replace('</header>',link+'</header>')
voice_note='<p>掛け声100台詞の共通カタログから、「ナイス」「やったー」「次、いくよー」などを状況に合わせて選びます。正しい九九の声が終わり、空き枠に収まるときだけ再生します。口・目・手の透過パーツと決めポーズを組み合わせて、発言とリアクションを動かします。</p>'
if voice_note not in s:s=s.replace('<h2>最初の試作に用意するもの</h2>',voice_note+'<h2>最初の試作に用意するもの</h2>')
forest_html.write_text(s)
index=WEB/'index.html';s=index.read_text()
link='<a class="new-link" href="production-plan.html">制作計画｜画像生成500回・アニメーション・掛け声100台詞 →</a>'
if link not in s:s=s.replace('</header>',link+'</header>')
index.write_text(s)

def esc(value):return html.escape(str(value))
def rows(items):return ''.join('<tr>'+''.join('<td>'+esc(v)+'</td>' for v in row)+'</tr>' for row in items)
def paras(items):return ''.join('<p>'+esc(t)+'</p>' for t in items)
def numbered(items):return '<ol>'+''.join('<li>'+esc(t)+'</li>' for t in items)+'</ol>'

template='''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>画像生成500回と掛け声100種の制作計画</title><style>
*{box-sizing:border-box}body{margin:0;background:#fff8e8;color:#19334a;font-family:"Hiragino Kaku Gothic ProN",Meiryo,sans-serif;line-height:1.85}header,main,footer{max-width:1160px;margin:auto;padding:30px 32px}a{color:#087e75;text-underline-offset:4px}nav{display:flex;flex-wrap:wrap;gap:10px 24px;font-size:12px}.eyebrow{color:#11877a;font-size:11px;font-weight:800;letter-spacing:.1em;margin:30px 0 10px}h1{font-size:clamp(27px,4vw,43px);line-height:1.4;letter-spacing:-.03em;margin:0 0 20px}h2{font-size:24px;margin:0 0 18px;line-height:1.5}h3{font-size:17px;margin:26px 0 10px}p{margin:0 0 15px}.lead{font-size:16px;max-width:870px}.status{font-size:12px;color:#61756d}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;border-top:1px solid #d3d9cd;border-bottom:1px solid #d3d9cd;padding:20px 0;margin:26px 0 20px}.stats strong{display:block;font-size:35px;line-height:1.3;color:#db643e}.stats span{font-size:12px}.jump{position:sticky;top:0;background:#fff8e8f5;z-index:2;border-bottom:1px solid #d3d9cd;padding:12px 0}.jump a{font-weight:700}section{margin-bottom:54px;scroll-margin-top:80px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px}th,td{border:1px solid #d3d9cd;padding:11px 13px;text-align:left;vertical-align:top}th{background:#19334a;color:#fff8e8}tbody tr:nth-child(even){background:#f1f3e9}.budget td:nth-child(2){font-weight:900;color:#c65d31;text-align:center;white-space:nowrap}.budget td:first-child{width:24%}.callbar{height:25px;display:flex;border-radius:8px;overflow:hidden;margin:16px 0 8px}.callbar span:nth-child(1){width:5.2%;background:#8b9f9a}.callbar span:nth-child(2){width:70.8%;background:#138b80}.callbar span:nth-child(3){width:24%;background:#efb540}.legend{font-size:12px;color:#61756d}.two{display:grid;grid-template-columns:1fr 1fr;gap:30px}.two h3{margin-top:0}.steps li{margin-bottom:12px}.cast{font-size:13px;background:#eaf0e3;padding:16px 20px;border-radius:12px}ol{padding-left:23px}li{margin:7px 0}.catalog-tools{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:20px 0}.catalog-tools label{font-size:12px;display:flex;align-items:center;gap:8px}input,select{font:inherit;font-size:13px;border:1px solid #adc1b3;border-radius:7px;background:#fffdf6;padding:10px;min-height:44px;color:#19334a}input{width:240px}#visible-count{margin-left:auto;font-size:12px;font-weight:800}.clips{display:grid;grid-template-columns:1fr 1fr;gap:12px}.clip{border:1px solid #cbd6c6;border-radius:11px;background:#fffdf7;padding:17px 19px}.clip[hidden]{display:none}.clip-top{font-size:10px;color:#61756d;display:flex;justify-content:space-between;gap:10px}.clip h3{font-size:20px;margin:10px 0}.clip p{font-size:12px;margin:0;color:#61756d;line-height:1.75}.links{display:flex;gap:20px;flex-wrap:wrap;font-size:12px}footer{border-top:1px solid #d3d9cd;font-size:12px;color:#61756d}a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #eeb142;outline-offset:3px}@media(max-width:720px){header,main,footer{padding:24px 18px}.two,.clips{grid-template-columns:1fr}.stats{gap:12px}.stats strong{font-size:30px}.jump{position:static}h2{font-size:21px}th,td{font-size:11px;padding:9px}.catalog-tools{display:block}.catalog-tools label{margin-bottom:10px}input,select{max-width:100%}#visible-count{display:block}.budget td:first-child{width:29%}}@media(max-width:420px){.stats span{font-size:10px}.stats strong{font-size:27px}.lead{font-size:14px}}
</style></head><body><header><nav><a href="index.html">← 21ゲームの画面一覧</a><a href="forest-plan.html">九九の森の企画</a></nav><div class="eyebrow">PRODUCTION PLAN / 2026.10.04 更新</div><h1>動く素材と掛け声の制作計画</h1><p class="lead">スロットの数字が流れて止まり、キャラクターが話して跳ねる。画像生成でかわいい部品を作り、ゲームの動きと音楽へ組み込みます。掛け声は、場面に合う<strong>異なる100台詞</strong>を用意しました。</p><p class="status">今回は制作計画と台詞集の更新です。新規画像生成0回。アニメ素材と掛け声音声の量産・ゲームへの組み込みはこれからです。</p><div class="stats"><div><strong>500回</strong><span>画像生成・編集の上限</span></div><div><strong>21本</strong><span>動く画面へ仕上げるゲーム</span></div><div><strong>100種</strong><span>使用条件付きの掛け声台詞</span></div></div><nav class="jump"><a href="#budget">500回の配分</a><a href="#slot">スロット・数字</a><a href="#animation">キャラの動き</a><a href="#voice">音声のルール</a><a href="#catalog">100台詞を見る</a></nav></header><main>
<section id="budget"><h2>既存26・新規354・予備120</h2><p>500回は、既存分も含むプロジェクト全体の上限として計画します。現存する26素材を暫定26回として計上し、354回を制作、120回を修正へ配分します。</p><div class="callbar" aria-label="既存26回、新規制作354回、修正予備120回"><span></span><span></span><span></span></div><p class="legend">灰：既存26　緑：新規354　黄：予備120　／　合計500</p><div class="table-wrap"><table class="budget"><thead><tr><th>用途</th><th>回数</th><th>制作するもの</th></tr></thead><tbody>__BUDGET__</tbody></table></div><p class="status">既存26は完成素材からの暫定値で、過去の失敗・不採用を含む呼び出し数は未照合です。量産前に履歴を確認し、差分を予備枠から差し引きます。474回を確定残高とは扱いません。</p><h3>回数と完成素材数を分ける</h3><p>画像生成・編集・再生成は1呼び出しで1回。複数コマのシートも1回です。切り抜きや位置合わせ、圧縮、ゲームでのアニメ再生は生成回数に含めません。実行前に枠を予約し、成否と原本を台帳に残します。</p></section>
<section id="slot"><h2>スロットを、本当に回して止める</h2><p>筐体、数字タイル、リール帯、窓枠、反射、レバーを別の部品にします。生成した数字の帯を窓の中で連続移動させ、入力した選択値の位置へ減速して止めます。</p><div class="table-wrap"><table><thead><tr><th>段階</th><th>動き</th></tr></thead><tbody>__SLOT__</tbody></table></div><div class="two"><div><h3>数字も画像でかわいく</h3><p>0〜9を、ぷっくりチップ・ゼリー・木製の3テーマで生成します。桁をつなげて1〜81の答えや式に使い、記号や判定文字も合わせます。48回の枠で共通素材を作ります。</p></div><div><h3>止まった値と選んだ値を一致させる</h3><p>問題・答え・選択は数値データで管理し、対応する画像を表示します。誤答を当たり演出で正解に差し替えません。選択肢を読む時間と、止める拍を分けます。</p></div></div><p class="status">数字の輪郭は崩さず、0と6・6と9・1と7を見分けられるか実サイズで確認。正確な読み上げ用テキストも保持します。</p></section>
<section id="animation"><h2>15キャラを、7つの基本状態で動かす</h2><p>基準画30回、基本動作105回、特別リアクション30回をキャラクター制作に割り当てます。まず鳥・狼・ウサギの3体で方法を確かめます。</p><p class="cast">__CAST__</p><div class="table-wrap"><table><thead><tr><th>状態</th><th>動かし方</th></tr></thead><tbody>__STATES__</tbody></table></div><h3>生成するのは、動かせるポーズとパーツ</h3><p>1状態4〜6キーポーズのシートや、口・目・手などの透過パーツを用意します。位置・回転・拡大縮小をゲーム側でつなぎ、口は閉じ口・小口・大口を発話に合わせて切り替えます。</p><p>コマ間で形が崩れた動作は、少ない決めポーズとパーツ変形へ組み直します。足元、余白、顔、衣装をそろえ、ループのつなぎ目と透明な縁を確認。必要な舞台だけを先読みします。</p><details><summary>21ゲームそれぞれの動きを見る</summary><div class="table-wrap"><table><thead><tr><th>ゲーム</th><th>動き</th></tr></thead><tbody>__MOTION__</tbody></table></div></details></section>
<section id="voice"><h2>掛け声は、九九が聞き取れる場所へ</h2><p>問題・正しい九九・掛け声を別ファイルにして、同じ音声時計で再生します。結果では正しい九九を先に聞かせ、その後に「ナイス！」「やったー！」などを入れます。</p>__VOICE_RULES__<h3>最初は25台詞から、最後に100本へ</h3>__VOICE_PRODUCTION__<p class="status">100種類は異なる台詞の数です。九九の出題・正答音声は別枠。各台詞をまず適任の1キャラで収録し、キャラ違いの同文を100種類に数えません。</p></section>
<section id="phases"><h2>2本の完成見本から、21本へ</h2><div class="table-wrap"><table><thead><tr><th>制作段階</th><th>新規枠</th><th>成果物</th></tr></thead><tbody>__PHASES__</tbody></table></div><p class="status">80＋140＋134＝354回。いずれも新規制作枠の内数です。修正予備は品質の確認後に必要な分だけ使います。</p></section>
<section id="catalog"><h2>掛け声100パターン</h2><p>「正解」「ナイス」「すごい」「やったー」「あー、おしい」「次、いくよー」「がんばれー」を含む100台詞です。分類や言葉で絞り込めます。</p><p class="status">台詞と使用条件の一覧です。音声ファイルはまだ生成していません。</p><div class="catalog-tools"><label>分類<select id="category"><option value="all">すべて</option>__OPTIONS__</select></label><label>検索<input id="search" type="search" placeholder="例：次、オオカミ、正解" autocomplete="off"></label><span id="visible-count" aria-live="polite">100 / 100 台詞</span></div><div class="clips" id="clips">__CLIPS__</div></section>
<div class="links"><a href="production-plan.json">制作仕様JSON</a><a href="cheers-100.json">100台詞と再生条件JSON</a><a href="index.html">21ゲームの画面一覧</a></div></main><footer>制作計画の更新。既存の画像生成による画面案と、今後生成するアニメーション素材を区別して管理します。</footer><script>
const category=document.getElementById('category'),search=document.getElementById('search');function filter(){const q=search.value.trim().toLowerCase();let n=0;document.querySelectorAll('.clip').forEach(card=>{card.hidden=(category.value!=='all'&&card.dataset.category!==category.value)||(q&&!card.textContent.toLowerCase().includes(q));if(!card.hidden)n++;});document.getElementById('visible-count').textContent=n+' / 100 台詞';}category.addEventListener('change',filter);search.addEventListener('input',filter);
</script></body></html>'''
voice_names={'beat-bird':'ビートくん','wolf':'オオカミ','rabbit':'ウサギ','bear':'クマ','robot':'ロボット','fox':'キツネ','frog':'カエル','gorilla':'ゴリラ','octopus':'タコ'}
clips=''.join(f'<article class="clip" data-category="{esc(x["category"])}"><div class="clip-top"><span>{x["id"]} · {esc(x["categoryName"])}</span><span>{esc(voice_names[x["voice"]])}</span></div><h3>{esc(x["text"])}</h3><p>{esc(x["guard"])}</p></article>' for x in cheers['clips'])
replacements={
'__BUDGET__':rows([[x['label'],str(x['calls']),x['purpose']] for x in plan['budget']['allocations']]),
'__SLOT__':rows(plan['slot']['sequence']), '__CAST__':esc(' ／ '.join(plan['cast'])),
'__STATES__':rows([[x['name'],x['description']] for x in plan['states']]),
'__MOTION__':rows([[f"{x['id']:02d} {x['name']}",x['action']] for x in plan['motion']]),
'__VOICE_RULES__':numbered(plan['voice']['playbackRules']),
'__VOICE_PRODUCTION__':numbered(plan['voice']['production']),
'__PHASES__':rows([[x['name'],str(x['newProductionCalls'])+'回',x['deliverable']] for x in plan['phases']]),
'__OPTIONS__':''.join('<option value="'+x['key']+'">'+esc(x['name'])+'（10）</option>' for x in cheers['categories']), '__CLIPS__':clips}
for key,value in replacements.items(): template=template.replace(key,value)
(WEB/'production-plan.html').write_text(template+'\n')
print(json.dumps({'documentPages':len(data['pages']),'imageCallCap':500,'cheerTexts':len(cheers['clips'])},ensure_ascii=False))
