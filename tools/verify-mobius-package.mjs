import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const manifestPath = path.join(root, 'mobius.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const staticAssets = manifest.static_assets || {}
const errors = []

function normalizeAssetPath(value) {
  return value.replace(/^\/+/, '').replace(/\\/g, '/')
}

function isExternalUrl(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|data:|blob:|#)/i.test(value)
}

const declared = new Set(Object.keys(staticAssets).map(normalizeAssetPath))

for (const [dest, src] of Object.entries(staticAssets)) {
  const destPath = normalizeAssetPath(dest)
  const srcPath = normalizeAssetPath(src)
  if (destPath.includes('..')) errors.push(`static_assets destination escapes package: ${dest}`)
  if (srcPath.includes('..')) errors.push(`static_assets source escapes repo: ${src}`)
  if (!fs.existsSync(path.join(root, srcPath))) errors.push(`missing source for ${dest}: ${src}`)
}

for (const [dest, src] of Object.entries(staticAssets)) {
  if (!dest.endsWith('.css')) continue
  const css = fs.readFileSync(path.join(root, normalizeAssetPath(src)), 'utf8')
  const cssDir = path.posix.dirname(normalizeAssetPath(dest))
  for (const match of css.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) {
    const raw = match[2].trim()
    if (!raw || isExternalUrl(raw)) continue
    if (raw.startsWith('/')) {
      errors.push(`${dest} uses host-absolute asset URL: ${raw}`)
      continue
    }
    const resolved = normalizeAssetPath(path.posix.normalize(path.posix.join(cssDir, raw)))
    if (resolved.startsWith('../')) {
      errors.push(`${dest} URL escapes static package: ${raw}`)
    } else if (!declared.has(resolved)) {
      errors.push(`${dest} URL is not declared in static_assets: ${raw} -> ${resolved}`)
    }
  }
}

if (errors.length) {
  console.error(errors.map((line) => `- ${line}`).join('\n'))
  process.exit(1)
}

console.log(`Mobius package OK: ${Object.keys(staticAssets).length} static assets`)
