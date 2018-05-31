import {
	AABB, arrayFromFunction, assert, assertVectors, int, lerp, M4, NLA_PRECISION, raddd, Transformable, Tuple3, V, V3, eq0,
} from 'ts3dutils'

import {currentGL, GL_COLOR, pushQuad, TSGLContext, Buffer} from './index'

const {cos, sin, PI, min, max} = Math

const WGL = WebGLRenderingContext as any as WebGLRenderingContextStrict.Constants

export interface MeshData {
	normals: V3[]
	coords: [number, number][]
	colors: GL_COLOR[]
	TRIANGLES: int[]
	LINES: int[]
}
export type MeshWith<T extends keyof MeshData = never> = Mesh & Pick<MeshData, T>

/**
 * @example new Mesh()
 *        .addIndexBuffer('TRIANGLES')
 *        .addIndexBuffer('LINES')
 *        .addVertexBuffer('normals', 'ts_Normal')
 */
export class Mesh extends Transformable {
	hasBeenCompiled: boolean = false
	vertexBuffers: { [name: string]: Buffer } = {}
	indexBuffers: { [name: string]: Buffer } = {}

	vertices: V3[]
	normals?: V3[]

	constructor() {
		super()
		this.addVertexBuffer('vertices', 'ts_Vertex')
	}

	/**
	 * Calculate area, volume and centroid of the mesh.
	 *
	 * The area is the sum of the areas of the triangles.
	 *
	 * For closed meshes, the volume is the contained volume. If the volume is inside-out, i.e. the face normals point
	 * inwards, the returned value is negative. In general, this calculates the sum of the z-direction shadow volumes
	 * of the triangles. The z-dir shadow volume is the cut-off prism with the triangle projected onto the XY plane as
	 * the base face and the triangle itself as the top face.
	 *
	 * The centroid is the "mean point of all points inside the volume". If a uniform density is assumed, this is
	 * equivalent to the center of gravity. In general, this calculates the weighted average of the centroids of all the
	 * triangle shadow volumes.
	 */
	calcVolume(this: Mesh & { TRIANGLES: int[] }): { volume: number, centroid: V3, area: number } {
		let totalVolumeX2 = 0, totalCentroidWithZX2 = V3.O, totalAreaX2 = 0
		const triangles = this.TRIANGLES
		const vertices = this.vertices
		for (let i = 0; i < triangles.length; i += 3) {
			const ai = triangles[i + 0], bi = triangles[i + 1], ci = triangles[i + 2]
			const a = vertices[ai], b = vertices[bi], c = vertices[ci]
			const ab = b.minus(a), ac = c.minus(a)
			const normal = ab.cross(ac)
			//const centroidZ = (v0.z + v1.z + v2.z) / 3
			const faceCentroid = V3.add(a, b, c).div(3)
			//totalVolume += centroidZ * (area === v01.cross(v02).length() / 2) * v01.cross(v02).unit().z
			totalVolumeX2 += faceCentroid.z * normal.z
			const faceAreaX2 = normal.length()
			totalAreaX2 += faceAreaX2

			// NB: the shadow volume centroid does NOT have the same XY coordinates
			// as the face centroid.
			// calculate the weighted centroid of the shadow volume:
			// faceShadowCentroid = INTEGRATE [0; 1] (
			//   INTEGRATE [0; 1 - s] (
			//     normal.z *
			//     ((1 - s - t) a + s b + t c) *
			//     ((1 - s - t) a + s b + t c).z
			//   ) dt
			// ) ds
			// = (a (2 a.z + b.z + c.z) + b (a.z + 2 b.z + c.z) + c (a.z + b.z + 2 c.z)) / 24
			const faceShadowCentroid = V3.add(
				a.times(2 * a.z + b.z + c.z),
				b.times(a.z + 2 * b.z + c.z),
				c.times(a.z + b.z + 2 * c.z),
			).times(normal.z) // 1/24 factor is done at very end
			totalCentroidWithZX2 = totalCentroidWithZX2.plus(faceShadowCentroid)
		}
		// sumInPlaceTree adds negligible additional accuracy for XY sphere
		const volume = totalVolumeX2 / 2
		return {
			volume,
			centroid: eq0(volume) ? V3.O: totalCentroidWithZX2.div(24*volume).schur(new V3(1, 1, 0.5)),
			area: totalAreaX2 / 2
		}
	}

