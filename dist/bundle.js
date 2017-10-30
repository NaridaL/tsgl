(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('ts3dutils'), require('chroma-js')) :
	typeof define === 'function' && define.amd ? define(['exports', 'ts3dutils', 'chroma-js'], factory) :
	(factory((global.tsgl = {}),global.ts3dutils,global.chroma));
}(this, (function (exports,ts3dutils,chroma) { 'use strict';

chroma = chroma && chroma.hasOwnProperty('default') ? chroma['default'] : chroma;

var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const { cos, sin, PI, min, max } = Math;
const WGL$2 = WebGLRenderingContext;
/**
 * @example new Mesh()
 *        .addIndexBuffer('TRIANGLES')
 *        .addIndexBuffer('LINES')
 *        .addVertexBuffer('normals', 'LGL_Normal')
 */
class Mesh extends ts3dutils.Transformable {
    constructor() {
        super();
        this.hasBeenCompiled = false;
        this.vertexBuffers = {};
        this.indexBuffers = {};
        this.addVertexBuffer('vertices', 'LGL_Vertex');
        //if (options.coords) this.addVertexBuffer('coords', 'LGL_TexCoord')
        //if (options.normals) this.addVertexBuffer('normals', 'LGL_Normal')
        //if (options.colors) this.addVertexBuffer('colors', 'LGL_Color')
    }
    calcVolume() {
        let totalVolume = 0, totalCentroid = ts3dutils.V3.O, totalAreaX2 = 0;
        const triangles = this.TRIANGLES;
        const vertices = this.vertices;
        for (let i = 0; i < triangles.length; i += 3) {
            const i0 = triangles[i + 0], i1 = triangles[i + 1], i2 = triangles[i + 2];
            const v0 = vertices[i0], v1 = vertices[i1], v2 = vertices[i2];
            const v01 = v1.minus(v0), v02 = v2.minus(v0);
            const normal = v01.cross(v02);
            //const centroidZ = (v0.z + v1.z + v2.z) / 3
            //totalVolume += centroidZ * (area === v01.cross(v02).length() / 2) * v01.cross(v02).unit().z
            const faceCentroid = v0.plus(v1.plus(v2)).div(3);
            totalVolume += faceCentroid.z * normal.z / 2;
            const faceAreaX2 = normal.length();
            totalAreaX2 += faceAreaX2;
            totalCentroid = totalCentroid.plus(new ts3dutils.V3(faceCentroid.x, faceCentroid.y, faceCentroid.z / 2).times(faceCentroid.z * normal.z / 2));
        }
        // sumInPlaceTree adds negligible additional accuracy for XY sphere
        return { volume: totalVolume, centroid: totalCentroid.div(triangles.length / 3), area: totalAreaX2 / 2 };
    }
    /**
     * Add a new vertex buffer with a list as a property called `name` on this object and map it to
     * the attribute called `attribute` in all shaders that draw this mesh.
     * @example new Mesh().addVertexBuffer('coords', 'LGL_TexCoord')
     */
    addVertexBuffer(name, attribute) {
        ts3dutils.assert(!this.vertexBuffers[attribute], 'Buffer ' + attribute + ' already exists.');
        //assert(!this[name])
        this.hasBeenCompiled = false;
        ts3dutils.assert('string' == typeof name);
        ts3dutils.assert('string' == typeof attribute);
        const buffer = this.vertexBuffers[attribute] = new Buffer(WGL$2.ARRAY_BUFFER, Float32Array);
        buffer.name = name;
        this[name] = [];
        return this;
    }
    /**
     * Add a new index buffer.
     * @example new Mesh().addIndexBuffer('TRIANGLES')
     * @example new Mesh().addIndexBuffer('LINES')
     */
    addIndexBuffer(name) {
        this.hasBeenCompiled = false;
        const buffer = this.indexBuffers[name] = new Buffer(WGL$2.ELEMENT_ARRAY_BUFFER, Uint16Array);
        buffer.name = name;
        this[name] = [];
        return this;
    }
    concat(...others) {
        const mesh = new Mesh();
        [this].concat(others).forEach((oldMesh) => {
            const startIndex = mesh.vertices ? mesh.vertices.length : 0;
            Object.getOwnPropertyNames(oldMesh.vertexBuffers).forEach(attribute => {
                const bufferName = this.vertexBuffers[attribute].name;
                if (!mesh.vertexBuffers[attribute]) {
                    mesh.addVertexBuffer(bufferName, attribute);
                }
                mesh[bufferName].push(oldMesh[bufferName]);
            });
            Object.getOwnPropertyNames(oldMesh.indexBuffers).forEach(name => {
                if (!mesh.indexBuffers[name]) {
                    mesh.addIndexBuffer(name);
                }
                mesh[name].push(...oldMesh[name].map(index => index + startIndex));
            });
        });
        return mesh;
    }
    /**
     * Upload all attached buffers to the GPU in preparation for rendering. This doesn't need to be called every
     * frame, only needs to be done when the data changes.
     *
     * Sets `this.hasBeenCompiled` to true.
     */
    compile(gl = currentGL()) {
        // figure out shortest vertex buffer to make sure indexBuffers are in bounds
        Object.getOwnPropertyNames(this.vertexBuffers).forEach(attribute => {
            const buffer = this.vertexBuffers[attribute];
            buffer.data = this[buffer.name];
            buffer.compile(undefined, gl);
            
        });
        for (const name in this.indexBuffers) {
            const buffer = this.indexBuffers[name];
            buffer.data = this[buffer.name];
            buffer.compile(undefined, gl);
            // if (NLA_DEBUG && buffer.maxValue >= minVertexBufferLength) {
            // 	throw new Error(`max index value for buffer ${name}
            // 	is too large ${buffer.maxValue} min Vbuffer size: ${minVertexBufferLength} ${minBufferName}`)
            // }
        }
        this.hasBeenCompiled = true;
        return this;
    }
    static fromBinarySTL(stl) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const mesh = new Mesh()
                    .addVertexBuffer('normals', 'LGL_Normal');
                const fileReader = new FileReader();
                fileReader.onerror = reject;
                fileReader.onload = function (progressEvent) {
                    const dataView = new DataView(this.result);
                    const HEADER_BYTE_SIZE = 80;
                    const triangleCount = dataView.getUint32(HEADER_BYTE_SIZE, true);
                    mesh.normals.length = triangleCount * 3;
                    mesh.vertices.length = triangleCount * 3;
                    let i = triangleCount * 3, bufferPtr = HEADER_BYTE_SIZE + 4;
                    function readV3() {
                        const x = dataView.getFloat32(bufferPtr, true);
                        bufferPtr += 4;
                        const y = dataView.getFloat32(bufferPtr, true);
                        bufferPtr += 4;
                        const z = dataView.getFloat32(bufferPtr, true);
                        bufferPtr += 4;
                        return new ts3dutils.V3(x, y, z);
                    }
                    while (i) {
                        i -= 3;
                        const normal = readV3();
                        mesh.normals[i + 0] = normal;
                        mesh.normals[i + 1] = normal;
                        mesh.normals[i + 2] = normal;
                        mesh.vertices[i + 0] = readV3();
                        mesh.vertices[i + 1] = readV3();
                        mesh.vertices[i + 2] = readV3();
                        bufferPtr += 2;
                    }
                    resolve(mesh);
                };
                fileReader.readAsArrayBuffer(stl);
            });
        });
    }
    toBinarySTL() {
        if (!this.TRIANGLES)
            throw new Error('TRIANGLES must be defined.');
        const HEADER_BYTE_SIZE = 80, FLOAT_BYTE_SIZE = 4;
        const triangles = this.TRIANGLES;
        const triangleCount = triangles.length / 3;
        const buffer = new ArrayBuffer(HEADER_BYTE_SIZE + 4 + triangleCount * (4 * 3 * FLOAT_BYTE_SIZE + 2));
        const dataView = new DataView(buffer);
        dataView.setUint32(HEADER_BYTE_SIZE, triangleCount, true);
        let bufferPtr = HEADER_BYTE_SIZE + 4;
        let i = triangles.length;
        while (i) {
            i -= 3;
            const a = this.vertices[triangles[i]], b = this.vertices[triangles[i + 1]], c = this.vertices[triangles[i + 2]];
            const normal = ts3dutils.V3.normalOnPoints(a, b, c);
            [normal, a, b, c].forEach(v => {
                dataView.setFloat32(bufferPtr, v.x, true);
                bufferPtr += 4;
                dataView.setFloat32(bufferPtr, v.y, true);
                bufferPtr += 4;
                dataView.setFloat32(bufferPtr, v.z, true);
                bufferPtr += 4;
            });
            // skip 2 bytes, already initalized to zero
            bufferPtr += 2;
        }
        ts3dutils.assert(bufferPtr == buffer.byteLength, bufferPtr + ' ' + buffer.byteLength);
        return new Blob([buffer], { type: 'application/octet-stream' });
    }
    /**
     * Transform all vertices by `matrix` and all normals by the inverse transpose of `matrix`.
     *
     * Index buffer data is referenced.
     */
    transform(m4) {
        const mesh = new Mesh();
        mesh.vertices = m4.transformedPoints(this.vertices);
        if (this.normals) {
            mesh.addVertexBuffer('normals', 'LGL_Normal');
            const invTrans = m4.as3x3().inversed().transposed().normalized();
            mesh.normals = this.normals.map(n => invTrans.transformVector(n).unit());
            // mesh.normals.forEach(n => assert(n.hasLength(1)))
        }
        for (const name in this.indexBuffers) {
            mesh.addIndexBuffer(name);
            mesh[name] = this[name];
        }
        mesh.compile();
        return mesh;
    }
    /**
     * Computes a new normal1 for each vertex from the average normal1 of the neighboring triangles. This means
     * adjacent triangles must share vertices for the resulting normals to be smooth.
     */
    computeNormalsFromFlatTriangles() {
        if (!this.normals)
            this.addVertexBuffer('normals', 'LGL_Normal');
        // tslint:disable:no-string-literal
        //this.vertexBuffers['LGL_Normal'].data = arrayFromFunction(this.vertices.length, i => V3.O)
        const TRIANGLES = this.TRIANGLES, vertices = this.vertices, normals = this.normals;
        normals.length = vertices.length;
        for (let i = 0; i < TRIANGLES.length; i += 3) {
            const ai = TRIANGLES[i], bi = TRIANGLES[i + 1], ci = TRIANGLES[i + 2];
            const a = vertices[ai];
            const b = vertices[bi];
            const c = vertices[ci];
            const normal = b.minus(a).cross(c.minus(a)).unit();
            normals[ai] = normals[ai].plus(normal);
            normals[bi] = normals[bi].plus(normal);
            normals[ci] = normals[ci].plus(normal);
        }
        for (let i = 0; i < vertices.length; i++) {
            normals[i] = normals[i].unit();
        }
        this.hasBeenCompiled = false;
        return this;
    }
    computeWireframeFromFlatTriangles(indexBufferName = 'LINES') {
        if (!this.TRIANGLES)
            throw new Error('TRIANGLES must be defined.');
        const canonEdges = new Set();
        function canonEdge(i0, i1) {
            const iMin = min(i0, i1), iMax = max(i0, i1);
            return (iMin << 16) | iMax;
        }
        // function uncanonEdge(key) {
        // 	return [key >> 16, key & 0xffff]
        // }
        const t = this.TRIANGLES;
        for (let i = 0; i < t.length; i += 3) {
            canonEdges.add(canonEdge(t[i + 0], t[i + 1]));
            canonEdges.add(canonEdge(t[i + 1], t[i + 2]));
            canonEdges.add(canonEdge(t[i + 2], t[i + 0]));
        }
        const data = indexBufferName;
        if (!this[data])
            this.addIndexBuffer(indexBufferName);
        //this.LINES = new Array(canonEdges.size)
        canonEdges.forEach(val => this[data].push(val >> 16, val & 0xffff));
        this.hasBeenCompiled = false;
        return this;
    }
    computeWireframeFromFlatTrianglesClosedMesh(indexBufferName = 'LINES') {
        if (!this.TRIANGLES)
            throw new Error('TRIANGLES must be defined.');
        if (!this.LINES)
            this.addIndexBuffer('LINES');
        const tris = this.TRIANGLES;
        if (!this[indexBufferName])
            this.addIndexBuffer(indexBufferName);
        const lines = this[indexBufferName];
        for (let i = 0; i < tris.length; i += 3) {
            if (tris[i + 0] < tris[i + 1])
                lines.push(tris[i + 0], tris[i + 1]);
            if (tris[i + 1] < tris[i + 2])
                lines.push(tris[i + 1], tris[i + 2]);
            if (tris[i + 2] < tris[i + 0])
                lines.push(tris[i + 2], tris[i + 0]);
        }
        this.hasBeenCompiled = false;
        return this;
    }
    computeNormalLines(length = 1, indexBufferName = 'LINES') {
        if (!this.normals) {
            throw new Error('normals must be defined.');
        }
        const vs = this.vertices, si = this.vertices.length;
        if (!this[indexBufferName])
            this.addIndexBuffer(indexBufferName);
        for (let i = 0; i < this.normals.length; i++) {
            vs[si + i] = vs[i].plus(this.normals[i].toLength(length));
            this[indexBufferName].push(si + i, i);
        }
        this.hasBeenCompiled = false;
        return this;
    }
    getAABB() {
        return new ts3dutils.AABB().addPoints(this.vertices);
    }
    getBoundingSphere() {
        const sphere = { center: this.getAABB().getCenter(), radius: 0 };
        for (let i = 0; i < this.vertices.length; i++) {
            sphere.radius = Math.max(sphere.radius, this.vertices[i].minus(sphere.center).length());
        }
        return sphere;
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
    static plane(options = {}) {
        const detailX = options.detailX || options.detail || 1;
        const detailY = options.detailY || options.detail || 1;
        const startX = options.startX || 0;
        const startY = options.startY || 0;
        const width = options.width || 1;
        const height = options.height || 1;
        const mesh = new Mesh()
            .addIndexBuffer('LINES')
            .addIndexBuffer('TRIANGLES')
            .addVertexBuffer('normals', 'LGL_Normal')
            .addVertexBuffer('coords', 'LGL_TexCoord');
        for (let j = 0; j <= detailY; j++) {
            const t = j / detailY;
            for (let i = 0; i <= detailX; i++) {
                const s = i / detailX;
                mesh.vertices.push(new ts3dutils.V3(startX + s * width, startY + t * height, 0));
                mesh.coords.push([s, t]);
                mesh.normals.push(ts3dutils.V3.Z);
                if (i < detailX && j < detailY) {
                    const offset = i + j * (detailX + 1);
                    mesh.TRIANGLES.push(offset, offset + detailX + 1, offset + 1, offset + detailX + 1, offset + detailX + 2, offset + 1);
                }
            }
        }
        for (let i = 0; i < detailX; i++) {
            mesh.LINES.push(i, i + 1);
            mesh.LINES.push((detailX + 1) * detailY + i, (detailX + 1) * detailY + i + 1);
        }
        for (let j = 0; j < detailY; j++) {
            mesh.LINES.push(detailX * j, detailX * (j + 1) + 1);
            mesh.LINES.push(detailX * (j + 1), detailX * (j + 2) + 1);
        }
        mesh.compile();
        return mesh;
    }
    /**
     * Generates a unit cube (1x1x1) starting at the origin and extending into the (+ + +) octant.
     * I.e. box from V3.O to V3(1,1,1)
     * Creates line, triangle, vertex and normal1 buffers.
     */
    static cube() {
        const mesh = new Mesh()
            .addVertexBuffer('normals', 'LGL_Normal')
            .addIndexBuffer('TRIANGLES')
            .addIndexBuffer('LINES');
        // basically indexes for faces of the cube. vertices each need to be added 3 times,
        // as they have different normals depending on the face being rendered
        const VERTEX_CORNERS = [
            0, 1, 2, 3,
            4, 5, 6, 7,
            0, 4, 1, 5,
            2, 6, 3, 7,
            2, 6, 0, 4,
            3, 7, 1, 5,
        ];
        mesh.vertices = VERTEX_CORNERS.map(i => Mesh.UNIT_CUBE_CORNERS[i]);
        mesh.normals = [ts3dutils.V3.X.negated(), ts3dutils.V3.X, ts3dutils.V3.Y.negated(), ts3dutils.V3.Y, ts3dutils.V3.Z.negated(), ts3dutils.V3.Z].map(v => [v, v, v, v]).concatenated();
        for (let i = 0; i < 6 * 4; i += 4) {
            pushQuad(mesh.TRIANGLES, 0 != i % 8, VERTEX_CORNERS[i], VERTEX_CORNERS[i + 1], VERTEX_CORNERS[i + 2], VERTEX_CORNERS[i + 3]);
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
        ].map(i => VERTEX_CORNERS.indexOf(i));
        mesh.compile();
        return mesh;
    }
    static isocahedron() {
        return Mesh.sphere(0);
    }
    static sphere2(las, longs) {
        const baseVertices = ts3dutils.arrayFromFunction(las, i => {
            const angle = i / (las - 1) * PI - PI / 2;
            return new ts3dutils.V3(0, cos(angle), sin(angle));
        });
        return Mesh.rotation(baseVertices, { anchor: ts3dutils.V3.O, dir1: ts3dutils.V3.Z }, 2 * PI, longs, true, baseVertices);
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
    static sphere(subdivisions = 3) {
        const golden = (1 + Math.sqrt(5)) / 2, u = new ts3dutils.V3(1, golden, 0).unit(), s = u.x, t = u.y;
        // base vertices of isocahedron
        const vertices = [
            new ts3dutils.V3(-s, t, 0),
            new ts3dutils.V3(s, t, 0),
            new ts3dutils.V3(-s, -t, 0),
            new ts3dutils.V3(s, -t, 0),
            new ts3dutils.V3(0, -s, t),
            new ts3dutils.V3(0, s, t),
            new ts3dutils.V3(0, -s, -t),
            new ts3dutils.V3(0, s, -t),
            new ts3dutils.V3(t, 0, -s),
            new ts3dutils.V3(t, 0, s),
            new ts3dutils.V3(-t, 0, -s),
            new ts3dutils.V3(-t, 0, s)
        ];
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
        ];
        /**
         * Tesselates triangle a b c
         * a b c must already be in vertices with the indexes ia ib ic
         * res is the number of subdivisions to do. 0 just results in triangle and line indexes being added to the
         * respective buffers.
         */
        function tesselateRecursively(a, b, c, res, vertices, triangles, ia, ib, ic, lines) {
            if (0 == res) {
                triangles.push(ia, ib, ic);
                if (ia < ib)
                    lines.push(ia, ib);
                if (ib < ic)
                    lines.push(ib, ic);
                if (ic < ia)
                    lines.push(ic, ia);
            }
            else {
                // subdivide the triangle abc into 4 by adding a vertex (with the correct distance from the origin)
                // between each segment ab, bc and cd, then calling the function recursively
                const abMid1 = a.plus(b).toLength(1), bcMid1 = b.plus(c).toLength(1), caMid1 = c.plus(a).toLength(1);
                // indexes of new vertices:
                const iabm = vertices.length, ibcm = iabm + 1, icam = iabm + 2;
                vertices.push(abMid1, bcMid1, caMid1);
                tesselateRecursively(abMid1, bcMid1, caMid1, res - 1, vertices, triangles, iabm, ibcm, icam, lines);
                tesselateRecursively(a, abMid1, caMid1, res - 1, vertices, triangles, ia, iabm, icam, lines);
                tesselateRecursively(b, bcMid1, abMid1, res - 1, vertices, triangles, ib, ibcm, iabm, lines);
                tesselateRecursively(c, caMid1, bcMid1, res - 1, vertices, triangles, ic, icam, ibcm, lines);
            }
        }
        const mesh = new Mesh()
            .addVertexBuffer('normals', 'LGL_Normal')
            .addIndexBuffer('TRIANGLES')
            .addIndexBuffer('LINES');
        mesh.vertices.push(...vertices);
        subdivisions = undefined == subdivisions ? 4 : subdivisions;
        for (let i = 0; i < 20; i++) {
            const [ia, ic, ib] = triangles.slice(i * 3, i * 3 + 3);
            tesselateRecursively(vertices[ia], vertices[ic], vertices[ib], subdivisions, mesh.vertices, mesh.TRIANGLES, ia, ic, ib, mesh.LINES);
        }
        mesh.normals = mesh.vertices;
        mesh.compile();
        return mesh;
    }
    static aabb(aabb) {
        const matrix = ts3dutils.M4.multiplyMultiple(ts3dutils.M4.translate(aabb.min), ts3dutils.M4.scale(aabb.size().max(new ts3dutils.V3(ts3dutils.NLA_PRECISION, ts3dutils.NLA_PRECISION, ts3dutils.NLA_PRECISION))));
        const mesh = Mesh.cube().transform(matrix);
        // mesh.vertices = aabb.corners()
        mesh.computeNormalLines(20);
        mesh.compile();
        return mesh;
    }
    static offsetVertices(vertices, offset, close, normals) {
        ts3dutils.assertVectors.apply(undefined, vertices);
        ts3dutils.assertVectors(offset);
        const mesh = new Mesh()
            .addIndexBuffer('TRIANGLES')
            .addVertexBuffer('coords', 'LGL_TexCoord');
        normals && mesh.addVertexBuffer('normals', 'LGL_Normal');
        mesh.vertices = vertices.concat(vertices.map(v => v.plus(offset)));
        const vl = vertices.length;
        mesh.coords = ts3dutils.arrayFromFunction(vl * 2, (i) => [(i % vl) / vl, (i / vl) | 0]);
        const triangles = mesh.TRIANGLES;
        for (let i = 0; i < vertices.length - 1; i++) {
            pushQuad(triangles, false, i, i + 1, vertices.length + i, vertices.length + i + 1);
        }
        if (close) {
            pushQuad(triangles, false, 0, vertices.length - 1, vertices.length, vertices.length * 2 - 1);
        }
        if (normals) {
            mesh.normals = normals.concat(normals);
        }
        mesh.compile();
        return mesh;
    }
    // Creates a new $Mesh by rotating $vertices by $totalRads around $lineAxis (according to the right-hand
    // rule). $steps is the number of steps to take. $close is whether the vertices of the first and last step
    // should be connected by triangles. If $normals is set (pass an array of V3s of the same length as $vertices),
    // these will also be rotated and correctly added to the mesh.
    // @example const precious = Mesh.rotation([V(10, 0, -2), V(10, 0, 2), V(11, 0, 2), V(11, 0, -2)], , L3.Z, 512)
    static rotation(vertices, lineAxis, totalRads, steps, close = true, normals) {
        const mesh = new Mesh().addIndexBuffer('TRIANGLES');
        normals && mesh.addVertexBuffer('normals', 'LGL_Normal');
        const vc = vertices.length, vTotal = vc * steps;
        const rotMat = new ts3dutils.M4();
        const triangles = mesh.TRIANGLES;
        for (let i = 0; i < steps; i++) {
            // add triangles
            const rads = totalRads / steps * i;
            ts3dutils.M4.rotateLine(lineAxis.anchor, lineAxis.dir1, rads, rotMat);
            mesh.vertices.push(...rotMat.transformedPoints(vertices));
            normals && mesh.normals.push(...rotMat.transformedVectors(normals));
            if (close || i !== steps - 1) {
                for (let j = 0; j < vc - 1; j++) {
                    pushQuad(triangles, false, i * vc + j + 1, i * vc + j, ((i + 1) * vc + j + 1) % vTotal, ((i + 1) * vc + j) % vTotal);
                }
            }
        }
        mesh.compile();
        return mesh;
    }
    static parametric(pF, pN, sMin, sMax, tMin, tMax, sRes, tRes) {
        const mesh = new Mesh()
            .addVertexBuffer('normals', 'LGL_Normal')
            .addIndexBuffer('TRIANGLES');
        for (let si = 0; si <= sRes; si++) {
            const s = ts3dutils.lerp(sMin, sMax, si / sRes);
            for (let ti = 0; ti <= tRes; ti++) {
                const t = ts3dutils.lerp(tMin, tMax, ti / tRes);
                mesh.vertices.push(pF(s, t));
                mesh.normals.push(pN(s, t));
                if (ti < tRes && si < sRes) {
                    const offset = ti + si * (tRes + 1);
                    pushQuad(mesh.TRIANGLES, false, offset, offset + tRes + 1, offset + 1, offset + tRes + 2);
                }
            }
        }
        mesh.compile();
        return mesh;
    }
    static load(json) {
        const mesh = new Mesh();
        if (Array.isArray(json.vertices[0])) {
            mesh.vertices = json.vertices.map(x => ts3dutils.V(x));
        }
        else {
            throw new Error();
        }
        if (json.triangles) {
            mesh.addIndexBuffer('TRIANGLES');
            mesh.TRIANGLES = json.triangles;
        }
        if (json.normals) {
            mesh.addVertexBuffer('normals', 'LGL_Normal');
            mesh.normals = json.normals;
        }
        mesh.compile();
        return mesh;
    }
}
// unique corners of a unit cube. Used by Mesh.cube to generate a cube mesh.
Mesh.UNIT_CUBE_CORNERS = [
    ts3dutils.V3.O,
    new ts3dutils.V3(0, 0, 1),
    new ts3dutils.V3(0, 1, 0),
    new ts3dutils.V3(0, 1, 1),
    new ts3dutils.V3(1, 0, 0),
    new ts3dutils.V3(1, 0, 1),
    new ts3dutils.V3(1, 1, 0),
    ts3dutils.V3.XYZ,
];

