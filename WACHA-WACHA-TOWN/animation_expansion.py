"""Reproducible 800-call production ledger; image pixels come from image_gen.

This helper extracts existing character references, records provenance and audits
delivery. It never calls an image API and never synthesizes replacement artwork.
"""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
import shutil
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'assets/production/animation-expansion'
PYTHON = '/Users/makibook/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3'


def read(path):
    return json.loads(path.read_text())


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temp.replace(path)


def data():
    return json.loads((ROOT / 'expedition/data.js').read_text().split('=', 1)[1].rstrip(';\n'))


def reference(job, runtime):
    dest = OUT / 'references' / (job['id'] + '.png')
    if dest.exists():
        return
    by_id = {c['id']: c for c in runtime['characters']}
    canvas = Image.new('RGBA', (512, len(job['characters']) * 256), '#ebe9e3')
    pen = ImageDraw.Draw(canvas)
    for row, cid in enumerate(job['characters']):
        character = by_id[cid]
        for column, index in enumerate([0, 4]):
            frame = character['frames'][index]
            path = ROOT / runtime['sourceMetadata'][character['image']]['path']
            if frame.get('sourceImage'):
                path = ROOT / 'assets/production/source' / (frame['sourceImage'] + '.png')
            sprite = Image.open(path).convert('RGBA').crop(tuple(frame['source']))
            sprite.thumbnail((222, 224), Image.Resampling.LANCZOS)
            x = column * 256 + (256 - sprite.width) // 2
            y = row * 256 + 248 - sprite.height
            canvas.alpha_composite(sprite, (x, y))
        pen.text((8, row * 256 + 4), f'ROW {row + 1}: {cid}', fill='#3a3831')
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest)


def character_prompt(job, stage, chars, roles):
    base = ('Use case: identity-preserve. Production animation sprite sheet for Wacha Wacha Town. '
            'The supplied reference contains FOUR existing characters, top to bottom, each shown in two original poses. '
            'Create new poses of EXACTLY these four people, one person per row. Preserve each face, body proportions, '
            'skin tone, hairstyle, hat, accessories, outfit construction and EXACT clothing colors. No redesigns or recolors. '
            'Match their crisp hand-painted storybook chibi rendering and gentle overhead three-quarter perspective. '
            'True transparent alpha background. No floor, scenery, stairs, labels, text, grid lines or shadows under feet. '
            'Every cell has generous empty gutters and complete head, hands and feet. Keep fixed character scale and '
            'foot baseline across a row; animate limbs and posture, do not translate the character across cells. ')
    identities = '\n'.join(f'Row {i + 1}: {c["id"]}, {c["name"]}; action context: {roles[c["role"]]["name"]}.' for i, c in enumerate(chars))
    if job['kind'] == 'directional':
        detail = ('EXACT GRID: FOUR equal rows by TWELVE equal columns, 48 separate sprites. '
                  'Columns 1-4: four sequential poses of a BACK-VIEW walk cycle going away from the viewer, '
                  'show the back of the head and outfit, no face looking at camera. '
                  'Columns 5-8: four sequential poses ASCENDING stairs diagonally up-right, three-quarter rear view, '
                  'lean forward slightly, alternate high knee and planted lower foot, believable upward effort. '
                  'Columns 9-12: four sequential poses DESCENDING stairs diagonally down-right, three-quarter front view, '
                  'careful lower-reaching foot and counterbalancing arms, clearly different from flat walking. '
                  'Do not draw stairs: the game supplies the exact staircase under their feet. '
                  'Small carried tools remain identifiable but are held safely near the body during movement. '
                  'Wide landscape canvas, ideally 2048 by 1024. ')
    else:
        detail = ('EXACT GRID: FOUR equal rows by EIGHT equal columns, 32 separate sprites. '
                  'Each row is one expressive, coherent EIGHT-FRAME seamless loop of the stated role action, '
                  'with clear anticipation, contact/effort, follow-through and recovery. Hands interact convincingly '
                  'at waist/chest height with portable tools or an unseen counter in front-right. '
                  'Keep the original portable tools; do not attach a large counter, building, chair or floor to the sprite. '
                  'Facing front-right three-quarter. Make genuinely different body poses, not identical copies. '
                  'Landscape canvas, ideally 1536 by 1024. ')
    return base + detail + f'Stage: {stage["name"]}. Stage locations: {stage["zones"]}.\n' + identities