	/**
	 * Add a new vertex buffer with a list as a property called `name` on this object and map it to
	 * the attribute called `attribute` in all shaders that draw this mesh.
	 * @example new Mesh().addVertexBuffer('coords', 'ts_TexCoord')
	 */
	addVertexBuffer<K extends string>(name: K, attribute: string): this & { [k in K]: any[] } {
		assert(!this.vertexBuffers[attribute], 'Buffer ' + attribute + ' already exists.')
		//assert(!this[name])
		this.hasBeenCompiled = false
		assert('string' == typeof name)
		assert('string' == typeof attribute)
		const buffer = this.vertexBuffers[attribute] = new Buffer(WGL.ARRAY_BUFFER, Float32Array)
		buffer.name = name
		;(this as any)[name] = []
		return this as any
	}

	/**
	 * Add a new index buffer.
	 * @example new Mesh().addIndexBuffer('TRIANGLES')
	 * @example new Mesh().addIndexBuffer('LINES')
	 */
	addIndexBuffer<K extends string>(name: K): this & { [k in K]: int[] } {
		this.hasBeenCompiled = false
		const buffer = this.indexBuffers[name] = new Buffer(WGL.ELEMENT_ARRAY_BUFFER, Uint16Array)
		buffer.name = name
		;(this as any)[name] = []
		return this as any
	}

	concat<T extends Mesh>(...others: T[]): T {
		const mesh = new Mesh() as any
		;[this as Mesh].concat(others).forEach((oldMesh: any) => {
			const startIndex = mesh.vertices ? mesh.vertices.length : 0
			Object.getOwnPropertyNames(oldMesh.vertexBuffers).forEach(attribute => {
				const bufferName = this.vertexBuffers[attribute].name!
				if (!mesh.vertexBuffers[attribute]) {
					mesh.addVertexBuffer(bufferName, attribute)
				}
				mesh[bufferName].push(...oldMesh[bufferName])
			})
			Object.getOwnPropertyNames(oldMesh.indexBuffers).forEach(name => {
				if (!mesh.indexBuffers[name]) {
					mesh.addIndexBuffer(name)
				}
				mesh[name].push(...(oldMesh[name] as int[]).map(index => index + startIndex))
			})
		})
		return mesh
	}

	/**
	 * Upload all attached buffers to the GPU in preparation for rendering. This doesn't need to be called every
	 * frame, only needs to be done when the data changes.
	 *
	 * Sets `this.hasBeenCompiled` to true.
	 */
	compile(gl: TSGLContext = currentGL()) {
		// figure out shortest vertex buffer to make sure indexBuffers are in bounds
		let minVertexBufferLength = Infinity// TODO, _minBufferName
		Object.getOwnPropertyNames(this.vertexBuffers).forEach(attribute => {
			const buffer = this.vertexBuffers[attribute]
			buffer.data = (this as any)[buffer.name!]
			buffer.compile(undefined, gl)
			if ((this as any)[buffer.name!].length < minVertexBufferLength) {
				// _minBufferName = attribute
				minVertexBufferLength = (this as any)[buffer.name!].length
			}
		})

		for (const name in this.indexBuffers) {
			const buffer = this.indexBuffers[name]
			buffer.data = (this as any)[buffer.name!]
			buffer.compile(undefined, gl)
			// if (NLA_DEBUG && buffer.maxValue >= minVertexBufferLength) {
			// 	throw new Error(`max index value for buffer ${name}
			// 	is too large ${buffer.maxValue} min Vbuffer size: ${minVertexBufferLength} ${minBufferName}`)
			// }
		}
		this.hasBeenCompiled = true
		return this
	}

