import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const manifestPath = path.join(root, 'mobius.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const staticAssets = manifest.static_assets || {}
const errors = []
const wrapper = fs.readFileSync(path.join(root, 'index.jsx'), 'utf8')
const gameEntry = fs.readFileSync(path.join(root, 'src/index.js'), 'utf8')
const publicEntry = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8')
const shipSource = fs.readFileSync(path.join(root, 'src/components/Ship.js'), 'utf8')

if (wrapper.includes('/app-assets/')) {
  errors.push(
    'wrapper must not navigate a document through the ordinary same-origin /app-assets lane',
  )
}
if (!wrapper.includes('/app-embeds/by-id/')) {
  errors.push('wrapper does not use the sandboxed /app-embeds document lane')
}
if (!wrapper.includes('sandbox="allow-scripts allow-forms allow-pointer-lock"')) {
  errors.push('wrapper iframe must keep an explicit sandbox without allow-same-origin')
}
if (!wrapper.includes("data.type === 'cuberun:navigating'")) {
  errors.push('wrapper does not re-cover the frame before a later navigation')
}
if (!wrapper.includes('messageBridgeArmed')
    || !wrapper.includes("postToFrame({ type: 'cuberun:ready-probe' })")
    || !wrapper.includes("postToFrame({ type: 'cuberun:ready-ack' })")) {
  errors.push('wrapper does not gate the frame behind the acknowledged ready bridge')
}
if (!gameEntry.includes("post('cuberun:navigating')")
    && !gameEntry.includes("postMessage({ type: 'cuberun:navigating' }")) {
  errors.push('game entry does not source-signal before full-document navigation')
}
if (!gameEntry.includes("addEventListener('beforeunload'")) {
  errors.push('game entry does not source-signal before full-document navigation')
}
if (!gameEntry.includes('startReadyHandshake()')) {
  errors.push('game entry does not retry readiness until wrapper acknowledgement')
}
if (publicEntry.includes('requestFullscreen')
    || wrapper.includes('allow="autoplay; fullscreen; gamepad"')) {
  errors.push('the nested game must not request browser fullscreen implicitly')
}
if (!wrapper.includes('aria-label="Enter CubeRun focus mode"')
    || !wrapper.includes("phase === 'ready' &&")
    || !wrapper.includes('onClick={() => postImmersive(true)}')
    || !wrapper.includes('return () => postImmersive(false)')
    || !wrapper.includes("if (event.key === 'Escape') postImmersive(false)")
    || !wrapper.includes('if (hidden) postImmersive(false)')
    || wrapper.includes('aria-pressed={immersive}')
    || wrapper.includes("'Exit focus'")) {
  errors.push('focus entry must be explicit and stateless, with every exit path releasing the shell lease')
}
if (shipSource.includes('useGLTF') || shipSource.includes('DRACOLoader')) {
  errors.push('uncompressed ship model must not retain the external Draco loader path')
}

function normalizeAssetPath(value) {
  return value.replace(/^\/+/, '').replace(/\\/g, '/')
}

function isExternalUrl(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|data:|blob:|#)/i.test(value)
}

const declared = new Set(Object.keys(staticAssets).map(normalizeAssetPath))
const declaredSources = new Set(
  Object.values(staticAssets).map(normalizeAssetPath),
)

function filesBelow(directory) {
  const out = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) out.push(...filesBelow(target))
    else if (entry.isFile()) out.push(normalizeAssetPath(path.relative(root, target)))
  }
  return out
}

for (const [dest, src] of Object.entries(staticAssets)) {
  const destPath = normalizeAssetPath(dest)
  const srcPath = normalizeAssetPath(src)
  if (destPath.includes('..')) errors.push(`static_assets destination escapes package: ${dest}`)
  if (srcPath.includes('..')) errors.push(`static_assets source escapes repo: ${src}`)
  if (!fs.existsSync(path.join(root, srcPath))) errors.push(`missing source for ${dest}: ${src}`)
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', srcPath], {
      cwd: root,
      stdio: 'ignore',
    })
  } catch {
    errors.push(`source is not Git-tracked for ${dest}: ${src}`)
  }
}

for (const built of filesBelow(path.join(root, 'build'))) {
  if (!declaredSources.has(built)) errors.push(`undeclared build output: ${built}`)
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
