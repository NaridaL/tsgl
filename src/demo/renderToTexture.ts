import { arrayFromFunction, lerp, V, V3 } from "ts3dutils"
import { Mesh, Shader, Texture, TSGLContext } from "tsgl"

import gazeboJSON from "../../gazebo.json"

const { sin, PI } = Math

/**
 * Render mesh to texture, then render that texture to another mesh.
 */
export function renderToTexture(gl: TSGLContext) {
  const mesh = Mesh.load(gazeboJSON)
  const sinVertices = arrayFromFunction(32, (i) => {
    const x = lerp(-PI, PI, i / 31)
    const y = sin(x)
    return new V3(x / 7.64, y / 7.64, 0)
  })
  const cyl = Mesh.offsetVertices(sinVertices, V3.Z, false)
  const plane = Mesh.plane()
  const texture = Texture.fromURLSwitch("texture.png")
  const overlay = new Texture(1024, 1024)
  const meshShader = Shader.create(
    `
	attribute vec3 ts_Normal;
	attribute vec4 ts_Vertex;
	uniform mat4 ts_ModelViewProjectionMatrix;
  varying vec3 normal;
  void main() {
    normal = ts_Normal;
    gl_Position = ts_ModelViewProjectionMatrix * ts_Vertex;
  }
`,
    `
	precision highp float;
  varying vec3 normal;
  void main() {
    gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
  }
`,
  )
  const planeShader = Shader.create(
    `
	attribute vec2 ts_TexCoord;
	attribute vec4 ts_Vertex;
	uniform mat4 ts_ModelViewProjectionMatrix;
  varying vec2 coord;
  void main() {
    coord = ts_TexCoord.xy;
    gl_Position = ts_ModelViewProjectionMatrix * ts_Vertex;
  }
`,
    `
	precision highp float;
  uniform sampler2D texture;
  uniform sampler2D overlay;
  varying vec2 coord;
  void main() {
    gl_FragColor = (texture2D(overlay, coord) + texture2D(texture, coord)) / 2.0;
  }
`,
  )

  gl.clearColor(1, 1, 1, 1)
  gl.enable(gl.DEPTH_TEST)

  return gl.animate(function (abs) {
    const angleDeg = (abs / 1000) * 20

    gl.pushMatrix()
    overlay.drawTo(function (gl: TSGLContext) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.matrixMode(gl.PROJECTION)
      gl.loadIdentity()
      gl.perspective(60, 1, 0.1, 1000)
      gl.lookAt(V(0, -2, 0.5), V(0, 0, 0.5), V3.Z)
      gl.matrixMode(gl.MODELVIEW)
      gl.loadIdentity()
      gl.rotate(angleDeg, 0, 0, 1)
      gl.rotate(90, 1, 0, 0)
      gl.scale(0.01, 0.01, 0.01)
      meshShader.draw(mesh)
    })
    gl.popMatrix()

    gl.matrixMode(gl.PROJECTION)
    gl.loadIdentity()
    gl.perspective(70, gl.canvas.width / gl.canvas.height, 0.1, 1000)
    gl.lookAt(V(0, -2, 1), V(0.5, 0, 0), V3.Z)
    gl.matrixMode(gl.MODELVIEW)

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    texture.bind(0)
    overlay.bind(1)
    planeShader.uniforms({
      texture: 0,
      overlay: 1,
    })

    gl.loadIdentity()
    //gl.rotate(angleDeg, 0, 0, 1)
    //gl.rotate(30 * DEG, 1, 0, 0)
    //gl.rotate(90, 0,0,1)
    planeShader.draw(cyl)

    gl.loadIdentity()
    gl.rotate(90, 1, 0, 0)
    gl.translate(0.5, 0)
    planeShader.draw(plane)
  })
}
