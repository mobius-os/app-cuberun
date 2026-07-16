import { LoaderUtils } from 'three'

// three r129 predates LoaderUtils.resolveURL, while the GLTF loader used by
// this game expects it at runtime. Keep the compatibility at the app boundary
// rather than rewriting installed dependencies during every build.
if (typeof LoaderUtils.resolveURL !== 'function') {
  LoaderUtils.resolveURL = (url, path) => {
    if (typeof url !== 'string' || url === '') return ''
    if (/^(https?:)?\/\//i.test(url) || /^data:.*,.*$/i.test(url)
        || /^blob:.*$/i.test(url) || /^\//.test(url)) return url
    return path + url
  }
}
