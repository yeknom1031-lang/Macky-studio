# -*- coding: utf-8 -*-
"""Regenerate the offline attribution page and the stage soundtrack ledger."""
from pathlib import Path
import html,json,re
ROOT=Path(__file__).resolve().parent
PROJECT=ROOT.parent.parent
sources=json.loads((ROOT/'sources.json').read_text())
tracks=json.loads((ROOT/'tracks.json').read_text())
by_source={s['id']:[t for t in tracks if t['source']==s['id']] for s in sources}
data=json.loads((PROJECT/'expedition/data.js').read_text().split('=',1)[1].rstrip(';\n'))
js=(PROJECT/'src/expedition-audio.js').read_text()
profiles=re.findall(r"\['([^']+)',\s*\[([^\]]*)\],\s*(null|'[^']+'),\s*([\d.]+)\]",js)
assert len(profiles)==24
mapping=[]
for i,(music,beds,cue,crowd) in enumerate(profiles):
 mapping.append(dict(stage=i+1,name=data['stages'][i]['name'],music='music-'+music,crowd='crowd',crowdGain=float(crowd),environment=re.findall(r"'([^']+)'",beds),occasionalCue=None if cue=='null' else cue.strip("'")))
(ROOT/'stage-mapping.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2))
notes='元音源を Ogg Vorbis 44.1 kHz に変換し、音量を調整しています。環境音はモノラル化・一部抜粋、音楽と環境音には短いフェードを加えています。会話音は 4.2 kHz でローパス処理。具体的な加工と利用ファイルは各項目に記載しています。作者が本ゲームを推薦・承認したことを意味しません。'
md=['# 音楽・環境音・効果音のクレジット','',notes,'','素材のライセンスは該当する音源に適用されます。CC BY の素材には作者名・作品名・配布元・ライセンスと加工内容を併記しています。','']
sections=[]
esc=html.escape
for s in sources:
 ts=by_source[s['id']]
 if not ts:continue
 md += [f"## {s['title']}",'',f"作者: {s['author']}",f"配布元: {s['sourcePage']}",f"ライセンス: [{s['license']}]({s['licenseUrl']})",'']
 rows=[]
 for t in ts:
  desc=t['changes']+(f"; archive member: {t['archiveMember']}" if t['archiveMember'] else '')
  md += [f"- `{t['id']}.ogg`: {desc}"]
  rows.append(f"<li><code>{esc(t['id'])}.ogg</code><small>{esc(desc)}</small></li>")
 md += ['']
 sections.append(f"<section><h2>{esc(s['title'])}</h2><p class='author'>{esc(s['author'])}</p><p><a href='{esc(s['sourcePage'])}'>作者による配布ページ</a> · <a href='{esc(s['licenseUrl'])}'>{esc(s['license'])}</a></p><ul>{''.join(rows)}</ul></section>")
preview=''.join(f"<div class='sample'><b>{esc(t['id'].replace('music-','').title())}</b><audio controls preload='none' src='{esc(t['id'])}.ogg'></audio></div>" for t in tracks if t['kind']=='music')
(ROOT/'CREDITS.md').write_text('\n'.join(md))
(ROOT/'CREDITS.html').write_text('''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>音のクレジット｜わちゃわちゃタウン</title><style>body{margin:0;background:#f6f1e8;color:#302f29;font:16px/1.75 system-ui,sans-serif}main{max-width:860px;margin:auto;padding:48px 24px}a{color:#25655e}h1{font-size:32px;line-height:1.4}h2{font-size:22px;margin:0}section{background:#fffdf7;border:1px solid #e5dece;border-radius:18px;padding:24px;margin:20px 0}.author{font-weight:600}.intro{color:#615e54}.samples{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.sample{display:grid;gap:6px}audio{width:100%;height:38px}small{display:block;overflow-wrap:anywhere;color:#777165}li{margin:8px 0}code{font-size:14px}footer{color:#777165;font-size:13px}</style><main><p><a href="../index.html">← 街を選ぶ画面へ</a></p><h1>街を彩る音楽と音</h1><p class="intro">7曲の音楽と、ざわめき・鳥・水辺・風・機械の音を、24の街に合わせて組み合わせています。無料公開された音源を、それぞれのライセンスに従って利用しています。</p><div class="samples">'''+preview+'''</div><p>'''+esc(notes)+'''</p>'''+''.join(sections)+'''<footer>確認日: 2026-10-04。音源の取得先・SHA-256・加工記録・確認時の配布ページは制作リポジトリの assets/audio/ に保存しています。音量・ミュートはゲームの設定から変更できます。</footer></main></html>''')
print(json.dumps(dict(sources=len(sources),tracks=len(tracks),stages=len(mapping)),ensure_ascii=False))
