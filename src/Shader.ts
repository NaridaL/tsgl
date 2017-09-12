/* tslint:disable:no-string-literal */
interface UniformTypesMap {
    FLOAT_VEC4: GL_COLOR | V3
    FLOAT_VEC3: [number, number, number] | V3
    FLOAT_VEC2: [number, number] | V3
    FLOAT: number
    INT: int
    FLOAT_MAT4: M4 | number[]
    FLOAT_MAT3: M4 | number[]
    SAMPLER_2D: int
}
function isFloatArray(obj: any): obj is number[] | Float64Array | Float32Array {
    return Float32Array == obj.constructor || Float64Array == obj.constructor ||
        Array.isArray(obj) && obj.every(x => 'number' == typeof x)
}
function isIntArray(x: any) {
    if ([Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array]
            .some(y => x instanceof y)) {
        return true
    }
    return (x instanceof Float32Array || x instanceof Float64Array || Array.isArray(x)) &&
        (x as number[]).every(x => Number.isInteger(x))
}
type ShaderType<UniformTypes> = string & { T?: UniformTypes }

//const x:keyof UniformTypesMap = undefined as 'FLOAT_VEC4' | 'FLOAT_VEC3'
class Shader<UniformTypes extends { [uniformName: string]: keyof UniformTypesMap} = any> {
	program: WebGLProgram
	activeMatrices: { [matrixName: string ]: boolean }
	attributes: { [attributeName: string ]: number }
	uniformLocations: { [uniformName: string ]: WebGLUniformLocation }
	uniformInfos: { [uniformName: string ]: WebGLActiveInfo }
    projectionMatrixVersion = -1
    modelViewMatrixVersion = -1
	gl: LightGLContext
    static create<
            S extends { [uniformName: string]: keyof UniformTypesMap},
            T extends { [uniformName: string]: keyof UniformTypesMap}>
    (vertexSource: ShaderType<S>, fragmentSource: ShaderType<T>): Shader<S & T> {
	    return new Shader(vertexSource, fragmentSource) as any
    }

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
	constructor(vertexSource: string, fragmentSource: string, gl = currentGL()) {

		// Headers are prepended to the sources to provide some automatic functionality.
		const header = `
		uniform mat3 LGL_NormalMatrix;
		uniform mat4 LGL_ModelViewMatrix;
		uniform mat4 LGL_ProjectionMatrix;
		uniform mat4 LGL_ModelViewProjectionMatrix;
		uniform mat4 LGL_ModelViewMatrixInverse;
		uniform mat4 LGL_ProjectionMatrixInverse;
		uniform mat4 LGL_ModelViewProjectionMatrixInverse;
	`
		const vertexHeader = header + `
		attribute vec4 LGL_Vertex;
		attribute vec4 LGL_TexCoord;
		attribute vec3 LGL_Normal;
		attribute vec4 LGL_Color;
	`
		const fragmentHeader = `  precision highp float;` + header

		const matrixNames = header.match(/\bLGL_\w+/g)

		// Compile and link errors are thrown as strings.
		function compileSource(type: number, source: string) {
			const shader = gl.createShader(type)
			gl.shaderSource(shader, source)
			gl.compileShader(shader)
			if (!gl.getShaderParameter(shader, WGL.COMPILE_STATUS)) {
				throw new Error('compile error: ' + gl.getShaderInfoLog(shader))
			}
			return shader
		}

		this.gl = gl
        const program = gl.createProgram()
        if (!program) {
		    gl.handleError()
        }
		this.program = program!
		gl.attachShader(this.program, compileSource(WGL.VERTEX_SHADER, vertexHeader + vertexSource))
		gl.attachShader(this.program, compileSource(WGL.FRAGMENT_SHADER, fragmentHeader + fragmentSource))
		gl.linkProgram(this.program)
		if (!gl.getProgramParameter(this.program, WGL.LINK_STATUS)) {
			throw new Error('link error: ' + gl.getProgramInfoLog(this.program))
		}
		this.attributes = {}
		this.uniformLocations = {}

		// Check for the use of built-in matrices that require expensive matrix
		// multiplications to compute, and record these in `activeMatrices`.
		this.activeMatrices = {}
        matrixNames && matrixNames.forEach(name => {
			if (gl.getUniformLocation(this.program, name)) {
				this.activeMatrices[name] = true
			}
		})

		this.uniformInfos = {}
		for (let i = gl.getProgramParameter(this.program, WGL.ACTIVE_UNIFORMS); i-- > 0;) {
            // see https://www.khronos.org/registry/OpenGL-Refpages/es2.0/xhtml/glGetActiveUniform.xml
            // this.program has already been checked
            // i is in bounds
			const info = gl.getActiveUniform(this.program, i)!
			this.uniformInfos[info.name] = info
		}
        gl.handleError()
	}


