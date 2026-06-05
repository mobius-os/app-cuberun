#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
method = r'''
	static resolveURL( url, path ) {

		// Invalid URLs should not happen, but are returned as-is for compatibility.
		if ( typeof url !== 'string' || url === '' ) return '';

		// Host-relative or absolute URLs do not need a base path.
		if ( /^(https?:)?\/\//i.test( url ) || /^data:.*,.*$/i.test( url ) || /^blob:.*$/i.test( url ) || /^\//.test( url ) ) return url;

		return path + url;

	}
'''
for name in ['node_modules/three/src/loaders/LoaderUtils.js', 'node_modules/three/build/three.module.js']:
    p = Path(name)
    s = p.read_text()
    if 'static resolveURL' in s:
        continue
    marker = "\n\tstatic extractUrlBase( url ) {"
    if marker not in s:
        raise SystemExit(f'LoaderUtils insertion point not found in {name}')
    p.write_text(s.replace(marker, method + marker, 1))
PY
