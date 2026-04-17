# -*- mode: python ; coding: utf-8 -*-

import os

from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None
repo_root = os.path.abspath('.')
pysrc_root = os.path.join(repo_root, 'pysrc')


def first_existing_path(*candidates):
    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            return candidate
    return None

datas = [
    (os.path.join(pysrc_root, 'static', 'avatars'), 'static/avatars'),
    (os.path.join(pysrc_root, 'static', 'agent'), 'static/agent'),
    (os.path.join(pysrc_root, 'static', 'conf'), 'static/conf'),
    (os.path.join(pysrc_root, 'static', 'docs'), 'static/docs'),
    (os.path.join(pysrc_root, 'static', 'dist'), 'static/dist'),
    (os.path.join(pysrc_root, 'claw', 'reference_data'), 'claw/reference_data'),
]
datas.extend(collect_data_files('webview'))

hiddenimports = [
    'main',
    'fastapi',
    'uvicorn',
    'starlette',
    'pydantic',
    'pydantic_core',
    'sqlalchemy',
    'passlib',
    'apscheduler',
    'markdown_it',
    'httpx',
    'httpcore',
    'h11',
    'loguru',
    'anyio',
    'websockets',
    'multipart',
    'requests',
    'mcp',
    'webview',
]
hiddenimports.extend(collect_submodules('webview'))
hiddenimports.extend(collect_submodules('modules'))
hiddenimports.extend(collect_submodules('common'))

a = Analysis(
    [os.path.join(pysrc_root, 'desktop.py')],
    pathex=[pysrc_root, repo_root],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'common.ocr_service',
        'docx',
        'lxml',
        'cryptography',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='一人国企·OPC',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=first_existing_path(
        os.path.join(pysrc_root, 'res', 'icon.ico'),
        os.path.join(pysrc_root, 'res', 'logo.ico'),
        os.path.join(repo_root, 'public', 'favicon.ico'),
    ),
)

app = BUNDLE(
    exe,
    name='一人国企·OPC.app',
    icon=first_existing_path(
        os.path.join(pysrc_root, 'res', 'logo.icns'),
    ),
    bundle_identifier=None,
    info_plist={
        'CFBundleName': '一人国企·OPC',
        'CFBundleDisplayName': '一人国企·OPC',
        'CFBundleShortVersionString': '0.1.0',
        'CFBundleVersion': '0.1.0',
        'NSHumanReadableCopyright': 'Copyright © 2026 OneState OPC',
    },
)
