/// <reference path="../types.d.ts" />
import { V3, DEG, V, clamp } from 'ts3dutils'
import { LightGLContext, Mesh, Shader } from 'tsgl'

/**
 * Move camera using mouse.
 */
export function camera(gl: LightGLContext) {
	let yRot = -10 * DEG
	let zRot = 90 * DEG
	let camera = new V3(0, -5, 1)
	const mesh = Mesh.sphere().computeWireframeFromFlatTriangles().compile()
	const shader = Shader.create(`
precision mediump float;
attribute vec3 LGL_Normal;
attribute vec4 LGL_Vertex;
uniform mat4 LGL_ModelViewProjectionMatrix;
varying vec3 normal;
void main() {
	normal = LGL_Normal;
	gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
}
`, `
precision mediump float;
uniform float brightness;
varying vec3 normal;
void main() {
	gl_FragColor = vec4(brightness * (normal * 0.5 + 0.5), 1.0);
}
`)

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

	return gl.animate(function (abs, diff) {
		const angleDeg = abs / 1000 * 45
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
		gl.loadIdentity()
		const speed = diff / 1000 * 4

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

		shader.uniforms({ brightness: 1 }).draw(mesh, gl.TRIANGLES)
		shader.uniforms({ brightness: 0 }).draw(mesh, gl.LINES)
	})
}

(camera as any).info = 'LMB-drag to move camera.'