<!--- header generated automatically, don't edit --->
[![Travis](https://img.shields.io/travis/NaridaL/tsgl.svg?style=flat-square)](https://travis-ci.org/NaridaL/tsgl)
[![npm](https://img.shields.io/npm/v/tsgl.svg?style=flat-square)](https://www.npmjs.com/package/tsgl)
[![David](https://img.shields.io/david/expressjs/express.svg?style=flat-square)](https://david-dm.org/NaridaL/tsgl)

# tsgl
Light TypeScript wrapper around WebGL

## Installation
NPM:  `npm install tsgl --save`

In the browser, you can include the [UMD bundle](./dist/bundle.js) in a script tag, and the module will be available under the global `tsgl`

<!--- CONTENT-START --->
## Demos
<!--- DEMO-TABLE-START --->
||||
--- | --- | ---
[setupDemo](https://naridal.github.io/tsgl/demo.html#setupDemo) | [src](./src/demo.ts#L19-L50) | Draw a rotating cube.
[multiTexture](https://naridal.github.io/tsgl/demo.html#multiTexture) | [src](./src/demo.ts#L55-L101) | Blend two textures while rendering them to a quad.
[camera](https://naridal.github.io/tsgl/demo.html#camera) | [src](./src/demo.ts#L106-L189) | Move camera using mouse.
[immediateMode](https://naridal.github.io/tsgl/demo.html#immediateMode) | [src](./src/demo.ts#L194-L253) | OpenGL-style immediate mode.
[renderToTexture](https://naridal.github.io/tsgl/demo.html#renderToTexture) | [src](./src/demo.ts#L258-L344) | Render mesh to texture, then render that texture to another mesh.
[shadowMap](https://naridal.github.io/tsgl/demo.html#shadowMap) | [src](./src/demo.ts#L349-L600) | Draw shadow of a mesh using a shadow map.
[gpuLightMap](https://naridal.github.io/tsgl/demo.html#gpuLightMap) | [src](./src/demo.ts#L735-L1094) | Draw soft shadows by calculating a light map in multiple passes.
[mag](https://naridal.github.io/tsgl/demo.html#mag) | [src](./src/demo.ts#L1128-L1258) | Calculate and render magnetic field lines.
<!--- DEMO-TABLE-END --->





<!--- CONTENT-END --->
<!--- footer generated automatically, don't edit --->
LICENSE
MIT
