#!/usr/bin/env python3
"""Build a Finder-launchable local app and a Desktop shortcut."""
from pathlib import Path
import plistlib
import subprocess
import tempfile

HERE = Path(__file__).resolve().parent
APP_NAME = 'Macky ゲームポータル.app'
APP = HERE / 'build' / APP_NAME
SCRIPT = '''#!/bin/zsh
launcher_dir="${0:A:h}"
portal_script="$launcher_dir/../../../../server.py"
portal_log="${TMPDIR:-/tmp/}macky-game-portal-launcher.log"
launcher_python="$(command -v python3)"
if [[ -z "$launcher_python" ]]; then
  launcher_python="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
fi
if [[ ! -x "$launcher_python" || ! -f "$portal_script" ]]; then
  print 'ゲームポータルを起動できませんでした。' > "$portal_log"
  print 'Macky-studio内のGAME-PORTALフォルダとPython 3を確認してください。' >> "$portal_log"
  /usr/bin/open -t "$portal_log"
  exit 1
fi
"$launcher_python" "$portal_script" "$@" > "$portal_log" 2>&1
launcher_result=$?
if [[ "$launcher_result" != 0 ]]; then
  /usr/bin/open -t "$portal_log"
fi
exit "$launcher_result"
'''


def build():
    contents = APP / 'Contents'
    (contents / 'MacOS').mkdir(parents=True, exist_ok=True)
    (contents / 'Resources').mkdir(parents=True, exist_ok=True)
    executable = contents / 'MacOS' / 'launcher'
    executable.write_text(SCRIPT)
    executable.chmod(0o755)
    info = {
        'CFBundleName': 'Macky ゲームポータル',
        'CFBundleDisplayName': 'Macky ゲームポータル',
        'CFBundleIdentifier': 'local.macky-studio.game-portal',
        'CFBundlePackageType': 'APPL',
        'CFBundleExecutable': 'launcher',
        'CFBundleIconFile': 'Portal.icns',
        'CFBundleVersion': '1',
        'CFBundleShortVersionString': '1.0',
        'LSMinimumSystemVersion': '10.15',
        'LSUIElement': True,
        'NSHighResolutionCapable': True,
    }
    with (contents / 'Info.plist').open('wb') as target:
        plistlib.dump(info, target)
    logo = HERE.parent / 'macky_studio_logo.png'
    with tempfile.TemporaryDirectory(prefix='macky-portal-icon-') as temp:
        iconset = Path(temp) / 'Portal.iconset'
        iconset.mkdir()
        for size in (16,32,128,256,512):
            for scale in (1,2):
                name = f'icon_{size}x{size}' + ('@2x' if scale == 2 else '') + '.png'
                subprocess.run(['/usr/bin/sips','-s','format','png','-z',str(size*scale),str(size*scale),str(logo),'--out',str(iconset/name)],check=True,stdout=subprocess.DEVNULL)
        subprocess.run(['/usr/bin/iconutil','-c','icns',str(iconset),'-o',str(contents/'Resources/Portal.icns')],check=True)
    shortcut = Path.home() / 'Desktop' / APP_NAME
    if shortcut.is_symlink() and shortcut.resolve() == APP:
        pass
    elif shortcut.exists() or shortcut.is_symlink():
        raise FileExistsError(f'同名のファイルを上書きせずに残しました: {shortcut}')
    else:
        shortcut.symlink_to(APP, target_is_directory=True)
    print(f'アプリ: {APP}')
    print(f'デスクトップ: {shortcut}')

if __name__ == '__main__':
    build()