/* tslint:disable:no-string-literal */
const WGL$3 = WebGLRenderingContext;
/**
 * These are all the draw modes usable in OpenGL ES
 */

(function (DRAW_MODES) {
    DRAW_MODES[DRAW_MODES["POINTS"] = WGL$3.POINTS] = "POINTS";
    DRAW_MODES[DRAW_MODES["LINES"] = WGL$3.LINES] = "LINES";
    DRAW_MODES[DRAW_MODES["LINE_STRIP"] = WGL$3.LINE_STRIP] = "LINE_STRIP";
    DRAW_MODES[DRAW_MODES["LINE_LOOP"] = WGL$3.LINE_LOOP] = "LINE_LOOP";
    DRAW_MODES[DRAW_MODES["TRIANGLES"] = WGL$3.TRIANGLES] = "TRIANGLES";
    DRAW_MODES[DRAW_MODES["TRIANGLE_STRIP"] = WGL$3.TRIANGLE_STRIP] = "TRIANGLE_STRIP";
    DRAW_MODES[DRAW_MODES["TRIANGLE_FAN"] = WGL$3.TRIANGLE_FAN] = "TRIANGLE_FAN";
})(exports.DRAW_MODES || (exports.DRAW_MODES = {}));
const SHADER_VAR_TYPES = ['FLOAT', 'FLOAT_MAT2', 'FLOAT_MAT3', 'FLOAT_MAT4', 'FLOAT_VEC2', 'FLOAT_VEC3', 'FLOAT_VEC4', 'INT', 'INT_VEC2', 'INT_VEC3', 'INT_VEC4', 'UNSIGNED_INT'];
const DRAW_MODE_CHECKS = {
    [exports.DRAW_MODES.POINTS]: x => true,
    [exports.DRAW_MODES.LINES]: x => 0 == x % 2,
    [exports.DRAW_MODES.LINE_STRIP]: x => x > 2,
    [exports.DRAW_MODES.LINE_LOOP]: x => x > 2,
    [exports.DRAW_MODES.TRIANGLES]: x => 0 == x % 3,
    [exports.DRAW_MODES.TRIANGLE_STRIP]: x => x > 3,
    [exports.DRAW_MODES.TRIANGLE_FAN]: x => x > 3,
};
function isArray(obj) {
    return Array == obj.constructor || Float32Array == obj.constructor || Float64Array == obj.constructor;
}
function isFloatArray(obj) {
    return Float32Array == obj.constructor || Float64Array == obj.constructor ||
        Array.isArray(obj) && obj.every(x => 'number' == typeof x);
}
function isIntArray(x) {
    if ([Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array]
        .some(y => x instanceof y)) {
        return true;
    }
    return (x instanceof Float32Array || x instanceof Float64Array || Array.isArray(x)) &&
        x.every(x => Number.isInteger(x));
}
//const x:keyof UniformTypesMap = undefined as 'FLOAT_VEC4' | 'FLOAT_VEC3'
class Shader {
    /**
     * Provides a convenient wrapper for WebGL shaders. A few uniforms and attributes,
     * prefixed with `gl_`, are automatically added to all shader sources to make
     * simple shaders easier to write.
     * Headers for the following variables are automatically prepended to the passed source. The correct variables
     * are also automatically passed to the shader when drawing.
     *
     * For vertex and fragment shaders:
     uniform mat3 LGL_NormalMatrix;
     uniform mat4 LGL_ModelViewMatrix;
     uniform mat4 LGL_ProjectionMatrix;
     uniform mat4 LGL_ModelViewProjectionMatrix;
     uniform mat4 LGL_ModelViewMatrixInverse;
     uniform mat4 LGL_ProjectionMatrixInverse;
     uniform mat4 LGL_ModelViewProjectionMatrixInverse;
     *
     *
     * Example usage:
     *
     *  const shader = new GL.Shader(
     *      `void main() { gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex; }`,
     *      `uniform vec4 color; void main() { gl_FragColor = color; }`)
     *
     *  shader.uniforms({ color: [1, 0, 0, 1] }).draw(mesh)
     *
     * Compiles a shader program using the provided vertex and fragment shaders.
     */
    constructor(vertexSource, fragmentSource, gl = currentGL()) {
        this.projectionMatrixVersion = -1;
        this.modelViewMatrixVersion = -1;
        // Headers are prepended to the sources to provide some automatic functionality.
        const header = `
		uniform mat3 LGL_NormalMatrix;
		uniform mat4 LGL_ModelViewMatrix;
		uniform mat4 LGL_ProjectionMatrix;
		uniform mat4 LGL_ModelViewProjectionMatrix;
		uniform mat4 LGL_ModelViewMatrixInverse;
		uniform mat4 LGL_ProjectionMatrixInverse;
		uniform mat4 LGL_ModelViewProjectionMatrixInverse;
	`;
        const vertexHeader = header + `
		attribute vec4 LGL_Vertex;
		attribute vec2 LGL_TexCoord;
		attribute vec3 LGL_Normal;
		attribute vec4 LGL_Color;
	`;
        const fragmentHeader = `  precision highp float;` + header;
        const matrixNames = header.match(/\bLGL_\w+/g);
        // Compile and link errors are thrown as strings.
        function compileSource(type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, WGL$3.COMPILE_STATUS)) {
                throw new Error('compile error: ' + gl.getShaderInfoLog(shader));
            }
            return shader;
        }
        this.gl = gl;
        const program = gl.createProgram();
        if (!program) {
            gl.handleError();
        }
        this.program = program;
        gl.attachShader(this.program, compileSource(WGL$3.VERTEX_SHADER, vertexHeader + vertexSource));
        gl.attachShader(this.program, compileSource(WGL$3.FRAGMENT_SHADER, fragmentHeader + fragmentSource));
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, WGL$3.LINK_STATUS)) {
            throw new Error('link error: ' + gl.getProgramInfoLog(this.program));
        }
        this.attributes = {};
        this.uniformLocations = {};
        // Check for the use of built-in matrices that require expensive matrix
        // multiplications to compute, and record these in `activeMatrices`.
        this.activeMatrices = {};
        matrixNames && matrixNames.forEach(name => {
            if (gl.getUniformLocation(this.program, name)) {
                this.activeMatrices[name] = true;
            }
        });
        this.uniformInfos = {};
        for (let i = gl.getProgramParameter(this.program, WGL$3.ACTIVE_UNIFORMS); i-- > 0;) {
            // see https://www.khronos.org/registry/OpenGL-Refpages/es2.0/xhtml/glGetActiveUniform.xml
            // this.program has already been checked
            // i is in bounds
            const info = gl.getActiveUniform(this.program, i);
            this.uniformInfos[info.name] = info;
        }
        gl.handleError();
    }
    static create(vertexSource, fragmentSource) {
        return new Shader(vertexSource, fragmentSource);
    }
    /**
     * Set a uniform for each property of `uniforms`. The correct `viewerGL.uniform*()` method is inferred from the
     * value types and from the stored uniform sampler flags.
     */
    uniforms(uniforms) {
        const gl = this.gl;
        gl.useProgram(this.program);
        gl.handleError();
        for (const name in uniforms) {
            const location = this.uniformLocations[name] || gl.getUniformLocation(this.program, name);
            !location && console.warn(name + ' uniform is not used in shader');
            if (!location)
                continue;
            this.uniformLocations[name] = location;
            let value = uniforms[name];
            const info = this.uniformInfos[name];
            if (ts3dutils.NLA_DEBUG) {
                // TODO: better errors
                if (gl.SAMPLER_2D == info.type || gl.SAMPLER_CUBE == info.type || gl.INT == info.type) {
                    if (1 == info.size) {
                        ts3dutils.assert(Number.isInteger(value));
                    }
                    else {
                        ts3dutils.assert(isIntArray(value) && value.length == info.size, 'value must be int array if info.size != 1');
                    }
                }
                ts3dutils.assert(gl.FLOAT != info.type ||
                    (1 == info.size && 'number' === typeof value || isFloatArray(value) && info.size == value.length));
                ts3dutils.assert(gl.FLOAT_VEC3 != info.type ||
                    (1 == info.size && value instanceof ts3dutils.V3 ||
                        Array.isArray(value) && info.size == value.length && ts3dutils.assertVectors(...value)));
                ts3dutils.assert(gl.FLOAT_VEC4 != info.type || 1 != info.size || isFloatArray(value) && value.length == 4);
                ts3dutils.assert(gl.FLOAT_MAT4 != info.type || value instanceof ts3dutils.M4, () => value.toSource());
                ts3dutils.assert(gl.FLOAT_MAT3 != info.type || value.length == 9 || value instanceof ts3dutils.M4);
            }
            if (value instanceof ts3dutils.V3) {
                value = value.toArray();
            }
            if (gl.FLOAT_VEC4 == info.type && info.size != 1) {
                gl.uniform4fv(location, value.concatenated());
            }
            else if (value.length) {
                switch (value.length) {
                    case 1:
                        gl.uniform1fv(location, value);
                        break;
                    case 2:
                        gl.uniform2fv(location, value);
                        break;
                    case 3:
                        gl.uniform3fv(location, value);
                        break;
                    case 4:
                        gl.uniform4fv(location, value);
                        break;
                    // Matrices are automatically transposed, since WebGL uses column-major
                    // indices instead of row-major indices.
                    case 9:
                        gl.uniformMatrix3fv(location, false, new Float32Array([
                            value[0], value[3], value[6],
                            value[1], value[4], value[7],
                            value[2], value[5], value[8],
                        ]));
                        break;
                    case 16:
                        gl.uniformMatrix4fv(location, false, new Float32Array([
                            value[0], value[4], value[8], value[12],
                            value[1], value[5], value[9], value[13],
                            value[2], value[6], value[10], value[14],
                            value[3], value[7], value[11], value[15],
                        ]));
                        break;
                    default:
                        throw new Error('don\'t know how to load uniform "' + name + '" of length ' + value.length);
                }
            }
            else if ('number' == typeof value) {
                if (gl.SAMPLER_2D == info.type || gl.SAMPLER_CUBE == info.type || gl.INT == info.type) {
                    gl.uniform1i(location, value);
                }
                else {
                    gl.uniform1f(location, value);
                }
            }
            else if ('boolean' == typeof value) {
                gl.uniform1i(location, +value);
            }
            else if (value instanceof ts3dutils.M4) {
                const m = value.m;
                if (gl.FLOAT_MAT4 == info.type) {
                    gl.uniformMatrix4fv(location, false, [
                        m[0], m[4], m[8], m[12],
                        m[1], m[5], m[9], m[13],
                        m[2], m[6], m[10], m[14],
                        m[3], m[7], m[11], m[15]
                    ]);
                }
                else if (gl.FLOAT_MAT3 == info.type) {
                    gl.uniformMatrix3fv(location, false, [
                        m[0], m[4], m[8],
                        m[1], m[5], m[9],
                        m[2], m[6], m[10]
                    ]);
                }
                else if (gl.FLOAT_MAT2 == info.type) {
                    gl.uniformMatrix2fv(location, false, new Float32Array([
                        m[0], m[4],
                        m[1], m[5]
                    ]));
                }
                else {
                    throw new Error(`Can't assign M4 to ${info.type}`);
                }
            }
            else {
                throw new Error('attempted to set uniform "' + name + '" to invalid value ' + value);
            }
            gl.handleError();
        }
        return this;
    }
    /**
     * Sets all uniform matrix attributes, binds all relevant buffers, and draws the mesh geometry as indexed
     * triangles or indexed LINES. Set `mode` to `WGL.LINES` (and either add indices to `LINES` or call
     * `computeWireframe()`) to draw the mesh in wireframe.
     *
     * @param mesh
     * @param mode Defaults to 'TRIANGLES'. Must be passed as string so the correct index buffer can be
     *     automatically drawn.
     * @param start int
     * @param count int
     */
    draw(mesh, mode = exports.DRAW_MODES.TRIANGLES, start, count) {
        ts3dutils.assert(mesh.hasBeenCompiled, 'mesh.hasBeenCompiled');
        ts3dutils.assert(undefined != exports.DRAW_MODES[mode]);
        const modeStr = exports.DRAW_MODES[mode];
        // assert(mesh.indexBuffers[modeStr], `mesh.indexBuffers[${modeStr}] undefined`)
        return this.drawBuffers(mesh.vertexBuffers, mesh.indexBuffers[modeStr], mode, start, count);
    }
    /**
     * Sets all uniform matrix attributes, binds all relevant buffers, and draws the
     * indexed mesh geometry. The `vertexBuffers` argument is a map from attribute
     * names to `Buffer` objects of type `WGL.ARRAY_BUFFER`, `indexBuffer` is a `Buffer`
     * object of type `WGL.ELEMENT_ARRAY_BUFFER`, and `mode` is a WebGL primitive mode
     * like `WGL.TRIANGLES` or `WGL.LINES`. This method automatically creates and caches
     * vertex attribute pointers for attributes as needed.
     */
    drawBuffers(vertexBuffers, indexBuffer, mode = exports.DRAW_MODES.TRIANGLES, start = 0, count) {
        const gl = this.gl;
        gl.handleError();
        ts3dutils.assert(undefined != exports.DRAW_MODES[mode]);
        ts3dutils.assertf(() => 1 <= Object.keys(vertexBuffers).length);
        Object.keys(vertexBuffers).forEach(key => ts3dutils.assertInst(Buffer, vertexBuffers[key]));
        // Only varruct up the built-in matrices that are active in the shader
        const on = this.activeMatrices;
        const modelViewMatrixInverse = (on['LGL_ModelViewMatrixInverse'] || on['LGL_NormalMatrix'])
            //&& this.modelViewMatrixVersion != gl.modelViewMatrixVersion
            && gl.modelViewMatrix.inversed();
        const projectionMatrixInverse = on['LGL_ProjectionMatrixInverse']
            //&& this.projectionMatrixVersion != gl.projectionMatrixVersion
            && gl.projectionMatrix.inversed();
        const modelViewProjectionMatrix = (on['LGL_ModelViewProjectionMatrix'] || on['LGL_ModelViewProjectionMatrixInverse'])
            //&& (this.projectionMatrixVersion != gl.projectionMatrixVersion || this.modelViewMatrixVersion !=
            // gl.modelViewMatrixVersion)
            && gl.projectionMatrix.times(gl.modelViewMatrix);
        const uni = {}; // Uniform Matrices
        on['LGL_ModelViewMatrix']
            && this.modelViewMatrixVersion != gl.modelViewMatrixVersion
            && (uni['LGL_ModelViewMatrix'] = gl.modelViewMatrix);
        on['LGL_ModelViewMatrixInverse'] && (uni['LGL_ModelViewMatrixInverse'] = modelViewMatrixInverse);
        on['LGL_ProjectionMatrix']
            && this.projectionMatrixVersion != gl.projectionMatrixVersion
            && (uni['LGL_ProjectionMatrix'] = gl.projectionMatrix);
        projectionMatrixInverse && (uni['LGL_ProjectionMatrixInverse'] = projectionMatrixInverse);
        modelViewProjectionMatrix && (uni['LGL_ModelViewProjectionMatrix'] = modelViewProjectionMatrix);
        modelViewProjectionMatrix && on['LGL_ModelViewProjectionMatrixInverse']
            && (uni['LGL_ModelViewProjectionMatrixInverse'] = modelViewProjectionMatrix.inversed());
        on['LGL_NormalMatrix']
            && this.modelViewMatrixVersion != gl.modelViewMatrixVersion
            && (uni['LGL_NormalMatrix'] = modelViewMatrixInverse.transposed());
        this.uniforms(uni);
        this.projectionMatrixVersion = gl.projectionMatrixVersion;
        this.modelViewMatrixVersion = gl.modelViewMatrixVersion;
        // Create and enable attribute pointers as necessary.
        let minVertexBufferLength = Infinity;
        for (const attribute in vertexBuffers) {
            const buffer = vertexBuffers[attribute];
            ts3dutils.assert(buffer.hasBeenCompiled);
            const location = this.attributes[attribute] || gl.getAttribLocation(this.program, attribute);
            gl.handleError();
            if (location == -1 || !buffer.buffer) {
                //console.warn(`Vertex buffer ${attribute} was not bound because the attribute is not active.`)
                continue;
            }
            this.attributes[attribute] = location;
            gl.bindBuffer(WGL$3.ARRAY_BUFFER, buffer.buffer);
            gl.handleError();
            gl.enableVertexAttribArray(location);
            gl.handleError();
            gl.vertexAttribPointer(location, buffer.spacing, WGL$3.FLOAT, false, 0, 0);
            gl.handleError();
            minVertexBufferLength = Math.min(minVertexBufferLength, buffer.count);
        }
        // Disable unused attribute pointers.
        for (const attribute in this.attributes) {
            if (!(attribute in vertexBuffers)) {
                gl.disableVertexAttribArray(this.attributes[attribute]);
                gl.handleError();
            }
        }
        // Draw the geometry.
        if (minVertexBufferLength) {
            count = count || (indexBuffer ? indexBuffer.count : minVertexBufferLength);
            ts3dutils.assert(DRAW_MODE_CHECKS[mode](count), 'count ' + count + ' doesn\'t fulfill requirement '
                + DRAW_MODE_CHECKS[mode].toString() + ' for mode ' + exports.DRAW_MODES[mode]);
            if (indexBuffer) {
                ts3dutils.assert(indexBuffer.hasBeenCompiled);
                ts3dutils.assert(minVertexBufferLength > indexBuffer.maxValue);
                ts3dutils.assert(count % indexBuffer.spacing == 0);
                ts3dutils.assert(start % indexBuffer.spacing == 0);
                if (start + count > indexBuffer.count) {
                    throw new Error('Buffer not long enough for passed parameters start/length/buffer length' + ' ' + start + ' ' + count + ' ' + indexBuffer.count);
                }
                gl.bindBuffer(WGL$3.ELEMENT_ARRAY_BUFFER, indexBuffer.buffer);
                gl.handleError();
                // start parameter has to be multiple of sizeof(WGL.UNSIGNED_SHORT)
                gl.drawElements(mode, count, WGL$3.UNSIGNED_SHORT, 2 * start);
                gl.handleError();
            }
            else {
                if (start + count > minVertexBufferLength) {
                    throw new Error('invalid');
                }
                gl.drawArrays(mode, start, count);
                gl.handleError();
            }
            gl.drawCallCount++;
        }
        return this;
    }
}

