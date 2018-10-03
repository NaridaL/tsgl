'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var ts3dutils = require('ts3dutils');
var tslib_1 = require('tslib');
var chroma = _interopDefault(require('chroma.ts'));

const WGL = WebGLRenderingContext;
class Buffer$$1 {
    /**
     * Provides a simple method of uploading data to a GPU buffer.
     *
     * @example
     *     const vertices = new Buffer(WGL.ARRAY_BUFFER, Float32Array)
     *     vertices.data = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]]
     *     vertices.compile()
     *
     * @example
     *     const indices = new Buffer(WGL.ELEMENT_ARRAY_BUFFER, Uint16Array)
     *     indices.data = [[0, 1, 2], [2, 1, 3]]
     *     indices.compile()
     *
     * @param target Specifies the target to which the buffer object is bound.
     * @param type
     */
    constructor(target, type) {
        this.target = target;
        this.type = type;
        this.buffer = undefined;
        this.data = [];
        /** Number of elements in buffer. 2 V3s is still 2, not 6. */
        this.count = 0;
        /** Space between elements in buffer. 3 for V3s. */
        this.spacing = 1;
        this.hasBeenCompiled = false;
        ts3dutils.assert(target == WGL.ARRAY_BUFFER || target == WGL.ELEMENT_ARRAY_BUFFER, 'target == WGL.ARRAY_BUFFER || target == WGL.ELEMENT_ARRAY_BUFFER');
        ts3dutils.assert(type == Float32Array || type == Uint16Array || type == Uint32Array, 'type == Float32Array || type == Uint16Array || type == Uint32Array');
        if (Uint16Array == type) {
            this.bindSize = WGL.UNSIGNED_SHORT;
        }
        else if (Uint32Array == type) {
            this.bindSize = WGL.UNSIGNED_INT;
        }
    }
    /**
     * Upload the contents of `data` to the GPU in preparation for rendering. The data must be a list of lists
     * where each inner list has the same length. For example, each element of data for vertex normals would be a
     * list of length three. This will remember the data length and element length for later use by shaders.
     *
     * This could have used `[].concat.apply([], this.data)` to flatten the array but Google
     * Chrome has a maximum number of arguments so the concatenations are chunked to avoid that limit.
     *
     * @param usage Either `WGL.STATIC_DRAW` or `WGL.DYNAMIC_DRAW`. Defaults to `WGL.STATIC_DRAW`
     */
    compile(usage = WGL.STATIC_DRAW, gl = currentGL$$1()) {
        ts3dutils.assert(WGL.STATIC_DRAW == usage || WGL.DYNAMIC_DRAW == usage, 'WGL.STATIC_DRAW == type || WGL.DYNAMIC_DRAW == type');
        this.buffer = this.buffer || gl.createBuffer();
        let buffer;
        if (this.data.length == 0) {
            console.warn('empty buffer ' + this.name);
            //console.trace()
        }
        if (this.data.length == 0 || this.data[0] instanceof ts3dutils.V3) {
            ts3dutils.assert(!(this.data[0] instanceof ts3dutils.V3) || this.type == Float32Array);
            ts3dutils.V3.pack(this.data, (buffer = new this.type(this.data.length * 3))); // asserts that all
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
            ts3dutils.assert([1, 2, 3, 4].includes(spacing));
            this.spacing = spacing;
            this.count = this.data.length;
        }
        gl.bindBuffer(this.target, this.buffer);
        gl.bufferData(this.target, buffer, usage);
        this.hasBeenCompiled = true;
    }
}

const { cos, sin, PI, min, max } = Math;
const WGL$1 = WebGLRenderingContext;
const tempM4_1 = new ts3dutils.M4();
const tempM4_2 = new ts3dutils.M4();
/**
 * @example new Mesh()
 *        .addIndexBuffer('TRIANGLES')
 *        .addIndexBuffer('LINES')
 *        .addVertexBuffer('normals', 'ts_Normal')
 */