	/**
	 * Set a uniform for each property of `uniforms`. The correct `viewerGL.uniform*()` method is inferred from the
	 * value types and from the stored uniform sampler flags.
	 */
	uniforms(uniforms: Partial<{ [K in keyof UniformTypes]: UniformTypesMap[UniformTypes[K]] }>): this {
        const gl = this.gl
		gl.useProgram(this.program)
        gl.handleError()

		for (const name in uniforms) {
			const location = this.uniformLocations[name] || gl.getUniformLocation(this.program, name)
			assert(!!location, name + ' uniform is not used in shader')
			if (!location) continue
			this.uniformLocations[name] = location
			let value: any = uniforms[name] as any
			const info = this.uniformInfos[name]
			if (NLA_DEBUG) {
			    // TODO: better errors
			    if (WGL.SAMPLER_2D == info.type || WGL.SAMPLER_CUBE == info.type || WGL.INT == info.type) {
			        if (1 == info.size) {
			            assert(Number.isInteger(value))
                    } else {
			            assert(isIntArray(value) && value.length == info.size, 'value must be int array if info.size != 1')
                    }
                }
                assert(WGL.FLOAT != info.type ||
                    (1 == info.size && 'number' === typeof value || isFloatArray(value) && info.size == value.length))
                assert(WGL.FLOAT_VEC3 != info.type ||
                    (1 == info.size && value instanceof V3 ||
                        Array.isArray(value) && info.size == value.length && assertVectors(...value)))
                assert(WGL.FLOAT_VEC4 != info.type || isFloatArray(value) && value.length == 4)
                assert(WGL.FLOAT_MAT4 != info.type || value instanceof M4, () => value.toSource())
                assert(WGL.FLOAT_MAT3 != info.type || value.length == 9 || value instanceof M4)
			}
			if (value instanceof V3) {
				value = value.toArray()
			}
			if (value.length) {
				switch (value.length) {
					case 1:
						gl.uniform1fv(location, value)
						break
					case 2:
						gl.uniform2fv(location, value)
						break
					case 3:
						gl.uniform3fv(location, value)
						break
					case 4:
						gl.uniform4fv(location, value)
						break
					// Matrices are automatically transposed, since WebGL uses column-major
					// indices instead of row-major indices.
					case 9:
						gl.uniformMatrix3fv(location, false, new Float32Array([
							value[0], value[3], value[6],
							value[1], value[4], value[7],
							value[2], value[5], value[8]
						]))
						break
					case 16:
						gl.uniformMatrix4fv(location, false, new Float32Array([
							value[0], value[4], value[8], value[12],
							value[1], value[5], value[9], value[13],
							value[2], value[6], value[10], value[14],
							value[3], value[7], value[11], value[15]
						]))
						break
					default:
						throw new Error('don\'t know how to load uniform "' + name + '" of length ' + value.length)
				}
			} else if ('number' == typeof value) {
				if (WGL.SAMPLER_2D == info.type || WGL.SAMPLER_CUBE == info.type || WGL.INT == info.type) {
					gl.uniform1i(location, value)
				} else {
					gl.uniform1f(location, value)
				}
			} else if (value instanceof M4) {
                const m = value.m
                if (WGL.FLOAT_MAT4 == info.type) {
                    gl.uniformMatrix4fv(location, false, [
                        m[0], m[4], m[8], m[12],
                        m[1], m[5], m[9], m[13],
                        m[2], m[6], m[10], m[14],
                        m[3], m[7], m[11], m[15]])
                } else if (WGL.FLOAT_MAT3 == info.type) {
                    gl.uniformMatrix3fv(location, false, [
                        m[0], m[4], m[8],
                        m[1], m[5], m[9],
                        m[2], m[6], m[10]])
                } else if (WGL.FLOAT_MAT2 == info.type) {
                    gl.uniformMatrix2fv(location, false, new Float32Array([
                        m[0], m[4],
                        m[1], m[5]]))
                } else {
                    throw new Error(`Can't assign M4 to ${info.type}`)
                }
            } else {
				throw new Error('attempted to set uniform "' + name + '" to invalid value ' + value)
			}
            gl.handleError()
		}

		return this
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
	draw(mesh: Mesh, mode: DRAW_MODES = DRAW_MODES.TRIANGLES, start?: int, count?: int): this {
		assert(mesh.hasBeenCompiled, 'mesh.hasBeenCompiled')
		assert(undefined != DRAW_MODES[mode])
        const modeStr: string = DRAW_MODES[mode]
        assert(mesh.indexBuffers[modeStr], `mesh.indexBuffers[${modeStr}] undefined`)
		return this.drawBuffers(mesh.vertexBuffers, mesh.indexBuffers[modeStr], mode, start, count)
	}

	/**
	 * Sets all uniform matrix attributes, binds all relevant buffers, and draws the
	 * indexed mesh geometry. The `vertexBuffers` argument is a map from attribute
	 * names to `Buffer` objects of type `WGL.ARRAY_BUFFER`, `indexBuffer` is a `Buffer`
	 * object of type `WGL.ELEMENT_ARRAY_BUFFER`, and `mode` is a WebGL primitive mode
	 * like `WGL.TRIANGLES` or `WGL.LINES`. This method automatically creates and caches
	 * vertex attribute pointers for attributes as needed.
	 */
	drawBuffers(vertexBuffers: { [attributeName: string]: Buffer },
                indexBuffer: Buffer | undefined,
                mode: DRAW_MODES = DRAW_MODES.TRIANGLES,
                start: int = 0, count?: int): this {
        const gl = this.gl
        gl.handleError()
        assert(undefined != DRAW_MODES[mode])
		assertf(() => 1 <= Object.keys(vertexBuffers).length)
		Object.keys(vertexBuffers).forEach(key => assertInst(Buffer, vertexBuffers[key]))

		// Only varruct up the built-in matrices that are active in the shader
        const on = this.activeMatrices
        const modelViewMatrixInverse = (on['LGL_ModelViewMatrixInverse'] || on['LGL_NormalMatrix'])
            && this.modelViewMatrixVersion != gl.modelViewMatrixVersion
            && gl.modelViewMatrix.inversed()
        const projectionMatrixInverse = on['LGL_ProjectionMatrixInverse']
            && this.projectionMatrixVersion != gl.projectionMatrixVersion
            && gl.projectionMatrix.inversed()
        const modelViewProjectionMatrix = (on['LGL_ModelViewProjectionMatrix'] || on['LGL_ModelViewProjectionMatrixInverse'])
            && (this.projectionMatrixVersion != gl.projectionMatrixVersion || this.modelViewMatrixVersion != gl.modelViewMatrixVersion)
            && gl.projectionMatrix.times(gl.modelViewMatrix)

        const uni: { [matrixName: string ]: M4 } = {} // Uniform Matrices
		on['LGL_ModelViewMatrix']
            && this.modelViewMatrixVersion != gl.modelViewMatrixVersion
            && (uni['LGL_ModelViewMatrix'] = gl.modelViewMatrix)
        on['LGL_ModelViewMatrixInverse'] && (uni['LGL_ModelViewMatrixInverse'] = modelViewMatrixInverse as M4)
		on['LGL_ProjectionMatrix']
            && this.projectionMatrixVersion != gl.projectionMatrixVersion
            && (uni['LGL_ProjectionMatrix'] = gl.projectionMatrix)
        projectionMatrixInverse && (uni['LGL_ProjectionMatrixInverse'] = projectionMatrixInverse)
        modelViewProjectionMatrix && (uni['LGL_ModelViewProjectionMatrix'] = modelViewProjectionMatrix)
        modelViewProjectionMatrix && on['LGL_ModelViewProjectionMatrixInverse']
                && (uni['LGL_ModelViewProjectionMatrixInverse'] = modelViewProjectionMatrix.inversed())
        on['LGL_NormalMatrix']
            && this.modelViewMatrixVersion != gl.modelViewMatrixVersion
            && (uni['LGL_NormalMatrix'] = (modelViewMatrixInverse as M4).transposed())
		this.uniforms(uni as any)
        this.projectionMatrixVersion = gl.projectionMatrixVersion
        this.modelViewMatrixVersion = gl.modelViewMatrixVersion

		// Create and enable attribute pointers as necessary.
		let minVertexBufferLength = Infinity
		for (const attribute in vertexBuffers) {
            const buffer = vertexBuffers[attribute]
            assert(buffer.hasBeenCompiled)
            const location = this.attributes[attribute] || gl.getAttribLocation(this.program, attribute)
            gl.handleError()
			if (location == -1 || !buffer.buffer) {
				//console.warn(`Vertex buffer ${attribute} was not bound because the attribute is not active.`)
				continue
			}
			this.attributes[attribute] = location
			gl.bindBuffer(WGL.ARRAY_BUFFER, buffer.buffer)
            gl.handleError()

			gl.enableVertexAttribArray(location)
            gl.handleError()

			gl.vertexAttribPointer(location, buffer.spacing, WGL.FLOAT, false, 0, 0)
            gl.handleError()

			minVertexBufferLength = Math.min(minVertexBufferLength, buffer.count)
		}

		// Disable unused attribute pointers.
		for (const attribute in this.attributes) {
			if (!(attribute in vertexBuffers)) {
				gl.disableVertexAttribArray(this.attributes[attribute])
                gl.handleError()
			}
		}

		// Draw the geometry.
		if (minVertexBufferLength) {
			count = count || (indexBuffer ? indexBuffer.count : minVertexBufferLength)
			assert(DRAW_MODE_CHECKS[mode](count), 'count ' + count + ' doesn\'t fulfill requirement '
				+ DRAW_MODE_CHECKS[mode].toString() + ' for mode ' + DRAW_MODES[mode])

			if (indexBuffer) {
			    assert(indexBuffer.hasBeenCompiled)
			    assert(minVertexBufferLength > indexBuffer.maxValue!)
				assert(count % indexBuffer.spacing == 0)
				assert(start % indexBuffer.spacing == 0)
				if (start + count > indexBuffer.count) {
					throw new Error('Buffer not long enough for passed parameters start/length/buffer length' + ' ' + start + ' ' + count + ' ' + indexBuffer.count)
				}
				gl.bindBuffer(WGL.ELEMENT_ARRAY_BUFFER, indexBuffer.buffer!)
                gl.handleError()
				// start parameter has to be multiple of sizeof(WGL.UNSIGNED_SHORT)
				gl.drawElements(mode, count, WGL.UNSIGNED_SHORT, 2 * start)
                gl.handleError()
			} else {
				if (start + count > minVertexBufferLength) {
					throw new Error('invalid')
				}
				gl.drawArrays(mode, start, count)
                gl.handleError()
			}
			gl.drawCallCount++
		}

		return this
	}
}