<!--- header generated automatically, don't edit --->
[![Travis](https://img.shields.io/travis/NaridaL/tsgl.svg?style=flat-square)](https://travis-ci.org/NaridaL/tsgl)
[![npm](https://img.shields.io/npm/v/tsgl.svg?style=flat-square)](https://www.npmjs.com/package/tsgl)
[![David](https://img.shields.io/david/expressjs/express.svg?style=flat-square)](https://david-dm.org/NaridaL/tsgl)

# tsgl
Light TypeScript wrapper around WebGL based on https://github.com/evanw/lightgl.js/

## Installation
NPM:  `npm install tsgl --save`

In the browser, you can include the [UMD bundle](./dist/bundle.js) in a script tag, and the module will be available under the global `tsgl`

<!--- CONTENT-START --->
## Demos
<!--- DEMO-TABLE-START --->
||||
--- | --- | ---
[camera](https://naridal.github.io/tsgl/demo.html#camera) | [src](./src/demo/camera.ts) | Move camera using mouse.
[gpuLightMap](https://naridal.github.io/tsgl/demo.html#gpuLightMap) | [src](./src/demo/gpuLightMap.ts) | Draw soft shadows by calculating a light map in multiple passes.
[immediateMode](https://naridal.github.io/tsgl/demo.html#immediateMode) | [src](./src/demo/immediateMode.ts) | OpenGL-style immediate mode.
[mag](https://naridal.github.io/tsgl/demo.html#mag) | [src](./src/demo/mag.ts) | Calculate and render magnetic field lines.
[multiTexture](https://naridal.github.io/tsgl/demo.html#multiTexture) | [src](./src/demo/multiTexture.ts) | Blend two textures while rendering them to a quad.
[rayTracing](https://naridal.github.io/tsgl/demo.html#rayTracing) | [src](./src/demo/rayTracing.ts) | Realtime GPU ray tracing including reflection.
[renderToTexture](https://naridal.github.io/tsgl/demo.html#renderToTexture) | [src](./src/demo/renderToTexture.ts) | Render mesh to texture, then render that texture to another mesh.
[setupDemo](https://naridal.github.io/tsgl/demo.html#setupDemo) | [src](./src/demo/setupDemo.ts) | Draw a rotating cube.
[shadowMap](https://naridal.github.io/tsgl/demo.html#shadowMap) | [src](./src/demo/shadowMap.ts) | Draw shadow of a mesh using a shadow map.
<!--- DEMO-TABLE-END --->









<!--- CONTENT-END --->
<!--- footer generated automatically, don't edit --->
## License
[MIT](./LICENSE)
