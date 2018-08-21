import { V, V3 } from 'ts3dutils'
import { Mesh, Shader, TSGLContext } from 'tsgl'

/**
 * Draw a rotating cube.
 */
export function setupDemo(gl: TSGLContext) {
	const mesh = Mesh.cube()
	const shader = Shader.create<{ color: 'FLOAT_VEC4' }, {}>(
		`
		uniform mat4 ts_ModelViewProjectionMatrix;
		attribute vec4 ts_Vertex;
		varying vec4 foo;
		void main() {
			foo = vec4(1.0, 1.0, 1.0, 1.0);
			gl_Position = ts_ModelViewProjectionMatrix * ts_Vertex;
		}
	`,
		`
		precision highp float;
		uniform vec4 color;
		varying vec4 bar;
		void main() {
			gl_FragColor = color;
		}
	`,
	)

	// setup camera
	gl.matrixMode(gl.PROJECTION)
	gl.loadIdentity()
	gl.perspective(70, gl.canvas.width / gl.canvas.height, 0.1, 1000)
	gl.lookAt(V(0, -2, 1.5), V3.O, V3.Z)
	gl.matrixMode(gl.MODELVIEW)

	gl.enable(gl.DEPTH_TEST)

	return gl.animate(function(abs, _diff) {
		const angleDeg = (abs / 1000) * 45
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
		gl.loadIdentity()
		gl.rotate(angleDeg, 0, 0, 1)
		gl.scale(1.5)
		gl.translate(-0.5, -0.5, -0.5)

		shader.uniforms({ color: [1, 1, 0, 1] }).draw(mesh)
		shader.uniforms({ color: [0, 0, 0, 1] }).draw(mesh, gl.LINES)
	})
}