	static async fromBinarySTL(stl: Blob) {
		return new Promise<Mesh & { normals: V3[] }>((resolve, reject) => {
			const mesh = new Mesh()
				.addVertexBuffer('normals', 'ts_Normal')
			const fileReader = new FileReader()
			fileReader.onerror = reject
			fileReader.onload = function (_progressEvent) {
				const dataView = new DataView(this.result)
				const HEADER_BYTE_SIZE = 80
				const triangleCount = dataView.getUint32(HEADER_BYTE_SIZE, true)
				mesh.normals.length = triangleCount * 3
				mesh.vertices.length = triangleCount * 3
				let i = triangleCount * 3, bufferPtr = HEADER_BYTE_SIZE + 4

				function readV3() {
					const x = dataView.getFloat32(bufferPtr, true)
					bufferPtr += 4
					const y = dataView.getFloat32(bufferPtr, true)
					bufferPtr += 4
					const z = dataView.getFloat32(bufferPtr, true)
					bufferPtr += 4
					return new V3(x, y, z)
				}

				while (i) {
					i -= 3
					const normal = readV3()
					mesh.normals[i + 0] = normal
					mesh.normals[i + 1] = normal
					mesh.normals[i + 2] = normal
					mesh.vertices[i + 0] = readV3()
					mesh.vertices[i + 1] = readV3()
					mesh.vertices[i + 2] = readV3()

					bufferPtr += 2
				}
				resolve(mesh)
			}
			fileReader.readAsArrayBuffer(stl)
		})
	}

	toBinarySTL(this: Mesh & { TRIANGLES: number[] }): Blob {
		if (!this.TRIANGLES) throw new Error('TRIANGLES must be defined.')
		const HEADER_BYTE_SIZE = 80, FLOAT_BYTE_SIZE = 4
		const triangles = this.TRIANGLES
		const triangleCount = triangles.length / 3
		const buffer = new ArrayBuffer(HEADER_BYTE_SIZE + 4 + triangleCount * (4 * 3 * FLOAT_BYTE_SIZE + 2))
		const dataView = new DataView(buffer)
		dataView.setUint32(HEADER_BYTE_SIZE, triangleCount, true)
		let bufferPtr = HEADER_BYTE_SIZE + 4
		let i = triangles.length
		while (i) {
			i -= 3
			const a = this.vertices[triangles[i]], b = this.vertices[triangles[i + 1]],
				c = this.vertices[triangles[i + 2]]
			const normal = V3.normalOnPoints(a, b, c)

			;[normal, a, b, c].forEach(v => {
				dataView.setFloat32(bufferPtr, v.x, true)
				bufferPtr += 4
				dataView.setFloat32(bufferPtr, v.y, true)
				bufferPtr += 4
				dataView.setFloat32(bufferPtr, v.z, true)
				bufferPtr += 4
			})
			// skip 2 bytes, already initalized to zero
			bufferPtr += 2
		}
		assert(bufferPtr == buffer.byteLength, bufferPtr + ' ' + buffer.byteLength)
		return new Blob([buffer], {type: 'application/octet-stream'})

	}

	/**
	 * Transform all vertices by `matrix` and all normals by the inverse transpose of `matrix`.
	 *
	 * Index buffer data is referenced.
	 */
	transform(m4: M4): this {
		const mesh = new Mesh()
		mesh.vertices = m4.transformedPoints(this.vertices)
		if (this.normals) {
			mesh.addVertexBuffer('normals', 'ts_Normal')
			const invTrans = m4.as3x3().inversed().transposed().normalized()
			mesh.normals = this.normals.map(n => invTrans.transformVector(n).unit())
			// mesh.normals.forEach(n => assert(n.hasLength(1)))
		}
		for (const name in this.indexBuffers) {
			mesh.addIndexBuffer(name)
			;(mesh as any)[name] = (this as any)[name]
		}
		for (const attribute in this.vertexBuffers) {
			if ('ts_Vertex' !== attribute && 'ts_Normal' !== attribute) {
				const name = this.vertexBuffers[attribute].name!
				mesh.addVertexBuffer(name, attribute)
				;(mesh as any)[name] = (this as any)[name]
			}
		}
		this.hasBeenCompiled && mesh.compile()
		return mesh as this
	}

