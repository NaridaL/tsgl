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


// tslint:disable
import GL = WebGLRenderingContextStrict

// Various functions for helping debug WebGL apps.

/**
 * Wrapped logging function.
 * @param msg Message to log.
 */
function log(msg: string) {
	if (window.console && window.console.log) {
		window.console.log(msg)
	}
}

/**
 * Wrapped error logging function.
 * @param msg Message to log.
 */
function error(msg: string) {
	if (window.console && window.console.error) {
		window.console.error(msg)
	} else {
		log(msg)
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
const glValidEnumContexts: { [funcName: string]: { [argCount: number]: { [argIndex: number]: boolean | { enumBitwiseOr: string[] } } } } = {
	// Generic setters and getters

	'enable': { 1: { 0: true } },
	'disable': { 1: { 0: true } },
	'getParameter': { 1: { 0: true } },

	// Rendering

	'drawArrays': { 3: { 0: true } },
	'drawElements': { 4: { 0: true, 2: true } },

	// Shaders

	'createShader': { 1: { 0: true } },
	'getShaderParameter': { 2: { 1: true } },
	'getProgramParameter': { 2: { 1: true } },
	'getShaderPrecisionFormat': { 2: { 0: true, 1: true } },

	// Vertex attributes

	'getVertexAttrib': { 2: { 1: true } },
	'vertexAttribPointer': { 6: { 2: true } },

	// Textures

	'bindTexture': { 2: { 0: true } },
	'activeTexture': { 1: { 0: true } },
	'getTexParameter': { 2: { 0: true, 1: true } },
	'texParameterf': { 3: { 0: true, 1: true } },
	'texParameteri': { 3: { 0: true, 1: true, 2: true } },
	// texImage2D and texSubImage2D are defined below with WebGL 2 entrypoints
	'copyTexImage2D': { 8: { 0: true, 2: true } },
	'copyTexSubImage2D': { 8: { 0: true } },
	'generateMipmap': { 1: { 0: true } },
	// compressedTexImage2D and compressedTexSubImage2D are defined below with WebGL 2 entrypoints

	// Buffer objects

	'bindBuffer': { 2: { 0: true } },
	// bufferData and bufferSubData are defined below with WebGL 2 entrypoints
	'getBufferParameter': { 2: { 0: true, 1: true } },

	// Renderbuffers and framebuffers

	'pixelStorei': { 2: { 0: true, 1: true } },
	// readPixels is defined below with WebGL 2 entrypoints
	'bindRenderbuffer': { 2: { 0: true } },
	'bindFramebuffer': { 2: { 0: true } },
	'checkFramebufferStatus': { 1: { 0: true } },
	'framebufferRenderbuffer': { 4: { 0: true, 1: true, 2: true } },
	'framebufferTexture2D': { 5: { 0: true, 1: true, 2: true } },
	'getFramebufferAttachmentParameter': { 3: { 0: true, 1: true, 2: true } },
	'getRenderbufferParameter': { 2: { 0: true, 1: true } },
	'renderbufferStorage': { 4: { 0: true, 1: true } },

	// Frame buffer operations (clear, blend, depth test, stencil)

	'clear': { 1: { 0: { 'enumBitwiseOr': ['COLOR_BUFFER_BIT', 'DEPTH_BUFFER_BIT', 'STENCIL_BUFFER_BIT'] } } },
	'depthFunc': { 1: { 0: true } },
	'blendFunc': { 2: { 0: true, 1: true } },
	'blendFuncSeparate': { 4: { 0: true, 1: true, 2: true, 3: true } },
	'blendEquation': { 1: { 0: true } },
	'blendEquationSeparate': { 2: { 0: true, 1: true } },
	'stencilFunc': { 3: { 0: true } },
	'stencilFuncSeparate': { 4: { 0: true, 1: true } },
	'stencilMaskSeparate': { 2: { 0: true } },
	'stencilOp': { 3: { 0: true, 1: true, 2: true } },
	'stencilOpSeparate': { 4: { 0: true, 1: true, 2: true, 3: true } },

	// Culling

	'cullFace': { 1: { 0: true } },
	'frontFace': { 1: { 0: true } },

	// ANGLE_instanced_arrays extension

	'drawArraysInstancedANGLE': { 4: { 0: true } },
	'drawElementsInstancedANGLE': { 5: { 0: true, 2: true } },

	// EXT_blend_minmax extension

	'blendEquationEXT': { 1: { 0: true } },

	// WebGL 2 Buffer objects

	'bufferData': {
		3: { 0: true, 2: true }, // WebGL 1
		4: { 0: true, 2: true }, // WebGL 2
		5: { 0: true, 2: true }  // WebGL 2
	},
	'bufferSubData': {
		3: { 0: true }, // WebGL 1
		4: { 0: true }, // WebGL 2
		5: { 0: true }  // WebGL 2
	},
	'copyBufferSubData': { 5: { 0: true, 1: true } },
	'getBufferSubData': { 3: { 0: true }, 4: { 0: true }, 5: { 0: true } },

	// WebGL 2 Framebuffer objects

	'blitFramebuffer': { 10: { 8: { 'enumBitwiseOr': ['COLOR_BUFFER_BIT', 'DEPTH_BUFFER_BIT', 'STENCIL_BUFFER_BIT'] }, 9: true } },
	'framebufferTextureLayer': { 5: { 0: true, 1: true } },
	'invalidateFramebuffer': { 2: { 0: true } },
	'invalidateSubFramebuffer': { 6: { 0: true } },
	'readBuffer': { 1: { 0: true } },

	// WebGL 2 Renderbuffer objects

	'getInternalformatParameter': { 3: { 0: true, 1: true, 2: true } },
	'renderbufferStorageMultisample': { 5: { 0: true, 2: true } },

	// WebGL 2 Texture objects

	'texStorage2D': { 5: { 0: true, 2: true } },
	'texStorage3D': { 6: { 0: true, 2: true } },
	'texImage2D': {
		9: { 0: true, 2: true, 6: true, 7: true }, // WebGL 1 & 2
		6: { 0: true, 2: true, 3: true, 4: true }, // WebGL 1
		10: { 0: true, 2: true, 6: true, 7: true } // WebGL 2
	},
	'texImage3D': {
		10: { 0: true, 2: true, 7: true, 8: true },
		11: { 0: true, 2: true, 7: true, 8: true }
	},
	'texSubImage2D': {
		9: { 0: true, 6: true, 7: true }, // WebGL 1 & 2
		7: { 0: true, 4: true, 5: true }, // WebGL 1
		10: { 0: true, 6: true, 7: true } // WebGL 2
	},
	'texSubImage3D': {
		11: { 0: true, 8: true, 9: true },
		12: { 0: true, 8: true, 9: true }
	},
	'copyTexSubImage3D': { 9: { 0: true } },
	'compressedTexImage2D': {
		7: { 0: true, 2: true }, // WebGL 1 & 2
		8: { 0: true, 2: true }, // WebGL 2
		9: { 0: true, 2: true }  // WebGL 2
	},
	'compressedTexImage3D': {
		8: { 0: true, 2: true },
		9: { 0: true, 2: true },
		10: { 0: true, 2: true }
	},
	'compressedTexSubImage2D': {
		8: { 0: true, 6: true }, // WebGL 1 & 2
		9: { 0: true, 6: true }, // WebGL 2
		10: { 0: true, 6: true } // WebGL 2
	},
	'compressedTexSubImage3D': {
		10: { 0: true, 8: true },
		11: { 0: true, 8: true },
		12: { 0: true, 8: true }
	},

	// WebGL 2 Vertex attribs

	'vertexAttribIPointer': { 5: { 2: true } },

	// WebGL 2 Writing to the drawing buffer

	'drawArraysInstanced': { 4: { 0: true } },
	'drawElementsInstanced': { 5: { 0: true, 2: true } },
	'drawRangeElements': { 6: { 0: true, 4: true } },

	// WebGL 2 Reading back pixels

	'readPixels': {
		7: { 4: true, 5: true }, // WebGL 1 & 2
		8: { 4: true, 5: true }  // WebGL 2
	},

	// WebGL 2 Multiple Render Targets

	'clearBufferfv': { 3: { 0: true }, 4: { 0: true } },
	'clearBufferiv': { 3: { 0: true }, 4: { 0: true } },
	'clearBufferuiv': { 3: { 0: true }, 4: { 0: true } },
	'clearBufferfi': { 4: { 0: true } },

	// WebGL 2 Query objects

	'beginQuery': { 2: { 0: true } },
	'endQuery': { 1: { 0: true } },
	'getQuery': { 2: { 0: true, 1: true } },
	'getQueryParameter': { 2: { 1: true } },

	// WebGL 2 Sampler objects

	'samplerParameteri': { 3: { 1: true, 2: true } },
	'samplerParameterf': { 3: { 1: true } },
	'getSamplerParameter': { 2: { 1: true } },

	// WebGL 2 Sync objects

	'fenceSync': { 2: { 0: true, 1: { 'enumBitwiseOr': [] } } },
	'clientWaitSync': { 3: { 1: { 'enumBitwiseOr': ['SYNC_FLUSH_COMMANDS_BIT'] } } },
	'waitSync': { 3: { 1: { 'enumBitwiseOr': [] } } },
	'getSyncParameter': { 2: { 1: true } },

	// WebGL 2 Transform Feedback

	'bindTransformFeedback': { 2: { 0: true } },
	'beginTransformFeedback': { 1: { 0: true } },
	'transformFeedbackVaryings': { 3: { 2: true } },

	// WebGL2 Uniform Buffer Objects and Transform Feedback Buffers

	'bindBufferBase': { 3: { 0: true } },
	'bindBufferRange': { 5: { 0: true } },
	'getIndexedParameter': { 2: { 0: true } },
	'getActiveUniforms': { 3: { 2: true } },
	'getActiveUniformBlockParameter': { 3: { 2: true } }
}

/**
 * Map of numbers to names.
 * @type {Object}
 */
let glEnums: { [k: number]: string } = null as any

/**
 * Map of names to numbers.
 * @type {Object}
 */
let enumStringToValue: { [k: string]: GL.GLenum<string> } = null as any

/**
 * Initializes this module. Safe to call more than once.
 * @param ctx A WebGL context. If
 *    you have more than one context it doesn't matter which one
 *    you pass in, it is only used to pull out constants.
 */
export function init() {
	if (null === glEnums) {
		glEnums = {}
		enumStringToValue = {}
		const c = (window as any).WebGL2RenderingContext || (window as any).WebGLRenderingContext
		if (!c) throw new Error('Neither WebGL2RenderingContext nor WebGLRenderingContext exists on window.')
		for (const propertyName in c) {
			const prop = c[propertyName]
			if ('number' === typeof prop) {
				glEnums[prop] = propertyName
				enumStringToValue[propertyName] = prop as any
			}
		}
	}
}

/**
 * Returns true or false if value matches any WebGL enum
 * @param value Value to check if it might be an enum.
 * @return True if value matches one of the WebGL defined enums
 */
export function mightBeEnum(value: number): boolean {
	init()
	return (glEnums[value] !== undefined)
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
export function glEnumToString(value: GL.GLenum<string>): string {
	init()
	var name = glEnums[value as any]
	return (name !== undefined) ? ('gl.' + name) :
		('/*UNKNOWN WebGL ENUM*/ 0x' + (value as any).toString(16) + '')
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
export function glFunctionArgToString(functionName: string, numArgs: number, argumentIndex: number, value: any): string {
	const funcInfo = glValidEnumContexts[functionName]
	if (funcInfo !== undefined) {
		const funcOverloadInfo = funcInfo[numArgs]
		if (funcOverloadInfo !== undefined) {
			const argInfo = funcOverloadInfo[argumentIndex]
			if (argInfo) {
				if (typeof argInfo === 'object') {
					const enums = argInfo.enumBitwiseOr
					const orEnums = []
					let orResult = 0
					for (let i = 0; i < enums.length; ++i) {
						const enumValue = enumStringToValue[enums[i]]
						if ((value & enumValue) !== 0) {
							orResult |= enumValue
							orEnums.push(glEnumToString(enumValue))
						}
					}
					if (orResult === value) {
						return orEnums.join(' | ')
					} else {
						return glEnumToString(value)
					}
				} else {
					return glEnumToString(value)
				}
			}
		}
	}
	if (value === null) {
		return 'null'
	} else if (value === undefined) {
		return 'undefined'
	} else {
		return value.toString()
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
export function glFunctionArgsToString(functionName: string, args: number[]): string {
	// apparently we can't do args.join(',')
	var argStr = ''
	var numArgs = args.length
	for (var ii = 0; ii < numArgs; ++ii) {
		argStr += ((ii == 0) ? '' : ', ') +
			glFunctionArgToString(functionName, numArgs, ii, args[ii])
	}
	return argStr
}


function makePropertyWrapper(wrapper:any , original: any, propertyName: string) {
	//log('wrap prop: ' + propertyName)
	wrapper.__defineGetter__(propertyName, function () {
		return original[propertyName]
	})
	// TODO(gmane): this needs to handle properties that take more than
	// one value?
	wrapper.__defineSetter__(propertyName, function (value: any) {
		//log('set: ' + propertyName)
		original[propertyName] = value
	})
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
export function makeDebugContext(
	ctx: WebGLRenderingContextStrict,
	opt_onErrorFunc?: (err: GL.Error, funcName: string, args: any[]) => void,
	opt_onFunc?: (funcName: string, args: any[]) => void,
	opt_err_ctx: WebGLRenderingContextStrict = ctx
): WebGLRenderingContext {
	init()
	opt_onErrorFunc = opt_onErrorFunc || function (err, functionName, args) {
		// apparently we can't do args.join(',')
		var argStr = ''
		var numArgs = args.length
		for (let i = 0; i < numArgs; ++i) {
			argStr += ((i == 0) ? '' : ', ') +
				glFunctionArgToString(functionName, numArgs, i, args[i])
		}
		error('WebGL error ' + glEnumToString(err) + ' in ' + functionName +
			'(' + argStr + ')')
	}

	// Holds booleans for each GL error so after we get the error ourselves
	// we can still return it to the client app.
	const glErrorShadow: { [k: number]: boolean } = {}

	// Makes a function that calls a WebGL function and then calls getError.
	function makeErrorWrapper(ctx: WebGLRenderingContextStrict, functionName: string) {
		return function (...args: any[]) {
			if (opt_onFunc) {
				opt_onFunc(functionName, args)
			}
			const result = (ctx as any)[functionName].apply(ctx, args)
			const err = opt_err_ctx.getError()
			if (err != 0) {
				glErrorShadow[err] = true
				opt_onErrorFunc!(err, functionName, args)
			}
			return result
		}
	}

	// Make a an object that has a copy of every property of the WebGL context
	// but wraps all functions.
	const wrapper: any = {}
	for (let propertyName in ctx) {
		const prop = ctx[propertyName as keyof WebGLRenderingContextStrict]
		if ('function' === typeof prop) {
			if (propertyName != 'getExtension') {
				wrapper[propertyName] = makeErrorWrapper(ctx, propertyName)
			} else {
				let wrapped = makeErrorWrapper(ctx, propertyName)
				wrapper[propertyName as any] = function () {
					const result = wrapped.apply(ctx, arguments)
					if (!result) {
						return null
					}
					return makeDebugContext(result, opt_onErrorFunc, opt_onFunc, opt_err_ctx)
				}
			}
		} else {
			makePropertyWrapper(wrapper, ctx, propertyName)
		}
	}

	// Override the getError function with one that returns our saved results.
	wrapper.getError = function () {
		for (const err in glErrorShadow) {
			if (glErrorShadow.hasOwnProperty(err)) {
				if (glErrorShadow[err]) {
					glErrorShadow[err] = false
					return parseInt(err)
				}
			}
		}
		return ctx.NO_ERROR
	}

	return wrapper
}
export function isWebGL2RenderingContext(o: any): o is WebGL2RenderingContext {
	return !!o.createTransformFeedback
}
/**
 * Resets a context to the initial state.
 * @param ctx The webgl context to
 *     reset.
 */
export function resetToInitialState(ctx2: WebGL2RenderingContext | WebGLRenderingContextStrict) {

	if (isWebGL2RenderingContext(ctx2)) {
		ctx2.bindVertexArray(null)
	}

	const numAttribs = ctx2.getParameter(ctx2.MAX_VERTEX_ATTRIBS)
	const tmp = ctx2.createBuffer()
	ctx2.bindBuffer(ctx2.ARRAY_BUFFER, tmp)
	for (let ii = 0; ii < numAttribs; ++ii) {
		ctx2.disableVertexAttribArray(ii)
		ctx2.vertexAttribPointer(ii, 4, ctx2.FLOAT, false, 0, 0)
		ctx2.vertexAttrib1f(ii, 0)
		if (isWebGL2RenderingContext(ctx2)) {
			ctx2.vertexAttribDivisor(ii, 0)
		}
	}
	ctx2.deleteBuffer(tmp)

	const numTextureUnits = ctx2.getParameter(ctx2.MAX_TEXTURE_IMAGE_UNITS)
	for (let ii = 0; ii < numTextureUnits; ++ii) {
		ctx2.activeTexture((ctx2.TEXTURE0 + ii) as GL.TextureUnit)
		ctx2.bindTexture(ctx2.TEXTURE_CUBE_MAP, null)
		ctx2.bindTexture(ctx2.TEXTURE_2D, null)
		if (isWebGL2RenderingContext(ctx2)) {
			ctx2.bindTexture(ctx2.TEXTURE_2D_ARRAY, null)
			ctx2.bindTexture(ctx2.TEXTURE_3D, null)
			ctx2.bindSampler(ii, null)
		}
	}

	ctx2.activeTexture(ctx2.TEXTURE0)
	ctx2.useProgram(null)
	ctx2.bindBuffer(ctx2.ARRAY_BUFFER, null)
	ctx2.bindBuffer(ctx2.ELEMENT_ARRAY_BUFFER, null)
	ctx2.bindFramebuffer(ctx2.FRAMEBUFFER, null)
	ctx2.bindRenderbuffer(ctx2.RENDERBUFFER, null)
	ctx2.disable(ctx2.BLEND)
	ctx2.disable(ctx2.CULL_FACE)
	ctx2.disable(ctx2.DEPTH_TEST)
	ctx2.disable(ctx2.DITHER)
	ctx2.disable(ctx2.SCISSOR_TEST)
	ctx2.blendColor(0, 0, 0, 0)
	ctx2.blendEquation(ctx2.FUNC_ADD)
	ctx2.blendFunc(ctx2.ONE, ctx2.ZERO)
	ctx2.clearColor(0, 0, 0, 0)
	ctx2.clearDepth(1)
	ctx2.clearStencil(-1)
	ctx2.colorMask(true, true, true, true)
	ctx2.cullFace(ctx2.BACK)
	ctx2.depthFunc(ctx2.LESS)
	ctx2.depthMask(true)
	ctx2.depthRange(0, 1)
	ctx2.frontFace(ctx2.CCW)
	ctx2.hint(ctx2.GENERATE_MIPMAP_HINT, ctx2.DONT_CARE)
	ctx2.lineWidth(1)
	ctx2.pixelStorei(ctx2.PACK_ALIGNMENT, 4)
	ctx2.pixelStorei(ctx2.UNPACK_ALIGNMENT, 4)
	ctx2.pixelStorei(ctx2.UNPACK_FLIP_Y_WEBGL, false)
	ctx2.pixelStorei(ctx2.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
	ctx2.pixelStorei(ctx2.UNPACK_COLORSPACE_CONVERSION_WEBGL, ctx2.BROWSER_DEFAULT_WEBGL)
	ctx2.polygonOffset(0, 0)
	ctx2.sampleCoverage(1, false)
	ctx2.scissor(0, 0, ctx2.canvas.width, ctx2.canvas.height)
	ctx2.stencilFunc(ctx2.ALWAYS, 0, 0xFFFFFFFF)
	ctx2.stencilMask(0xFFFFFFFF)
	ctx2.stencilOp(ctx2.KEEP, ctx2.KEEP, ctx2.KEEP)
	ctx2.viewport(0, 0, ctx2.canvas.width, ctx2.canvas.height)
	ctx2.clear(ctx2.COLOR_BUFFER_BIT | ctx2.DEPTH_BUFFER_BIT | ctx2.STENCIL_BUFFER_BIT)

	if (isWebGL2RenderingContext(ctx2)) {
		ctx2.drawBuffers([ctx2.BACK])
		ctx2.readBuffer(ctx2.BACK)
		ctx2.bindBuffer(ctx2.COPY_READ_BUFFER, null)
		ctx2.bindBuffer(ctx2.COPY_WRITE_BUFFER, null)
		ctx2.bindBuffer(ctx2.PIXEL_PACK_BUFFER, null)
		ctx2.bindBuffer(ctx2.PIXEL_UNPACK_BUFFER, null)
		const numTransformFeedbacks = ctx2.getParameter(ctx2.MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS)
		for (let ii = 0; ii < numTransformFeedbacks; ++ii) {
			ctx2.bindBufferBase(ctx2.TRANSFORM_FEEDBACK_BUFFER, ii, null)
		}
		const numUBOs = ctx2.getParameter(ctx2.MAX_UNIFORM_BUFFER_BINDINGS)
		for (let ii = 0; ii < numUBOs; ++ii) {
			ctx2.bindBufferBase(ctx2.UNIFORM_BUFFER, ii, null)
		}
		ctx2.disable(ctx2.RASTERIZER_DISCARD)
		ctx2.pixelStorei(ctx2.UNPACK_IMAGE_HEIGHT, 0)
		ctx2.pixelStorei(ctx2.UNPACK_SKIP_IMAGES, 0)
		ctx2.pixelStorei(ctx2.UNPACK_ROW_LENGTH, 0)
		ctx2.pixelStorei(ctx2.UNPACK_SKIP_ROWS, 0)
		ctx2.pixelStorei(ctx2.UNPACK_SKIP_PIXELS, 0)
		ctx2.pixelStorei(ctx2.PACK_ROW_LENGTH, 0)
		ctx2.pixelStorei(ctx2.PACK_SKIP_ROWS, 0)
		ctx2.pixelStorei(ctx2.PACK_SKIP_PIXELS, 0)
		ctx2.hint(ctx2.FRAGMENT_SHADER_DERIVATIVE_HINT, ctx2.DONT_CARE)
	}

	// TODO: This should NOT be needed but Firefox fails with 'hint'
	while (ctx2.getError()) {}
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
export function makeLostContextSimulatingCanvas(canvas: HTMLCanvasElement) {
	const canvas2 = canvas as any
	let unwrappedContext_: any
	const onLost_: WebGLContextEventListener[] = []
	const onRestored_: WebGLContextEventListener[] = []
	let wrappedContext_: any = {}
	let contextId_ = 1
	let contextLost_ = false
	// const resourceId_ = 0
	const resourceDb_: WebGLObject[] = []
	let numCallsToLoseContext_ = 0
	let numCalls_ = 0
	let canRestore_ = false
	let restoreTimeout_ = 0

	// Holds booleans for each GL error so can simulate errors.
	const glErrorShadow_: { [e: number]: boolean } = {}

	canvas2.getContext = function (f) {
		return function () {
			const ctx = f.apply(canvas2, arguments)
			// Did we get a context and is it a WebGL context?
				// @ts-ignore
			if ((ctx instanceof WebGLRenderingContext) || (window.WebGL2RenderingContext && (ctx instanceof WebGL2RenderingContext))) {
				if (ctx != unwrappedContext_) {
					if (unwrappedContext_) {
						throw new Error('got different context')
					}
					unwrappedContext_ = ctx
					wrappedContext_ = makeLostContextSimulatingContext(unwrappedContext_)
				}
				return wrappedContext_
			}
			return ctx
		}
	}(canvas2.getContext)

	function wrapEvent(listener: WebGLContextEventListener | { handleEvent: WebGLContextEventListener }) {
		if (typeof (listener) == 'function') {
			return listener
		} else {
			return function (e: CustomWebGLContextEvent) {
				listener.handleEvent(e)
			}
		}
	}

	function addOnContextLostListener(listener: WebGLContextEventListener | { handleEvent: WebGLContextEventListener }) {
		onLost_.push(wrapEvent(listener))
	}

	function addOnContextRestoredListener(listener: WebGLContextEventListener | { handleEvent: WebGLContextEventListener }) {
		onRestored_.push(wrapEvent(listener))
	}


	function wrapAddEventListener(canvas: HTMLCanvasElement) {
		const f = canvas.addEventListener
		canvas.addEventListener = function (type: string, listener: any) {
			switch (type) {
				case 'webglcontextlost':
					addOnContextLostListener(listener)
					break
				case 'webglcontextrestored':
					addOnContextRestoredListener(listener)
					break
				default:
					f.apply(canvas, arguments)
			}
		}
	}

	wrapAddEventListener(canvas2)

	canvas2.loseContext = function () {
		if (!contextLost_) {
			contextLost_ = true
			numCallsToLoseContext_ = 0
			++contextId_
			while (unwrappedContext_.getError())
				clearErrors()
			glErrorShadow_[unwrappedContext_.CONTEXT_LOST_WEBGL] = true
			const event = makeWebGLContextEvent('context lost')
			const callbacks = onLost_.slice()
			setTimeout(function () {
				//log('numCallbacks:' + callbacks.length)
				for (let ii = 0; ii < callbacks.length; ++ii) {
					//log('calling callback:' + ii)
					callbacks[ii](event)
				}
				if (restoreTimeout_ >= 0) {
					setTimeout(function () {
						canvas2.restoreContext()
					}, restoreTimeout_)
				}
			}, 0)
		}
	}

	canvas2.restoreContext = function () {
		if (contextLost_) {
			if (onRestored_.length) {
				setTimeout(function () {
					if (!canRestore_) {
						throw new Error('can not restore. webglcontestlost listener did not call event.preventDefault')
					}
					freeResources()
					resetToInitialState(unwrappedContext_)
					contextLost_ = false
					numCalls_ = 0
					canRestore_ = false
					const callbacks = onRestored_.slice()
					const event = makeWebGLContextEvent('context restored')
					for (let ii = 0; ii < callbacks.length; ++ii) {
						callbacks[ii](event)
					}
				}, 0)
			}
		}
	}

	canvas2.loseContextInNCalls = function (numCalls: number) {
		if (contextLost_) {
			throw new Error('You can not ask a lost context to be lost')
		}
		numCallsToLoseContext_ = numCalls_ + numCalls
	}

	canvas2.getNumCalls = function () {
		return numCalls_
	}

	canvas2.setRestoreTimeout = function (timeout: number) {
		restoreTimeout_ = timeout
	}

	function isWebGLObject(obj: any): obj is WebGLObject {
		//return false
		return (obj instanceof WebGLBuffer ||
			obj instanceof WebGLFramebuffer ||
			obj instanceof WebGLProgram ||
			obj instanceof WebGLRenderbuffer ||
			obj instanceof WebGLShader ||
			obj instanceof WebGLTexture)
	}

	function checkResources(args: any[]) {
		for (let i = 0; i < args.length; ++i) {
			const arg = args[i]
			if (isWebGLObject(arg)) {
				return (arg as any).__webglDebugContextLostId__ == contextId_
			}
		}
		return true
	}

	function clearErrors() {
		const k = Object.keys(glErrorShadow_) as any as number[]
		for (let i = 0; i < k.length; ++i) {
			delete glErrorShadow_[k[i]]
		}
	}

	function loseContextIfTime() {
		++numCalls_
		if (!contextLost_) {
			if (numCallsToLoseContext_ == numCalls_) {
				canvas2.loseContext()
			}
		}
	}

	// Makes a function that simulates WebGL when out of context.
	function makeLostContextFunctionWrapper(ctx: WebGLRenderingContext, functionName: string) {
		const f = (ctx as any)[functionName]
		return function () {
			// log('calling:' + functionName)
			// Only call the functions if the context is not lost.
			loseContextIfTime()
			if (!contextLost_) {
				//if (!checkResources(arguments)) {
				//  glErrorShadow_[wrappedContext_.INVALID_OPERATION] = true
				//  return
				//}
				const result = f.apply(ctx, arguments)
				return result
			}
		}
	}

	function freeResources() {
		for (let ii = 0; ii < resourceDb_.length; ++ii) {
			const resource = resourceDb_[ii]
			if (resource instanceof WebGLBuffer) {
				unwrappedContext_.deleteBuffer(resource)
			} else if (resource instanceof WebGLFramebuffer) {
				unwrappedContext_.deleteFramebuffer(resource)
			} else if (resource instanceof WebGLProgram) {
				unwrappedContext_.deleteProgram(resource)
			} else if (resource instanceof WebGLRenderbuffer) {
				unwrappedContext_.deleteRenderbuffer(resource)
			} else if (resource instanceof WebGLShader) {
				unwrappedContext_.deleteShader(resource)
			} else if (resource instanceof WebGLTexture) {
				unwrappedContext_.deleteTexture(resource)
			}
			else if (isWebGL2RenderingContext) {
				// @ts-ignore
				if (resource instanceof WebGLQuery) {
					unwrappedContext_.deleteQuery(resource)
					// @ts-ignore
				} else if (resource instanceof WebGLSampler) {
					unwrappedContext_.deleteSampler(resource)
					// @ts-ignore
				} else if (resource instanceof WebGLSync) {
					unwrappedContext_.deleteSync(resource)
					// @ts-ignore
				} else if (resource instanceof WebGLTransformFeedback) {
					unwrappedContext_.deleteTransformFeedback(resource)
					// @ts-ignore
				} else if (resource instanceof WebGLVertexArrayObject) {
					unwrappedContext_.deleteVertexArray(resource)
				}
			}
		}
	}
	interface CustomWebGLContextEvent {statusMessage: string, preventDefault: () => void}
	type WebGLContextEventListener = (e: CustomWebGLContextEvent) => void
	function makeWebGLContextEvent(statusMessage: string): CustomWebGLContextEvent {
		return {
			statusMessage: statusMessage,
			preventDefault: function () {
				canRestore_ = true
			}
		}
	}

	return canvas2

	function makeLostContextSimulatingContext(ctx: WebGLRenderingContext) {
		// copy all functions and properties to wrapper
		for (const propertyName in ctx) {
			if (typeof (ctx as any)[propertyName] == 'function') {
				wrappedContext_[propertyName] = makeLostContextFunctionWrapper(
					ctx, propertyName)
			} else {
				makePropertyWrapper(wrappedContext_, ctx, propertyName)
			}
		}

		// Wrap a few functions specially.
		wrappedContext_.getError = function () {
			loseContextIfTime()
			if (!contextLost_) {
				let err
				while (err = unwrappedContext_.getError()) {
					glErrorShadow_[err] = true
				}
			}
			for (const err in glErrorShadow_) {
				if (glErrorShadow_[err]) {
					delete glErrorShadow_[err]
					return err
				}
			}
			return wrappedContext_.NO_ERROR
		}

		const creationFunctions = [
			'createBuffer',
			'createFramebuffer',
			'createProgram',
			'createRenderbuffer',
			'createShader',
			'createTexture'
		]
		if (isWebGL2RenderingContext) {
			creationFunctions.push(
				'createQuery',
				'createSampler',
				'fenceSync',
				'createTransformFeedback',
				'createVertexArray'
			)
		}
		for (let i = 0; i < creationFunctions.length; ++i) {
			const functionName = creationFunctions[i]
			wrappedContext_[functionName] = function (f) {
				return function () {
					loseContextIfTime()
					if (contextLost_) {
						return null
					}
					const obj = f.apply(ctx, arguments)
					obj.__webglDebugContextLostId__ = contextId_
					resourceDb_.push(obj)
					return obj
				}
			}((ctx as any)[functionName])
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
			'getVertexAttrib'
		]
		if (isWebGL2RenderingContext) {
			functionsThatShouldReturnNull.push(
				'getInternalformatParameter',
				'getQuery',
				'getQueryParameter',
				'getSamplerParameter',
				'getSyncParameter',
				'getTransformFeedbackVarying',
				'getIndexedParameter',
				'getUniformIndices',
				'getActiveUniforms',
				'getActiveUniformBlockParameter',
				'getActiveUniformBlockName'
			)
		}
		for (let ii = 0; ii < functionsThatShouldReturnNull.length; ++ii) {
			const functionName = functionsThatShouldReturnNull[ii]
			wrappedContext_[functionName] = function (f) {
				return function () {
					loseContextIfTime()
					if (contextLost_) {
						return null
					}
					return f.apply(ctx, arguments)
				}
			}(wrappedContext_[functionName])
		}

		const isFunctions = [
			'isBuffer',
			'isEnabled',
			'isFramebuffer',
			'isProgram',
			'isRenderbuffer',
			'isShader',
			'isTexture'
		]
		if (isWebGL2RenderingContext) {
			isFunctions.push(
				'isQuery',
				'isSampler',
				'isSync',
				'isTransformFeedback',
				'isVertexArray'
			)
		}
		for (let ii = 0; ii < isFunctions.length; ++ii) {
			const functionName = isFunctions[ii]
			wrappedContext_[functionName] = function (f) {
				return function () {
					loseContextIfTime()
					if (contextLost_) {
						return false
					}
					return f.apply(ctx, arguments)
				}
			}(wrappedContext_[functionName])
		}

		wrappedContext_.checkFramebufferStatus = function (f) {
			return function () {
				loseContextIfTime()
				if (contextLost_) {
					return wrappedContext_.FRAMEBUFFER_UNSUPPORTED
				}
				return f.apply(ctx, arguments)
			}
		}(wrappedContext_.checkFramebufferStatus)

		wrappedContext_.getAttribLocation = function (f) {
			return function () {
				loseContextIfTime()
				if (contextLost_) {
					return -1
				}
				return f.apply(ctx, arguments)
			}
		}(wrappedContext_.getAttribLocation)

		wrappedContext_.getVertexAttribOffset = function (f) {
			return function () {
				loseContextIfTime()
				if (contextLost_) {
					return 0
				}
				return f.apply(ctx, arguments)
			}
		}(wrappedContext_.getVertexAttribOffset)

		wrappedContext_.isContextLost = function () {
			return contextLost_
		}

		if (isWebGL2RenderingContext) {
			wrappedContext_.getFragDataLocation = function (f) {
				return function () {
					loseContextIfTime()
					if (contextLost_) {
						return -1
					}
					return f.apply(ctx, arguments)
				}
			}(wrappedContext_.getFragDataLocation)

			wrappedContext_.clientWaitSync = function (f) {
				return function () {
					loseContextIfTime()
					if (contextLost_) {
						return wrappedContext_.WAIT_FAILED
					}
					return f.apply(ctx, arguments)
				}
			}(wrappedContext_.clientWaitSync)

			wrappedContext_.getUniformBlockIndex = function (f) {
				return function () {
					loseContextIfTime()
					if (contextLost_) {
						return wrappedContext_.INVALID_INDEX
					}
					return f.apply(ctx, arguments)
				}
			}(wrappedContext_.getUniformBlockIndex)
		}

		return wrappedContext_
	}
}

