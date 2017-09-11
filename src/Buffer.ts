import {assert, int, NLA_DEBUG, V3} from 'ts3dutils'
import {currentGL} from './LightGLContext'

const WGL = WebGLRenderingContext

export class Buffer {
	buffer: WebGLBuffer | undefined
	data: any[]

	/** Number of elements in buffer. 2 V3s is still 2, not 6. */
	count: int

	/** Space between elements in buffer. 3 for V3s. */
	spacing: int

	hasBeenCompiled: boolean

	name?: string

    maxValue?: number

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
	constructor(readonly target: int, readonly type: typeof Float32Array | typeof Uint16Array) {
		assert(target == WGL.ARRAY_BUFFER || target == WGL.ELEMENT_ARRAY_BUFFER, 'target == WGL.ARRAY_BUFFER || target == WGL.ELEMENT_ARRAY_BUFFER')
		assert(type == Float32Array || type == Uint16Array, 'type == Float32Array || type == Uint16Array')
		this.buffer = undefined
		this.type = type
		this.data = []
		this.count = 0
		this.spacing = 0
		this.hasBeenCompiled = false
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
	compile(type: int = WGL.STATIC_DRAW, gl = currentGL()): void {
		assert(WGL.STATIC_DRAW == type || WGL.DYNAMIC_DRAW == type, 'WGL.STATIC_DRAW == type || WGL.DYNAMIC_DRAW == type')
        gl.handleError()
		this.buffer = this.buffer || gl.createBuffer() as WebGLBuffer
        gl.handleError()
		let buffer:  Float32Array | Uint16Array
		if (this.data.length == 0) {
			console.warn('empty buffer ' + this.name)
			//console.trace()
		}
		if (this.data.length == 0 || this.data[0] instanceof V3) {
		    assert(!(this.data[0] instanceof V3) || this.type == Float32Array)
			V3.pack(this.data, buffer = new this.type(this.data.length * 3) as Float32Array) // asserts that all
                                                                                             // elements are V3s
			this.spacing = 3
			this.count = this.data.length
			this.maxValue = 0
		} else {
			//assert(Array != this.data[0].constructor, this.name + this.data[0])
            if (Array.isArray(this.data[0])) {
                const bufferLength = this.data.length * this.data[0].length
                buffer = new this.type(bufferLength)
                let i = this.data.length, destPtr = bufferLength
                while (i--) {
                    const subArray = this.data[i]
                    let j = subArray.length
                    while (j--) {
                        buffer[--destPtr] = subArray[j]
                    }
                }
                assert(0 == destPtr)
            } else {
                buffer = new this.type(this.data)
            }

			const spacing = this.data.length ? buffer.length / this.data.length : 0
			assert(spacing % 1 == 0, `buffer ${this.name} elements not of consistent size, average size is ` + spacing)
			if (NLA_DEBUG) {
				if (10000 <= buffer.length) {
					this.maxValue = 0
				} else {
					this.maxValue = Math.max.apply(undefined, buffer)
				}
			}
			assert(spacing !== 0)
			this.spacing = spacing
			this.count = this.data.length
		}
        gl.bindBuffer(this.target, this.buffer)
        gl.handleError()
		gl.bufferData(this.target, buffer, type)
        gl.handleError()
		this.hasBeenCompiled = true
	}
}