	/**
	 * Computes a new normal for each vertex from the average normal of the neighboring triangles. This means
	 * adjacent triangles must share vertices for the resulting normals to be smooth.
	 */
	computeNormalsFromFlatTriangles(this: Mesh & { TRIANGLES: int[] }): this & { normals: V3[] } {
		if (!this.normals) this.addVertexBuffer('normals', 'ts_Normal')
		// tslint:disable:no-string-literal
		//this.vertexBuffers['ts_Normal'].data = arrayFromFunction(this.vertices.length, i => V3.O)

		const TRIANGLES = this.TRIANGLES, vertices = this.vertices, normals = this.normals!
		normals.length = vertices.length
		for (let i = 0; i < TRIANGLES.length; i += 3) {
			const ai = TRIANGLES[i], bi = TRIANGLES[i + 1], ci = TRIANGLES[i + 2]
			const a = vertices[ai]
			const b = vertices[bi]
			const c = vertices[ci]
			const normal = b.minus(a).cross(c.minus(a)).unit()
			normals[ai] = normals[ai].plus(normal)
			normals[bi] = normals[bi].plus(normal)
			normals[ci] = normals[ci].plus(normal)
		}
		for (let i = 0; i < vertices.length; i++) {
			normals[i] = normals[i].unit()
		}
		this.hasBeenCompiled = false
		return this as any
	}


	/**
	 * Populate the specified index buffer (default 'LINES') from the `triangles` index buffer.
	 */
	computeWireframeFromFlatTriangles(this: Mesh & { TRIANGLES: int[] }): this & { LINES: int[] }
	computeWireframeFromFlatTriangles<T extends string>(this: Mesh & { TRIANGLES: int[] },
														indexBufferName: T): this & { [k in T]: int[] }
	computeWireframeFromFlatTriangles(this: any, indexBufferName: string = 'LINES'): this {
		if (!this.TRIANGLES) throw new Error('TRIANGLES must be defined.')
		const canonEdges = new Set()

		function canonEdge(i0: int, i1: int) {
			const iMin = min(i0, i1), iMax = max(i0, i1)
			return (iMin << 16) | iMax
		}

		// function uncanonEdge(key) {
		// 	return [key >> 16, key & 0xffff]
		// }
		const t = this.TRIANGLES
		for (let i = 0; i < t.length; i += 3) {
			canonEdges.add(canonEdge(t[i + 0], t[i + 1]))
			canonEdges.add(canonEdge(t[i + 1], t[i + 2]))
			canonEdges.add(canonEdge(t[i + 2], t[i + 0]))
		}
		const data = indexBufferName
		if (!this[data]) this.addIndexBuffer(indexBufferName)
		//this.LINES = new Array(canonEdges.size)
		canonEdges.forEach(val => this[data].push(val >> 16, val & 0xffff))
		this.hasBeenCompiled = false
		return this
	}

	computeWireframeFromFlatTrianglesClosedMesh(this: Mesh & { TRIANGLES: int[] }): this & { LINES: int[] }
	computeWireframeFromFlatTrianglesClosedMesh<T extends string>(this: Mesh & { TRIANGLES: int[] },
																  indexBufferName: T): this & { [k in T]: int[] }
	computeWireframeFromFlatTrianglesClosedMesh(this: any, indexBufferName: string = 'LINES'): this {
		if (!this.TRIANGLES) throw new Error('TRIANGLES must be defined.')
		if (!this.LINES) this.addIndexBuffer('LINES')
		const tris = this.TRIANGLES
		if (!this[indexBufferName]) this.addIndexBuffer(indexBufferName)
		const lines = this[indexBufferName]
		for (let i = 0; i < tris.length; i += 3) {
			if (tris[i + 0] < tris[i + 1]) lines.push(tris[i + 0], tris[i + 1])
			if (tris[i + 1] < tris[i + 2]) lines.push(tris[i + 1], tris[i + 2])
			if (tris[i + 2] < tris[i + 0]) lines.push(tris[i + 2], tris[i + 0])
		}
		this.hasBeenCompiled = false
		return this
	}

