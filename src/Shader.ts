/* tslint:disable:no-string-literal */
import {assert, assertf, assertInst, assertVectors, int, M4, NLA_DEBUG, V3} from 'ts3dutils'

import {currentGL, GL_COLOR, TSGLContext, Buffer, Mesh} from './index'

import GL = WebGLRenderingContextStrict
const WGL = WebGLRenderingContext as any as WebGLRenderingContextStrict.Constants

/**
 * These are all the draw modes usable in OpenGL ES
 */
const DRAW_MODE_NAMES = {
	[WGL.POINTS]: 'POINTS',
	[WGL.LINES]: 'LINES',
	[WGL.LINE_STRIP]: 'LINE_STRIP',
	[WGL.LINE_LOOP]: 'LINE_LOOP',
	[WGL.TRIANGLES]: 'TRIANGLES',
	[WGL.TRIANGLE_STRIP]: 'TRIANGLE_STRIP',
	[WGL.TRIANGLE_FAN]: 'TRIANGLE_FAN',
}
const DRAW_MODE_CHECKS: { [type: string]: (x: int) => boolean } = {
	[WGL.POINTS]: _ => true,
	[WGL.LINES]: x => 0 == x % 2, // divisible by 2
	[WGL.LINE_STRIP]: x => x > 2, // need at least 2
	[WGL.LINE_LOOP]: x => x > 2, // more like > 3, but oh well
	[WGL.TRIANGLES]: x => 0 == x % 3, // divisible by 3
	[WGL.TRIANGLE_STRIP]: x => x > 3,
	[WGL.TRIANGLE_FAN]: x => x > 3,
}

export const SHADER_VAR_TYPES = ['FLOAT', 'FLOAT_MAT2', 'FLOAT_MAT3', 'FLOAT_MAT4', 'FLOAT_VEC2', 'FLOAT_VEC3', 'FLOAT_VEC4', 'INT', 'INT_VEC2', 'INT_VEC3', 'INT_VEC4', 'UNSIGNED_INT']


export function isArray<T>(obj: any): obj is T[] {
	return Array == obj.constructor || Float32Array == obj.constructor || Float64Array == obj.constructor
}

export interface UniformTypesMap {
	FLOAT_VEC4: GL_COLOR | V3
	FLOAT_VEC3: [number, number, number] | V3
	FLOAT_VEC2: [number, number] | V3
	FLOAT: number
	INT: int
	FLOAT_MAT4: M4 | number[]
	FLOAT_MAT3: M4 | number[]
	SAMPLER_2D: int
	BOOL: boolean
}
export type UniformTypes = keyof UniformTypesMap

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

export type ShaderType<UniformTypes, AttributeTypes = {}> = string & { T?: UniformTypes, A?: AttributeTypes }
export type VarTypeMap = { [name: string]: UniformTypes }
export type ShaderSource<U extends VarTypeMap, IN extends VarTypeMap, OUT extends VarTypeMap, kind extends 'vertex' | 'fragment'> = string & { U: U, IN: IN, OUT: OUT, kind: kind }

//const x:UniformTypes = undefined as 'FLOAT_VEC4' | 'FLOAT_VEC3'
export class Shader<UniformTypes extends VarTypeMap = any, AttributeTypes extends VarTypeMap = any> {
	program: WebGLProgram
	activeMatrices: { [matrixName: string ]: boolean }
	attributeLocations: { [attributeName: string ]: number }
	constantAttributes: { [attributeName: string ]: boolean }
	uniformLocations: { [uniformName: string ]: WebGLUniformLocation }
	uniformInfos: { [uniformName: string ]: GL.WebGLActiveInfo<GL.UniformType> }
	projectionMatrixVersion = -1
	modelViewMatrixVersion = -1
	gl: TSGLContext

