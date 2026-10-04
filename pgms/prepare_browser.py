#!/usr/bin/env python3
# Copyright © 2025-2026 by Alan M. Marcum, Nescorna Professional.
# All rights reserved.
"""Revision: 1. Bundle pinned Python modules and a local WebAssembly runtime."""
import argparse
import importlib.metadata
import json
from pathlib import Path
import shutil
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'web/public/runtime')
    args = parser.parse_args()
    sys.path.insert(0, str(ROOT / "src"))
    from jpi2excel import UPSTREAM_REVISION
    upstream = importlib.metadata.distribution('jpi-analyzer')
    origin = json.loads(upstream.read_text('direct_url.json') or '{}')
    if origin.get('vcs_info', {}).get('commit_id') != UPSTREAM_REVISION:
        parser.error('Install the project with its pinned Git dependency first')
    if importlib.metadata.version('openpyxl') != '3.1.5' or importlib.metadata.version('et-xmlfile') != '2.0.0':
        parser.error('Browser bundle requires openpyxl==3.1.5 and et-xmlfile==2.0.0')
    runtime = ROOT / 'web/node_modules/pyodide'
    if not runtime.is_dir():
        parser.error('Run npm ci in web first')
    args.output.mkdir(parents=True, exist_ok=True)
    for name in ['pyodide.mjs', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']:
        shutil.copyfile(runtime / name, args.output / name)
    with zipfile.ZipFile(args.output / 'jpi-python.zip', 'w', zipfile.ZIP_DEFLATED) as bundle:
        for package, directory in [('jpi2excel', ROOT / 'src/jpi2excel')]:
            for path in sorted(directory.rglob('*.py')):
                bundle.write(path, f'{package}/{path.relative_to(directory)}')
        for name in ['jpi-analyzer', 'openpyxl', 'et-xmlfile']:
            distribution = importlib.metadata.distribution(name)
            for entry in sorted(distribution.files or []):
                if str(entry).endswith('.py') or any(word in str(entry).upper() for word in ('LICENSE', 'LICENCE', 'AUTHORS')):
                    if '..' not in entry.parts:
                        bundle.write(distribution.locate_file(entry), str(entry))
    shutil.copyfile(ROOT / 'docs/THIRD-PARTY.md', args.output / 'THIRD-PARTY.txt')
    shutil.copyfile(ROOT / 'COPYRIGHT', args.output / 'COPYRIGHT.txt')
    for license_file in (ROOT / 'web/licenses').glob('*.txt'):
        shutil.copyfile(license_file, args.output / license_file.name)
    print(f'Prepared browser runtime in {args.output}')


if __name__ == '__main__':
    main()
