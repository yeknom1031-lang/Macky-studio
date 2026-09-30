#!/usr/bin/env python3
"""Package the offline game as a Mac app that needs no preview server."""
import argparse
import plistlib
import shutil
from pathlib import Path


def package(destination):
    source = Path(__file__).resolve().parent / 'index.html'
    if not source.is_file():
        raise SystemExit('Build index.html before packaging.')
    contents = destination / 'Contents'
    resources = contents / 'Resources'
    executable = contents / 'MacOS' / 'WachaTown'
    resources.mkdir(parents=True, exist_ok=True)
    executable.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, resources / 'index.html')
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
            'CFBundleVersion': '1',
            'CFBundleShortVersionString': '1.0',
            'LSUIElement': True,
        }, stream)
    print(f'Created {destination}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path,
                        default=Path.home() / 'Desktop' / 'わちゃわちゃタウン.app')
    package(parser.parse_args().output)
