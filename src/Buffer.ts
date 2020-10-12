/// <reference types="webgl-strict-types" />
import { assert, int, NLA_DEBUG, V3 } from "ts3dutils"
import { currentGL, TSGLContext } from "./index"

import GL = WebGLRenderingContextStrict
const WGL = (WebGLRenderingContext as any) as WebGLRenderingContextStrict.Constants

export class Buffer {
  buffer: WebGLBuffer | undefined = undefined
  data: any[] = []

  /** Number of elements in buffer. 2 V3s is still 2, not 6. */
  count: int = 0

  /** Space between elements in buffer. 3 for V3s. */
  spacing: 1 | 2 | 3 | 4 = 1

  hasBeenCompiled: boolean = false

  name?: string

  maxValue?: number

  bindSize: GL["UNSIGNED_INT"] | GL["UNSIGNED_SHORT"]

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
  constructor(
    public readonly target: GL.BufferTarget,
    public readonly type:
      | typeof Float32Array
      | typeof Uint16Array
      | typeof Uint32Array,
  ) {
    assert(
      target == WGL.ARRAY_BUFFER || target == WGL.ELEMENT_ARRAY_BUFFER,
      "target == WGL.ARRAY_BUFFER || target == WGL.ELEMENT_ARRAY_BUFFER",
    )
    assert(
      type == Float32Array || type == Uint16Array || type == Uint32Array,
      "type == Float32Array || type == Uint16Array || type == Uint32Array",
    )
    if (Uint16Array == type) {
      this.bindSize = WGL.UNSIGNED_SHORT
    } else if (Uint32Array == type) {
      this.bindSize = WGL.UNSIGNED_INT
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
  compile(
    usage: GL.BufferDataUsage = WGL.STATIC_DRAW,
    gl: TSGLContext = currentGL(),
  ): void {
    assert(
      WGL.STATIC_DRAW == usage || WGL.DYNAMIC_DRAW == usage,
      "WGL.STATIC_DRAW == type || WGL.DYNAMIC_DRAW == type",
    )
    this.buffer = this.buffer || gl.createBuffer()!
    let buffer: Float32Array | Uint16Array | Uint32Array
    if (this.data.length == 0) {
      console.warn("empty buffer " + this.name)
      //console.trace()
    }
    if (this.data.length == 0 || this.data[0] instanceof V3) {
      assert(!(this.data[0] instanceof V3) || this.type == Float32Array)
      V3.pack(
        this.data,
        (buffer = new this.type(this.data.length * 3) as Float32Array),
      ) // asserts that all
      // elements are V3s
      this.spacing = 3
      this.count = this.data.length
      this.maxValue = 0
    } else {
      //assert(Array != this.data[0].constructor, this.name + this.data[0])
      if (Array.isArray(this.data[0])) {
        const bufferLength = this.data.length * this.data[0].length
        buffer = new this.type(bufferLength)
        let i = this.data.length,
          destPtr = bufferLength
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
      assert(
        spacing % 1 == 0,
        `buffer ${this.name} elements not of consistent size, average size is ` +
          spacing,
      )
      if (NLA_DEBUG) {
        if (10000 <= buffer.length) {
          this.maxValue = 0
        } else {
          this.maxValue = Math.max.apply(undefined, buffer)
        }
      }
      assert([1, 2, 3, 4].includes(spacing))
      this.spacing = spacing as 1 | 2 | 3 | 4
      this.count = this.data.length
    }
    gl.bindBuffer(this.target, this.buffer)
    gl.bufferData(this.target, buffer, usage)
    this.hasBeenCompiled = true
  }
}