class Mesh$$1 extends ts3dutils.Transformable {
    constructor() {
        super();
        this.hasBeenCompiled = false;
        this.vertexBuffers = {};
        this.indexBuffers = {};
        this.addVertexBuffer('vertices', 'ts_Vertex');
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
    calcVolume() {
        let totalVolumeX2 = 0, totalCentroidWithZX2 = ts3dutils.V3.O, totalAreaX2 = 0;
        const triangles = this.TRIANGLES;
        const vertices = this.vertices;
        for (let i = 0; i < triangles.length; i += 3) {
            const ai = triangles[i + 0], bi = triangles[i + 1], ci = triangles[i + 2];
            const a = vertices[ai], b = vertices[bi], c = vertices[ci];
            const ab = b.minus(a), ac = c.minus(a);
            const normal = ab.cross(ac);
            //const centroidZ = (v0.z + v1.z + v2.z) / 3
            const faceCentroid = ts3dutils.V3.add(a, b, c).div(3);
            //totalVolume += centroidZ * (area === v01.cross(v02).length() / 2) * v01.cross(v02).unit().z
            totalVolumeX2 += faceCentroid.z * normal.z;
            const faceAreaX2 = normal.length();
            totalAreaX2 += faceAreaX2;
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
            const faceShadowCentroid = ts3dutils.V3.add(a.times(2 * a.z + b.z + c.z), b.times(a.z + 2 * b.z + c.z), c.times(a.z + b.z + 2 * c.z)).times(normal.z); // 1/24 factor is done at very end
            totalCentroidWithZX2 = totalCentroidWithZX2.plus(faceShadowCentroid);
        }
        // sumInPlaceTree adds negligible additional accuracy for XY sphere
        const volume = totalVolumeX2 / 2;
        return {
            volume,
            centroid: ts3dutils.eq0(volume) ? ts3dutils.V3.O : totalCentroidWithZX2.div(24 * volume).schur(new ts3dutils.V3(1, 1, 0.5)),
            area: totalAreaX2 / 2,
        };
    }
    /**
     * Add a new vertex buffer with a list as a property called `name` on this object and map it to
     * the attribute called `attribute` in all shaders that draw this mesh.
     * @example new Mesh().addVertexBuffer('coords', 'ts_TexCoord')
     */
    addVertexBuffer(name, attribute) {
        ts3dutils.assert(!this.vertexBuffers[attribute], 'Buffer ' + attribute + ' already exists.');
        //assert(!this[name])
        this.hasBeenCompiled = false;
        ts3dutils.assert('string' == typeof name);
        ts3dutils.assert('string' == typeof attribute);
        const buffer = (this.vertexBuffers[attribute] = new Buffer$$1(WGL$1.ARRAY_BUFFER, Float32Array));
        buffer.name = name;
        this[name] = [];
        return this;
    }
    /**
     * Add a new index buffer.
     * @example new Mesh().addIndexBuffer('TRIANGLES')
     * @example new Mesh().addIndexBuffer('LINES')
     */
    addIndexBuffer(name, type = WGL$1.UNSIGNED_SHORT) {
        this.hasBeenCompiled = false;
        const arrayType = WGL$1.UNSIGNED_SHORT == type ? Uint16Array : Uint32Array;
        const buffer = (this.indexBuffers[name] = new Buffer$$1(WGL$1.ELEMENT_ARRAY_BUFFER, arrayType));
        buffer.name = name;
        this[name] = [];
        return this;
    }
    concat(...others) {
        const result = new Mesh$$1();
        const allMeshes = [this].concat(others);
        Object.getOwnPropertyNames(this.vertexBuffers).forEach(attribute => {
            ts3dutils.assert(others.every(other => !!other.vertexBuffers[attribute]));
            const bufferName = this.vertexBuffers[attribute].name;
            if ('ts_Vertex' !== attribute) {
                result.addVertexBuffer(bufferName, attribute);
            }
            result[bufferName] = allMeshes.map(mesh => mesh[bufferName]).concatenated();
        });
        Object.getOwnPropertyNames(this.indexBuffers).forEach(name => {
            ts3dutils.assert(others.every(other => !!other.indexBuffers[name]));
            result.addIndexBuffer(name, this.indexBuffers[name].bindSize);
            const newIndexBufferData = new Array(allMeshes.reduce((sum, mesh) => sum + mesh[name].length, 0));
            let ptr = 0;
            let startIndex = 0;
            for (const mesh of allMeshes) {
                for (const index of mesh[name]) {
                    newIndexBufferData[ptr++] = startIndex + index;
                }
                startIndex += mesh.vertices.length;
            }
            result[name] = newIndexBufferData;
        });
        result.compile();
        return result;
    }
    /**
     * Upload all attached buffers to the GPU in preparation for rendering. This doesn't need to be called every
     * frame, only needs to be done when the data changes.
     *
     * Sets `this.hasBeenCompiled` to true.
     */
    compile(gl = currentGL$$1()) {
        // figure out shortest vertex buffer to make sure indexBuffers are in bounds
        let minVertexBufferLength = Infinity; // TODO, _minBufferName
        Object.getOwnPropertyNames(this.vertexBuffers).forEach(attribute => {
            const buffer = this.vertexBuffers[attribute];
            buffer.data = this[buffer.name];
            buffer.compile(undefined, gl);
            if (this[buffer.name].length < minVertexBufferLength) {
                // _minBufferName = attribute
                minVertexBufferLength = this[buffer.name].length;
            }
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
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const mesh = new Mesh$$1().addVertexBuffer('normals', 'ts_Normal');
                const fileReader = new FileReader();
                fileReader.onerror = reject;
                fileReader.onload = function (_progressEvent) {
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
     * Returns a new Mesh with transformed vertices.
     *
     * Transform all vertices by `matrix` and all normals by the inverse transpose of `matrix`.
     *
     * Index buffer data is referenced.
     */
    transform(m4) {
        const mesh = new Mesh$$1();
        mesh.vertices = m4.transformedPoints(this.vertices);
        if (this.normals) {
            mesh.addVertexBuffer('normals', 'ts_Normal');
            const invTrans = m4
                .as3x3(tempM4_1)
                .inversed(tempM4_2)
                .transposed(tempM4_1);
            mesh.normals = this.normals.map(n => invTrans.transformVector(n).unit());
            // mesh.normals.forEach(n => assert(n.hasLength(1)))
        }
        for (const name in this.indexBuffers) {
            mesh.addIndexBuffer(name);
            mesh[name] = this[name];
        }
        for (const attribute in this.vertexBuffers) {
            if ('ts_Vertex' !== attribute && 'ts_Normal' !== attribute) {
                const name = this.vertexBuffers[attribute].name;
                mesh.addVertexBuffer(name, attribute);
                mesh[name] = this[name];
            }
        }
        // this.hasBeenCompiled && mesh.compile()
        return mesh;
    }
    /**
     * Computes a new normal for each vertex from the average normal of the neighboring triangles. This means
     * adjacent triangles must share vertices for the resulting normals to be smooth.
     */
    computeNormalsFromFlatTriangles() {
        if (!this.normals)
            this.addVertexBuffer('normals', 'ts_Normal');
        // tslint:disable:no-string-literal
        //this.vertexBuffers['ts_Normal'].data = arrayFromFunction(this.vertices.length, i => V3.O)
        const TRIANGLES = this.TRIANGLES, vertices = this.vertices, normals = this.normals;
        normals.length = vertices.length;
        for (let i = 0; i < TRIANGLES.length; i += 3) {
            const ai = TRIANGLES[i], bi = TRIANGLES[i + 1], ci = TRIANGLES[i + 2];
            const a = vertices[ai];
            const b = vertices[bi];
            const c = vertices[ci];
            const normal = b
                .minus(a)
                .cross(c.minus(a))
                .unit();
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
    /**
     * Generates a square mesh in the XY plane.
     * Texture coordinates (buffer "coords") are set to go from 0 to 1 in either direction.
     *
     * @param options foo
     * @param options.detail Defaults to 1
     * @param options.detailX Defaults to options.detail. Number of subdivisions in X direction.
     * @param options.detailY Defaults to options.detail. Number of subdivisions in Y direction.j
     * @param options.width defaults to 1
     * @param options.height defaults to 1
     * @param options.startX defaults to 0
     * @param options.startY defaults to 0
     */
    static plane(options = {}) {
        const detailX = options.detailX || options.detail || 1;
        const detailY = options.detailY || options.detail || 1;
        const startX = options.startX || 0;
        const startY = options.startY || 0;
        const width = options.width || 1;
        const height = options.height || 1;
        const mesh = new Mesh$$1()
            .addIndexBuffer('LINES')
            .addIndexBuffer('TRIANGLES')
            .addVertexBuffer('normals', 'ts_Normal')
            .addVertexBuffer('coords', 'ts_TexCoord');
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
    static box(xDetail = 1, yDetail = 1, zDetail = 1) {
        const mesh = new Mesh$$1()
            .addIndexBuffer('LINES')
            .addIndexBuffer('TRIANGLES')
            .addVertexBuffer('normals', 'ts_Normal');
        mesh.vertices.length = mesh.normals.length =
            2 * ((xDetail + 1) * (yDetail + 1) + (yDetail + 1) * (zDetail + 1) + (zDetail + 1) * (xDetail + 1));
        mesh.TRIANGLES.length = 4 * (xDetail * yDetail + yDetail * zDetail + zDetail * xDetail);
        let vi = 0, ti = 0;
        function x(detailX, detailY, m, startX = 0, width = 1, startY = 0, height = 1) {
            const normal = m.transformVector(ts3dutils.V3.Z);
            for (let j = 0; j <= detailY; j++) {
                const t = j / detailY;
                for (let i = 0; i <= detailX; i++) {
                    const s = i / detailX;
                    mesh.vertices[vi] = m.transformPoint(new ts3dutils.V3(startX + s * width, startY + t * height, 0));
                    mesh.normals[vi] = normal;
                    vi++;
                    if (i < detailX && j < detailY) {
                        const offset = i + j * (detailX + 1);
                        mesh.TRIANGLES[ti++] = offset;
                        mesh.TRIANGLES[ti++] = offset + detailX + 1;
                        mesh.TRIANGLES[ti++] = offset + 1;
                        mesh.TRIANGLES[ti++] = offset + detailX + 1;
                        mesh.TRIANGLES[ti++] = offset + detailX + 2;
                        mesh.TRIANGLES[ti++] = offset + 1;
                    }
                }
            }
        }
        x(yDetail, xDetail, ts3dutils.M4.forSys(ts3dutils.V3.Y, ts3dutils.V3.X, ts3dutils.V3.Z.negated()));
        x(xDetail, yDetail, ts3dutils.M4.translate(ts3dutils.V3.Z));
        x(zDetail, yDetail, ts3dutils.M4.forSys(ts3dutils.V3.Z, ts3dutils.V3.Y, ts3dutils.V3.X.negated()));
        x(yDetail, zDetail, ts3dutils.M4.forSys(ts3dutils.V3.Y, ts3dutils.V3.Z, ts3dutils.V3.X, ts3dutils.V3.X));
        x(xDetail, zDetail, ts3dutils.M4.forSys(ts3dutils.V3.X, ts3dutils.V3.Z, ts3dutils.V3.Y.negated()));
        x(zDetail, xDetail, ts3dutils.M4.forSys(ts3dutils.V3.Z, ts3dutils.V3.X, ts3dutils.V3.Y, ts3dutils.V3.Y));
        return mesh;
    }
    /**
     * Generates a unit cube (1x1x1) starting at the origin and extending into the (+ + +) octant.
     * I.e. box from V3.O to V3(1,1,1)
     * Creates line (only cube edges), triangle, vertex and normal1 buffers.
     */
    static cube() {
        const mesh = new Mesh$$1()
            .addVertexBuffer('normals', 'ts_Normal')
            .addIndexBuffer('TRIANGLES')
            .addIndexBuffer('LINES');
        // basically indexes for faces of the cube. vertices each need to be added 3 times,
        // as they have different normals depending on the face being rendered
        // prettier-ignore
        const VERTEX_CORNERS = [
            0, 1, 2, 3,
            4, 5, 6, 7,
            0, 4, 1, 5,
            2, 6, 3, 7,
            2, 6, 0, 4,
            3, 7, 1, 5,
        ];
        mesh.vertices = VERTEX_CORNERS.map(i => Mesh$$1.UNIT_CUBE_CORNERS[i]);
        mesh.normals = [ts3dutils.V3.X.negated(), ts3dutils.V3.X, ts3dutils.V3.Y.negated(), ts3dutils.V3.Y, ts3dutils.V3.Z.negated(), ts3dutils.V3.Z].flatMap(v => [v, v, v, v]);
        for (let i = 0; i < 6 * 4; i += 4) {
            pushQuad$$1(mesh.TRIANGLES, 0 != i % 8, VERTEX_CORNERS[i], VERTEX_CORNERS[i + 1], VERTEX_CORNERS[i + 2], VERTEX_CORNERS[i + 3]);
        }
        // indexes of LINES relative to UNIT_CUBE_CORNERS. Mapped to VERTEX_CORNERS.indexOf
        // so they make sense in the context of the mesh
        // prettier-ignore
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
        return Mesh$$1.sphere(0);
    }
    static sphere2(latitudes, longitudes) {
        const baseVertices = ts3dutils.arrayFromFunction(latitudes, i => {
            const angle = (i / (latitudes - 1)) * PI - PI / 2;
            return new ts3dutils.V3(0, cos(angle), sin(angle));
        });
        return Mesh$$1.rotation(baseVertices, { anchor: ts3dutils.V3.O, dir1: ts3dutils.V3.Z }, 2 * PI, longitudes, true, baseVertices);
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
            new ts3dutils.V3(-t, 0, s),
        ];
        // base triangles of isocahedron
        // prettier-ignore
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
        const mesh = new Mesh$$1()
            .addVertexBuffer('normals', 'ts_Normal')
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
        const matrix = ts3dutils.M4.product(ts3dutils.M4.translate(aabb.min), ts3dutils.M4.scale(aabb.size().max(new ts3dutils.V3(ts3dutils.NLA_PRECISION, ts3dutils.NLA_PRECISION, ts3dutils.NLA_PRECISION))));
        const mesh = Mesh$$1.cube().transform(matrix);
        // mesh.vertices = aabb.corners()
        mesh.computeNormalLines(20);
        mesh.compile();
        return mesh;
    }
    static offsetVertices(vertices, offset, close, normals) {
        ts3dutils.assertVectors.apply(undefined, vertices);
        ts3dutils.assertVectors(offset);
        const mesh = new Mesh$$1().addIndexBuffer('TRIANGLES').addVertexBuffer('coords', 'ts_TexCoord');
        normals && mesh.addVertexBuffer('normals', 'ts_Normal');
        mesh.vertices = vertices.concat(vertices.map(v => v.plus(offset)));
        const vl = vertices.length;
        mesh.coords = ts3dutils.arrayFromFunction(vl * 2, (i) => [(i % vl) / vl, (i / vl) | 0]);
        const triangles = mesh.TRIANGLES;
        for (let i = 0; i < vertices.length - 1; i++) {
            pushQuad$$1(triangles, false, i, i + 1, vertices.length + i, vertices.length + i + 1);
        }
        if (close) {
            pushQuad$$1(triangles, false, vertices.length - 1, 0, vertices.length * 2 - 1, vertices.length);
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
        const mesh = new Mesh$$1().addIndexBuffer('TRIANGLES');
        normals && mesh.addVertexBuffer('normals', 'ts_Normal');
        const vc = vertices.length, vTotal = vc * steps;
        const rotMat = new ts3dutils.M4();
        const triangles = mesh.TRIANGLES;
        for (let i = 0; i < steps; i++) {
            // add triangles
            const rads = (totalRads / steps) * i;
            ts3dutils.M4.rotateLine(lineAxis.anchor, lineAxis.dir1, rads, rotMat);
            mesh.vertices.push(...rotMat.transformedPoints(vertices));
            normals && mesh.normals.push(...rotMat.transformedVectors(normals));
            if (close || i !== steps - 1) {
                for (let j = 0; j < vc - 1; j++) {
                    pushQuad$$1(triangles, false, i * vc + j + 1, i * vc + j, ((i + 1) * vc + j + 1) % vTotal, ((i + 1) * vc + j) % vTotal);
                }
            }
        }
        mesh.compile();
        return mesh;
    }
    static parametric(pF, pN, sMin, sMax, tMin, tMax, sRes, tRes) {
        const mesh = new Mesh$$1().addIndexBuffer('TRIANGLES').addVertexBuffer('normals', 'ts_Normal');
        for (let si = 0; si <= sRes; si++) {
            const s = ts3dutils.lerp(sMin, sMax, si / sRes);
            for (let ti = 0; ti <= tRes; ti++) {
                const t = ts3dutils.lerp(tMin, tMax, ti / tRes);
                mesh.vertices.push(pF(s, t));
                pN && mesh.normals.push(pN(s, t));
                if (ti < tRes && si < sRes) {
                    const offset = ti + si * (tRes + 1);
                    pushQuad$$1(mesh.TRIANGLES, false, offset, offset + tRes + 1, offset + 1, offset + tRes + 2);
                }
            }
        }
        return mesh;
    }
    static load(json) {
        const mesh = new Mesh$$1();
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
            mesh.addVertexBuffer('normals', 'ts_Normal');
            mesh.normals = json.normals;
        }
        mesh.compile();
        return mesh;
    }
    toJSON() {
        return {
            vertices: this.vertices.map(x => x.toArray()),
            TRIANGLES: this.TRIANGLES,
        };
    }
}
// unique corners of a unit cube. Used by Mesh.cube to generate a cube mesh.
Mesh$$1.UNIT_CUBE_CORNERS = [
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
const WGL$2 = WebGLRenderingContext;
/**
 * These are all the draw modes usable in OpenGL ES
 */
const DRAW_MODE_NAMES = {
    [WGL$2.POINTS]: 'POINTS',
    [WGL$2.LINES]: 'LINES',
    [WGL$2.LINE_STRIP]: 'LINE_STRIP',
    [WGL$2.LINE_LOOP]: 'LINE_LOOP',
    [WGL$2.TRIANGLES]: 'TRIANGLES',
    [WGL$2.TRIANGLE_STRIP]: 'TRIANGLE_STRIP',
    [WGL$2.TRIANGLE_FAN]: 'TRIANGLE_FAN',
};
const DRAW_MODE_CHECKS = {
    [WGL$2.POINTS]: _ => true,
    [WGL$2.LINES]: x => 0 == x % 2,
    [WGL$2.LINE_STRIP]: x => x > 2,
    [WGL$2.LINE_LOOP]: x => x > 2,
    [WGL$2.TRIANGLES]: x => 0 == x % 3,
    [WGL$2.TRIANGLE_STRIP]: x => x > 3,
    [WGL$2.TRIANGLE_FAN]: x => x > 3,
};
const SHADER_VAR_TYPES$$1 = [
    'FLOAT',
    'FLOAT_MAT2',
    'FLOAT_MAT3',
    'FLOAT_MAT4',
    'FLOAT_VEC2',
    'FLOAT_VEC3',
    'FLOAT_VEC4',
    'INT',
    'INT_VEC2',
    'INT_VEC3',
    'INT_VEC4',
    'UNSIGNED_INT',
];
function isArray$$1(obj) {
    return Array == obj.constructor || Float32Array == obj.constructor || Float64Array == obj.constructor;
}
function isFloatArray(obj) {
    return (Float32Array == obj.constructor ||
        Float64Array == obj.constructor ||
        (Array.isArray(obj) && obj.every(x => 'number' == typeof x)));
}
function isIntArray(x) {
    if ([Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array].some(y => x instanceof y)) {
        return true;
    }
    return ((x instanceof Float32Array || x instanceof Float64Array || Array.isArray(x)) &&
        x.every(x => Number.isInteger(x)));
}
//const x:UniformTypes = undefined as 'FLOAT_VEC4' | 'FLOAT_VEC3'
class Shader$$1 {
    /**
     * Provides a convenient wrapper for WebGL shaders. A few uniforms and attributes,
     * prefixed with `gl_`, are automatically added to all shader sources to make
     * simple shaders easier to write.
     * Headers for the following variables are automatically prepended to the passed source. The correct variables
     * are also automatically passed to the shader when drawing.
     *
     * For vertex and fragment shaders:
     uniform mat3 ts_NormalMatrix;
     uniform mat4 ts_ModelViewMatrix;
     uniform mat4 ts_ProjectionMatrix;
     uniform mat4 ts_ModelViewProjectionMatrix;
     uniform mat4 ts_ModelViewMatrixInverse;
     uniform mat4 ts_ProjectionMatrixInverse;
     uniform mat4 ts_ModelViewProjectionMatrixInverse;
     *
     *
     * Example usage:
     *
     *  const shader = new GL.Shader(
     *      `void main() { gl_Position = ts_ModelViewProjectionMatrix * ts_Vertex; }`,
     *      `uniform vec4 color; void main() { gl_FragColor = color; }`)
     *
     *  shader.uniforms({ color: [1, 0, 0, 1] }).draw(mesh)
     *
     * Compiles a shader program using the provided vertex and fragment shaders.
     */
    constructor(vertexSource, fragmentSource, gl = currentGL$$1()) {
        this.projectionMatrixVersion = -1;
        this.modelViewMatrixVersion = -1;
        // const versionRegex = /^(?:\s+|\/\/[\s\S]*?[\r\n]+|\/\*[\s\S]*?\*\/)+(#version\s+(\d+)\s+es)/
        // Headers are prepended to the sources to provide some automatic functionality.
        const header = `
		uniform mat3 ts_NormalMatrix;
		uniform mat4 ts_ModelViewMatrix;
		uniform mat4 ts_ProjectionMatrix;
		uniform mat4 ts_ModelViewProjectionMatrix;
		uniform mat4 ts_ModelViewMatrixInverse;
		uniform mat4 ts_ProjectionMatrixInverse;
		uniform mat4 ts_ModelViewProjectionMatrixInverse;
	`;
        const matrixNames = header.match(/\bts_\w+/g);
        // Compile and link errors are thrown as strings.
        function compileSource(type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                throw new Error('compile error: ' + gl.getShaderInfoLog(shader));
            }
            return shader;
        }
        this.gl = gl;
        this.program = gl.createProgram();
        gl.attachShader(this.program, compileSource(gl.VERTEX_SHADER, vertexSource));
        gl.attachShader(this.program, compileSource(gl.FRAGMENT_SHADER, fragmentSource));
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            throw new Error('link error: ' + gl.getProgramInfoLog(this.program));
        }
        this.attributeLocations = {};
        this.uniformLocations = {};
        this.constantAttributes = {};
        // Check for the use of built-in matrices that require expensive matrix
        // multiplications to compute, and record these in `activeMatrices`.
        this.activeMatrices = {};
        matrixNames &&
            matrixNames.forEach(name => {
                if (gl.getUniformLocation(this.program, name)) {
                    this.activeMatrices[name] = true;
                }
            });
        this.uniformInfos = {};
        for (let i = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS); i-- > 0;) {
            // see https://www.khronos.org/registry/OpenGL-Refpages/es2.0/xhtml/glGetActiveUniform.xml
            // this.program has already been checked
            // i is in bounds
            const info = gl.getActiveUniform(this.program, i);
            this.uniformInfos[info.name] = info;
        }
    }
    static create(vertexSource, fragmentSource, gl) {
        return new Shader$$1(vertexSource, fragmentSource, gl);
    }
    /**
     * Set a uniform for each property of `uniforms`. The correct `viewerGL.uniform*()` method is inferred from the
     * value types and from the stored uniform sampler flags.
     */
    uniforms(uniforms) {
        const gl = this.gl;
        gl.useProgram(this.program);
        for (const name in uniforms) {
            const location = this.uniformLocations[name] || gl.getUniformLocation(this.program, name);
            // !location && console.warn(name + ' uniform is not used in shader')
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
                ts3dutils.assert(gl.FLOAT != info.type || ((1 == info.size && 'number' === typeof value) || isFloatArray(value)));
                ts3dutils.assert(gl.FLOAT_VEC3 != info.type ||
                    ((1 == info.size && value instanceof ts3dutils.V3) ||
                        (Array.isArray(value) && info.size == value.length && ts3dutils.assertVectors(...value))));
                ts3dutils.assert(gl.FLOAT_VEC4 != info.type || 1 != info.size || (isFloatArray(value) && value.length == 4));
                ts3dutils.assert(gl.FLOAT_MAT4 != info.type || value instanceof ts3dutils.M4, () => value.toSource());
                ts3dutils.assert(gl.FLOAT_MAT3 != info.type || value.length == 9 || value instanceof ts3dutils.M4);
            }
            if (value instanceof ts3dutils.V3) {
                value = value.toArray();
            }
            if (gl.FLOAT_VEC4 == info.type && info.size != 1) {
                if (value instanceof Float32Array || value instanceof Float64Array) {
                    gl.uniform4fv(location, value instanceof Float32Array ? value : Float32Array.from(value));
                }
                else {
                    gl.uniform4fv(location, value.concatenated());
                }
            }
            else if (gl.FLOAT == info.type && info.size != 1) {
                gl.uniform1fv(location, value);
            }
            else if (gl.FLOAT_VEC3 == info.type && info.size != 1) {
                gl.uniform3fv(location, ts3dutils.V3.pack(value));
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
                        // prettier-ignore
                        gl.uniformMatrix3fv(location, false, new Float32Array([
                            value[0], value[3], value[6],
                            value[1], value[4], value[7],
                            value[2], value[5], value[8],
                        ]));
                        break;
                    case 16:
                        // prettier-ignore
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
                    // prettier-ignore
                    gl.uniformMatrix4fv(location, false, [
                        m[0], m[4], m[8], m[12],
                        m[1], m[5], m[9], m[13],
                        m[2], m[6], m[10], m[14],
                        m[3], m[7], m[11], m[15]
                    ]);
                }
                else if (gl.FLOAT_MAT3 == info.type) {
                    // prettier-ignore
                    gl.uniformMatrix3fv(location, false, [
                        m[0], m[4], m[8],
                        m[1], m[5], m[9],
                        m[2], m[6], m[10]
                    ]);
                }
                else if (gl.FLOAT_MAT2 == info.type) {
                    // prettier-ignore
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
        }
        return this;
    }
    attributes(attributes) {
        const gl = this.gl;
        gl.useProgram(this.program);
        for (const name in attributes) {
            const location = this.attributeLocations[name] || gl.getAttribLocation(this.program, name);
            if (location == -1) {
                if (!name.startsWith('ts_')) {
                    console.warn(`Vertex buffer ${name} was not bound because the attribute is not active.`);
                }
                continue;
            }
            this.attributeLocations[name] = location;
            gl.disableVertexAttribArray(location);
            let value = attributes[name];
            if (value instanceof ts3dutils.V3) {
                // TODO: figure out the types here...
                value = value.toArray();
            }
            if ('number' === typeof value) {
                gl.vertexAttrib1f(location, value);
            }
            else {
                gl.vertexAttrib4fv(location, value);
                // switch ((value as number[]).length) {
                // 	case 1:
                // 		gl.vertexAttrib1fv(location, value as number[])
                // 		break
                // 	case 2:
                // 		gl.vertexAttrib2fv(location, value as number[])
                // 		break
                // 	case 3:
                // 		gl.vertexAttrib3fv(location, value as number[])
                // 		break
                // 	case 4:
                // 		break
                // }
            }
            this.constantAttributes[name] = true;
        }
        return this;
    }
    /**
     * Sets all uniform matrix attributes, binds all relevant buffers, and draws the mesh geometry as indexed
     * triangles or indexed LINES. Set `mode` to `gl.LINES` (and either add indices to `LINES` or call
     * `computeWireframe()`) to draw the mesh in wireframe.
     *
     * @param mesh
     * @param mode Defaults to 'TRIANGLES'. Must be passed as string so the correct index buffer can be
     *     automatically drawn.
     * @param start int
     * @param count int
     */
    draw(mesh, mode = WGL$2.TRIANGLES, start, count) {
        ts3dutils.assert(mesh.hasBeenCompiled, 'mesh.hasBeenCompiled');
        ts3dutils.assert(undefined != DRAW_MODE_NAMES[mode]);
        const modeName = DRAW_MODE_NAMES[mode];
        // assert(mesh.indexBuffers[modeStr], `mesh.indexBuffers[${modeStr}] undefined`)
        return this.drawBuffers(mesh.vertexBuffers, mesh.indexBuffers[modeName], mode, start, count);
    }
    /**
     * Sets all uniform matrix attributes, binds all relevant buffers, and draws the
     * indexed mesh geometry. The `vertexBuffers` argument is a map from attribute
     * names to `Buffer` objects of type `WGL.ARRAY_BUFFER`, `indexBuffer` is a `Buffer`
     * object of type `WGL.ELEMENT_ARRAY_BUFFER`, and `mode` is a WebGL primitive mode
     * like `WGL.TRIANGLES` or `WGL.LINES`. This method automatically creates and caches
     * vertex attribute pointers for attributes as needed.
     */
    drawBuffers(vertexBuffers, indexBuffer, mode = WGL$2.TRIANGLES, start = 0, count) {
        const gl = this.gl;
        ts3dutils.assert(undefined != DRAW_MODE_NAMES[mode]);
        ts3dutils.assertf(() => 1 <= Object.keys(vertexBuffers).length);
        Object.keys(vertexBuffers).forEach(key => ts3dutils.assertInst(Buffer$$1, vertexBuffers[key]));
        // Only varruct up the built-in matrices that are active in the shader
        const on = this.activeMatrices;
        const modelViewMatrixInverse = (on['ts_ModelViewMatrixInverse'] || on['ts_NormalMatrix']) &&
            //&& this.modelViewMatrixVersion != gl.modelViewMatrixVersion
            gl.modelViewMatrix.inversed();
        const projectionMatrixInverse = on['ts_ProjectionMatrixInverse'] &&
            //&& this.projectionMatrixVersion != gl.projectionMatrixVersion
            gl.projectionMatrix.inversed();
        const modelViewProjectionMatrix = (on['ts_ModelViewProjectionMatrix'] || on['ts_ModelViewProjectionMatrixInverse']) &&
            //&& (this.projectionMatrixVersion != gl.projectionMatrixVersion || this.modelViewMatrixVersion !=
            // gl.modelViewMatrixVersion)
            gl.projectionMatrix.times(gl.modelViewMatrix);
        const uni = {}; // Uniform Matrices
        on['ts_ModelViewMatrix'] &&
            this.modelViewMatrixVersion != gl.modelViewMatrixVersion &&
            (uni['ts_ModelViewMatrix'] = gl.modelViewMatrix);
        on['ts_ModelViewMatrixInverse'] && (uni['ts_ModelViewMatrixInverse'] = modelViewMatrixInverse);
        on['ts_ProjectionMatrix'] &&
            this.projectionMatrixVersion != gl.projectionMatrixVersion &&
            (uni['ts_ProjectionMatrix'] = gl.projectionMatrix);
        projectionMatrixInverse && (uni['ts_ProjectionMatrixInverse'] = projectionMatrixInverse);
        modelViewProjectionMatrix && (uni['ts_ModelViewProjectionMatrix'] = modelViewProjectionMatrix);
        modelViewProjectionMatrix &&
            on['ts_ModelViewProjectionMatrixInverse'] &&
            (uni['ts_ModelViewProjectionMatrixInverse'] = modelViewProjectionMatrix.inversed());
        on['ts_NormalMatrix'] &&
            this.modelViewMatrixVersion != gl.modelViewMatrixVersion &&
            (uni['ts_NormalMatrix'] = modelViewMatrixInverse.transposed());
        this.uniforms(uni);
        this.projectionMatrixVersion = gl.projectionMatrixVersion;
        this.modelViewMatrixVersion = gl.modelViewMatrixVersion;
        // Create and enable attribute pointers as necessary.
        let minVertexBufferLength = Infinity;
        for (const attribute in vertexBuffers) {
            const buffer = vertexBuffers[attribute];
            ts3dutils.assert(buffer.hasBeenCompiled);
            const location = this.attributeLocations[attribute] || gl.getAttribLocation(this.program, attribute);
            if (location == -1 || !buffer.buffer) {
                if (!attribute.startsWith('ts_')) {
                    console.warn(`Vertex buffer ${attribute} was not bound because the attribute is not active.`);
                }
                continue;
            }
            this.attributeLocations[attribute] = location;
            gl.bindBuffer(WGL$2.ARRAY_BUFFER, buffer.buffer);
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(location, buffer.spacing, WGL$2.FLOAT, false, 0, 0);
            minVertexBufferLength = Math.min(minVertexBufferLength, buffer.count);
        }
        // Disable unused attribute pointers.
        for (const attribute in this.attributeLocations) {
            if (!(attribute in vertexBuffers)) {
                gl.disableVertexAttribArray(this.attributeLocations[attribute]);
            }
        }
        if (ts3dutils.NLA_DEBUG) {
            const numAttribs = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
            for (let i = 0; i < numAttribs; ++i) {
                const buffer = gl.getVertexAttrib(i, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
                if (!buffer) {
                    const info = gl.getActiveAttrib(this.program, i);
                    if (!this.constantAttributes[info.name]) {
                        console.warn('No buffer is bound to attribute ' + info.name + ' and it was not set with .attributes()');
                    }
                }
                // console.log('name:', info.name, 'type:', info.type, 'size:', info.size)
            }
        }
        // Draw the geometry.
        if (minVertexBufferLength) {
            if (undefined === count) {
                count = indexBuffer ? indexBuffer.count : minVertexBufferLength;
            }
            ts3dutils.assert(DRAW_MODE_CHECKS[mode](count), 'count ' +
                count +
                "doesn't fulfill requirement +" +
                DRAW_MODE_CHECKS[mode].toString() +
                ' for mode ' +
                DRAW_MODE_NAMES[mode]);
            if (indexBuffer) {
                ts3dutils.assert(indexBuffer.hasBeenCompiled);
                ts3dutils.assert(minVertexBufferLength > indexBuffer.maxValue);
                ts3dutils.assert(count % indexBuffer.spacing == 0);
                ts3dutils.assert(start % indexBuffer.spacing == 0);
                if (start + count > indexBuffer.count) {
                    throw new Error('Buffer not long enough for passed parameters start/length/buffer length ' +
                        start +
                        ' ' +
                        count +
                        ' ' +
                        indexBuffer.count);
                }
                gl.bindBuffer(WGL$2.ELEMENT_ARRAY_BUFFER, indexBuffer.buffer);
                // start parameter has to be multiple of sizeof(WGL.UNSIGNED_SHORT)
                gl.drawElements(mode, count, indexBuffer.bindSize, indexBuffer.type.BYTES_PER_ELEMENT * start);
            }
            else {
                if (start + count > minVertexBufferLength) {
                    throw new Error('invalid');
                }
                gl.drawArrays(mode, start, count);
            }
            gl.drawCallCount++;
        }
        return this;
    }
}

class Texture$$1 {
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
    constructor(width, height, options = {}, gl = currentGL$$1()) {
        this.gl = gl;
        this.width = width;
        this.height = height;
        this.format = options.format || gl.RGBA;
        this.internalFormat = options.internalFormat || gl.RGBA;
        this.type = options.type || gl.UNSIGNED_BYTE;
        const magFilter = options.filter || options.magFilter || gl.LINEAR;
        const minFilter = options.filter || options.minFilter || gl.LINEAR;
        if (this.type === gl.FLOAT) {
            if (gl.version != 2 && !gl.getExtension('OES_texture_float')) {
                throw new Error('OES_texture_float is required but not supported');
            }
            if ((minFilter !== gl.NEAREST || magFilter !== gl.NEAREST) &&
                !gl.getExtension('OES_texture_float_linear')) {
                throw new Error('OES_texture_float_linear is required but not supported');
            }
        }
        else if (this.type === gl.HALF_FLOAT_OES) {
            if (!gl.getExtension('OES_texture_half_float')) {
                throw new Error('OES_texture_half_float is required but not supported');
            }
            if ((minFilter !== gl.NEAREST || magFilter !== gl.NEAREST) &&
                !gl.getExtension('OES_texture_half_float_linear')) {
                throw new Error('OES_texture_half_float_linear is required but not supported');
            }
        }
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, options.wrap || options.wrapS || gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, options.wrap || options.wrapT || gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, width, height, 0, this.format, this.type, options.data);
    }
    setData(data) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.format, this.width, this.height, 0, this.format, this.type, data);
    }
    bind(unit) {
        this.gl.activeTexture((this.gl.TEXTURE0 + unit));
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    }
    unbind(unit) {
        this.gl.activeTexture((this.gl.TEXTURE0 + unit));
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
    drawTo(render) {
        const gl = this.gl;
        const prevFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
        if (!this.framebuffer) {
            // create a renderbuffer for the depth component
            const prevRenderbuffer = gl.getParameter(gl.RENDERBUFFER_BINDING);
            const depthRenderbuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderbuffer);
            // DEPTH_COMPONENT16 is the only depth format
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
            gl.bindRenderbuffer(gl.RENDERBUFFER, prevRenderbuffer);
            // create a framebuffer to render to
            this.framebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderbuffer);
            if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
                throw new Error('Rendering to this texture is not supported (incomplete this.framebuffer)');
            }
        }
        else if (prevFramebuffer !== this.framebuffer) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        }
        const prevViewport = gl.getParameter(gl.VIEWPORT);
        gl.viewport(0, 0, this.width, this.height);
        render(gl);
        // restore previous state
        prevFramebuffer !== this.framebuffer && gl.bindFramebuffer(gl.FRAMEBUFFER, prevFramebuffer);
        gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3]);
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
    static fromImage(imgElement, options = {}, gl = currentGL$$1()) {
        const texture = new Texture$$1(imgElement.width, imgElement.height, options, gl);
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
    static fromURLSwitch(url, options, gl = currentGL$$1()) {
        Texture$$1.checkerBoardCanvas =
            Texture$$1.checkerBoardCanvas ||
                (function () {
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
        const texture = Texture$$1.fromImage(Texture$$1.checkerBoardCanvas, options);
        const image = new Image();
        image.onload = () => Texture$$1.fromImage(image, options, gl).swapWith(texture);
        // error event doesn't return a reason. Most likely a 404.
        image.onerror = () => {
            throw new Error('Could not load image ' + image.src + '. 404?');
        };
        image.src = url;
        return texture;
    }
    static fromURL(url, options, gl = currentGL$$1()) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(Texture$$1.fromImage(image, options, gl));
            image.onerror = ev => reject('Could not load image ' + image.src + '. 404?' + ev);
            image.src = url;
        });
    }
}

