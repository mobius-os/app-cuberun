# Editing CubeRun gameplay

This copy was downloaded so it can be edited locally. The first place to look is:

- `src/constants/index.js` → `GAMEPLAY`

Useful knobs:

- `initialGameSpeed`: starting forward speed.
- `speedIncreasePerLevel`: how much faster each level gets.
- `acceleration`: how quickly the game reaches the desired speed.
- `cubeAmount`: number of moving obstacles.
- `cubeSize`: visual obstacle size.
- `collisionRadius`: how forgiving crashes are. Lower = easier.
- `obstacleRiseSpeed`: how quickly cubes rise into place.
- `steeringAcceleration`: how snappy left/right controls feel.
- `maxHorizontalVelocity`: maximum sideways speed.
- `forwardSpeedScale` / `lateralSpeedScale`: global movement scale.

Good first experiments:

- Easier mode: lower `cubeAmount`, lower `collisionRadius`, lower `speedIncreasePerLevel`.
- Hard mode: raise `cubeAmount`, raise `speedIncreasePerLevel`, raise `initialGameSpeed`.
- Floaty controls: lower `steeringAcceleration`.
- Twitchy controls: raise `steeringAcceleration` and `maxHorizontalVelocity`.

## Source layout

- `src/` is the editable React/Three game.
- `index.jsx` is the Mobius wrapper around the built game. Keep it thin: probe,
  iframe, error/retry chrome, immersive shell request, storage bridge, signals.
- `build/` is generated output. Rebuild it from `src/` before packaging.
- `mobius.json` maps every served static asset to a file in `build/`.

## Data contracts

- High scores are stored through the wrapper in `window.mobius.storage` at
  `highscores.json` as `[number, number, number]`, sorted descending.
- Standalone fallback keys are `cuberun:highscores` and
  `cuberun:musicEnabled`. Bare `highscores` and `musicEnabled` are read only
  for migration.
- Game events are posted from the built game to the wrapper, which emits
  Mobius signals with flat primitive payloads.

## Rebuild and package

1. Run `npm install` or `yarn install`.
2. If the old CRA dependencies fail locally, run:
   - `tools/fix-postcss-safe-parser.sh`
   - `tools/fix-three-loaderutils.sh`
3. Run `npm run build`. The script sets the Webpack 4/OpenSSL compatibility
   flag needed on current Node versions.
4. Update `mobius.json` `static_assets` for any new hashed filenames in
   `build/`.
5. Run `npm run verify:mobius`.
6. Reinstall the package in Mobius and smoke the wrapper. Do not mark the app
   offline-capable until every static asset is proven cached under
   `/app-assets/by-id/cuberun/`.