	computeNormalLines(this: Mesh & { normals: V3[] }, length: number): this & { LINES: int[] }
	computeNormalLines<T extends string>(this: Mesh & { normals: V3[] },
										 length: number, indexBufferName: T): this & { [k in T]: int[] }
	computeNormalLines(this: any, length: number = 1, indexBufferName: string = 'LINES') {
		if (!this.normals) {
			throw new Error('normals must be defined.')
		}
		const vs = this.vertices, si = this.vertices.length
		if (!this[indexBufferName]) this.addIndexBuffer(indexBufferName)

		for (let i = 0; i < this.normals.length; i++) {
			vs[si + i] = vs[i].plus(this.normals[i].toLength(length))
			this[indexBufferName].push(si + i, i)
		}
		this.hasBeenCompiled = false
		return this
	}

	getAABB(): AABB {
		return new AABB().addPoints(this.vertices)
	}

	getBoundingSphere(): { center: V3, radius: number } {
		const sphere = {center: this.getAABB().getCenter(), radius: 0}
		for (let i = 0; i < this.vertices.length; i++) {
			sphere.radius = Math.max(sphere.radius, this.vertices[i].minus(sphere.center).length())
		}
		return sphere
	}

	/**
	 * Generates a square mesh in the XY plane.
	 * Texture coordinates (buffer "coords") are set to go from 0 to 1 in either direction.
	 *
	 * @param {Object=} options
	 * @param {number=} options.detail Defaults to 1
	 * @param {number=} options.detailX Defaults to options.detail. Number of subdivisions in X direction.
	 * @param {number=} options.detailY Defaults to options.detail. Number of subdivisions in Y direction.j
	 * @param {number=} options.width defaults to 1
	 * @param {number=} options.height defaults to 1
	 * @param {number=} options.startX defaults to 0
	 * @param {number=} options.startY defaults to 0
	 */
	static plane(options: {
		detail?: int,
		detailX?: int,
		detailY?: int,
		width?: number,
		height?: number,
		startX?: number,
		startY?: number
	} = {}) {
		const detailX = options.detailX || options.detail || 1
		const detailY = options.detailY || options.detail || 1
		const startX = options.startX || 0
		const startY = options.startY || 0
		const width = options.width || 1
		const height = options.height || 1
		const mesh = new Mesh()
			.addIndexBuffer('LINES')
			.addIndexBuffer('TRIANGLES')
			.addVertexBuffer('normals', 'ts_Normal')
			.addVertexBuffer('coords', 'ts_TexCoord')

		for (let j = 0; j <= detailY; j++) {
			const t = j / detailY
			for (let i = 0; i <= detailX; i++) {
				const s = i / detailX
				mesh.vertices.push(new V3(startX + s * width, startY + t * height, 0))
				mesh.coords.push([s, t])
				mesh.normals.push(V3.Z)
				if (i < detailX && j < detailY) {
					const offset = i + j * (detailX + 1)
					mesh.TRIANGLES.push(
						offset, offset + detailX + 1, offset + 1,
						offset + detailX + 1, offset + detailX + 2, offset + 1)
				}
			}
		}

		for (let i = 0; i < detailX; i++) {
			mesh.LINES.push(i, i + 1)
			mesh.LINES.push((detailX + 1) * detailY + i, (detailX + 1) * detailY + i + 1)
		}
		for (let j = 0; j < detailY; j++) {
			mesh.LINES.push(detailX * j, detailX * (j + 1) + 1)
			mesh.LINES.push(detailX * (j + 1), detailX * (j + 2) + 1)
		}

		mesh.compile()
		return mesh
	}

	// unique corners of a unit cube. Used by Mesh.cube to generate a cube mesh.
	static UNIT_CUBE_CORNERS = [
		V3.O,
		new V3(0, 0, 1),
		new V3(0, 1, 0),
		new V3(0, 1, 1),

		new V3(1, 0, 0),
		new V3(1, 0, 1),
		new V3(1, 1, 0),
		V3.XYZ,
	]