/**
 * There's only one constant, use it for default values. Use chroma-js or similar for actual colors.
 */
const GL_COLOR_BLACK = [0, 0, 0, 1];
function currentGL() {
    return LightGLContext.gl;
}
const WGL$1 = WebGLRenderingContext;
function isNumber(obj) {
    const str = Object.prototype.toString.call(obj);
    return str == '[object Number]' || str == '[object Boolean]';
}
class LightGLContext {
    constructor(gl, immediate = {
            mesh: new Mesh()
                .addVertexBuffer('coords', 'LGL_TexCoord')
                .addVertexBuffer('colors', 'LGL_Color'),
            mode: -1,
            coord: [0, 0],
            color: [1, 1, 1, 1],
            pointSize: 1,
            shader: new Shader(`
            uniform float pointSize;
            varying vec4 color;
            varying vec2 coord;
            void main() {
                color = LGL_Color;
                coord = LGL_TexCoord;
                gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
                gl_PointSize = pointSize;
            }
        `, `
            uniform sampler2D texture;
            uniform float pointSize;
            uniform bool useTexture;
            varying vec4 color;
            varying vec2 coord;
            void main() {
                gl_FragColor = color;
                if (useTexture) gl_FragColor *= texture2D(texture, coord.xy);
            }
        `, gl),
        }) {
        this.immediate = immediate;
        this.modelViewMatrix = new ts3dutils.M4();
        this.projectionMatrix = new ts3dutils.M4();
        this.MODELVIEW = LightGLContext.MODELVIEW;
        this.PROJECTION = LightGLContext.PROJECTION;
        this.tempMatrix = new ts3dutils.M4();
        this.resultMatrix = new ts3dutils.M4();
        this.modelViewStack = [];
        this.projectionStack = [];
        this.drawCallCount = 0;
        this.projectionMatrixVersion = 0;
        this.modelViewMatrixVersion = 0;
        this.matrixMode(LightGLContext.MODELVIEW);
    }
    /// Implement the OpenGL modelview and projection matrix stacks, along with some other useful GLU matrix functions.
    matrixMode(mode) {
        switch (mode) {
            case this.MODELVIEW:
                this.currentMatrixName = 'modelViewMatrix';
                //this.currentMatrix = this.modelViewMatrix
                this.stack = this.modelViewStack;
                break;
            case this.PROJECTION:
                this.currentMatrixName = 'projectionMatrix';
                //this.currentMatrix = this.projectionMatrix
                this.stack = this.projectionStack;
                break;
            default:
                throw new Error('invalid matrix mode ' + mode);
        }
    }
    loadIdentity() {
        ts3dutils.M4.identity(this[this.currentMatrixName]);
        this.currentMatrixName == 'projectionMatrix' ? this.projectionMatrixVersion++ : this.modelViewMatrixVersion++;
    }
    loadMatrix(m4) {
        ts3dutils.M4.copy(m4, this[this.currentMatrixName]);
        this.currentMatrixName == 'projectionMatrix' ? this.projectionMatrixVersion++ : this.modelViewMatrixVersion++;
    }
    multMatrix(m4) {
        ts3dutils.M4.multiply(this[this.currentMatrixName], m4, this.resultMatrix);
        const temp = this.resultMatrix;
        this.resultMatrix = this[this.currentMatrixName];
        this[this.currentMatrixName] = temp;
        this.currentMatrixName == 'projectionMatrix' ? this.projectionMatrixVersion++ : this.modelViewMatrixVersion++;
    }
    mirror(plane) {
        this.multMatrix(ts3dutils.M4.mirror(plane));
    }
    perspective(fovDegrees, aspect, near, far, result) {
        this.multMatrix(ts3dutils.M4.perspectiveRad(fovDegrees * ts3dutils.DEG, aspect, near, far, this.tempMatrix));
    }
    frustum(left, right, bottom, top, near, far) {
        this.multMatrix(ts3dutils.M4.frustum(left, right, bottom, top, near, far, this.tempMatrix));
    }
    ortho(left, right, bottom, top, near, far) {
        this.multMatrix(ts3dutils.M4.ortho(left, right, bottom, top, near, far, this.tempMatrix));
    }
    scale(...args) {
        this.multMatrix(ts3dutils.M4.scale(...args, this.tempMatrix));
    }
    mirroredX() {
        this.multMatrix(ts3dutils.M4.mirror(ts3dutils.P3ZX));
    }
    translate(x, y, z) {
        if (undefined !== y) {
            this.multMatrix(ts3dutils.M4.translate(x, y, z, this.tempMatrix));
        }
        else {
            this.multMatrix(ts3dutils.M4.translate(x, this.tempMatrix));
        }
    }
    rotate(angleDegrees, x, y, z) {
        this.multMatrix(ts3dutils.M4.rotate(angleDegrees * ts3dutils.DEG, { x, y, z }, this.tempMatrix));
    }
    lookAt(eye, center, up) {
        this.multMatrix(ts3dutils.M4.lookAt(eye, center, up, this.tempMatrix));
    }
    pushMatrix() {
        this.stack.push(ts3dutils.M4.copy(this[this.currentMatrixName]));
    }
    popMatrix() {
        const pop = this.stack.pop();
        ts3dutils.assert(undefined !== pop);
        this[this.currentMatrixName] = pop;
        this.currentMatrixName == 'projectionMatrix' ? this.projectionMatrixVersion++ : this.modelViewMatrixVersion++;
    }
    /**
     * World coordinates (WC) to screen/window coordinates matrix
     */
    wcToWindowMatrix() {
        const viewport = this.getParameter(this.VIEWPORT);
        const [x, y, w, h] = viewport;
        const viewportToScreenMatrix = new ts3dutils.M4([
            w / 2, 0, 0, x + w / 2,
            h / 2, 0, 0, y + h / 2,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]);
        return ts3dutils.M4.multiplyMultiple(viewportToScreenMatrix, this.projectionMatrix, this.modelViewMatrix);
    }
    /////////// IMMEDIATE MODE
    // ### Immediate mode
    //
    // Provide an implementation of OpenGL's deprecated immediate mode. This is
    // deprecated for a reason: constantly re-specifying the geometry is a bad
    // idea for performance. You should use a `GL.Mesh` instead, which specifies
    // the geometry once and caches it on the graphics card. Still, nothing
    // beats a quick `viewerGL.begin(WGL.POINTS); viewerGL.vertex(1, 2, 3); viewerGL.end();` for
    // debugging. This intentionally doesn't implement fixed-function lighting
    // because it's only meant for quick debugging tasks.
    pointSize(pointSize) {
        this.immediate.shader.uniforms({ pointSize: pointSize });
    }
    begin(mode) {
        if (this.immediate.mode != -1)
            throw new Error('mismatched viewerGL.begin() and viewerGL.end() calls');
        this.immediate.mode = mode;
        this.immediate.mesh.colors = [];
        this.immediate.mesh.coords = [];
        this.immediate.mesh.vertices = [];
    }
    color(...args) {
        this.immediate.color =
            (1 == args.length && Array.isArray(args[0]))
                ? args[0]
                : (1 == args.length && 'number' == typeof args[0])
                    ? hexIntToGLColor(args[0])
                    : (1 == args.length && 'string' == typeof args[0])
                        ? chroma(args[0]).gl()
                        : [args[0], args[1], args[2], args[3] || 0];
    }
    texCoord(...args) {
        this.immediate.coord = ts3dutils.V.apply(undefined, args).toArray(2);
    }
    vertex(...args) {
        this.immediate.mesh.colors.push(this.immediate.color);
        this.immediate.mesh.coords.push(this.immediate.coord);
        this.immediate.mesh.vertices.push(ts3dutils.V.apply(undefined, args));
    }
    end() {
        if (this.immediate.mode == -1)
            throw new Error('mismatched viewerGL.begin() and viewerGL.end() calls');
        this.immediate.mesh.compile();
        this.immediate.shader.uniforms({
            useTexture: !!LightGLContext.gl.getParameter(WGL$1.TEXTURE_BINDING_2D),
        }).drawBuffers(this.immediate.mesh.vertexBuffers, undefined, this.immediate.mode);
        this.immediate.mode = -1;
    }
    makeCurrent() {
        LightGLContext.gl = this;
    }
    /**
     * Starts an animation loop.
     */
    animate(callback) {
        const requestAnimationFrame = window.requestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            function (callback) {
                setTimeout(() => callback(performance.now()), 1000 / 60);
            };
        let time = performance.now(), keepUpdating = true;
        const update = (domHighResTimeStamp) => {
            const now = performance.now();
            callback.call(this, now, now - time);
            time = now;
            keepUpdating && requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
        return () => { keepUpdating = false; };
    }
    /**
     * Provide an easy way to get a fullscreen app running, including an
     * automatic 3D perspective projection matrix by default. This should be
     * called once.
     *
     * Just fullscreen, no automatic camera:
     *
     *     viewerGL.fullscreen({ camera: false })
     *
     * Adjusting field of view, near plane distance, and far plane distance:
     *
     *     viewerGL.fullscreen({ fov: 45, near: 0.1, far: 1000 })
     *
     * Adding padding from the edge of the window:
     *
     *     viewerGL.fullscreen({ paddingLeft: 250, paddingBottom: 60 })
     */
    fullscreen(options = {}) {
        const top = options.paddingTop || 0;
        const left = options.paddingLeft || 0;
        const right = options.paddingRight || 0;
        const bottom = options.paddingBottom || 0;
        if (!document.body) {
            throw new Error('document.body doesn\'t exist yet (call viewerGL.fullscreen() from ' +
                'window.onload() or from inside the <body> tag)');
        }
        document.body.appendChild(this.canvas);
        document.body.style.overflow = 'hidden';
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = left + 'px';
        this.canvas.style.top = top + 'px';
        const gl = this;
        function windowOnResize() {
            gl.canvas.width = window.innerWidth - left - right;
            gl.canvas.height = window.innerHeight - top - bottom;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            if (options.camera) {
                gl.matrixMode(LightGLContext.PROJECTION);
                gl.loadIdentity();
                gl.perspective(options.fov || 45, gl.canvas.width / gl.canvas.height, options.near || 0.1, options.far || 1000);
                gl.matrixMode(LightGLContext.MODELVIEW);
            }
        }
        window.addEventListener('resize', windowOnResize);
        windowOnResize();
        return this;
    }
    viewportFill() {
        this.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    handleError() {
        // const errorCode = this.getError()
        // if (0 !== errorCode) {
        //     throw new Error('' + errorCode + WGL_ERROR[errorCode])
        // }
    }
    /**
     * `create()` creates a new WebGL context and augments it with more methods. The alpha channel is disabled
     * by default because it usually causes unintended transparencies in the canvas.
     */
    static create(options = {}) {
        const canvas = options.canvas || document.createElement('canvas');
        if (!options.canvas) {
            canvas.width = 800;
            canvas.height = 600;
        }
        if (!('alpha' in options))
            options.alpha = false;
        let newGL = undefined;
        try {
            newGL = canvas.getContext('webgl', options);
            console.log('getting context');
        }
        catch (e) {
            console.log(e, newGL);
        }
        try {
            newGL = newGL || canvas.getContext('experimental-webgl', options);
        }
        catch (e) {
            console.log(e, newGL);
        }
        if (!newGL)
            throw new Error('WebGL not supported');
        LightGLContext.gl = newGL;
        ts3dutils.addOwnProperties(newGL, LightGLContext.prototype);
        ts3dutils.addOwnProperties(newGL, new LightGLContext(newGL));
        //addEventListeners(newGL)
        return newGL;
    }
}
LightGLContext.MODELVIEW = 0;
LightGLContext.PROJECTION = 1;
LightGLContext.HALF_FLOAT_OES = 0x8D61;
var WGL_ERROR;
(function (WGL_ERROR) {
    WGL_ERROR[WGL_ERROR["NO_ERROR"] = WGL$1.NO_ERROR] = "NO_ERROR";
    WGL_ERROR[WGL_ERROR["INVALID_ENUM"] = WGL$1.INVALID_ENUM] = "INVALID_ENUM";
    WGL_ERROR[WGL_ERROR["INVALID_VALUE"] = WGL$1.INVALID_VALUE] = "INVALID_VALUE";
    WGL_ERROR[WGL_ERROR["INVALID_OPERATION"] = WGL$1.INVALID_OPERATION] = "INVALID_OPERATION";
    WGL_ERROR[WGL_ERROR["INVALID_FRAMEBUFFER_OPERATION"] = WGL$1.INVALID_FRAMEBUFFER_OPERATION] = "INVALID_FRAMEBUFFER_OPERATION";
    WGL_ERROR[WGL_ERROR["OUT_OF_MEMORY"] = WGL$1.OUT_OF_MEMORY] = "OUT_OF_MEMORY";
    WGL_ERROR[WGL_ERROR["CONTEXT_LOST_WEBGL"] = WGL$1.CONTEXT_LOST_WEBGL] = "CONTEXT_LOST_WEBGL";
})(WGL_ERROR || (WGL_ERROR = {}));
LightGLContext.prototype.MODELVIEW = LightGLContext.MODELVIEW;
LightGLContext.prototype.PROJECTION = LightGLContext.PROJECTION;
LightGLContext.prototype.HALF_FLOAT_OES = LightGLContext.HALF_FLOAT_OES;
/**
 *
 * Push two triangles:
 * c - d
 * | \ |
 * a - b
 */
function pushQuad(triangles, flipped, a, b, c, d) {
    if (flipped) {
        triangles.push(a, c, b, b, c, d);
    }
    else {
        triangles.push(a, b, c, b, d, c);
    }
}
function hexIntToGLColor(color) {
    return [(color >> 16) / 255.0, ((color >> 8) & 0xff) / 255.0, (color & 0xff) / 255.0, 1.0];
}

const WGL = WebGLRenderingContext;
class Buffer {
    /**
     * Provides a simple method of uploading data to a GPU buffer. Example usage:
     *
     *     const vertices = new Buffer(WGL.ARRAY_BUFFER, Float32Array)
     *     vertices.data = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]]
     *     vertices.compile()
     *
     *     const indices = new Buffer(WGL.ELEMENT_ARRAY_BUFFER, Uint16Array)
     *     indices.data = [[0, 1, 2], [2, 1, 3]]
     *     indices.compile()
     *
     * Specifies the target to which the buffer object is bound.
     * The symbolic constant must be GL_ARRAY_BUFFER or GL_ELEMENT_ARRAY_BUFFER.
     */
    constructor(target, type) {
        this.target = target;
        this.type = type;
        ts3dutils.assert(target == WGL.ARRAY_BUFFER || target == WGL.ELEMENT_ARRAY_BUFFER, 'target == WGL.ARRAY_BUFFER || target == WGL.ELEMENT_ARRAY_BUFFER');
        ts3dutils.assert(type == Float32Array || type == Uint16Array, 'type == Float32Array || type == Uint16Array');
        this.buffer = undefined;
        this.type = type;
        this.data = [];
        this.count = 0;
        this.spacing = 0;
        this.hasBeenCompiled = false;
    }
    /**
     * Upload the contents of `data` to the GPU in preparation for rendering. The data must be a list of lists
     * where each inner list has the same length. For example, each element of data for vertex normals would be a
     * list of length three. This will remember the data length and element length for later use by shaders.
     *
     * This could have used `[].concat.apply([], this.data)` to flatten the array but Google
     * Chrome has a maximum number of arguments so the concatenations are chunked to avoid that limit.
     *
     * @param type Either `WGL.STATIC_DRAW` or `WGL.DYNAMIC_DRAW`. Defaults to `WGL.STATIC_DRAW`
     */
    compile(type = WGL.STATIC_DRAW, gl = currentGL()) {
        ts3dutils.assert(WGL.STATIC_DRAW == type || WGL.DYNAMIC_DRAW == type, 'WGL.STATIC_DRAW == type || WGL.DYNAMIC_DRAW == type');
        gl.handleError();
        this.buffer = this.buffer || gl.createBuffer();
        gl.handleError();
        let buffer;
        if (this.data.length == 0) {
            console.warn('empty buffer ' + this.name);
            //console.trace()
        }
        if (this.data.length == 0 || this.data[0] instanceof ts3dutils.V3) {
            ts3dutils.assert(!(this.data[0] instanceof ts3dutils.V3) || this.type == Float32Array);
            ts3dutils.V3.pack(this.data, buffer = new this.type(this.data.length * 3)); // asserts that all
            // elements are V3s
            this.spacing = 3;
            this.count = this.data.length;
            this.maxValue = 0;
        }
        else {
            //assert(Array != this.data[0].constructor, this.name + this.data[0])
            if (Array.isArray(this.data[0])) {
                const bufferLength = this.data.length * this.data[0].length;
                buffer = new this.type(bufferLength);
                let i = this.data.length, destPtr = bufferLength;
                while (i--) {
                    const subArray = this.data[i];
                    let j = subArray.length;
                    while (j--) {
                        buffer[--destPtr] = subArray[j];
                    }
                }
                ts3dutils.assert(0 == destPtr);
            }
            else {
                buffer = new this.type(this.data);
            }
            const spacing = this.data.length ? buffer.length / this.data.length : 0;
            ts3dutils.assert(spacing % 1 == 0, `buffer ${this.name} elements not of consistent size, average size is ` + spacing);
            if (ts3dutils.NLA_DEBUG) {
                if (10000 <= buffer.length) {
                    this.maxValue = 0;
                }
                else {
                    this.maxValue = Math.max.apply(undefined, buffer);
                }
            }
            ts3dutils.assert(spacing !== 0);
            this.spacing = spacing;
            this.count = this.data.length;
        }
        gl.bindBuffer(this.target, this.buffer);
        gl.handleError();
        gl.bufferData(this.target, buffer, type);
        gl.handleError();
        this.hasBeenCompiled = true;
    }
}

class Texture {
    /**
     * Provides a simple wrapper around WebGL textures that supports render-to-texture.
     *
     * The arguments `width` and `height` give the size of the texture in texels.
     * WebGL texture dimensions must be powers of two unless `filter` is set to
     * either `WGL.NEAREST` or `WGL.LINEAR` and `wrap` is set to `WGL.CLAMP_TO_EDGE`
     * (which they are by default).
     *
     * Texture parameters can be passed in via the `options` argument.
     * Example usage:
     *
     *      let tex = new GL.Texture(256, 256, {
         *       magFilter: WGL.NEAREST,
         *       minFilter: WGL.LINEAR,
         *
         *       wrapS: WGL.REPEAT,
         *       wrapT: WGL.REPEAT,
         *
         *       format: WGL.RGB, // Defaults to WGL.RGBA
         *       type: WGL.FLOAT // Defaults to WGL.UNSIGNED_BYTE
         *     })
     *
     */
    constructor(width, height, options = {}, gl = currentGL()) {
        this.gl = gl;
        this.texture = gl.createTexture();
        gl.handleError(); // in case createTexture returns null & fails
        this.width = width;
        this.height = height;
        this.format = options.format || gl.RGBA;
        this.type = options.type || gl.UNSIGNED_BYTE;
        const magFilter = options.filter || options.magFilter || gl.LINEAR;
        const minFilter = options.filter || options.minFilter || gl.LINEAR;
        if (this.type === gl.FLOAT) {
            if (!gl.getExtension('OES_texture_float')) {
                throw new Error('OES_texture_float is required but not supported');
            }
            if ((minFilter !== gl.NEAREST || magFilter !== gl.NEAREST) && !gl.getExtension('OES_texture_float_linear')) {
                throw new Error('OES_texture_float_linear is required but not supported');
            }
        }
        else if (this.type === LightGLContext.HALF_FLOAT_OES) {
            if (!gl.getExtension('OES_texture_half_float')) {
                throw new Error('OES_texture_half_float is required but not supported');
            }
            if ((minFilter !== gl.NEAREST || magFilter !== gl.NEAREST) && !gl.getExtension('OES_texture_half_float_linear')) {
                throw new Error('OES_texture_half_float_linear is required but not supported');
            }
        }
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, options.wrap || options.wrapS || gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, options.wrap || options.wrapT || gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
    }
    bind(unit) {
        this.gl.activeTexture(this.gl.TEXTURE0 + unit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    }
    unbind(unit) {
        this.gl.activeTexture(this.gl.TEXTURE0 + unit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
    canDrawTo() {
        const gl = this.gl;
        this.framebuffer = this.framebuffer || gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        const result = gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return result;
    }
    drawTo(callback) {
        const gl = this.gl;
        this.framebuffer = this.framebuffer || gl.createFramebuffer();
        this.renderbuffer = this.renderbuffer || gl.createRenderbuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer);
        if (this.width != this.renderbuffer.width || this.height != this.renderbuffer.height) {
            this.renderbuffer.width = this.width;
            this.renderbuffer.height = this.height;
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
        }
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.renderbuffer);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
            throw new Error('Rendering to this texture is not supported (incomplete this.framebuffer)');
        }
        const viewport = gl.getParameter(gl.VIEWPORT);
        gl.viewport(0, 0, this.width, this.height);
        callback(gl);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);
    }
    swapWith(other) {
        ts3dutils.assert(this.gl == other.gl);
        let temp;
        temp = other.texture;
        other.texture = this.texture;
        this.texture = temp;
        temp = other.width;
        other.width = this.width;
        this.width = temp;
        temp = other.height;
        other.height = this.height;
        this.height = temp;
    }
    /**
     * Return a new texture created from `imgElement`, an `<img>` tag.
     */
    static fromImage(imgElement, options, gl = currentGL()) {
        options = options || {};
        const texture = new Texture(imgElement.width, imgElement.height, options, gl);
        try {
            gl.texImage2D(gl.TEXTURE_2D, 0, texture.format, texture.format, texture.type, imgElement);
        }
        catch (e) {
            if (location.protocol == 'file:') {
                throw new Error('imgElement not loaded for security reasons (serve this page over "http://" instead)');
            }
            else {
                throw new Error('imgElement not loaded for security reasons (imgElement must originate from the same ' +
                    'domain as this page or use Cross-Origin Resource Sharing)');
            }
        }
        if (options.minFilter && options.minFilter != gl.NEAREST && options.minFilter != gl.LINEAR) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        return texture;
    }
    /**
     * Returns a checkerboard texture that will switch to the correct texture when it loads.
     */
    static fromURL(url, options = {}, gl = currentGL()) {
        Texture.checkerBoardCanvas = Texture.checkerBoardCanvas || (function () {
            const c = document.createElement('canvas').getContext('2d');
            if (!c)
                throw new Error('Could not create 2d canvas.');
            c.canvas.width = c.canvas.height = 128;
            for (let y = 0; y < c.canvas.height; y += 16) {
                for (let x = 0; x < c.canvas.width; x += 16) {
                    //noinspection JSBitwiseOperatorUsage
                    c.fillStyle = (x ^ y) & 16 ? '#FFF' : '#DDD';
                    c.fillRect(x, y, 16, 16);
                }
            }
            return c.canvas;
        })();
        const texture = Texture.fromImage(Texture.checkerBoardCanvas, options);
        const image = new Image();
        image.onload = () => Texture.fromImage(image, options, gl).swapWith(texture);
        image.src = url;
        return texture;
    }
}

exports.Buffer = Buffer;
exports.Mesh = Mesh;
exports.SHADER_VAR_TYPES = SHADER_VAR_TYPES;
exports.isArray = isArray;
exports.Shader = Shader;
exports.Texture = Texture;
exports.GL_COLOR_BLACK = GL_COLOR_BLACK;
exports.currentGL = currentGL;
exports.isNumber = isNumber;
exports.LightGLContext = LightGLContext;
exports.pushQuad = pushQuad;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=bundle.js.map
