import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

import './threeCompat'
import './styles/normalize.css'
import './styles/index.css';

import CubeWorld from './components/CubeWorld';

function ReadySignal() {
  useEffect(() => {
    const post = (type) => {
      try {
        window.parent.postMessage({ type }, '*')
      } catch {
        /* Standalone development page. */
      }
    }
    // Cover the nested frame before a later full-document navigation can
    // reveal a blocked/error document. The wrapper accepts this only from its
    // exact contentWindow with the expected opaque `null` origin.
    const notifyNavigating = () => post('cuberun:navigating')
    window.addEventListener('beforeunload', notifyNavigating)
    window.addEventListener('pagehide', notifyNavigating)
    post('cuberun:ready')
    return () => {
      window.removeEventListener('beforeunload', notifyNavigating)
      window.removeEventListener('pagehide', notifyNavigating)
    }
  }, [])
  return null
}

const rootEl = document.getElementById('root')
const app = (
  <React.StrictMode>
    <CubeWorld bgColor='#141622' />
    <ReadySignal />
  </React.StrictMode>
)

if (ReactDOM.createRoot) {
  ReactDOM.createRoot(rootEl).render(app)
} else {
  ReactDOM.render(app, rootEl)
}