/*
** Copyright (c) 2012 The Khronos Group Inc.
**
** Permission is hereby granted, free of charge, to any person obtaining a
** copy of this software and/or associated documentation files (the
** 'Materials'), to deal in the Materials without restriction, including
** without limitation the rights to use, copy, modify, merge, publish,
** distribute, sublicense, and/or sell copies of the Materials, and to
** permit persons to whom the Materials are furnished to do so, subject to
** the following conditions:
**
** The above copyright notice and this permission notice shall be included
** in all copies or substantial portions of the Materials.
**
** THE MATERIALS ARE PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
** EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
** MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
** IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
** CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
** TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
** MATERIALS OR THE USE OR OTHER DEALINGS IN THE MATERIALS.
*/
// Various functions for helping debug WebGL apps.
/**
 * Wrapped logging function.
 * @param msg Message to log.
 */
function log(msg) {
    if (window.console && window.console.log) {
        window.console.log(msg);
    }
}
/**
 * Wrapped error logging function.
 * @param msg Message to log.
 */
function error(msg) {
    if (window.console && window.console.error) {
        window.console.error(msg);
    }
    else {
        log(msg);
    }
}
/**
 * Which arguments are enums based on the number of arguments to the function.
 * So
 *    'texImage2D': {
 *       9: { 0:true, 2:true, 6:true, 7:true },
 *       6: { 0:true, 2:true, 3:true, 4:true },
 *    },
 *
 * means if there are 9 arguments then 6 and 7 are enums, if there are 6
 * arguments 3 and 4 are enums
 *
 * @type {!Object.<number, !Object.<number, string>}
 */