	/**
	 * Create shader drom typed vertex and fragment source. Weird generic arguments are because
	 * the vertex shader is required to have the OUT types the fragment shader needs as IN,
	 * but not vice-versa.
	 */
	static create<
	FragSrc extends ShaderSource<{}, {}, {}, 'fragment'>,
	VertSrc extends ShaderSource<{}, {}, FragSrc['IN'], 'vertex'>>(
		vertexSource: VertSrc, fragmentSource: FragSrc, gl?: TSGLContext
	): Shader<VertSrc['U'] & FragSrc['U'], VertSrc['IN']>
	/**
	 * Create shader from typed vertex and untyped fragment source. Uniform of the fragment shader
	 * can optionally be manually specified.
	 */
	static create<FU extends VarTypeMap, VertSrc extends ShaderSource<{}, {}, {}, 'vertex'>>(vertexSource: VertSrc, fragmentSource: string & { IN?: undefined }, gl?: TSGLContext): Shader<FU & VertSrc['U'], VertSrc['IN']>
	/**
	 * Create shader from untyped vertex and typed fragment source. Uniform and attribute types of the shader
	 * can optionally be manually specified.
	 */
	static create<VU extends VarTypeMap, VA extends VarTypeMap, FragSrc extends ShaderSource<{}, {}, {}, 'vertex'>>(vertexSource: string & { IN?: undefined }, fragmentSource: FragSrc, gl?: TSGLContext): Shader<VU & FragSrc['U'], VA>
	/**
	 * Create shader from untyped vertex and fragment source. Uniform and attribute types of the shader
	 * can optionally be manually specified.
	 */
	static create<U extends VarTypeMap = {}, A extends VarTypeMap = {}>(vertexSource: string & { IN?: undefined }, fragmentSource: string & { IN?: undefined }, gl?: TSGLContext): Shader<U, A>
	static create(vertexSource: string, fragmentSource: string, gl?: TSGLContext) {
		return new Shader(vertexSource, fragmentSource, gl) as any
	}

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
	protected constructor(vertexSource: string, fragmentSource: string, gl = currentGL()) {
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
	`
		const matrixNames = header.match(/\bts_\w+/g)

		// Compile and link errors are thrown as strings.
		function compileSource(type: GL.ShaderType, source: string) {
			const shader = gl.createShader(type)!
			gl.shaderSource(shader, source)
			gl.compileShader(shader)
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				throw new Error('compile error: ' + gl.getShaderInfoLog(shader))
			}
			return shader
		}


		this.gl = gl
		this.program = gl.createProgram()!
		gl.attachShader(this.program, compileSource(gl.VERTEX_SHADER, vertexSource))
		gl.attachShader(this.program, compileSource(gl.FRAGMENT_SHADER, fragmentSource))
		gl.linkProgram(this.program)
		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			throw new Error('link error: ' + gl.getProgramInfoLog(this.program))
		}
		this.attributeLocations = {}
		this.uniformLocations = {}
		this.constantAttributes = {}

		// Check for the use of built-in matrices that require expensive matrix
		// multiplications to compute, and record these in `activeMatrices`.
		this.activeMatrices = {}
		matrixNames && matrixNames.forEach(name => {
			if (gl.getUniformLocation(this.program, name)) {
				this.activeMatrices[name] = true
			}
		})

		this.uniformInfos = {}
		for (let i = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS); i-- > 0;) {
			// see https://www.khronos.org/registry/OpenGL-Refpages/es2.0/xhtml/glGetActiveUniform.xml
			// this.program has already been checked
			// i is in bounds
			const info = gl.getActiveUniform(this.program, i)!
			this.uniformInfos[info.name] = info
		}
	}


	/**
	 * Set a uniform for each property of `uniforms`. The correct `viewerGL.uniform*()` method is inferred from the
	 * value types and from the stored uniform sampler flags.
	 */
	uniforms(uniforms: Partial<{ [K in keyof UniformTypes]: UniformTypesMap[UniformTypes[K]] }>): this {
		const gl = this.gl
		gl.useProgram(this.program)

		for (const name in uniforms) {
			const location = this.uniformLocations[name] || gl.getUniformLocation(this.program, name)
			// !location && console.warn(name + ' uniform is not used in shader')
			if (!location) continue
			this.uniformLocations[name] = location
			let value: any = uniforms[name] as any
			const info = this.uniformInfos[name]
			if (NLA_DEBUG) {
				// TODO: better errors
				if (gl.SAMPLER_2D == info.type || gl.SAMPLER_CUBE == info.type || gl.INT == info.type) {
					if (1 == info.size) {
						assert(Number.isInteger(value))
					} else {
						assert(isIntArray(value) && value.length == info.size, 'value must be int array if info.size != 1')
					}
				}
				assert(gl.FLOAT != info.type ||
					(1 == info.size && 'number' === typeof value || isFloatArray(value) ))
				assert(gl.FLOAT_VEC3 != info.type ||
					(1 == info.size && value instanceof V3 ||
						Array.isArray(value) && info.size == value.length && assertVectors(...value)))
				assert(gl.FLOAT_VEC4 != info.type || 1 != info.size || isFloatArray(value) && value.length == 4)
				assert(gl.FLOAT_MAT4 != info.type || value instanceof M4, () => value.toSource())
				assert(gl.FLOAT_MAT3 != info.type || value.length == 9 || value instanceof M4)
			}
			if (value instanceof V3) {
				value = value.toArray()
			}
			if (gl.FLOAT_VEC4 == info.type && info.size != 1) {
				if (value instanceof Float32Array || value instanceof Float64Array) {
					gl.uniform4fv(location, value instanceof Float32Array ? value : Float32Array.from(value))
				} else {
					gl.uniform4fv(location, value.concatenated())
				}
			} else if (gl.FLOAT == info.type && info.size != 1) {
				gl.uniform1fv(location, value)
			} else if (gl.FLOAT_VEC3 == info.type && info.size != 1) {
				gl.uniform3fv(location, V3.pack(value))
			} else if (value.length) {
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
							value[2], value[5], value[8],
						]))
						break
					case 16:
						gl.uniformMatrix4fv(location, false, new Float32Array([
							value[0], value[4], value[8], value[12],
							value[1], value[5], value[9], value[13],
							value[2], value[6], value[10], value[14],
							value[3], value[7], value[11], value[15],
						]))
						break
					default:
						throw new Error('don\'t know how to load uniform "' + name + '" of length ' + value.length)
				}
			} else if ('number' == typeof value) {
				if (gl.SAMPLER_2D == info.type || gl.SAMPLER_CUBE == info.type || gl.INT == info.type) {
					gl.uniform1i(location, value)
				} else {
					gl.uniform1f(location, value)
				}
			} else if ('boolean' == typeof value) {
				gl.uniform1i(location, +value)
			} else if (value instanceof M4) {
				const m = value.m
				if (gl.FLOAT_MAT4 == info.type) {
					gl.uniformMatrix4fv(location, false, [
						m[0], m[4], m[8], m[12],
						m[1], m[5], m[9], m[13],
						m[2], m[6], m[10], m[14],
						m[3], m[7], m[11], m[15]])
				} else if (gl.FLOAT_MAT3 == info.type) {
					gl.uniformMatrix3fv(location, false, [
						m[0], m[4], m[8],
						m[1], m[5], m[9],
						m[2], m[6], m[10]])
				} else if (gl.FLOAT_MAT2 == info.type) {
					gl.uniformMatrix2fv(location, false, new Float32Array([
						m[0], m[4],
						m[1], m[5]]))
				} else {
					throw new Error(`Can't assign M4 to ${info.type}`)
				}
			} else {
				throw new Error('attempted to set uniform "' + name + '" to invalid value ' + value)
			}
		}

		return this
	}

	attributes(attributes: Partial<{ [K in keyof AttributeTypes]: UniformTypesMap[AttributeTypes[K]] }>): this {
		const gl = this.gl
		gl.useProgram(this.program)

		for (const name in attributes) {
			const location = this.attributeLocations[name] || gl.getAttribLocation(this.program, name)
			if (location == -1) {
				if (!name.startsWith('ts_')) {
					console.warn(`Vertex buffer ${name} was not bound because the attribute is not active.`)
				}
				continue
			}
			this.attributeLocations[name] = location
			gl.disableVertexAttribArray(location)
			let value = attributes[name]
			if (value instanceof V3) {
				value = value.toArray()
			}
			if ('number' === typeof value) {
				gl.vertexAttrib1f(location, value)
			} else {
				gl.vertexAttrib4fv(location, value as number[])
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
			this.constantAttributes[name] = true
		}
		return this
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
	draw(mesh: Mesh, mode: GL.DrawMode = WGL.TRIANGLES, start?: int, count?: int): this {
		assert(mesh.hasBeenCompiled, 'mesh.hasBeenCompiled')
		assert(undefined != DRAW_MODE_NAMES[mode])
		const modeName: string = DRAW_MODE_NAMES[mode]
		// assert(mesh.indexBuffers[modeStr], `mesh.indexBuffers[${modeStr}] undefined`)
		return this.drawBuffers(mesh.vertexBuffers, mesh.indexBuffers[modeName], mode, start, count)
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
				mode: GL.DrawMode = WGL.TRIANGLES,
				start: int = 0, count?: int): this {
		const gl = this.gl
		assert(undefined != DRAW_MODE_NAMES[mode])
		assertf(() => 1 <= Object.keys(vertexBuffers).length)
		Object.keys(vertexBuffers).forEach(key => assertInst(Buffer, vertexBuffers[key]))

		// Only varruct up the built-in matrices that are active in the shader
		const on = this.activeMatrices
		const modelViewMatrixInverse = (on['ts_ModelViewMatrixInverse'] || on['ts_NormalMatrix'])
			//&& this.modelViewMatrixVersion != gl.modelViewMatrixVersion
			&& gl.modelViewMatrix.inversed()
		const projectionMatrixInverse = on['ts_ProjectionMatrixInverse']
			//&& this.projectionMatrixVersion != gl.projectionMatrixVersion
			&& gl.projectionMatrix.inversed()
		const modelViewProjectionMatrix = (on['ts_ModelViewProjectionMatrix'] || on['ts_ModelViewProjectionMatrixInverse'])
			//&& (this.projectionMatrixVersion != gl.projectionMatrixVersion || this.modelViewMatrixVersion !=
			// gl.modelViewMatrixVersion)
			&& gl.projectionMatrix.times(gl.modelViewMatrix)

		const uni: { [matrixName: string ]: M4 } = {} // Uniform Matrices
		on['ts_ModelViewMatrix']
		&& this.modelViewMatrixVersion != gl.modelViewMatrixVersion
		&& (uni['ts_ModelViewMatrix'] = gl.modelViewMatrix)
		on['ts_ModelViewMatrixInverse'] && (uni['ts_ModelViewMatrixInverse'] = modelViewMatrixInverse as M4)
		on['ts_ProjectionMatrix']
		&& this.projectionMatrixVersion != gl.projectionMatrixVersion
		&& (uni['ts_ProjectionMatrix'] = gl.projectionMatrix)
		projectionMatrixInverse && (uni['ts_ProjectionMatrixInverse'] = projectionMatrixInverse)
		modelViewProjectionMatrix && (uni['ts_ModelViewProjectionMatrix'] = modelViewProjectionMatrix)
		modelViewProjectionMatrix && on['ts_ModelViewProjectionMatrixInverse']
		&& (uni['ts_ModelViewProjectionMatrixInverse'] = modelViewProjectionMatrix.inversed())
		on['ts_NormalMatrix']
		&& this.modelViewMatrixVersion != gl.modelViewMatrixVersion
		&& (uni['ts_NormalMatrix'] = (modelViewMatrixInverse as M4).transposed())
		this.uniforms(uni as any)
		this.projectionMatrixVersion = gl.projectionMatrixVersion
		this.modelViewMatrixVersion = gl.modelViewMatrixVersion

		// Create and enable attribute pointers as necessary.
		let minVertexBufferLength = Infinity
		for (const attribute in vertexBuffers) {
			const buffer = vertexBuffers[attribute]
			assert(buffer.hasBeenCompiled)
			const location = this.attributeLocations[attribute] || gl.getAttribLocation(this.program, attribute)
			if (location == -1 || !buffer.buffer) {
				if (!attribute.startsWith('ts_')) {
					console.warn(`Vertex buffer ${attribute} was not bound because the attribute is not active.`)
				}
				continue
			}
			this.attributeLocations[attribute] = location
			gl.bindBuffer(WGL.ARRAY_BUFFER, buffer.buffer)

			gl.enableVertexAttribArray(location)

			gl.vertexAttribPointer(location, buffer.spacing, WGL.FLOAT, false, 0, 0)

			minVertexBufferLength = Math.min(minVertexBufferLength, buffer.count)
		}

		// Disable unused attribute pointers.
		for (const attribute in this.attributeLocations) {
			if (!(attribute in vertexBuffers)) {
				gl.disableVertexAttribArray(this.attributeLocations[attribute])
			}
		}

		if (NLA_DEBUG) {
			const numAttribs = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES)
			for (let i = 0; i < numAttribs; ++i) {
				const buffer=gl.getVertexAttrib(i, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING)
				if (!buffer) {
					const info = gl.getActiveAttrib(this.program, i)!
					if (!this.constantAttributes[info.name]) {
						console.warn('No buffer is bound to attribute ' + info.name + ' and it was not set with .attributes()')
					}
				}
				// console.log('name:', info.name, 'type:', info.type, 'size:', info.size)
			}
		}

		// Draw the geometry.
		if (minVertexBufferLength) {
			if (undefined === count) {
				count = (indexBuffer ? indexBuffer.count : minVertexBufferLength)
			}
			assert(DRAW_MODE_CHECKS[mode](count), 'count ' + count + ' doesn\'t fulfill requirement '
				+ DRAW_MODE_CHECKS[mode].toString() + ' for mode ' + DRAW_MODE_NAMES[mode])

			if (indexBuffer) {
				assert(indexBuffer.hasBeenCompiled)
				assert(minVertexBufferLength > indexBuffer.maxValue!)
				assert(count % indexBuffer.spacing == 0)
				assert(start % indexBuffer.spacing == 0)
				if (start + count > indexBuffer.count) {
					throw new Error('Buffer not long enough for passed parameters start/length/buffer length' + ' ' + start + ' ' + count + ' ' + indexBuffer.count)
				}
				gl.bindBuffer(WGL.ELEMENT_ARRAY_BUFFER, indexBuffer.buffer!)
				// start parameter has to be multiple of sizeof(WGL.UNSIGNED_SHORT)
				gl.drawElements(mode, count, WGL.UNSIGNED_SHORT, 2 * start)
			} else {
				if (start + count > minVertexBufferLength) {
					throw new Error('invalid')
				}
				gl.drawArrays(mode, start, count)
			}
			gl.drawCallCount++
		}

		return this
	}
}