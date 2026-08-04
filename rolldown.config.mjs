// Compile-smoke config for the Möbius wrapper. Möbius installs index.jsx as a
// single Rolldown-compiled module and supplies every bare import through its
// shell import map, so those stay external here.
import { isAbsolute } from 'node:path'

export default {
  input: 'index.jsx',
  platform: 'browser',
  tsconfig: false,
  transform: { jsx: 'react-jsx' },
  external: (id) => !id.startsWith('.') && !isAbsolute(id),
  output: { format: 'es', dir: '.rolldown-smoke' },
}
