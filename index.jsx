import React from 'react'

export default function CubeRunApp({ appId }) {
  const src = appId ? `/app-assets/by-id/${appId}/index.html` : '/app-assets/cuberun/index.html'
  return (
    <div style={{ height: '100%', width: '100%', background: '#10121f', overflow: 'hidden' }}>
      <iframe
        title="CubeRun"
        src={src}
        style={{ width: '100%', height: '100%', border: 0, display: 'block', background: '#10121f' }}
        allow="autoplay; fullscreen; gamepad"
      />
    </div>
  )
}