const glValidEnumContexts = {
    // Generic setters and getters
    enable: { 1: { 0: true } },
    disable: { 1: { 0: true } },
    getParameter: { 1: { 0: true } },
    // Rendering
    drawArrays: { 3: { 0: true } },
    drawElements: { 4: { 0: true, 2: true } },
    // Shaders
    createShader: { 1: { 0: true } },
    getShaderParameter: { 2: { 1: true } },
    getProgramParameter: { 2: { 1: true } },
    getShaderPrecisionFormat: { 2: { 0: true, 1: true } },
    // Vertex attributes
    getVertexAttrib: { 2: { 1: true } },
    vertexAttribPointer: { 6: { 2: true } },
    // Textures
    bindTexture: { 2: { 0: true } },
    activeTexture: { 1: { 0: true } },
    getTexParameter: { 2: { 0: true, 1: true } },
    texParameterf: { 3: { 0: true, 1: true } },
    texParameteri: { 3: { 0: true, 1: true, 2: true } },
    // texImage2D and texSubImage2D are defined below with WebGL 2 entrypoints
    copyTexImage2D: { 8: { 0: true, 2: true } },
    copyTexSubImage2D: { 8: { 0: true } },
    generateMipmap: { 1: { 0: true } },
    // compressedTexImage2D and compressedTexSubImage2D are defined below with WebGL 2 entrypoints
    // Buffer objects
    bindBuffer: { 2: { 0: true } },
    // bufferData and bufferSubData are defined below with WebGL 2 entrypoints
    getBufferParameter: { 2: { 0: true, 1: true } },
    // Renderbuffers and framebuffers
    pixelStorei: { 2: { 0: true, 1: true } },
    // readPixels is defined below with WebGL 2 entrypoints
    bindRenderbuffer: { 2: { 0: true } },
    bindFramebuffer: { 2: { 0: true } },
    checkFramebufferStatus: { 1: { 0: true } },
    framebufferRenderbuffer: { 4: { 0: true, 1: true, 2: true } },
    framebufferTexture2D: { 5: { 0: true, 1: true, 2: true } },
    getFramebufferAttachmentParameter: { 3: { 0: true, 1: true, 2: true } },
    getRenderbufferParameter: { 2: { 0: true, 1: true } },
    renderbufferStorage: { 4: { 0: true, 1: true } },
    // Frame buffer operations (clear, blend, depth test, stencil)
    clear: { 1: { 0: { enumBitwiseOr: ['COLOR_BUFFER_BIT', 'DEPTH_BUFFER_BIT', 'STENCIL_BUFFER_BIT'] } } },
    depthFunc: { 1: { 0: true } },
    blendFunc: { 2: { 0: true, 1: true } },
    blendFuncSeparate: { 4: { 0: true, 1: true, 2: true, 3: true } },
    blendEquation: { 1: { 0: true } },
    blendEquationSeparate: { 2: { 0: true, 1: true } },
    stencilFunc: { 3: { 0: true } },
    stencilFuncSeparate: { 4: { 0: true, 1: true } },
    stencilMaskSeparate: { 2: { 0: true } },
    stencilOp: { 3: { 0: true, 1: true, 2: true } },
    stencilOpSeparate: { 4: { 0: true, 1: true, 2: true, 3: true } },
    // Culling
    cullFace: { 1: { 0: true } },
    frontFace: { 1: { 0: true } },
    // ANGLE_instanced_arrays extension
    drawArraysInstancedANGLE: { 4: { 0: true } },
    drawElementsInstancedANGLE: { 5: { 0: true, 2: true } },
    // EXT_blend_minmax extension
    blendEquationEXT: { 1: { 0: true } },
    // WebGL 2 Buffer objects
    bufferData: {
        3: { 0: true, 2: true },
        4: { 0: true, 2: true },
        5: { 0: true, 2: true },
    },
    bufferSubData: {
        3: { 0: true },
        4: { 0: true },
        5: { 0: true },
    },
    copyBufferSubData: { 5: { 0: true, 1: true } },
    getBufferSubData: { 3: { 0: true }, 4: { 0: true }, 5: { 0: true } },
    // WebGL 2 Framebuffer objects
    blitFramebuffer: {
        10: { 8: { enumBitwiseOr: ['COLOR_BUFFER_BIT', 'DEPTH_BUFFER_BIT', 'STENCIL_BUFFER_BIT'] }, 9: true },
    },
    framebufferTextureLayer: { 5: { 0: true, 1: true } },
    invalidateFramebuffer: { 2: { 0: true } },
    invalidateSubFramebuffer: { 6: { 0: true } },
    readBuffer: { 1: { 0: true } },
    // WebGL 2 Renderbuffer objects
    getInternalformatParameter: { 3: { 0: true, 1: true, 2: true } },
    renderbufferStorageMultisample: { 5: { 0: true, 2: true } },
    // WebGL 2 Texture objects
    texStorage2D: { 5: { 0: true, 2: true } },
    texStorage3D: { 6: { 0: true, 2: true } },
    texImage2D: {
        9: { 0: true, 2: true, 6: true, 7: true },
        6: { 0: true, 2: true, 3: true, 4: true },
        10: { 0: true, 2: true, 6: true, 7: true },
    },
    texImage3D: {
        10: { 0: true, 2: true, 7: true, 8: true },
        11: { 0: true, 2: true, 7: true, 8: true },
    },
    texSubImage2D: {
        9: { 0: true, 6: true, 7: true },
        7: { 0: true, 4: true, 5: true },
        10: { 0: true, 6: true, 7: true },
    },
    texSubImage3D: {
        11: { 0: true, 8: true, 9: true },
        12: { 0: true, 8: true, 9: true },
    },
    copyTexSubImage3D: { 9: { 0: true } },
    compressedTexImage2D: {
        7: { 0: true, 2: true },
        8: { 0: true, 2: true },
        9: { 0: true, 2: true },
    },
    compressedTexImage3D: {
        8: { 0: true, 2: true },
        9: { 0: true, 2: true },
        10: { 0: true, 2: true },
    },
    compressedTexSubImage2D: {
        8: { 0: true, 6: true },
        9: { 0: true, 6: true },
        10: { 0: true, 6: true },
    },
    compressedTexSubImage3D: {
        10: { 0: true, 8: true },
        11: { 0: true, 8: true },
        12: { 0: true, 8: true },
    },
    // WebGL 2 Vertex attribs
    vertexAttribIPointer: { 5: { 2: true } },
    // WebGL 2 Writing to the drawing buffer
    drawArraysInstanced: { 4: { 0: true } },
    drawElementsInstanced: { 5: { 0: true, 2: true } },
    drawRangeElements: { 6: { 0: true, 4: true } },
    // WebGL 2 Reading back pixels
    readPixels: {
        7: { 4: true, 5: true },
        8: { 4: true, 5: true },
    },
    // WebGL 2 Multiple Render Targets
    clearBufferfv: { 3: { 0: true }, 4: { 0: true } },
    clearBufferiv: { 3: { 0: true }, 4: { 0: true } },
    clearBufferuiv: { 3: { 0: true }, 4: { 0: true } },
    clearBufferfi: { 4: { 0: true } },
    // WebGL 2 Query objects
    beginQuery: { 2: { 0: true } },
    endQuery: { 1: { 0: true } },
    getQuery: { 2: { 0: true, 1: true } },
    getQueryParameter: { 2: { 1: true } },
    // WebGL 2 Sampler objects
    samplerParameteri: { 3: { 1: true, 2: true } },
    samplerParameterf: { 3: { 1: true } },
    getSamplerParameter: { 2: { 1: true } },
    // WebGL 2 Sync objects
    fenceSync: { 2: { 0: true, 1: { enumBitwiseOr: [] } } },
    clientWaitSync: { 3: { 1: { enumBitwiseOr: ['SYNC_FLUSH_COMMANDS_BIT'] } } },
    waitSync: { 3: { 1: { enumBitwiseOr: [] } } },
    getSyncParameter: { 2: { 1: true } },
    // WebGL 2 Transform Feedback
    bindTransformFeedback: { 2: { 0: true } },
    beginTransformFeedback: { 1: { 0: true } },
    transformFeedbackVaryings: { 3: { 2: true } },
    // WebGL2 Uniform Buffer Objects and Transform Feedback Buffers
    bindBufferBase: { 3: { 0: true } },
    bindBufferRange: { 5: { 0: true } },
    getIndexedParameter: { 2: { 0: true } },
    getActiveUniforms: { 3: { 2: true } },
    getActiveUniformBlockParameter: { 3: { 2: true } },
};
/**
 * Map of numbers to names.
 * @type {Object}
 */