	/**
	 * Generates a unit cube (1x1x1) starting at the origin and extending into the (+ + +) octant.
	 * I.e. box from V3.O to V3(1,1,1)
	 * Creates line (only cube edges), triangle, vertex and normal1 buffers.
	 */
	static cube() {
		const mesh = new Mesh()
			.addVertexBuffer('normals', 'ts_Normal')
			.addIndexBuffer('TRIANGLES')
			.addIndexBuffer('LINES')

		// basically indexes for faces of the cube. vertices each need to be added 3 times,
		// as they have different normals depending on the face being rendered
		const VERTEX_CORNERS = [
			0, 1, 2, 3, // X = 0
			4, 5, 6, 7, // X = 1

			0, 4, 1, 5, // Y = 0
			2, 6, 3, 7, // Y = 1

			2, 6, 0, 4, // Z = 0
			3, 7, 1, 5, // Z = 1
		]
		mesh.vertices = VERTEX_CORNERS.map(i => Mesh.UNIT_CUBE_CORNERS[i])
		mesh.normals = [V3.X.negated(), V3.X, V3.Y.negated(), V3.Y, V3.Z.negated(), V3.Z].flatMap(v => [v, v, v, v])
		for (let i = 0; i < 6 * 4; i += 4) {
			pushQuad(mesh.TRIANGLES, 0 != i % 8,
				VERTEX_CORNERS[i], VERTEX_CORNERS[i + 1], VERTEX_CORNERS[i + 2], VERTEX_CORNERS[i + 3])
		}
		// indexes of LINES relative to UNIT_CUBE_CORNERS. Mapped to VERTEX_CORNERS.indexOf
		// so they make sense in the context of the mesh
		mesh.LINES = [
			0, 1,
			0, 2,
			1, 3,
			2, 3,

			0, 4,
			1, 5,
			2, 6,
			3, 7,

			4, 5,
			4, 6,
			5, 7,
			6, 7,
		].map(i => VERTEX_CORNERS.indexOf(i))

		mesh.compile()
		return mesh
	}

	static isocahedron() {
		return Mesh.sphere(0)
	}

	static sphere2(las: int, longs: int) {
		const baseVertices = arrayFromFunction(las, i => {
			const angle = i / (las - 1) * PI - PI / 2
			return new V3(0, cos(angle), sin(angle))
		})
		return Mesh.rotation(baseVertices, {anchor: V3.O, dir1: V3.Z}, 2 * PI, longs, true, baseVertices)
	}

