/// <reference path="../types.d.ts" />

import { arrayFromFunction, clamp, DEG, Tuple2, V, V3 } from "ts3dutils"

import {
  isWebGL2RenderingContext,
  Mesh,
  Shader,
  Texture,
  TSGLContext,
} from "tsgl"

import rayTracerFS from "../shaders/rayTracerFS.glslx"
import rayTracerVS from "../shaders/rayTracerVS.glslx"

/**
 * Realtime GPU ray tracing including reflection.
 */
export async function rayTracing(gl: TSGLContext) {
  if (!isWebGL2RenderingContext(gl)) throw new Error("require webgl2")
  let angleX = 30
  let angleY = 10

  // This is the mesh we tell WebGL to draw. It covers the whole view so each pixel will get a fragment shader call.
  const mesh = Mesh.plane({ startX: -1, startY: -1, width: 2, height: 2 })

  // floor and dodecahedron are meshes we will ray-trace
  // add a vertex buffer "specular", which defines how reflective the mesh is.
  // specular=1 means it is perfectly reflective, specular=0 perfectly matte
  // meshes neeed coords vertex buffer as we will draw them with meshes
  const floor = Mesh.plane({ startX: -4, startY: -4, width: 8, height: 8 })
    .addVertexBuffer("specular", "specular")
    .rotateX(90 * DEG)
  floor.specular = floor.vertices.map((_) => 0) // floor doesn't reflect
  const dodecahedron = Mesh.sphere(0)
    .addVertexBuffer("specular", "specular")
    .addVertexBuffer("coords", "ts_TexCoord")
    .translate(3, 1)
  // d20 reflects most of the light
  dodecahedron.specular = dodecahedron.vertices.map((_) => 0.8)
  // all uv coordinates the same to pick a solid color from the texture
  dodecahedron.coords = dodecahedron.vertices.map(
    (_) => [0, 0] as Tuple2<number>,
  )

  // don't transform the vertices at all
  // out/in pos so we get the world position of the fragments
  const shader = Shader.create(rayTracerVS, rayTracerFS)

  // define spheres which we will have the shader ray-trace
  const sphereCenters = arrayFromFunction(
    8,
    (i) => [V(0.0, 1.6, 0.0), V(3, 3, 3), V(-3, 3, 3)][i] || V3.O,
  )
  const sphereRadii = arrayFromFunction(8, (i) => [1.5, 0.5, 0.5][i] || 0)

  // texture for ray-traced mesh
  const floorTexture = await Texture.fromURL("./mandelbrot.jpg")

  const showMesh = floor.concat(dodecahedron)
  const textureWidth = 1024
  const textureHeight = 1

  // verticesTexture contains the mesh vertices
  // vertices are unpacked so we don't have an extra index buffer for the triangles
  const verticesTexture = new Texture(textureWidth, textureHeight)
  const verticesBuffer = new Float32Array(textureWidth * textureHeight * 3)
  V3.pack(
    showMesh.TRIANGLES.map((i) => showMesh.vertices[i]),
    verticesBuffer,
  )
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGB32F,
    textureWidth,
    textureHeight,
    0,
    gl.RGB,
    gl.FLOAT,
    verticesBuffer,
  )

  // uvTexture contains the uv coordinates for the vertices as wel as the specular value for each vertex
  const uvTexture = new Texture(textureWidth, textureHeight, {
    format: gl.RGB,
    type: gl.FLOAT,
  })
  const uvBuffer = new Float32Array(textureWidth * textureHeight * 3)
  showMesh.TRIANGLES.forEach((i, index) => {
    uvBuffer[index * 3] = showMesh.coords[i][0]
    uvBuffer[index * 3 + 1] = showMesh.coords[i][1]
    uvBuffer[index * 3 + 2] = showMesh.specular[i]
  })
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGB32F,
    textureWidth,
    textureHeight,
    0,
    gl.RGB,
    gl.FLOAT,
    uvBuffer,
  )

  let lastPos = V3.O
  // scene rotation
  gl.canvas.onmousemove = function (e) {
    const pagePos = V(e.pageX, e.pageY)
    const delta = lastPos.to(pagePos)
    if (e.buttons & 1) {
      angleY += delta.x
      angleX = clamp(angleX + delta.y, -90, 90)
    }
    lastPos = pagePos
  }

  gl.matrixMode(gl.PROJECTION)
  gl.loadIdentity()

  verticesTexture.bind(0)
  floorTexture.bind(1)
  uvTexture.bind(2)
  shader.uniforms({
    "sphereCenters[0]": sphereCenters,
    "sphereRadii[0]": sphereRadii,
    vertices: 0,
    triangleTexture: 1,
    texCoords: 2,
  })

  return gl.animate(function (_abs, _diff) {
    // Camera setup
    gl.matrixMode(gl.MODELVIEW)
    gl.loadIdentity()
    // gl.perspective(70, gl.canvas.width / gl.canvas.height, 0.1, 1000)
    // gl.lookAt(V(0, 200, 200), V(0, 0, 0), V3.Z)
    gl.translate(0, 0, -10)
    gl.rotate(angleX, 1, 0, 0)
    gl.rotate(angleY, 0, 1, 0)
    gl.scale(0.2)

    shader.draw(mesh)

    // Draw debug output to show that the raytraced scene lines up correctly with
    // the rasterized scene
    gl.color(0, 0, 0, 0.5)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.begin(gl.LINES)
    for (let s = 4, i = -s; i <= s; i++) {
      gl.vertex(-s, 0, i)
      gl.vertex(s, 0, i)
      gl.vertex(i, 0, -s)
      gl.vertex(i, 0, s)
    }
    gl.end()
    gl.disable(gl.BLEND)
  })
}
;(rayTracing as any).info = "LMB-drag to rotate camera."