let glEnums = null;
/**
 * Map of names to numbers.
 * @type {Object}
 */
let enumStringToValue = null;
/**
 * Initializes this module. Safe to call more than once.
 * @param ctx A WebGL context. If
 *    you have more than one context it doesn't matter which one
 *    you pass in, it is only used to pull out constants.
 */
function init() {
    if (null === glEnums) {
        glEnums = {};
        enumStringToValue = {};
        const c = window.WebGL2RenderingContext || window.WebGLRenderingContext;
        if (!c)
            throw new Error('Neither WebGL2RenderingContext nor WebGLRenderingContext exists on window.');
        for (const propertyName in c) {
            const prop = c[propertyName];
            if ('number' === typeof prop) {
                glEnums[prop] = propertyName;
                enumStringToValue[propertyName] = prop;
            }
        }
    }
}
/**
 * Returns true or false if value matches any WebGL enum
 * @param value Value to check if it might be an enum.
 * @return True if value matches one of the WebGL defined enums
 */
function mightBeEnum(value) {
    init();
    return glEnums[value] !== undefined;
}
/**
 * Gets an string version of an WebGL enum.
 *
 * Example:
 *   var str = WebGLDebugUtil.glEnumToString(ctx.getError())
 *
 * @param value Value to return an enum for
 * @return The string version of the enum.
 */
function glEnumToString(value) {
    init();
    var name = glEnums[value];
    return name !== undefined ? 'gl.' + name : '/*UNKNOWN WebGL ENUM*/ 0x' + value.toString(16) + '';
}
/**
 * Converts the argument of a WebGL function to a string.
 * Attempts to convert enum arguments to strings.
 *
 * Example:
 *   WebGLDebugUtil.init(ctx)
 *   var str = WebGLDebugUtil.glFunctionArgToString('bindTexture', 2, 0, gl.TEXTURE_2D)
 *
 * would return 'TEXTURE_2D'
 *
 * @param functionName the name of the WebGL function.
 * @param numArgs the number of arguments passed to the function.
 * @param argumentIndex the index of the argument.
 * @param value The value of the argument.
 * @return The value as a string.
 */
function glFunctionArgToString(functionName, numArgs, argumentIndex, value) {
    const funcInfo = glValidEnumContexts[functionName];
    if (funcInfo !== undefined) {
        const funcOverloadInfo = funcInfo[numArgs];
        if (funcOverloadInfo !== undefined) {
            const argInfo = funcOverloadInfo[argumentIndex];
            if (argInfo) {
                if (typeof argInfo === 'object') {
                    const enums = argInfo.enumBitwiseOr;
                    const orEnums = [];
                    let orResult = 0;
                    for (let i = 0; i < enums.length; ++i) {
                        const enumValue = enumStringToValue[enums[i]];
                        if ((value & enumValue) !== 0) {
                            orResult |= enumValue;
                            orEnums.push(glEnumToString(enumValue));
                        }
                    }
                    if (orResult === value) {
                        return orEnums.join(' | ');
                    }
                    else {
                        return glEnumToString(value);
                    }
                }
                else {
                    return glEnumToString(value);
                }
            }
        }
    }
    if (value === null) {
        return 'null';
    }
    else if (value === undefined) {
        return 'undefined';
    }
    else {
        return value.toString();
    }
}
/**
 * Converts the arguments of a WebGL function to a string.
 * Attempts to convert enum arguments to strings.
 *
 * @param functionName the name of the WebGL function.
 * @param args The arguments.
 * @return The arguments as a string.
 */
function glFunctionArgsToString(functionName, args) {
    // apparently we can't do args.join(',')
    var argStr = '';
    var numArgs = args.length;
    for (var ii = 0; ii < numArgs; ++ii) {
        argStr += (ii == 0 ? '' : ', ') + glFunctionArgToString(functionName, numArgs, ii, args[ii]);
    }
    return argStr;
}
function makePropertyWrapper(wrapper, original, propertyName) {
    //log('wrap prop: ' + propertyName)
    wrapper.__defineGetter__(propertyName, function () {
        return original[propertyName];
    });
    // TODO(gmane): this needs to handle properties that take more than
    // one value?
    wrapper.__defineSetter__(propertyName, function (value) {
        //log('set: ' + propertyName)
        original[propertyName] = value;
    });
}
/**
 * Given a WebGL context returns a wrapped context that calls
 * gl.getError after every command and calls a function if the
 * result is not NO_ERROR.
 *
 * You can supply your own function if you want. For example, if you'd like
 * an exception thrown on any GL error you could do this
 *
 *    function throwOnGLError(err, funcName, args) {
 *      throw new Error(WebGLDebugUtils.glEnumToString(err) +
 *            ' was caused by call to ' + funcName)
 *    }
 *
 *    ctx = WebGLDebugUtils.makeDebugContext(
 *        canvas.getContext('webgl'), throwOnGLError)
 *
 * @param ctx The webgl context to wrap.
 * @param opt_onErrorFunc The function
 *     to call when gl.getError returns an error. If not specified the default
 *     function calls console.log with a message.
 * @param opt_onFunc The
 *     function to call when each webgl function is called. You
 *     can use this to log all calls for example.
 * @param opt_err_ctx The webgl context
 *        to call getError on if different than ctx.
 */
function makeDebugContext(ctx, opt_onErrorFunc, opt_onFunc, opt_err_ctx = ctx) {
    init();
    opt_onErrorFunc =
        opt_onErrorFunc ||
            function (err, functionName, args) {
                // apparently we can't do args.join(',')
                var argStr = '';
                var numArgs = args.length;
                for (let i = 0; i < numArgs; ++i) {
                    argStr += (i == 0 ? '' : ', ') + glFunctionArgToString(functionName, numArgs, i, args[i]);
                }
                error('WebGL error ' + glEnumToString(err) + ' in ' + functionName + '(' + argStr + ')');
            };
    // Holds booleans for each GL error so after we get the error ourselves
    // we can still return it to the client app.
    const glErrorShadow = {};
    // Makes a function that calls a WebGL function and then calls getError.
    function makeErrorWrapper(ctx, functionName) {
        return function (...args) {
            if (opt_onFunc) {
                opt_onFunc(functionName, args);
            }
            const result = ctx[functionName].apply(ctx, args);
            const err = opt_err_ctx.getError();
            if (err != 0) {
                glErrorShadow[err] = true;
                opt_onErrorFunc(err, functionName, args);
            }
            return result;
        };
    }
    // Make a an object that has a copy of every property of the WebGL context
    // but wraps all functions.
    const wrapper = {};
    for (let propertyName in ctx) {
        const prop = ctx[propertyName];
        if ('function' === typeof prop) {
            if (propertyName != 'getExtension') {
                wrapper[propertyName] = makeErrorWrapper(ctx, propertyName);
            }
            else {
                let wrapped = makeErrorWrapper(ctx, propertyName);
                wrapper[propertyName] = function () {
                    const result = wrapped.apply(ctx, arguments);
                    if (!result) {
                        return null;
                    }
                    return makeDebugContext(result, opt_onErrorFunc, opt_onFunc, opt_err_ctx);
                };
            }
        }
        else {
            makePropertyWrapper(wrapper, ctx, propertyName);
        }
    }
    // Override the getError function with one that returns our saved results.
    wrapper.getError = function () {
        for (const err in glErrorShadow) {
            if (glErrorShadow.hasOwnProperty(err)) {
                if (glErrorShadow[err]) {
                    glErrorShadow[err] = false;
                    return parseInt(err);
                }
            }
        }
        return ctx.NO_ERROR;
    };
    return wrapper;
}
function isWebGL2RenderingContext(o) {
    return !!o.createTransformFeedback;
}
/**
 * Resets a context to the initial state.
 * @param ctx The webgl context to
 *     reset.
 */
