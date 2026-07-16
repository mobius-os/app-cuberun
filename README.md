
![Cuberun](./src/textures/cuberun-logo.png)

<p align="center">
Avoid the cubes while the speed progressively increases! Can you beat the rainbow level?
</p>

----

<br/>
<img align="left" width="200" src="./osawards-badge.png">
<br/>
<p align="center">
<a href="https://osawards.com/react/2022"><em>Winner of the 2022 React Open Source Awards in the category Fun Side Project of the Year!</em></a>
</p>
<br />
<br/>

---

The game is inspired by an old flash game I used to play in the late 2000s called Cubefield. My version is in full 3D and built with React, THREE.js and react-three-fiber to glue them together.

I went for a synthwave aesthetic, including some self-composed music, which the visual effects are synced to (so turn the music on!).

High scores are stored by the Mobius wrapper in `highscores.json`, with a
namespaced `localStorage` fallback for standalone development.

The development process will be detailed on my [website](https://adamkarlsten.com).

## Screenshots

![](./public/regular.PNG)
![](./public/tunnelred.PNG)

## Controls

* Left: A, LeftArrow

* Right: D, RightArrow

Touch devices have on-screen controls.

## Mobius package

This fork includes a Mobius package:

* `mobius.json` is the install manifest.
* `index.jsx` is the Mobius wrapper. It probes the packaged build, requests
  fullscreen/immersive shell chrome, bridges high-score storage, and emits
  `app_ready`, `error`, `run_ended`, `high_score`, and `item_updated` signals.
* `build/` is a prebuilt CubeRun static bundle served by Mobius under
  `/app-embeds/by-id/<app_id>/`.
* `src/` is the editable third-party game source. Gameplay knobs live in
  `src/constants/index.js`.
* `icon.png` is the Mobius home-screen icon.

Install URL:

`https://raw.githubusercontent.com/mobius-os/app-cuberun/main/mobius.json`

Data contracts:

* Durable high scores: `window.mobius.storage` path `highscores.json`, value
  shape `[number, number, number]` sorted descending.
* Standalone fallback keys: `cuberun:highscores` and `cuberun:musicEnabled`.
  Bare legacy keys are read only for migration and corrupt values fall back to
  safe defaults.

Rebuild and repackage loop:

1. Install dependencies with `npm install` or `yarn install`.
2. If the old CRA toolchain fails, run `tools/fix-postcss-safe-parser.sh` and
   `tools/fix-three-loaderutils.sh`.
3. Run `npm run build`. The script sets the Webpack 4/OpenSSL compatibility
   flag needed on current Node versions. The build must keep relative asset paths
   (`./static/...`), not root-absolute paths.
4. Regenerate or update `mobius.json` `static_assets` to match the new hashed
   files in `build/`.
5. Run `npm run verify:mobius`.
6. Reinstall the app package in Mobius and smoke the wrapper. The package is
   not marked offline-capable until every build asset is proven cached under
   `/app-embeds/by-id/cuberun/`.
