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
