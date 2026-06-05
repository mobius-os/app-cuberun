
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

Also features high scores stored locally.

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
* `index.jsx` is the Mobius wrapper.
* `build/` is a prebuilt CubeRun static bundle served by Mobius under
  `/app-assets/by-id/<app_id>/`.
* `icon.png` is the Mobius home-screen icon.

Install URL:

`https://raw.githubusercontent.com/hamzamerzic/cuberun/main/mobius.json`

When rebuilding the game, make sure the build output uses relative asset paths
(`./static/...`), not `/cuberun/static/...`, so it works under any installed
Mobius app id.
