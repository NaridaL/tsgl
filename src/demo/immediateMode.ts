/// <reference path="../types.d.ts" />
import { V, V3 } from 'ts3dutils'
import { TSGLContext } from 'tsgl'

/**
 * OpenGL-style immediate mode.
 */
export function immediateMode(gl: TSGLContext) {
	// setup camera
	gl.disable(gl.CULL_FACE)
	gl.matrixMode(gl.PROJECTION)
	gl.loadIdentity()
	gl.perspective(90, gl.canvas.width / gl.canvas.height, 0.0001, 1000000)
	gl.lookAt(V(0, -3, 2), V3.O, V3.Z)
	gl.matrixMode(gl.MODELVIEW)

	gl.enable(gl.DEPTH_TEST)
	gl.clearColor(1, 1, 1, 0)

	return gl.animate(function (abs, _diff) {
		const angleDeg = (abs / 1000) * 45
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
		gl.loadIdentity()
		// gl.translate(0, 0, -5)
		gl.rotate(angleDeg, 0, 0, 1)

		gl.color(0.5, 0.5, 0.5)
		gl.lineWidth(1)
		gl.begin(gl.LINES)
		for (let i = -10; i <= 10; i++) {
			gl.vertex(i, -10, 0)
			gl.vertex(i, +10, 0)
			gl.vertex(-10, i, 0)
			gl.vertex(+10, i, 0)
		}
		gl.end()

		gl.pointSize(10)
		gl.begin(gl.POINTS)

		gl.color(1, 0, 0)
		gl.vertex(1, 0, 0)

		gl.color(0, 1, 0)
		gl.vertex(0, 1, 0)

		gl.color(0, 0, 1)
		gl.vertex(0, 0, 1)

		gl.end()

		gl.lineWidth(2)
		gl.begin(gl.LINE_LOOP)
		gl.color('red')
		gl.vertex(1, 0, 0)
		gl.color('green')
		gl.vertex(0, 1, 0)
		gl.color('blue')
		gl.vertex(0, 0, 1)
		gl.end()

		gl.begin(gl.TRIANGLES)
		gl.color(1, 1, 0)
		gl.vertex(0.5, 0.5, 0)
		gl.color(0, 1, 1)
		gl.vertex(0, 0.5, 0.5)
		gl.color(1, 0, 1)
		gl.vertex(0.5, 0, 0.5)
		gl.end()
	})
}
