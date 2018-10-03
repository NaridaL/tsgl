/// <reference path="../types.d.ts" />
import { color } from 'chroma.ts'
import { AABB, arrayFromFunction, DEG, M4, time, V, V3 } from 'ts3dutils'
import { Mesh, Shader, TSGLContext } from 'tsgl'
import posNormalColorVS from '../shaders/posNormalColorVS.glslx'
import varyingColorFS from '../shaders/varyingColorFS.glslx'

/**
 * Calculate and render magnetic field lines.
 */
export function mag(gl: TSGLContext) {
	const cubeMesh = Mesh.cube()
	// simple pos/color
	const shader = Shader.create(posNormalColorVS, varyingColorFS)
	gl.clearColor(1, 1, 1, 1)

	type PointCharge = { pos: V3; charge: number }

	// given a magnetic field created by fieldCharges, calculate the field strength/dir at pos
	function fieldAtPos(fieldCharges: PointCharge[], pos: V3) {
		const fieldChargeForces = fieldCharges.map(p => {
			const posToP = pos.to(p.pos)
			const r = posToP.length()
			const partialForceMagnitude = p.charge / r / r
			const partialForce = posToP.toLength(partialForceMagnitude)
			return partialForce
		})
		return V3.add(...fieldChargeForces)
	}

	/**
	 * Iteratively calculate a field line
	 * @param fieldCharges charge defining magnetic field
	 * @param bounds within which to calc field lines
	 * @param start start point of field line
	 * @param dir step size to take. negative to plot field line in reverse
	 */
	function* qPath(fieldCharges: PointCharge[], bounds: AABB, start: V3, dir: number) {
		let pos = start,
			f,
			i = 0
		while (true) {
			f = fieldAtPos(fieldCharges, pos)
			pos = pos.plus(f.toLength(dir))

			if (
				!bounds.containsPoint(pos) || // pos outside bounds
				i++ > 1000 || // to many iterations
				f.squared() > 2.5e7 // force to high, i.e. to close to charge
			)
				break
			yield pos
		}
	}

	/**
	 * Returns array of PointCharges to model a bar magnet.
	 * @param count
	 */
	function barMagnet(count = 4) {
		return arrayFromFunction(count * count, i => {
			const x = i % count
			const y = (i / count) | 0
			return { pos: V((0.5 + x) / count, (0.5 + y) / count, 0), charge: +(x < count / 2) || -1 }
		})
	}

	const enabledBarMagnets = [true, true, true, true, true]
	const barMagnetMatrices = [
		M4.scale(0.2, 0.1, 0.02)
			.rotateZ(20 * DEG)
			.translate(0.5, 0.5, 0.1),
		M4.scale(0.1, 0.05, 0.02)
			.rotateZ(60 * DEG)
			.translate(0.2, 0.1),
		M4.scale(0.2, 0.02, 0.02)
			.rotateY(-100 * DEG)
			.rotateZ(120 * DEG)
			.translate(0.2, 0.8),
		M4.scale(0.2, 0.1, 0.02)
			.rotateX(90 * DEG)
			.rotateZ(270 * DEG)
			.translate(0.9, 0.4, 0.1),
		M4.scale(0.2, 0.1, 0.02)
			.rotateX(90 * DEG)
			.rotateZ(270 * DEG)
			.translate(0.9, 0.9, 0.1),
	]

	const bounds = new AABB(V3.O, V(1, 1, 0.3))
	let linesDensity = 10
	const linesMesh = new Mesh().addIndexBuffer('LINES')

	function calculateFieldLines() {
		const ps: PointCharge[] = []
		barMagnetMatrices.forEach(
			(mat, index) =>
				enabledBarMagnets[index] &&
				ps.push(
					...barMagnet(6).map(p => {
						p.pos = mat.transformPoint(p.pos)
						return p
					}),
				),
		)

		linesMesh.LINES.clear()
		linesMesh.vertices.clear()
		console.log(
			'generation took (ms): ' +
				time(() => {
					for (const [x, y, z] of grid3d(linesDensity, linesDensity, Math.ceil(0.4 * linesDensity))) {
						const start = V(x, y, z * bounds.max.z)
						linesMesh.vertices.push(start)
						const STEP = 0.01
						for (const p of qPath(ps, bounds, start, STEP)) {
							linesMesh.vertices.push(p)
							linesMesh.LINES.push(linesMesh.vertices.length - 2, linesMesh.vertices.length - 1)
						}
						linesMesh.vertices.push(start)
						for (const p of qPath(ps, bounds, start, -STEP)) {
							linesMesh.vertices.push(p)
							linesMesh.LINES.push(linesMesh.vertices.length - 2, linesMesh.vertices.length - 1)
						}
					}
				}),
		)
		linesMesh.compile()
	}

	calculateFieldLines()

	const vectorFieldMesh = new Mesh()

	const fieldLinesXSide = 64
	const vectorFieldVectorLength = (2 * 0.9) / fieldLinesXSide
	vectorFieldMesh.vertices = ballGrid(fieldLinesXSide).flatMap(p => [
		new V3(p.x, p.y, -vectorFieldVectorLength / 2),
		new V3(p.x, p.y, vectorFieldVectorLength / 2),
	])

	// vectorFieldMesh.vertices = arrayFromFunction(fieldLinesXSide * fieldLinesXSide * 2, i => {
	//     const startOrEnd = i % 2
	//     const x = ((i / 2) | 0) % fieldLinesXSide
	//     const y = ((i / 2 / fieldLinesXSide) | 0) % fieldLinesXSide
	//     return new V3(x / fieldLinesXSide, y / fieldLinesXSide, (startOrEnd || -1) * 0.01)
	// })
	vectorFieldMesh.compile()

	// setup camera
	gl.matrixMode(gl.PROJECTION)
	gl.loadIdentity()
	gl.perspective(45, gl.canvas.width / gl.canvas.height, 0.1, 1000)
	gl.lookAt(V(0.5, 2, 1), V(0.5, 0.5), V3.Z)
	gl.matrixMode(gl.MODELVIEW)
	gl.clearColor(1, 1, 1, 0)

	gl.enable(gl.DEPTH_TEST)

	// vectorFieldShader.uniforms({
	// 	'ps[0]': ps as any,
	// 	color: chroma('red').gl(),
	// })

	gl.canvas.tabIndex = 0
	gl.canvas.focus()

	gl.canvas.addEventListener('keypress', e => {
		const index = e.key.charCodeAt(0) - '1'.charCodeAt(0)
		if (0 <= index && index <= 4) {
			enabledBarMagnets[index] = !enabledBarMagnets[index]
			calculateFieldLines()
		}

		if (e.key == '+' && linesDensity < 50) {
			linesDensity++
			calculateFieldLines()
		}

		if (e.key == '-' && linesDensity > 1) {
			linesDensity--
			calculateFieldLines()
		}
	})

	return gl.animate(function(abs, _diff) {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
		gl.loadIdentity()
		gl.multMatrix(M4.rotateLine(V(0.5, 0.5), V3.Z, abs / 5000))
		// gl.translate(-1, -1, -1)
		// gl.scale(2)

		shader.attributes({ ts_Color: color('black').gl() }).draw(linesMesh, gl.LINES)
		barMagnetMatrices.forEach((mat, index) => {
			if (enabledBarMagnets[index]) {
				gl.pushMatrix()
				gl.multMatrix(mat)
				gl.scale(0.5, 1, 1)
				shader.attributes({ ts_Color: color('red').gl() }).draw(cubeMesh, gl.LINES)
				gl.translate(1, 0)
				shader.attributes({ ts_Color: color('blue').gl() }).draw(cubeMesh, gl.LINES)
				gl.popMatrix()
			}
		})
		gl.scale(bounds.max)
		shader.attributes({ ts_Color: color('grey').gl() }).draw(cubeMesh, gl.LINES)
		// vectorFieldShader.drawBuffers(vectorFieldMesh.vertexBuffers, undefined, DRAW_MODES.LINES)
	})
}

/**
 * Returns a 1d array of V3s in a 2d-grid. The V3s are all within [0; 1]²
 * The V3s are spaced like circles fit together as tight as possible. i.e. rows offset by half the x-spacing.
 * .   .   .
 *   .   .   .
 * .   .   .
 *
 * @param xCount
 */
function ballGrid(xCount = 64) {
	const xSpacing = 1 / xCount
	const ySpacing = (xSpacing * Math.sqrt(3)) / 2
	const yCount = (1 / ySpacing) | 0
	return arrayFromFunction(xCount * yCount, i => {
		const x = i % xCount
		const y = (i / xCount) | 0
		return new V3((x + (y % 2) * 0.5) / xCount, y / yCount, 0)
	})
}

function grid3d(xCount = 64, yCount = xCount, zCount = 1) {
	return arrayFromFunction(xCount * yCount * zCount, i => {
		const x = i % xCount
		const y = (i / xCount) % yCount | 0
		const z = (i / xCount / yCount) | 0
		return new V3(x / xCount, y / yCount, z / zCount)
	})
}

;(mag as any).info = 'Press keys 1-5 to toggle magnets, +/- to change to number of field lines.'
