#!/usr/bin/env python3
"""Package the offline game as a Mac app that needs no preview server."""
import argparse
import plistlib
import shutil
import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path


def preflight(root):
    """Reject incomplete or stale bundles before touching an installed app."""
    source = root / 'expedition'
    report = json.loads((root / 'assets/production/build-report.json').read_text())
    if report['missing'] or report['errors'] or len(report['playableStages']) != 24:
        raise SystemExit('Package blocked: finish and verify all 24 stages first.')
    data_text = (source / 'data.js').read_text()
    prefix = 'window.WACHA24_DATA='
    if not data_text.startswith(prefix):
        raise SystemExit('Package blocked: invalid game data.')
    data = json.loads(data_text[len(prefix):].rstrip().removesuffix(';'))
    if len(data['stages']) != 24 or not all(stage['ready'] for stage in data['stages']):
        raise SystemExit('Package blocked: the runtime has an unfinished stage.')
    if len(data['characters']) != 4396 or report['characters'] != 4396:
        raise SystemExit('Package blocked: all 4,396 character designs are required.')
    required = {'cover', 'legacy'}
    required.update(character['image'] for character in data['characters'])
    for stage in data['stages']:
        required.update((stage['background'], stage['setImage']))
    missing = [key for key in required if not (source / 'images' / (key + '.js')).is_file()]
    if missing:
        raise SystemExit('Package blocked: missing runtime images: ' + ', '.join(sorted(missing)))
    for name in ['expedition-core.js', 'expedition-render.js', 'expedition-app.js', 'expedition.css']:
        if (source / name).read_bytes() != (root / 'src' / name).read_bytes():
            raise SystemExit(f'Package blocked: rebuild changed source {name}.')
    if (source / 'index.html').read_bytes() != (root / 'src/expedition.html').read_bytes():
        raise SystemExit('Package blocked: rebuild changed game HTML.')
    return source, report


def package(destination, check=False):
    root = Path(__file__).resolve().parent
    source, report = preflight(root)
    if check:
        print('Package preflight passed: 24 stages, 4,396 designs, all runtime files present.')
        return
    destination = destination.expanduser().absolute()
    if destination.suffix != '.app' or destination.is_symlink():
        raise SystemExit('Package destination must be a regular .app directory.')
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Build next to the installed app, then rename only after every file is copied.
    # A failed copy leaves the currently playable app intact.
    with tempfile.TemporaryDirectory(prefix='.wacha-package-', dir=destination.parent) as temporary:
        staged = Path(temporary) / destination.name
        populate(staged, source, root)
        old = Path(temporary) / 'previous.app'
        had_old = destination.exists()
        if had_old:
            destination.rename(old)
        try:
            staged.rename(destination)
        except BaseException:
            if had_old:
                old.rename(destination)
            raise
    summary = dict(
        at=datetime.now(timezone.utc).isoformat(), destination=str(destination),
        entry=str(destination / 'Contents/Resources/index.html'),
        stages=24, characters=report['characters'], generated=report['generated'],
        files=sum(path.is_file() for path in destination.rglob('*')),
        bytes=sum(path.stat().st_size for path in destination.rglob('*') if path.is_file()),
        needsServer=False, needsNetwork=False, appVersion='2.0',
    )
    (root / 'assets/production/package-report.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f'Created {destination}')


def populate(destination, source, root):
    contents = destination / 'Contents'
    resources = contents / 'Resources'
    executable = contents / 'MacOS' / 'WachaTown'
    resources.mkdir(parents=True, exist_ok=True)
    executable.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, resources / 'expedition')
    guide = root / 'docs/遊び方.html'
    if guide.exists():
        (resources / '遊び方.html').write_text(guide.read_text().replace('href="../expedition/', 'href="expedition/'))
    (resources / 'index.html').write_text('<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=expedition/index.html"><title>わちゃわちゃタウン</title><a href="expedition/index.html">24の街を開く</a>', encoding='utf-8')
    executable.write_text('''#!/bin/zsh
game="${0:A:h:h}/Resources/index.html"
/usr/bin/open -a "Google Chrome" "$game" || /usr/bin/open "$game"
''', encoding='utf-8')
    executable.chmod(0o755)
    with (contents / 'Info.plist').open('wb') as stream:
        plistlib.dump({
            'CFBundleName': 'わちゃわちゃタウン',
            'CFBundleDisplayName': 'わちゃわちゃタウン',
            'CFBundleIdentifier': 'com.mackystudio.wachatown',
            'CFBundleExecutable': 'WachaTown',
            'CFBundlePackageType': 'APPL',
            'CFBundleVersion': '2',
            'CFBundleShortVersionString': '2.0',
            'LSUIElement': True,
        }, stream)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path,
                        default=Path.home() / 'Desktop' / 'わちゃわちゃタウン.app')
    parser.add_argument('--check', action='store_true', help='Check completeness without changing the installed app.')
    args = parser.parse_args()
    package(args.output, args.check)