	/**
	 * Returns a sphere mesh with radius 1 created by subdividing the faces of a isocahedron (20-sided) recursively
	 * The sphere is positioned at the origin
	 * @param subdivisions
	 *      How many recursive divisions to do. A subdivision divides a triangle into 4,
	 *      so the total number of triangles is 20 * 4^subdivisions
	 * @returns
	 *      Contains vertex and normal1 buffers and index buffers for triangles and LINES
	 */
	static sphere(subdivisions: int = 3) {
		const golden = (1 + Math.sqrt(5)) / 2, u = new V3(1, golden, 0).unit(), s = u.x, t = u.y
		// base vertices of isocahedron
		const vertices = [
			new V3(-s, t, 0),
			new V3(s, t, 0),
			new V3(-s, -t, 0),
			new V3(s, -t, 0),

			new V3(0, -s, t),
			new V3(0, s, t),
			new V3(0, -s, -t),
			new V3(0, s, -t),

			new V3(t, 0, -s),
			new V3(t, 0, s),
			new V3(-t, 0, -s),
			new V3(-t, 0, s)]
		// base triangles of isocahedron
		const triangles = [
			// 5 faces around point 0
			0, 11, 5,
			0, 5, 1,
			0, 1, 7,
			0, 7, 10,
			0, 10, 11,

			// 5 adjacent faces
			1, 5, 9,
			5, 11, 4,
			11, 10, 2,
			10, 7, 6,
			7, 1, 8,

			// 5 faces around point 3
			3, 9, 4,
			3, 4, 2,
			3, 2, 6,
			3, 6, 8,
			3, 8, 9,

			// 5 adjacent faces
			4, 9, 5,
			2, 4, 11,
			6, 2, 10,
			8, 6, 7,
			9, 8, 1,
		]

		/**
		 * Tesselates triangle a b c
		 * a b c must already be in vertices with the indexes ia ib ic
		 * res is the number of subdivisions to do. 0 just results in triangle and line indexes being added to the
		 * respective buffers.
		 */
		function tesselateRecursively(a: V3, b: V3, c: V3, res: int, vertices: V3[], triangles: int[],
									  ia: int, ib: int, ic: int, lines: int[]) {
			if (0 == res) {
				triangles.push(ia, ib, ic)
				if (ia < ib) lines.push(ia, ib)
				if (ib < ic) lines.push(ib, ic)
				if (ic < ia) lines.push(ic, ia)
			} else {
				// subdivide the triangle abc into 4 by adding a vertex (with the correct distance from the origin)
				// between each segment ab, bc and cd, then calling the function recursively
				const abMid1 = a.plus(b).toLength(1), bcMid1 = b.plus(c).toLength(1), caMid1 = c.plus(a).toLength(1)
				// indexes of new vertices:
				const iabm = vertices.length, ibcm = iabm + 1, icam = iabm + 2
				vertices.push(abMid1, bcMid1, caMid1)
				tesselateRecursively(abMid1, bcMid1, caMid1, res - 1, vertices, triangles, iabm, ibcm, icam, lines)
				tesselateRecursively(a, abMid1, caMid1, res - 1, vertices, triangles, ia, iabm, icam, lines)
				tesselateRecursively(b, bcMid1, abMid1, res - 1, vertices, triangles, ib, ibcm, iabm, lines)
				tesselateRecursively(c, caMid1, bcMid1, res - 1, vertices, triangles, ic, icam, ibcm, lines)
			}
		}

		const mesh = new Mesh()
			.addVertexBuffer('normals', 'ts_Normal')
			.addIndexBuffer('TRIANGLES')
			.addIndexBuffer('LINES')
		mesh.vertices.push(...vertices)
		subdivisions = undefined == subdivisions ? 4 : subdivisions
		for (let i = 0; i < 20; i++) {
			const [ia, ic, ib] = triangles.slice(i * 3, i * 3 + 3)
			tesselateRecursively(vertices[ia], vertices[ic], vertices[ib], subdivisions, mesh.vertices, mesh.TRIANGLES, ia, ic, ib, mesh.LINES)
		}

		mesh.normals = mesh.vertices
		mesh.compile()
		return mesh
	}

	static aabb(aabb: AABB) {
		const matrix = M4.multiplyMultiple(
			M4.translate(aabb.min),
			M4.scale(aabb.size().max(new V3(NLA_PRECISION, NLA_PRECISION, NLA_PRECISION))))
		const mesh = Mesh.cube().transform(matrix)
		// mesh.vertices = aabb.corners()
		mesh.computeNormalLines(20)
		mesh.compile()

		return mesh
	}


	static offsetVertices(vertices: V3[], offset: V3, close: boolean): Mesh & { TRIANGLES: int[], coords: [number, number][] }
	static offsetVertices(vertices: V3[], offset: V3, close: boolean, normals: V3[]): Mesh & { TRIANGLES: int[], coords: [number, number][], normals: V3[] }
	static offsetVertices(vertices: V3[], offset: V3, close: boolean, normals?: V3[]) {
		assertVectors.apply(undefined, vertices)
		assertVectors(offset)

		const mesh = new Mesh()
			.addIndexBuffer('TRIANGLES')
			.addVertexBuffer('coords', 'ts_TexCoord')
		normals && mesh.addVertexBuffer('normals', 'ts_Normal')
		mesh.vertices = vertices.concat(vertices.map(v => v.plus(offset)))
		const vl = vertices.length
		mesh.coords = arrayFromFunction(vl * 2, (i): [number, number] => [(i % vl) / vl, (i / vl) | 0])

		const triangles = mesh.TRIANGLES
		for (let i = 0; i < vertices.length - 1; i++) {
			pushQuad(triangles, false,
				i, i + 1,
				vertices.length + i, vertices.length + i + 1)
		}
		if (close) {
			pushQuad(triangles, false, vertices.length - 1, 0, vertices.length * 2 - 1, vertices.length)
		}
		if (normals) {
			mesh.normals = normals.concat(normals)
		}
		mesh.compile()
		return mesh
	}

