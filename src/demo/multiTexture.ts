/// <reference path="../types.d.ts" />
import { Mesh, Texture, Shader, TSGLContext } from 'tsgl'
import { V3, V } from 'ts3dutils'

/**
 * Blend two textures while rendering them to a quad.
 */
export function multiTexture(gl: TSGLContext) {
	const mesh = Mesh.plane()
	const texture = Texture.fromURLSwitch('texture.png')
	const texture2 = Texture.fromURLSwitch('texture2.png')
	const shader = Shader.create<{ texture: 'SAMPLER_2D', texture2: 'SAMPLER_2D' }, {}>(`
	attribute vec2 ts_TexCoord;
	attribute vec4 ts_Vertex;
	uniform mat4 ts_ModelViewProjectionMatrix;
  varying vec2 coord;
  void main() {
    coord = ts_TexCoord;
    gl_Position = ts_ModelViewProjectionMatrix * ts_Vertex;
  }
`, `
	precision highp float;
  uniform sampler2D texture;
  uniform sampler2D texture2;
  varying vec2 coord;
  void main() {
    //gl_FragColor = vec4(coord.x, coord.y, 0, 1);
    gl_FragColor = texture2D(texture, coord) - texture2D(texture2, coord);
  }
`)
	gl.clearColor(1, 1, 1, 1)

	// setup camera
	gl.matrixMode(gl.PROJECTION)
	gl.loadIdentity()
	gl.perspective(40, gl.canvas.width / gl.canvas.height, 0.1, 1000)
	gl.lookAt(V(0, -2, 1.5), V3.O, V3.Z)
	gl.matrixMode(gl.MODELVIEW)

	gl.enable(gl.DEPTH_TEST)

	return gl.animate(function (abs, diff) {
		const angleDeg = abs / 1000 * 45
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
		gl.loadIdentity()

		//gl.translate(0, 0, -5)
		gl.rotate(angleDeg, 0, 0, 1)
		gl.translate(-0.5, -0.5)

		texture.bind(0)
		texture2.bind(1)
		shader.uniforms({
			texture: 0,
			texture2: 1,
		}).draw(mesh)
	})
}