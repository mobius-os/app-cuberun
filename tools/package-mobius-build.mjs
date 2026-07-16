import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const buildRoot = path.join(root, 'build')
const manifestPath = path.join(root, 'mobius.json')

function filesBelow(directory) {
  const out = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) out.push(...filesBelow(target))
    else if (entry.isFile()) out.push(path.relative(root, target).replace(/\\/g, '/'))
  }
  return out
}

const sources = filesBelow(buildRoot).sort()
if (!sources.includes('build/index.html')) {
  throw new Error('build/index.html is missing; run the clean build first')
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
manifest.static_assets = Object.fromEntries(
  sources.map((source) => [source.slice('build/'.length), source]),
)
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
fs.writeFileSync(
  path.join(root, '.mobius-static-assets.json'),
  `${JSON.stringify(Object.keys(manifest.static_assets), null, 2)}\n`,
)

// build/static is intentionally ignored for ordinary development, but a
// release commit must contain every generated source named by mobius.json.
// Stage exactly this freshly enumerated build and the rewritten manifest;
// obsolete bundles were already removed by react-scripts' clean build.
execFileSync('git', ['add', '-u', '--', buildRoot], {
  cwd: root,
  stdio: 'inherit',
})
execFileSync('git', ['add', '-f', '--', manifestPath, ...sources], {
  cwd: root,
  stdio: 'inherit',
})
console.log(`Staged ${sources.length} exact Mobius package assets`)
