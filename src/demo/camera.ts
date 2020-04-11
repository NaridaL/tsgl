/// <reference path="../types.d.ts" />
import { clamp, DEG, V, V3 } from 'ts3dutils'
import { Mesh, Shader, TSGLContext } from 'tsgl'

import { color } from 'chroma.ts'
// import posNormalColorVS from '../shaders/posNormalColorVS.glslx'
const posNormalColorVS = ' lol'

/**
 * Move camera using mouse.
 */
export function camera(gl: TSGLContext) {
	let yRot = -10 * DEG
	let zRot = 90 * DEG
	let camera = new V3(0, -5, 1)
	const mesh = Mesh.sphere().computeWireframeFromFlatTriangles().compile()
	const shader = Shader.create(
		posNormalColorVS,
		`
precision mediump float;
uniform float brightness;
varying vec3 normal;
void main() {
	gl_FragColor = vec4(brightness * (normal * 0.5 + 0.5), 1.0);
}
`,
	)

	let lastPos = V3.O
	// scene rotation
	gl.canvas.onmousemove = function (e) {
		const pagePos = V(e.pageX, e.pageY)
		const delta = lastPos.to(pagePos)
		if (e.buttons & 1) {
			zRot -= delta.x * 0.25 * DEG
			yRot = clamp(yRot - delta.y * 0.25 * DEG, -85 * DEG, 85 * DEG)
		}
		lastPos = pagePos
	}
	gl.canvas.contentEditable = 'true'
	const keys: { [key: string]: boolean } = {}
	gl.canvas.onkeydown = function (e) {
		keys[e.code] = true
	}
	gl.canvas.onkeyup = function (e) {
		keys[e.code] = false
	}

	gl.clearColor(1, 1, 1, 1)

	// setup camera

	gl.enable(gl.CULL_FACE)
	gl.enable(gl.POLYGON_OFFSET_FILL)
	gl.polygonOffset(1, 1)
	gl.clearColor(0.8, 0.8, 0.8, 1)
	gl.enable(gl.DEPTH_TEST)

	gl.vertexAttrib1f(0, 42)
	gl.enableVertexAttribArray(0)
	console.log(gl.getVertexAttrib(0, gl.CURRENT_VERTEX_ATTRIB))
	console.log(gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_ENABLED))

	const gl2 = (gl as any) as WebGL2RenderingContext
	const vao = gl2.createVertexArray()
	gl2.bindVertexArray(vao)
	gl2.vertexAttrib1f(0, 31)
	console.log(gl.getVertexAttrib(0, gl.CURRENT_VERTEX_ATTRIB))
	console.log(gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_ENABLED))

	gl2.bindVertexArray(null)
	console.log(gl.getVertexAttrib(0, gl.CURRENT_VERTEX_ATTRIB))
	console.log(gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_ENABLED))

	return gl.animate(function (_abs, diff) {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
		gl.loadIdentity()
		const speed = (diff / 1000) * 4

		// Forward movement
		const forwardMov = +!!(keys.KeyW || keys.ArrowUp) - +!!(keys.KeyS || keys.ArrowDown)
		const forwardV3 = V3.sphere(zRot, yRot)

		// Sideways movement
		const sideMov = +!!(keys.KeyA || keys.ArrowLeft) - +!!(keys.KeyD || keys.ArrowRight)
		const sideV3 = V3.sphere(zRot + Math.PI / 2, 0)

		const movementV3 = forwardV3.times(forwardMov).plus(sideV3.times(sideMov))
		camera = movementV3.likeO() ? camera : camera.plus(movementV3.toLength(speed))

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

		gl.matrixMode(gl.PROJECTION)
		gl.loadIdentity()
		gl.perspective(70, gl.canvas.width / gl.canvas.height, 0.1, 1000)
		gl.lookAt(camera, camera.plus(forwardV3), V3.Z)

		gl.matrixMode(gl.MODELVIEW)
		gl.loadIdentity()
		gl.rotate(-zRot, 0, 0, 1)
		gl.rotate(-yRot, 0, 1, 0)
		gl.translate(-camera.x, -camera.y, -camera.z)

		shader
			.uniforms({ brightness: 1 })
			.attributes({ ts_Color: color('red').gl() })
			.draw(mesh, gl.TRIANGLES)
		shader.uniforms({ brightness: 0 }).draw(mesh, gl.LINES)
	})
}

;(camera as any).info = 'LMB-drag to move camera.'
