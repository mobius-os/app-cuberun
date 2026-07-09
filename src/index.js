import React from 'react';
import ReactDOM from 'react-dom';

import './styles/normalize.css'
import './styles/index.css';

import CubeWorld from './components/CubeWorld';

const rootEl = document.getElementById('root')
const app = (
  <React.StrictMode>
    <CubeWorld bgColor='#141622' />
  </React.StrictMode>
)

if (ReactDOM.createRoot) {
  ReactDOM.createRoot(rootEl).render(app)
} else {
  ReactDOM.render(app, rootEl)
}

try {
  window.parent.postMessage({ type: 'cuberun:ready' }, window.location.origin)
} catch {
  /* Standalone development page. */
}