	// Creates a new $Mesh by rotating $vertices by $totalRads around $lineAxis (according to the right-hand
	// rule). $steps is the number of steps to take. $close is whether the vertices of the first and last step
	// should be connected by triangles. If $normals is set (pass an array of V3s of the same length as $vertices),
	// these will also be rotated and correctly added to the mesh.
	// @example const precious = Mesh.rotation([V(10, 0, -2), V(10, 0, 2), V(11, 0, 2), V(11, 0, -2)], , L3.Z, 512)
	static rotation(vertices: V3[], lineAxis: { anchor: V3, dir1: V3 }, totalRads: raddd, steps: int, close = true, normals?: V3[]) {
		const mesh = new Mesh().addIndexBuffer('TRIANGLES')
		normals && mesh.addVertexBuffer('normals', 'ts_Normal')
		const vc = vertices.length, vTotal = vc * steps

		const rotMat = new M4()
		const triangles = mesh.TRIANGLES
		for (let i = 0; i < steps; i++) {
			// add triangles
			const rads = totalRads / steps * i
			M4.rotateLine(lineAxis.anchor, lineAxis.dir1, rads, rotMat)
			mesh.vertices.push(...rotMat.transformedPoints(vertices))

			normals && mesh.normals!.push(...rotMat.transformedVectors(normals))
			if (close || i !== steps - 1) {
				for (let j = 0; j < vc - 1; j++) {
					pushQuad(triangles, false,
						i * vc + j + 1, i * vc + j,
						((i + 1) * vc + j + 1) % vTotal, ((i + 1) * vc + j) % vTotal)
				}
			}
		}

		mesh.compile()
		return mesh
	}

	static parametric(pF: (d: number, z: number) => V3, pN: undefined,
		sMin: number, sMax: number, tMin: number, tMax: number, sRes: number, tRes: number): Mesh & { TRIANGLES: int[] }
	static parametric(pF: (d: number, z: number) => V3, pN: ((d: number, z: number) => V3),
		sMin: number, sMax: number, tMin: number, tMax: number, sRes: number, tRes: number): Mesh & { normals: V3[], TRIANGLES: int[] }
	static parametric(pF: (d: number, z: number) => V3, pN: ((d: number, z: number) => V3) | undefined,
		sMin: number, sMax: number, tMin: number, tMax: number, sRes: number, tRes: number) {
		const mesh = new Mesh()
			.addIndexBuffer('TRIANGLES')
			.addVertexBuffer('normals', 'ts_Normal')
		for (let si = 0; si <= sRes; si++) {
			const s = lerp(sMin, sMax, si / sRes)
			for (let ti = 0; ti <= tRes; ti++) {
				const t = lerp(tMin, tMax, ti / tRes)
				mesh.vertices.push(pF(s, t))
				pN && mesh.normals.push(pN(s, t))
				if (ti < tRes && si < sRes) {
					const offset = ti + si * (tRes + 1)
					pushQuad(mesh.TRIANGLES, false,
						offset, offset + tRes + 1, offset + 1, offset + tRes + 2)
				}
			}
		}
		return mesh
	}

	static load(json: { vertices: Tuple3<number>[], triangles?: Tuple3<number>[], normals?: Tuple3<number>[] }) {
		const mesh = new Mesh()
		if (Array.isArray(json.vertices[0])) {
			mesh.vertices = json.vertices.map(x => V(x))
		} else {
			throw new Error()
		}
		if (json.triangles) {
			mesh.addIndexBuffer('TRIANGLES')
			;(mesh as any).TRIANGLES = json.triangles
		}
		if (json.normals) {
			mesh.addVertexBuffer('normals', 'ts_Normal')
			;(mesh as any).normals = json.normals
		}
		mesh.compile()
		return mesh
	}
}