def initialize():
    for folder in ['source', 'references', 'receipts', 'attempts', 'review', 'jobs']:
        (OUT / folder).mkdir(parents=True, exist_ok=True)
    manifest = read(ROOT / 'assets/production/jobs.json')
    runtime = data()
    roles = {r['id']: r for r in manifest['roles']}
    all_jobs = []
    for kind, base in [('directional', 0), ('interaction', 600)]:
        for si, stage in enumerate(manifest['stages']):
            sid = f'S{si + 1:02}'
            cast = [c for c in manifest['characters'] if c['stage'] == sid]
            selected = cast if kind == 'directional' else cast[::5]
            for bi in range(0, len(selected), 4):
                chars = selected[bi:bi + 4]
                ordinal = base + si * (25 if kind == 'directional' else 5) + bi // 4 + 1
                job = dict(id=f'A{ordinal:04}', ordinal=ordinal, stage=sid, kind=kind,
                           characters=[c['id'] for c in chars], rows=4, cols=12 if kind == 'directional' else 8,
                           reference=str(OUT / 'references' / f'A{ordinal:04}.png'),
                           transparent=True, status='planned')
                job['prompt'] = character_prompt(job, stage, chars, roles)
                reference(job, runtime)
                write(OUT / 'jobs' / (job['id'] + '.json'), job)
                all_jobs.append(job)
    for ordinal in range(721, 793):
        si = (ordinal - 721) // 3
        all_jobs.append(dict(id=f'A{ordinal:04}', ordinal=ordinal, stage=f'S{si+1:02}',
                             kind='environment', status='awaiting-placement-design'))
    for ordinal in range(793, 801):
        all_jobs.append(dict(id=f'A{ordinal:04}', ordinal=ordinal, kind='qa-repair', status='reserved'))
    write(OUT / 'plan.json', dict(version=1, maxGenerationCalls=800, generator='built-in image_gen.imagegen',
          preservedOriginals=545, allocations=dict(directional=600, interaction=120, environment=72, qaRepair=8),
          policy='One recorded image_gen invocation per numbered attempt. Preserve all originals. Never count slicing, frames or repackaging as image generation. Reject malformed sheets from runtime.',
          jobs=all_jobs))
    print(json.dumps(dict(planned=len(all_jobs), references=720, directory=str(OUT))))


def begin(jid):
    job = read(OUT / 'jobs' / (jid + '.json'))
    dest = OUT / 'attempts' / (jid + '.json')
    attempt = dict(id=jid, tool='built-in image_gen.imagegen', prompt=job['prompt'],
                   reference=job.get('reference'), startedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                   state='requested')
    # Exclusive creation prevents duplicate calls when several agents work together.
    with dest.open('x') as f:
        json.dump(attempt, f, ensure_ascii=False, indent=2)
    print(json.dumps(job, ensure_ascii=False))


def accept(jid, generated):
    source = Path(generated).expanduser().resolve()
    Image.open(source).verify()
    dest = OUT / 'source' / (jid + '.png')
    if dest.exists():
        raise SystemExit(f'Refusing to overwrite {dest}')
    shutil.copyfile(source, dest)
    attempt_path = OUT / 'attempts' / (jid + '.json')
    attempt = read(attempt_path)
    receipt = attempt | dict(state='generated-unreviewed', savedFrom=str(source), savedPath=str(dest),
                              sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),
                              finishedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
    write(OUT / 'receipts' / (jid + '.json'), receipt)
    write(attempt_path, receipt)
    print(json.dumps(dict(id=jid, savedPath=str(dest), sha256=receipt['sha256'])))


def status():
    attempts = list((OUT / 'attempts').glob('A*.json'))
    receipts = list((OUT / 'receipts').glob('A*.json'))
    print(json.dumps(dict(planned=800, attempted=len(attempts), generated=len(receipts),
                          remainingCalls=800-len(attempts)), ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['init', 'begin', 'accept', 'status'])
    parser.add_argument('id', nargs='?')
    parser.add_argument('source', nargs='?')
    args = parser.parse_args()
    if args.command == 'init':
        initialize()
    elif args.command == 'begin':
        begin(args.id)
    elif args.command == 'accept':
        accept(args.id, args.source)
    else:
        status()