function resetToInitialState(ctx2) {
    if (isWebGL2RenderingContext(ctx2)) {
        ctx2.bindVertexArray(null);
    }
    const numAttribs = ctx2.getParameter(ctx2.MAX_VERTEX_ATTRIBS);
    const tmp = ctx2.createBuffer();
    ctx2.bindBuffer(ctx2.ARRAY_BUFFER, tmp);
    for (let ii = 0; ii < numAttribs; ++ii) {
        ctx2.disableVertexAttribArray(ii);
        ctx2.vertexAttribPointer(ii, 4, ctx2.FLOAT, false, 0, 0);
        ctx2.vertexAttrib1f(ii, 0);
        if (isWebGL2RenderingContext(ctx2)) {
            ctx2.vertexAttribDivisor(ii, 0);
        }
    }
    ctx2.deleteBuffer(tmp);
    const numTextureUnits = ctx2.getParameter(ctx2.MAX_TEXTURE_IMAGE_UNITS);
    for (let ii = 0; ii < numTextureUnits; ++ii) {
        ctx2.activeTexture((ctx2.TEXTURE0 + ii));
        ctx2.bindTexture(ctx2.TEXTURE_CUBE_MAP, null);
        ctx2.bindTexture(ctx2.TEXTURE_2D, null);
        if (isWebGL2RenderingContext(ctx2)) {
            ctx2.bindTexture(ctx2.TEXTURE_2D_ARRAY, null);
            ctx2.bindTexture(ctx2.TEXTURE_3D, null);
            ctx2.bindSampler(ii, null);
        }
    }
    ctx2.activeTexture(ctx2.TEXTURE0);
    ctx2.useProgram(null);
    ctx2.bindBuffer(ctx2.ARRAY_BUFFER, null);
    ctx2.bindBuffer(ctx2.ELEMENT_ARRAY_BUFFER, null);
    ctx2.bindFramebuffer(ctx2.FRAMEBUFFER, null);
    ctx2.bindRenderbuffer(ctx2.RENDERBUFFER, null);
    ctx2.disable(ctx2.BLEND);
    ctx2.disable(ctx2.CULL_FACE);
    ctx2.disable(ctx2.DEPTH_TEST);
    ctx2.disable(ctx2.DITHER);
    ctx2.disable(ctx2.SCISSOR_TEST);
    ctx2.blendColor(0, 0, 0, 0);
    ctx2.blendEquation(ctx2.FUNC_ADD);
    ctx2.blendFunc(ctx2.ONE, ctx2.ZERO);
    ctx2.clearColor(0, 0, 0, 0);
    ctx2.clearDepth(1);
    ctx2.clearStencil(-1);
    ctx2.colorMask(true, true, true, true);
    ctx2.cullFace(ctx2.BACK);
    ctx2.depthFunc(ctx2.LESS);
    ctx2.depthMask(true);
    ctx2.depthRange(0, 1);
    ctx2.frontFace(ctx2.CCW);
    ctx2.hint(ctx2.GENERATE_MIPMAP_HINT, ctx2.DONT_CARE);
    ctx2.lineWidth(1);
    ctx2.pixelStorei(ctx2.PACK_ALIGNMENT, 4);
    ctx2.pixelStorei(ctx2.UNPACK_ALIGNMENT, 4);
    ctx2.pixelStorei(ctx2.UNPACK_FLIP_Y_WEBGL, false);
    ctx2.pixelStorei(ctx2.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    ctx2.pixelStorei(ctx2.UNPACK_COLORSPACE_CONVERSION_WEBGL, ctx2.BROWSER_DEFAULT_WEBGL);
    ctx2.polygonOffset(0, 0);
    ctx2.sampleCoverage(1, false);
    ctx2.scissor(0, 0, ctx2.canvas.width, ctx2.canvas.height);
    ctx2.stencilFunc(ctx2.ALWAYS, 0, 0xffffffff);
    ctx2.stencilMask(0xffffffff);
    ctx2.stencilOp(ctx2.KEEP, ctx2.KEEP, ctx2.KEEP);
    ctx2.viewport(0, 0, ctx2.canvas.width, ctx2.canvas.height);
    ctx2.clear(ctx2.COLOR_BUFFER_BIT | ctx2.DEPTH_BUFFER_BIT | ctx2.STENCIL_BUFFER_BIT);
    if (isWebGL2RenderingContext(ctx2)) {
        ctx2.drawBuffers([ctx2.BACK]);
        ctx2.readBuffer(ctx2.BACK);
        ctx2.bindBuffer(ctx2.COPY_READ_BUFFER, null);
        ctx2.bindBuffer(ctx2.COPY_WRITE_BUFFER, null);
        ctx2.bindBuffer(ctx2.PIXEL_PACK_BUFFER, null);
        ctx2.bindBuffer(ctx2.PIXEL_UNPACK_BUFFER, null);
        const numTransformFeedbacks = ctx2.getParameter(ctx2.MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS);
        for (let ii = 0; ii < numTransformFeedbacks; ++ii) {
            ctx2.bindBufferBase(ctx2.TRANSFORM_FEEDBACK_BUFFER, ii, null);
        }
        const numUBOs = ctx2.getParameter(ctx2.MAX_UNIFORM_BUFFER_BINDINGS);
        for (let ii = 0; ii < numUBOs; ++ii) {
            ctx2.bindBufferBase(ctx2.UNIFORM_BUFFER, ii, null);
        }
        ctx2.disable(ctx2.RASTERIZER_DISCARD);
        ctx2.pixelStorei(ctx2.UNPACK_IMAGE_HEIGHT, 0);
        ctx2.pixelStorei(ctx2.UNPACK_SKIP_IMAGES, 0);
        ctx2.pixelStorei(ctx2.UNPACK_ROW_LENGTH, 0);
        ctx2.pixelStorei(ctx2.UNPACK_SKIP_ROWS, 0);
        ctx2.pixelStorei(ctx2.UNPACK_SKIP_PIXELS, 0);
        ctx2.pixelStorei(ctx2.PACK_ROW_LENGTH, 0);
        ctx2.pixelStorei(ctx2.PACK_SKIP_ROWS, 0);
        ctx2.pixelStorei(ctx2.PACK_SKIP_PIXELS, 0);
        ctx2.hint(ctx2.FRAGMENT_SHADER_DERIVATIVE_HINT, ctx2.DONT_CARE);
    }
    // TODO: This should NOT be needed but Firefox fails with 'hint'
    while (ctx2.getError()) { }
}
/**
 * Given a canvas element returns a wrapped canvas element that will
 * simulate lost context. The canvas returned adds the following functions.
 *
 * loseContext:
 *   simulates a lost context event.
 *
 * restoreContext:
 *   simulates the context being restored.
 *
 * lostContextInNCalls:
 *   loses the context after N gl calls.
 *
 * getNumCalls:
 *   tells you how many gl calls there have been so far.
 *
 * setRestoreTimeout:
 *   sets the number of milliseconds until the context is restored
 *   after it has been lost. Defaults to 0. Pass -1 to prevent
 *   automatic restoring.
 *
 * @param canvas The canvas element to wrap.
 */
function makeLostContextSimulatingCanvas(canvas) {
    const canvas2 = canvas;
    let unwrappedContext_;
    const onLost_ = [];
    const onRestored_ = [];
    let wrappedContext_ = {};
    let contextId_ = 1;
    let contextLost_ = false;
    // const resourceId_ = 0
    const resourceDb_ = [];
    let numCallsToLoseContext_ = 0;
    let numCalls_ = 0;
    let canRestore_ = false;
    let restoreTimeout_ = 0;
    // Holds booleans for each GL error so can simulate errors.
    const glErrorShadow_ = {};
    canvas2.getContext = (function (f) {
        return function () {
            const ctx = f.apply(canvas2, arguments);
            // Did we get a context and is it a WebGL context?
            // @ts-ignore
            if (ctx instanceof WebGLRenderingContext ||
                // TODO:?
                (window.WebGL2RenderingContext && ctx instanceof WebGL2RenderingContext)) {
                if (ctx != unwrappedContext_) {
                    if (unwrappedContext_) {
                        throw new Error('got different context');
                    }
                    unwrappedContext_ = ctx;
                    wrappedContext_ = makeLostContextSimulatingContext(unwrappedContext_);
                }
                return wrappedContext_;
            }
            return ctx;
        };
    })(canvas2.getContext);
    function wrapEvent(listener) {
        if (typeof listener == 'function') {
            return listener;
        }
        else {
            return function (e) {
                listener.handleEvent(e);
            };
        }
    }
    function addOnContextLostListener(listener) {
        onLost_.push(wrapEvent(listener));
    }
    function addOnContextRestoredListener(listener) {
        onRestored_.push(wrapEvent(listener));
    }
    function wrapAddEventListener(canvas) {
        const f = canvas.addEventListener;
        canvas.addEventListener = function (type, listener) {
            switch (type) {
                case 'webglcontextlost':
                    addOnContextLostListener(listener);
                    break;
                case 'webglcontextrestored':
                    addOnContextRestoredListener(listener);
                    break;
                default:
                    f.apply(canvas, arguments);
            }
        };
    }
    wrapAddEventListener(canvas2);
    canvas2.loseContext = function () {
        if (!contextLost_) {
            contextLost_ = true;
            numCallsToLoseContext_ = 0;
            ++contextId_;
            while (unwrappedContext_.getError())
                clearErrors();
            glErrorShadow_[unwrappedContext_.CONTEXT_LOST_WEBGL] = true;
            const event = makeWebGLContextEvent('context lost');
            const callbacks = onLost_.slice();
            setTimeout(function () {
                //log('numCallbacks:' + callbacks.length)
                for (let ii = 0; ii < callbacks.length; ++ii) {
                    //log('calling callback:' + ii)
                    callbacks[ii](event);
                }
                if (restoreTimeout_ >= 0) {
                    setTimeout(function () {
                        canvas2.restoreContext();
                    }, restoreTimeout_);
                }
            }, 0);
        }
    };
    canvas2.restoreContext = function () {
        if (contextLost_) {
            if (onRestored_.length) {
                setTimeout(function () {
                    if (!canRestore_) {
                        throw new Error('can not restore. webglcontestlost listener did not call event.preventDefault');
                    }
                    freeResources();
                    resetToInitialState(unwrappedContext_);
                    contextLost_ = false;
                    numCalls_ = 0;
                    canRestore_ = false;
                    const callbacks = onRestored_.slice();
                    const event = makeWebGLContextEvent('context restored');
                    for (let ii = 0; ii < callbacks.length; ++ii) {
                        callbacks[ii](event);
                    }
                }, 0);
            }
        }
    };
    canvas2.loseContextInNCalls = function (numCalls) {
        if (contextLost_) {
            throw new Error('You can not ask a lost context to be lost');
        }
        numCallsToLoseContext_ = numCalls_ + numCalls;
    };
    canvas2.getNumCalls = function () {
        return numCalls_;
    };
    canvas2.setRestoreTimeout = function (timeout) {
        restoreTimeout_ = timeout;
    };
    function clearErrors() {
        const k = Object.keys(glErrorShadow_);
        for (let i = 0; i < k.length; ++i) {
            delete glErrorShadow_[k[i]];
        }
    }
    function loseContextIfTime() {
        ++numCalls_;
        if (!contextLost_) {
            if (numCallsToLoseContext_ == numCalls_) {
                canvas2.loseContext();
            }
        }
    }
    // Makes a function that simulates WebGL when out of context.
    function makeLostContextFunctionWrapper(ctx, functionName) {
        const f = ctx[functionName];
        return function () {
            // log('calling:' + functionName)
            // Only call the functions if the context is not lost.
            loseContextIfTime();
            if (!contextLost_) {
                //if (!checkResources(arguments)) {
                //  glErrorShadow_[wrappedContext_.INVALID_OPERATION] = true
                //  return
                //}
                const result = f.apply(ctx, arguments);
                return result;
            }
        };
    }
    function freeResources() {
        for (let ii = 0; ii < resourceDb_.length; ++ii) {
            const resource = resourceDb_[ii];
            if (resource instanceof WebGLBuffer) {
                unwrappedContext_.deleteBuffer(resource);
            }
            else if (resource instanceof WebGLFramebuffer) {
                unwrappedContext_.deleteFramebuffer(resource);
            }
            else if (resource instanceof WebGLProgram) {
                unwrappedContext_.deleteProgram(resource);
            }
            else if (resource instanceof WebGLRenderbuffer) {
                unwrappedContext_.deleteRenderbuffer(resource);
            }
            else if (resource instanceof WebGLShader) {
                unwrappedContext_.deleteShader(resource);
            }
            else if (resource instanceof WebGLTexture) {
                unwrappedContext_.deleteTexture(resource);
            }
            else if (isWebGL2RenderingContext) {
                // @ts-ignore
                if (resource instanceof WebGLQuery) {
                    unwrappedContext_.deleteQuery(resource);
                    // @ts-ignore
                }
                else if (resource instanceof WebGLSampler) {
                    unwrappedContext_.deleteSampler(resource);
                    // @ts-ignore
                }
                else if (resource instanceof WebGLSync) {
                    unwrappedContext_.deleteSync(resource);
                    // @ts-ignore
                }
                else if (resource instanceof WebGLTransformFeedback) {
                    unwrappedContext_.deleteTransformFeedback(resource);
                    // @ts-ignore
                }
                else if (resource instanceof WebGLVertexArrayObject) {
                    unwrappedContext_.deleteVertexArray(resource);
                }
            }
        }
    }
    function makeWebGLContextEvent(statusMessage) {
        return {
            statusMessage: statusMessage,
            preventDefault: function () {
                canRestore_ = true;
            },
        };
    }
    return canvas2;
    function makeLostContextSimulatingContext(ctx) {
        // copy all functions and properties to wrapper
        for (const propertyName in ctx) {
            if (typeof ctx[propertyName] == 'function') {
                wrappedContext_[propertyName] = makeLostContextFunctionWrapper(ctx, propertyName);
            }
            else {
                makePropertyWrapper(wrappedContext_, ctx, propertyName);
            }
        }
        // Wrap a few functions specially.
        wrappedContext_.getError = function () {
            loseContextIfTime();
            if (!contextLost_) {
                let err;
                while ((err = unwrappedContext_.getError())) {
                    glErrorShadow_[err] = true;
                }
            }
            for (const err in glErrorShadow_) {
                if (glErrorShadow_[err]) {
                    delete glErrorShadow_[err];
                    return err;
                }
            }
            return wrappedContext_.NO_ERROR;
        };
        const creationFunctions = [
            'createBuffer',
            'createFramebuffer',
            'createProgram',
            'createRenderbuffer',
            'createShader',
            'createTexture',
        ];
        if (isWebGL2RenderingContext) {
            creationFunctions.push('createQuery', 'createSampler', 'fenceSync', 'createTransformFeedback', 'createVertexArray');
        }
        for (let i = 0; i < creationFunctions.length; ++i) {
            const functionName = creationFunctions[i];
            wrappedContext_[functionName] = (function (f) {
                return function () {
                    loseContextIfTime();
                    if (contextLost_) {
                        return null;
                    }
                    const obj = f.apply(ctx, arguments);
                    obj.__webglDebugContextLostId__ = contextId_;
                    resourceDb_.push(obj);
                    return obj;
                };
            })(ctx[functionName]);
        }
        const functionsThatShouldReturnNull = [
            'getActiveAttrib',
            'getActiveUniform',
            'getBufferParameter',
            'getContextAttributes',
            'getAttachedShaders',
            'getFramebufferAttachmentParameter',
            'getParameter',
            'getProgramParameter',
            'getProgramInfoLog',
            'getRenderbufferParameter',
            'getShaderParameter',
            'getShaderInfoLog',
            'getShaderSource',
            'getTexParameter',
            'getUniform',
            'getUniformLocation',
            'getVertexAttrib',
        ];
        if (isWebGL2RenderingContext) {
            functionsThatShouldReturnNull.push('getInternalformatParameter', 'getQuery', 'getQueryParameter', 'getSamplerParameter', 'getSyncParameter', 'getTransformFeedbackVarying', 'getIndexedParameter', 'getUniformIndices', 'getActiveUniforms', 'getActiveUniformBlockParameter', 'getActiveUniformBlockName');
        }
        for (let ii = 0; ii < functionsThatShouldReturnNull.length; ++ii) {
            const functionName = functionsThatShouldReturnNull[ii];
            wrappedContext_[functionName] = (function (f) {
                return function () {
                    loseContextIfTime();
                    if (contextLost_) {
                        return null;
                    }
                    return f.apply(ctx, arguments);
                };
            })(wrappedContext_[functionName]);
        }
        const isFunctions = [
            'isBuffer',
            'isEnabled',
            'isFramebuffer',
            'isProgram',
            'isRenderbuffer',
            'isShader',
            'isTexture',
        ];
        if (isWebGL2RenderingContext) {
            isFunctions.push('isQuery', 'isSampler', 'isSync', 'isTransformFeedback', 'isVertexArray');
        }
        for (let ii = 0; ii < isFunctions.length; ++ii) {
            const functionName = isFunctions[ii];
            wrappedContext_[functionName] = (function (f) {
                return function () {
                    loseContextIfTime();
                    if (contextLost_) {
                        return false;
                    }
                    return f.apply(ctx, arguments);
                };
            })(wrappedContext_[functionName]);
        }
        wrappedContext_.checkFramebufferStatus = (function (f) {
            return function () {
                loseContextIfTime();
                if (contextLost_) {
                    return wrappedContext_.FRAMEBUFFER_UNSUPPORTED;
                }
                return f.apply(ctx, arguments);
            };
        })(wrappedContext_.checkFramebufferStatus);
        wrappedContext_.getAttribLocation = (function (f) {
            return function () {
                loseContextIfTime();
                if (contextLost_) {
                    return -1;
                }
                return f.apply(ctx, arguments);
            };
        })(wrappedContext_.getAttribLocation);
        wrappedContext_.getVertexAttribOffset = (function (f) {
            return function () {
                loseContextIfTime();
                if (contextLost_) {
                    return 0;
                }
                return f.apply(ctx, arguments);
            };
        })(wrappedContext_.getVertexAttribOffset);
        wrappedContext_.isContextLost = function () {
            return contextLost_;
        };
        if (isWebGL2RenderingContext) {
            wrappedContext_.getFragDataLocation = (function (f) {
                return function () {
                    loseContextIfTime();
                    if (contextLost_) {
                        return -1;
                    }
                    return f.apply(ctx, arguments);
                };
            })(wrappedContext_.getFragDataLocation);
            wrappedContext_.clientWaitSync = (function (f) {
                return function () {
                    loseContextIfTime();
                    if (contextLost_) {
                        return wrappedContext_.WAIT_FAILED;
                    }
                    return f.apply(ctx, arguments);
                };
            })(wrappedContext_.clientWaitSync);
            wrappedContext_.getUniformBlockIndex = (function (f) {
                return function () {
                    loseContextIfTime();
                    if (contextLost_) {
                        return wrappedContext_.INVALID_INDEX;
                    }
                    return f.apply(ctx, arguments);
                };
            })(wrappedContext_.getUniformBlockIndex);
        }
        return wrappedContext_;
    }
}

var posCoordVS = "attribute vec2 ts_TexCoord;attribute vec4 ts_Vertex;uniform mat4 ts_ModelViewProjectionMatrix;varying vec2 coord;void main(){coord=ts_TexCoord.xy;gl_Position=ts_ModelViewProjectionMatrix*ts_Vertex;}";

var sdfRenderFS = "precision mediump float;uniform sampler2D u_texture;uniform vec4 u_color;uniform float u_buffer;uniform float u_gamma;uniform float u_debug;varying vec2 coord;void main(){float dist=texture2D(u_texture,coord).r;if(u_debug>0.0){gl_FragColor=vec4(dist,dist,dist,1);}else{float alpha=smoothstep(u_buffer-u_gamma,u_buffer+u_gamma,dist);gl_FragColor=vec4(u_color.rgb,alpha*u_color.a);if(gl_FragColor.a==0.0){discard;}}}";

/**
 * There's only one constant, use it for default values. Use chroma-js or similar for actual colors.
 */
const GL_COLOR_BLACK$$1 = [0, 0, 0, 1];
function currentGL$$1() {
    return TSGLContextBase$$1.gl;
}
function isNumber$$1(obj) {
    const str = Object.prototype.toString.call(obj);
    return str == '[object Number]' || str == '[object Boolean]';
}
class TSGLContextBase$$1 {
    constructor(gl, immediate = {
        mesh: new Mesh$$1().addVertexBuffer('coords', 'ts_TexCoord').addVertexBuffer('colors', 'ts_Color'),
        mode: -1,
        coord: [0, 0],
        color: [1, 1, 1, 1],
        pointSize: 1,
        shader: Shader$$1.create(`
			attribute vec4 ts_Color;
			attribute vec4 ts_Vertex;
			uniform mat4 ts_ModelViewProjectionMatrix;
			attribute vec2 ts_TexCoord;
            uniform float pointSize;
            varying vec4 color;
            varying vec2 coord;
            void main() {
                color = ts_Color;
                coord = ts_TexCoord;
                gl_Position = ts_ModelViewProjectionMatrix * ts_Vertex;
                gl_PointSize = pointSize;
            }
		`, `
			precision highp float;
            uniform sampler2D texture;
            uniform float pointSize;
            // uniform bool useTexture;
            varying vec4 color;
            varying vec2 coord;
            void main() {
                gl_FragColor = color;
                // if (useTexture) gl_FragColor *= texture2D(texture, coord.xy);
            }
        `, gl),
    }) {
        this.immediate = immediate;
        this.modelViewMatrix = ts3dutils.M4.identity();
        this.projectionMatrix = ts3dutils.M4.identity();
        this.tempMatrix = new ts3dutils.M4();
        this.resultMatrix = new ts3dutils.M4();
        this.modelViewStack = [];
        this.projectionStack = [];
        this.drawCallCount = 0;
        this.projectionMatrixVersion = 0;
        this.modelViewMatrixVersion = 0;
        this.cachedSDFMeshes = {};
        this.matrixMode(TSGLContextBase$$1.MODELVIEW);
    }
    /// Implement the OpenGL modelview and projection matrix stacks, along with some other useful GLU matrix functions.
    matrixMode(mode) {
        switch (mode) {
            case this.MODELVIEW:
                this.currentMatrixName = 'modelViewMatrix';
                this.stack = this.modelViewStack;
                break;
            case this.PROJECTION:
                this.currentMatrixName = 'projectionMatrix';
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
    perspective(fovDegrees, aspect, near, far) {
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
        // prettier-ignore
        const viewportToScreenMatrix = new ts3dutils.M4([
            w / 2, 0, 0, x + w / 2,
            h / 2, 0, 0, y + h / 2,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]);
        return ts3dutils.M4.product(viewportToScreenMatrix, this.projectionMatrix, this.modelViewMatrix);
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
            1 == args.length && Array.isArray(args[0])
                ? args[0]
                : 1 == args.length && 'number' == typeof args[0]
                    ? hexIntToGLColor(args[0])
                    : 1 == args.length && 'string' == typeof args[0]
                        ? chroma.color(args[0]).gl()
                        : [args[0], args[1], args[2], args[3] || 1];
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
        this.immediate.shader
            .uniforms({
            useTexture: !!TSGLContextBase$$1.gl.getParameter(this.TEXTURE_BINDING_2D),
        })
            .drawBuffers(this.immediate.mesh.vertexBuffers, undefined, this.immediate.mode);
        this.immediate.mode = -1;
    }
    makeCurrent() {
        TSGLContextBase$$1.gl = this;
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
        const update = (now) => {
            if (keepUpdating) {
                callback.call(this, now, now - time);
                time = now;
                requestAnimationFrame(update);
            }
        };
        requestAnimationFrame(update);
        return () => {
            keepUpdating = false;
        };
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
            throw new Error("document.body doesn't exist yet (call viewerGL.fullscreen() from " +
                'window.onload() or from inside the <body> tag)');
        }
        document.body.appendChild(this.canvas);
        document.body.style.overflow = 'hidden';
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = left + 'px';
        this.canvas.style.top = top + 'px';
        this.canvas.style.width = window.innerWidth - left - right + 'px';
        this.canvas.style.bottom = window.innerHeight - top - bottom + 'px';
        const gl = this;
        function windowOnResize() {
            gl.canvas.width = (window.innerWidth - left - right) * window.devicePixelRatio;
            gl.canvas.height = (window.innerHeight - top - bottom) * window.devicePixelRatio;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            if (options.camera) {
                gl.matrixMode(TSGLContextBase$$1.PROJECTION);
                gl.loadIdentity();
                gl.perspective(options.fov || 45, gl.canvas.width / gl.canvas.height, options.near || 0.1, options.far || 1000);
                gl.matrixMode(TSGLContextBase$$1.MODELVIEW);
            }
        }
        window.addEventListener('resize', windowOnResize);
        windowOnResize();
        return this;
    }
    getMouseLine(canvasPosXOrE, canvasPosY) {
        if (canvasPosXOrE instanceof MouseEvent) {
            return this.getMouseLine(canvasPosXOrE.offsetX, canvasPosXOrE.offsetY);
        }
        const ndc1 = ts3dutils.V((canvasPosXOrE * 2) / this.canvas.offsetWidth - 1, (-canvasPosY * 2) / this.canvas.offsetHeight + 1, 0);
        const ndc2 = ts3dutils.V((canvasPosXOrE * 2) / this.canvas.offsetWidth - 1, (-canvasPosY * 2) / this.canvas.offsetHeight + 1, 1);
        const inverseProjectionMatrix = this.projectionMatrix.inversed();
        const anchor = inverseProjectionMatrix.transformPoint(ndc1);
        const dir = inverseProjectionMatrix.transformPoint(ndc2).minus(anchor);
        return { anchor, dir };
    }
    viewportFill() {
        this.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    setupTextRendering(pngURL, jsonURL) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.textRenderShader = Shader$$1.create(posCoordVS, sdfRenderFS);
            [this.textAtlas, this.textMetrics] = yield Promise.all([
                Texture$$1.fromURL(pngURL, {
                    format: this.LUMINANCE,
                    internalFormat: this.LUMINANCE,
                    type: this.UNSIGNED_BYTE,
                }),
                fetch(jsonURL).then(r => r.json()),
            ]);
            // const cs = this.textMetrics.chars
            // const maxY = Object.keys(cs).reduce((a, b) => Math.max(a, cs[b][3]), 0)
            // const minY = Object.keys(cs).reduce((a, b) => Math.min(a, cs[b][3] - cs[b][1]), 0)
            // console.log(maxY, minY)
        });
    }
    getSDFMeshForString(str) {
        ts3dutils.assert(this.textMetrics);
        return (this.cachedSDFMeshes[str] ||
            (this.cachedSDFMeshes[str] = createTextMesh(this.textMetrics, this.textAtlas, str)));
    }
    renderText(string, color, size = 1, xAlign = 'left', baseline = 'bottom', gamma = 0.05, lineHeight = 1.2) {
        const strMesh = this.getSDFMeshForString(string);
        this.pushMatrix();
        this.scale(size);
        const xTranslate = { left: 0, center: -0.5, right: -1 };
        const yTranslate = {
            top: -this.textMetrics.ascender / this.textMetrics.size,
            middle: (-this.textMetrics.ascender - this.textMetrics.descender) / 2 / this.textMetrics.size,
            alphabetic: 0,
            bottom: -this.textMetrics.descender / this.textMetrics.size,
        };
        // console.log('yTranslate[baseline]', yTranslate[baseline])
        this.translate(xTranslate[xAlign] * strMesh.width, yTranslate[baseline], 0);
        this.multMatrix(ts3dutils.M4.forSys(ts3dutils.V3.X, ts3dutils.V3.Y, new ts3dutils.V3(0, -lineHeight, 0)));
        this.textAtlas.bind(0);
        this.textRenderShader
            .uniforms({ texture: 0, u_color: color, u_debug: 0, u_gamma: gamma, u_buffer: 192 / 256 })
            .draw(strMesh);
        this.popMatrix();
        // gl.uniform1f(shader.u_debug, debug ? 1 : 0)
        // gl.uniform4fv(shader.u_color, [1, 1, 1, 1])
        // gl.uniform1f(shader.u_buffer, buffer)
        // gl.drawArrays(gl.TRIANGLES, 0, vertexBuffer.numItems)
        // gl.uniform4fv(shader.u_color, [0, 0, 0, 1])
        // gl.uniform1f(shader.u_buffer, 192 / 256)
        // gl.uniform1f(shader.u_gamma, (gamma * 1.4142) / scale)
        // gl.drawArrays(gl.TRIANGLES, 0, vertexBuffer.numItems)
    }
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
            newGL = canvas.getContext('webgl2', options);
            newGL && (newGL.version = 2);
            if (!newGL) {
                newGL = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
                newGL && (newGL.version = 1);
            }
            console.log('getting context');
        }
        catch (e) {
            console.log(e, 'Failed to get context');
        }
        if (!newGL)
            throw new Error('WebGL not supported');
        if (options.throwOnError) {
            newGL = makeDebugContext(newGL, (err, funcName) => {
                throw new Error(glEnumToString(err) + ' was caused by ' + funcName);
            });
        }
        TSGLContextBase$$1.gl = newGL;
        ts3dutils.addOwnProperties(newGL, TSGLContextBase$$1.prototype);
        ts3dutils.addOwnProperties(newGL, new TSGLContextBase$$1(newGL));
        //addEventListeners(newGL)
        return newGL;
    }
    /**
     * Sets the canvas render resolution (canvas.width and canvas.height) to match the display. I.e. it takes into
     * account window.devicePixelRatio.
     * @param maxPixelRatio A limit for the pixelRatio. Useful for very high DPI devices such as mobile devices.
     */
    fixCanvasRes(maxPixelRatio = Infinity) {
        this.canvas.width = this.canvas.clientWidth * Math.min(window.devicePixelRatio, maxPixelRatio);
        this.canvas.height = this.canvas.clientHeight * Math.min(window.devicePixelRatio, maxPixelRatio);
        this.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
}
TSGLContextBase$$1.MODELVIEW = 0;
TSGLContextBase$$1.PROJECTION = 1;
TSGLContextBase$$1.HALF_FLOAT_OES = 0x8d61;
(function (TSGLContext) {
    /**
     * `create()` creates a new WebGL context and augments it with more methods. The alpha channel is disabled
     * by default because it usually causes unintended transparencies in the canvas.
     */
    TSGLContext.create = TSGLContextBase$$1.create;
})(exports.TSGLContext || (exports.TSGLContext = {}));
// enum WGL_ERROR {
// 	NO_ERROR = WGL.NO_ERROR,
// 	INVALID_ENUM = WGL.INVALID_ENUM,
// 	INVALID_VALUE = WGL.INVALID_VALUE,
// 	INVALID_OPERATION = WGL.INVALID_OPERATION,
// 	INVALID_FRAMEBUFFER_OPERATION = WGL.INVALID_FRAMEBUFFER_OPERATION,
// 	OUT_OF_MEMORY = WGL.OUT_OF_MEMORY,
// 	CONTEXT_LOST_WEBGL = WGL.CONTEXT_LOST_WEBGL,
// }
TSGLContextBase$$1.prototype.MODELVIEW = TSGLContextBase$$1.MODELVIEW;
TSGLContextBase$$1.prototype.PROJECTION = TSGLContextBase$$1.PROJECTION;
TSGLContextBase$$1.prototype.HALF_FLOAT_OES = TSGLContextBase$$1.HALF_FLOAT_OES;
/**
 *
 * Push two triangles:
 * ```
 c - d
 | \ |
 a - b
 ```
 */
