class Mesh extends Transformable {
	hasBeenCompiled: boolean
	vertexBuffers: {[name: string]: Buffer}
	indexBuffers: {[name: string]: Buffer}


	TRIANGLES?: int[]
	LINES?: int[]
	normals?: V3[]
	vertices?: V3[]
	coords?: any[]
	colors?: any[]
	[name: string]: any

	constructor(options: {coords?: boolean, normals?: boolean, colors?: boolean, lines?: boolean, triangles?: boolean} = {}) {
		super()
		this.hasBeenCompiled = false
		this.vertexBuffers = {}
		this.indexBuffers = {}
		this.addVertexBuffer('vertices', 'LGL_Vertex')
		if (options.coords) this.addVertexBuffer('coords', 'LGL_TexCoord')
		if (options.normals) this.addVertexBuffer('normals', 'LGL_Normal')
		if (options.colors) this.addVertexBuffer('colors', 'LGL_Color')
		if (!('TRIANGLES' in options) || options.triangles) this.addIndexBuffer('TRIANGLES')
		if (options.lines) this.addIndexBuffer('LINES')
	}

	calcVolume(): {volume: number, centroid: V3, area: number} {
		let totalVolume = 0, totalCentroid = V3.O, totalAreaX2 = 0
		const triangles = this.TRIANGLES as int[]
		const vertices = this.vertices
		for (let i = 0; i < triangles.length; i += 3) {
			const i0 = triangles[i + 0], i1 = triangles[i + 1], i2 = triangles[i + 2]
			const v0 = vertices[i0], v1 = vertices[i1], v2 = vertices[i2]
			const v01 = v1.minus(v0), v02 = v2.minus(v0)
			const normal = v01.cross(v02)
			//const centroidZ = (v0.z + v1.z + v2.z) / 3
			//totalVolume += centroidZ * (area === v01.cross(v02).length() / 2) * v01.cross(v02).unit().z
			const faceCentroid = v0.plus(v1.plus(v2)).div(3)
			totalVolume += faceCentroid.z * normal.z / 2
			const faceAreaX2 = normal.length()
			totalAreaX2 += faceAreaX2
			totalCentroid = totalCentroid.plus(new V3(faceCentroid.x, faceCentroid.y, faceCentroid.z / 2).times(faceCentroid.z * normal.z / 2))
		}
		// sumInPlaceTree adds negligible additional accuracy for XY sphere
		return {volume: totalVolume, centroid: totalCentroid.div(triangles.length / 3), area: totalAreaX2 / 2}
	}

	/**
	 * Add a new vertex buffer with a list as a property called `name` on this object and map it to
	 * the attribute called `attribute` in all shaders that draw this mesh.
	 */
	addVertexBuffer(name: string, attribute: string) {
		assert(!this.vertexBuffers[attribute])
		//assert(!this[name])
		this.hasBeenCompiled = false
		assert('string' == typeof name)
		assert('string' == typeof attribute)
		const buffer = this.vertexBuffers[attribute] = new Buffer(WGL.ARRAY_BUFFER, Float32Array)
		buffer.name = name
		this[name] = []
	}

	/**
	 * Add a new index buffer.
	 */
	addIndexBuffer(name: string) {
		this.hasBeenCompiled = false
		const buffer = this.indexBuffers[name] = new Buffer(WGL.ELEMENT_ARRAY_BUFFER, Uint16Array)
		buffer.name = name
		this[name] = []
	}

