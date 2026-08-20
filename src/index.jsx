import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

import './threeCompat'
import './styles/normalize.css'
import './styles/index.css';

import CubeWorld from './components/CubeWorld';
import { startReadyHandshake } from './util/readyHandshake'

function ReadySignal() {
  useEffect(() => {
    const stopReadyHandshake = startReadyHandshake()
    // Cover the nested frame before a later full-document navigation can
    // reveal a blocked/error document. The wrapper accepts this only from its
    // exact contentWindow with the expected opaque `null` origin.
    const notifyNavigating = () => {
      try {
        window.parent.postMessage({ type: 'cuberun:navigating' }, '*')
      } catch {
        /* Standalone development page. */
      }
    }
    window.addEventListener('beforeunload', notifyNavigating)
    window.addEventListener('pagehide', notifyNavigating)
    return () => {
      stopReadyHandshake()
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