function pushQuad$$1(triangles, flipped, a, b, c, d) {
    // prettier-ignore
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
// function measureText(metrics: FontJsonMetrics, text: string, size: number) {
// 	const dimensions = {
// 		advance: 0,
// 	}
// 	const scale = size / metrics.size
// 	for (let i = 0; i < text.length; i++) {
// 		const horiAdvance = metrics.chars[text[i]][4]
// 		dimensions.advance += horiAdvance * scale
// 	}
// 	return dimensions
// }
// gl.getExtension('OES_standard_derivatives')
// gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE)
// gl.enable(gl.BLEND)
// const texture = gl.createTexture()
// const vertexBuffer = gl.createBuffer()
// const textureBuffer = gl.createBuffer()
function createTextMesh(fontMetrics, fontTextureAtlas, str, lineHeight = 1) {
    const mesh = new Mesh$$1().addIndexBuffer('TRIANGLES').addVertexBuffer('coords', 'ts_TexCoord');
    let cursorX = 0;
    let cursorY = 0;
    function drawGlyph(chr) {
        const metric = fontMetrics.chars[chr];
        if (!metric)
            return;
        const [width, height, horiBearingX, horiBearingY, horiAdvance, posX, posY] = metric;
        const { size, buffer } = fontMetrics;
        const quadStartIndex = mesh.vertices.length;
        // buffer = margin on texture
        if (width > 0 && height > 0) {
            // Add a quad (= two triangles) per glyph.
            const left = (cursorX + horiBearingX - buffer) / size;
            const right = (cursorX + horiBearingX + width + buffer) / size;
            const bottom = (horiBearingY - height - buffer) / size;
            const top = (horiBearingY + buffer) / size;
            mesh.vertices.push(new ts3dutils.V3(left, bottom, cursorY / size), new ts3dutils.V3(right, bottom, cursorY / size), new ts3dutils.V3(left, top, cursorY / size), new ts3dutils.V3(right, top, cursorY / size));
            const coordsLeft = posX / fontTextureAtlas.width;
            const coordsRight = (posX + width + 2 * buffer) / fontTextureAtlas.width;
            const coordsBottom = (posY + height + 2 * buffer) / fontTextureAtlas.height;
            const coordsTop = posY / fontTextureAtlas.height;
            mesh.coords.push([coordsLeft, coordsBottom], [coordsRight, coordsBottom], [coordsLeft, coordsTop], [coordsRight, coordsTop]);
            // mesh.coords.push([0, 0], [0, 1], [1, 0], [1, 1])
            pushQuad$$1(mesh.TRIANGLES, false, quadStartIndex, quadStartIndex + 1, quadStartIndex + 2, quadStartIndex + 3);
        }
        // pen.x += Math.ceil(horiAdvance * scale);
        cursorX += horiAdvance;
    }
    for (let i = 0; i < str.length; i++) {
        const chr = str[i];
        if ('\n' == chr) {
            cursorX = 0;
            cursorY += lineHeight * fontMetrics.size;
        }
        else {
            drawGlyph(chr);
        }
    }
    return Object.assign(mesh.compile(), { width: cursorX / fontMetrics.size, lineCount: cursorY + 1 });
}

exports.Buffer = Buffer$$1;
exports.Mesh = Mesh$$1;
exports.SHADER_VAR_TYPES = SHADER_VAR_TYPES$$1;
exports.isArray = isArray$$1;
exports.Shader = Shader$$1;
exports.Texture = Texture$$1;
exports.GL_COLOR_BLACK = GL_COLOR_BLACK$$1;
exports.currentGL = currentGL$$1;
exports.isNumber = isNumber$$1;
exports.TSGLContextBase = TSGLContextBase$$1;
exports.pushQuad = pushQuad$$1;
exports.init = init;
exports.mightBeEnum = mightBeEnum;
exports.glEnumToString = glEnumToString;
exports.glFunctionArgToString = glFunctionArgToString;
exports.glFunctionArgsToString = glFunctionArgsToString;
exports.makeDebugContext = makeDebugContext;
exports.isWebGL2RenderingContext = isWebGL2RenderingContext;
exports.resetToInitialState = resetToInitialState;
exports.makeLostContextSimulatingCanvas = makeLostContextSimulatingCanvas;
//# sourceMappingURL=bundle.js.map