	concat(...others: Mesh[]) {
		const mesh = new Mesh({triangles: false})
		;[this as Mesh].concat(others).forEach(oldMesh => {
			const startIndex = mesh.vertices ? mesh.vertices.length : 0
			Object.getOwnPropertyNames(oldMesh.vertexBuffers).forEach(attribute => {
				const bufferName = this.vertexBuffers[attribute].name
				if (!mesh.vertexBuffers[attribute]) {
					mesh.addVertexBuffer(bufferName, attribute)
				}
                mesh[bufferName].push(oldMesh[bufferName])
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
	compile() {
		// figure out shortest vertex buffer to make sure indexBuffers are in bounds
		let minVertexBufferLength = Infinity, minBufferName
		Object.getOwnPropertyNames(this.vertexBuffers).forEach(attribute => {
			const buffer = this.vertexBuffers[attribute]
			buffer.data = this[buffer.name]
			buffer.compile()
			if (this[buffer.name].length < minVertexBufferLength) {
				minBufferName = attribute
				minVertexBufferLength = this[buffer.name].length
			}
		})

		for (const name in this.indexBuffers) {
			const buffer = this.indexBuffers[name]
			buffer.data = this[buffer.name]
			buffer.compile()
			// if (NLA_DEBUG && buffer.maxValue >= minVertexBufferLength) {
			// 	throw new Error(`max index value for buffer ${name}
			// 	is too large ${buffer.maxValue} min Vbuffer size: ${minVertexBufferLength} ${minBufferName}`)
			// }
		}
		this.hasBeenCompiled = true
	}


	toBinarySTL(): Blob {
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
			const a = this.vertices[triangles[i]], b = this.vertices[triangles[i + 1]], c = this.vertices[triangles[i + 2]]
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
		const mesh = new Mesh({normals: !!this.normals})
		mesh.vertices = m4.transformedPoints(this.vertices)
		if (this.normals) {
			const invTrans = m4.as3x3().inversed().transposed().normalized()
			mesh.normals = this.normals.map(n => invTrans.transformVector(n))
            mesh.normals.forEach(n => assert(n.hasLength(1)))
		}
		for (const name in this.indexBuffers) {
			mesh.addIndexBuffer(name)
			mesh[name] = this[name]
		}
		mesh.compile()
		return mesh as this
	}

    /**
     * Computes a new normal1 for each vertex from the average normal1 of the neighboring triangles. This means
     * adjacent triangles must share vertices for the resulting normals to be smooth.
     */
    computeNormalsFromFlatTriangles(): this {
        if (!this.normals) this.addVertexBuffer('normals', 'LGL_Normal')
        // tslint:disable:no-string-literal
        this.vertexBuffers['LGL_Normal'].data = arrayFromFunction(this.vertices.length, i => V3.O)

        const {TRIANGLES, vertices, normals} = this
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
        return this
    }


    /**
     * Populate the `LINES` index buffer from the `triangles` index buffer.
     */
	computeWireframeFromFlatTriangles(indexBufferName: string = 'LINES'): this {
		const canonEdges = new Set()

		function canonEdge(i0: int, i1: int) {
			const iMin = min(i0, i1), iMax = max(i0, i1)
			return (iMin << 16) | iMax
		}

		// function uncanonEdge(key) {
		// 	return [key >> 16, key & 0xffff]
		// }
		const t = this.TRIANGLES
		for (let i = 0; i < this.TRIANGLES.length; i += 3) {
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

	computeWireframeFromFlatTrianglesClosedMesh(): this {
		if (!this.LINES) this.addIndexBuffer('LINES')
		const tris = this.TRIANGLES
		const lines = this.LINES
		for (let i = 0; i < this.TRIANGLES.length; i += 3) {
			if (tris[i + 0] < tris[i + 1]) lines.push(tris[i + 0], tris[i + 1])
			if (tris[i + 1] < tris[i + 2]) lines.push(tris[i + 1], tris[i + 2])
			if (tris[i + 2] < tris[i + 0]) lines.push(tris[i + 2], tris[i + 0])
		}
		this.hasBeenCompiled = false
		return this
	}

	computeNormalLines(length: number = 1, indexBufferName: string = 'LINES'): this {
		const vs = this.vertices, si = this.vertices.length
        const data = indexBufferName
        if (!this[data]) this.addIndexBuffer(indexBufferName)

		for (let i = 0; i < this.normals.length; i++) {
			vs[si + i] = vs[i].plus(this.normals[i].toLength(length))
			this[data].push(si + i, i)
		}
		this.hasBeenCompiled = false
		return this
	}

	getAABB(): AABB {
		return new AABB().addPoints(this.vertices)
	}

	getBoundingSphere(): {center: V3, radius: number} {
		const sphere = {center: this.getAABB().getCenter(), radius: 0}
		for (let i = 0; i < this.vertices.length; i++) {
			sphere.radius = Math.max(sphere.radius, this.vertices[i].minus(sphere.center).length())
		}
		return sphere
	}


// ### Mesh.plane([options])
//
// Generates a square 2x2 mesh the xy plane centered at the origin. The
// `options` argument specifies options to pass to the mesh constructor.
// Additional options include `detailX` and `detailY`, which set the tesselation
// in x and y, and `detail`, which sets both `detailX` and `detailY` at once.
// Two triangles are generated by default.
// Example usage:
//
//     var mesh1 = Mesh.plane();
//     var mesh2 = Mesh.plane({ detail: 5 });
//     var mesh3 = Mesh.plane({ detailX: 20, detailY: 40 });
//
	/**
	 * Generates a square mesh in the XY plane.
	 * Texture coordinates (buffer "coords") are set to go from 0 to 1 in either direction.
	 *
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
	} = {}): Mesh {
		const detailX = options.detailX || options.detail || 1
		const detailY = options.detailY || options.detail || 1
		const startX = options.startX || 0
		const startY = options.startY || 0
		const width = options.width || 1
		const height = options.height || 1
		const mesh = new Mesh({lines: true, normals: true, coords: true, triangles: true})

		for (let j = 0; j <= detailY; j++) {
            const t = j / detailY
			for (let i = 0; i <= detailX; i++) {
                const s = i / detailX
				mesh.vertices.push(new V3(startX + s * width, startY + t * height, 0))
				mesh.coords.push(s, t)
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
		V3.XYZ
	]

	/**
	 * Generates a unit cube (1x1x1) starting at the origin and extending into the (+ + +) octant.
	 * I.e. box from V3.O to V3(1,1,1)
	 * Creates line, triangle, vertex and normal1 buffers.
	 */
	static cube(): Mesh {
		const mesh = new Mesh({lines: true, triangles: true, normals: true})

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
		mesh.normals = [V3.X.negated(), V3.X, V3.Y.negated(), V3.Y, V3.Z.negated(), V3.Z].map(v => [v, v, v, v]).concatenated()
		for (let i = 0; i < 6 * 4; i += 4) {
			pushQuad(/** @type {number[]} */ mesh.TRIANGLES, 0 != i % 8,
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

	static isocahedron(): Mesh {
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
	static sphere(subdivisions: int = 3): Mesh {
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

		const mesh = new Mesh({normals: true, colors: false, lines: true})
		mesh.vertices.pushAll(vertices)
		subdivisions = undefined == subdivisions ? 4 : subdivisions
		for (let i = 0; i < 20; i++) {
			const [ia, ic, ib] = triangles.slice(i * 3, i * 3 + 3)
			tesselateRecursively(vertices[ia], vertices[ic], vertices[ib], subdivisions, mesh.vertices, mesh.TRIANGLES, ia, ic, ib, mesh.LINES)
		}

		mesh.normals = mesh.vertices
		mesh.compile()
		return mesh
	}

	static aabb(aabb: AABB): Mesh {
        const matrix = M4.multiplyMultiple(
            M4.translate(aabb.min),
            M4.scale(aabb.size().max(new V3(NLA_PRECISION, NLA_PRECISION, NLA_PRECISION))))
        const mesh = Mesh.cube().transform(matrix)
        // mesh.vertices = aabb.corners()
        mesh.computeNormalLines(20)
        mesh.compile()

        return mesh
    }


	static offsetVertices(vertices: V3[], offset: V3, close: boolean, normals?: V3[], steps?: int): Mesh {
		assertVectors.apply(undefined, vertices)
		assertVectors(offset)

        const mesh = new Mesh({normals: !!normals})
		mesh.vertices = vertices.concat(vertices.map(v => v.plus(offset)))

        const triangles = mesh.TRIANGLES
		for (let i = 0; i < vertices.length - 1; i++) {
			pushQuad(triangles, false,
				i, i + 1,
				vertices.length + i, vertices.length + i + 1)
		}
		if (close) {
			pushQuad(triangles, false, 0, vertices.length - 1, vertices.length, vertices.length * 2 - 1)
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
	static rotation(vertices: V3[], lineAxis: {anchor: V3, dir1: V3}, totalRads: raddd, steps: int, close = true, normals?: V3[]): Mesh {
		const mesh = new Mesh({normals: !!normals})
		const vc = vertices.length, vTotal = vc * steps

		const rotMat = new M4()
		const triangles = mesh.TRIANGLES
		for (let i = 0; i < steps; i++) {
			// add triangles
			const rads = totalRads / steps * i
			M4.rotateLine(lineAxis.anchor, lineAxis.dir1, rads, rotMat)
			Array.prototype.push.apply(mesh.vertices, rotMat.transformedPoints(vertices))

			normals && Array.prototype.push.apply(mesh.normals, rotMat.transformedVectors(normals))
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

	static parametric(pF: (d: number, z: number) => V3, pN: (d: number, z: number) => V3,
                      sMin: number, sMax: number, tMin: number, tMax: number, sRes: number, tRes: number) {
		const mesh = new Mesh({triangles: true, lines: false, normals: true})
		for (let si = 0; si <= sRes; si++) {
			const s = lerp(sMin, sMax, si / sRes)
			for (let ti = 0; ti <= tRes; ti++) {
				const t = lerp(tMin, tMax, ti / tRes)
				mesh.vertices.push(pF(s, t))
				mesh.normals.push(pN(s, t))
				if (ti < tRes && si < sRes) {
					const offset = ti + si * (tRes + 1)
					pushQuad(mesh.TRIANGLES, false,
						offset, offset + tRes + 1, offset + 1, offset + tRes + 2)
				}
			}
		}
		mesh.compile()
		return mesh
	}
}