import chroma from 'chroma-js'
import {addOwnProperties, assert, DEG, int, M4, P3ZX, V, V3,} from 'ts3dutils'

import {Mesh} from './Mesh'
import {DRAW_MODES, Shader} from './Shader'

export type GL_COLOR = [number, number, number, number]
/**
 * There's only one constant, use it for default values. Use chroma-js or similar for actual colors.
 */
export const GL_COLOR_BLACK: GL_COLOR = [0, 0, 0, 1]

export function currentGL(): LightGLContext {
	return LightGLContext.gl
}

const WGL = WebGLRenderingContext

export function isNumber(obj: any) {
	const str = Object.prototype.toString.call(obj)
	return str == '[object Number]' || str == '[object Boolean]'
}

export type UniformType = V3 | M4 | number[] | boolean | number

export interface LightGLContext extends WebGLRenderingContext {}
export class LightGLContext {
	modelViewMatrix: M4 = M4.identity()
	projectionMatrix: M4 = M4.identity()
	static readonly MODELVIEW: { __MATRIX_MODE_CONSTANT: any } = 0 as any
	static readonly PROJECTION: { __MATRIX_MODE_CONSTANT: any } = 1 as any
	MODELVIEW: typeof LightGLContext.MODELVIEW
	PROJECTION: typeof LightGLContext.PROJECTION

	readonly version: 1 | 2

	static HALF_FLOAT_OES: int = 0x8D61
	HALF_FLOAT_OES: int

	private tempMatrix = new M4()
	private resultMatrix = new M4()
	private modelViewStack: M4[] = []
	private projectionStack: M4[] = []
	private currentMatrixName: 'modelViewMatrix' | 'projectionMatrix'
	private stack: M4[]

	meshes: { [name: string]: Mesh }
	shaders: { [name: string]: Shader }
	public drawCallCount: int = 0
	public projectionMatrixVersion: int = 0
	public modelViewMatrixVersion: int = 0

	protected constructor(gl: LightGLContext, private immediate = {
		mesh: new Mesh()
			.addVertexBuffer('coords', 'LGL_TexCoord')
			.addVertexBuffer('colors', 'LGL_Color'),
		mode: -1 as DRAW_MODES | -1,
		coord: [0, 0] as [number, number],
		color: [1, 1, 1, 1] as GL_COLOR,
		pointSize: 1,
		shader: Shader.create(`
			attribute vec4 LGL_Color;
			attribute vec4 LGL_Vertex;
			uniform mat4 LGL_ModelViewProjectionMatrix;
			attribute vec2 LGL_TexCoord;
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
		this.matrixMode(LightGLContext.MODELVIEW)
	}

	/// Implement the OpenGL modelview and projection matrix stacks, along with some other useful GLU matrix functions.
	matrixMode(mode: { __MATRIX_MODE_CONSTANT: any }): void {
		switch (mode) {
			case this.MODELVIEW:
				this.currentMatrixName = 'modelViewMatrix'
				this.stack = this.modelViewStack
				break
			case this.PROJECTION:
				this.currentMatrixName = 'projectionMatrix'
				this.stack = this.projectionStack
				break
			default:
				throw new Error('invalid matrix mode ' + mode)
		}
	}

	loadIdentity(): void {
		M4.identity(this[this.currentMatrixName])
		this.currentMatrixName == 'projectionMatrix' ? this.projectionMatrixVersion++ : this.modelViewMatrixVersion++
	}

	loadMatrix(m4: M4) {
		M4.copy(m4, this[this.currentMatrixName])
		this.currentMatrixName == 'projectionMatrix' ? this.projectionMatrixVersion++ : this.modelViewMatrixVersion++
	}

	multMatrix(m4: M4) {
		M4.multiply(this[this.currentMatrixName], m4, this.resultMatrix)
		const temp = this.resultMatrix
		this.resultMatrix = this[this.currentMatrixName]
		this[this.currentMatrixName] = temp
		this.currentMatrixName == 'projectionMatrix' ? this.projectionMatrixVersion++ : this.modelViewMatrixVersion++
	}

	mirror(plane: { normal1: V3, w: number }) {
		this.multMatrix(M4.mirror(plane))
	}

	perspective(fovDegrees: number, aspect: number, near: number, far: number) {
		this.multMatrix(M4.perspectiveRad(fovDegrees * DEG, aspect, near, far, this.tempMatrix))
	}

	frustum(left: number, right: number, bottom: number, top: number, near: number, far: number) {
		this.multMatrix(M4.frustum(left, right, bottom, top, near, far, this.tempMatrix))
	}

	ortho(left: number, right: number, bottom: number, top: number, near: number, far: number) {
		this.multMatrix(M4.ortho(left, right, bottom, top, near, far, this.tempMatrix))
	}

	scale(x: number, y: number, z?: number): void
	scale(scale: number): void
	scale(v: V3): void
	scale(...args: any[]) {
		this.multMatrix((M4.scale as any)(...args, this.tempMatrix))
	}

	mirroredX() {
		this.multMatrix(M4.mirror(P3ZX))
	}

	translate(x: number, y?: number, z?: number): void
	translate(v: V3): void
	translate(x: any, y?: any, z?: any) {
		if (undefined !== y) {
			this.multMatrix(M4.translate(x, y, z, this.tempMatrix))
		} else {
			this.multMatrix(M4.translate(x, this.tempMatrix))
		}
	}

	rotate(angleDegrees: number, x: number, y: number, z: number) {
		this.multMatrix(M4.rotate(angleDegrees * DEG, {x, y, z}, this.tempMatrix))
	}

	lookAt(eye: V3, center: V3, up: V3) {
		this.multMatrix(M4.lookAt(eye, center, up, this.tempMatrix))
	}

	pushMatrix() {
		this.stack.push(M4.copy(this[this.currentMatrixName]))
	}

	popMatrix() {
		const pop = this.stack.pop()
		assert(undefined !== pop)
		this[this.currentMatrixName] = pop as M4
		this.currentMatrixName == 'projectionMatrix' ? this.projectionMatrixVersion++ : this.modelViewMatrixVersion++
	}

	/**
	 * World coordinates (WC) to screen/window coordinates matrix
	 */
	wcToWindowMatrix() {
		const viewport = this.getParameter(this.VIEWPORT)
		const [x, y, w, h] = viewport
		const viewportToScreenMatrix = new M4([
			w / 2, 0, 0, x + w / 2,
			h / 2, 0, 0, y + h / 2,
			0, 0, 1, 0,
			0, 0, 0, 1,
		])
		return M4.multiplyMultiple(viewportToScreenMatrix, this.projectionMatrix, this.modelViewMatrix)
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


	pointSize(pointSize: number): void {
		this.immediate.shader.uniforms({pointSize: pointSize})
	}

	begin(mode: DRAW_MODES | -1) {
		if (this.immediate.mode != -1) throw new Error('mismatched viewerGL.begin() and viewerGL.end() calls')
		this.immediate.mode = mode
		this.immediate.mesh.colors = []
		this.immediate.mesh.coords = []
		this.immediate.mesh.vertices = []
	}

	color(cssColor: string): void
	color(r: number, g: number, b: number, a?: number): void
	color(hexInt: int): void
	color(glColor: GL_COLOR): void
	color(...args: any[]) {
		this.immediate.color =
			(1 == args.length && Array.isArray(args[0]))
				? args[0]
				: (1 == args.length && 'number' == typeof args[0])
				? hexIntToGLColor(args[0])
				: (1 == args.length && 'string' == typeof args[0])
					? chroma(args[0]).gl()
					: [args[0], args[1], args[2], args[3] || 0]
	}

	texCoord(s: number, t: number): void
	texCoord(coords: [number, number]): void
	texCoord(coords: { x: number, y: number }): void
	texCoord(...args: any[]) {
		this.immediate.coord = V.apply(undefined, args).toArray(2)
	}

	vertex(v: V3): void
	vertex(x: number, y: number, z: number): void
	vertex(...args: any[]) {
		this.immediate.mesh.colors.push(this.immediate.color)
		this.immediate.mesh.coords.push(this.immediate.coord)
		this.immediate.mesh.vertices.push(V.apply(undefined, args))
	}

	end(): void {
		if (this.immediate.mode == -1) throw new Error('mismatched viewerGL.begin() and viewerGL.end() calls')
		this.immediate.mesh.compile()
		this.immediate.shader.uniforms({
			useTexture: !!LightGLContext.gl.getParameter(WGL.TEXTURE_BINDING_2D),
		}).drawBuffers(this.immediate.mesh.vertexBuffers, undefined, this.immediate.mode)
		this.immediate.mode = -1
	}


	////////// MISCELLANEOUS METHODS
	static gl: LightGLContext

	makeCurrent() {
		LightGLContext.gl = this
	}

	/**
	 * Starts an animation loop.
	 */
	animate(callback: (this: LightGLContext, domHighResTimeStamp: number, timeSinceLast: number) => void): () => void {
		const requestAnimationFrame: typeof window.requestAnimationFrame =
			window.requestAnimationFrame ||
			(window as any).mozRequestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			function (callback: FrameRequestCallback) {
				setTimeout(() => callback(performance.now()), 1000 / 60)
			}
		let time = performance.now(), keepUpdating = true
		const update = (now: number) => {
			if (keepUpdating) {
				callback.call(this, now, now - time)
				time = now
				requestAnimationFrame(update)
			}
		}
		requestAnimationFrame(update)
		return () => { keepUpdating = false }
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
	fullscreen(options: {
		paddingTop?: number,
		paddingLeft?: number,
		paddingRight?: number,
		paddingBottom?: number,
		camera?: boolean,
		fov?: number,
		near?: number,
		far?: number
	} = {}) {

		const top = options.paddingTop || 0
		const left = options.paddingLeft || 0
		const right = options.paddingRight || 0
		const bottom = options.paddingBottom || 0
		if (!document.body) {
			throw new Error('document.body doesn\'t exist yet (call viewerGL.fullscreen() from ' +
				'window.onload() or from inside the <body> tag)')
		}
		document.body.appendChild(this.canvas)
		document.body.style.overflow = 'hidden'
		this.canvas.style.position = 'absolute'
		this.canvas.style.left = left + 'px'
		this.canvas.style.top = top + 'px'
		this.canvas.style.width = window.innerWidth - left - right + 'px'
		this.canvas.style.bottom = window.innerHeight - top - bottom + 'px'

		const gl = this

		function windowOnResize() {
			gl.canvas.width = (window.innerWidth - left - right) * window.devicePixelRatio
			gl.canvas.height = (window.innerHeight - top - bottom) * window.devicePixelRatio
			gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
			if (options.camera) {
				gl.matrixMode(LightGLContext.PROJECTION)
				gl.loadIdentity()
				gl.perspective(options.fov || 45, gl.canvas.width / gl.canvas.height,
					options.near || 0.1, options.far || 1000)
				gl.matrixMode(LightGLContext.MODELVIEW)
			}
		}

		window.addEventListener('resize', windowOnResize)
		windowOnResize()
		return this
	}

	viewportFill() {
		this.viewport(0, 0, this.canvas.width, this.canvas.height)
	}

	handleError(): void {
		// const errorCode = this.getError()
		// if (0 !== errorCode) {
		//     throw new Error('' + errorCode + WGL_ERROR[errorCode])
		// }
	}


	/**
	 * `create()` creates a new WebGL context and augments it with more methods. The alpha channel is disabled
	 * by default because it usually causes unintended transparencies in the canvas.
	 */
	static create(options: { canvas?: HTMLCanvasElement, alpha?: boolean } = {}): LightGLContext {
		const canvas = options.canvas || document.createElement('canvas')
		if (!options.canvas) {
			canvas.width = 800
			canvas.height = 600
		}
		if (!('alpha' in options)) options.alpha = false
		let newGL: LightGLContext | undefined = undefined
		try {
			newGL = canvas.getContext('webgl2', options) as LightGLContext
			newGL && ((newGL as any).version = 2)
			if (!newGL) {
				newGL = (canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options)) as LightGLContext
				newGL && ((newGL as any).version = 1)
			}
			console.log('getting context')
		} catch (e) {
			console.log(e, 'Failed to get context')
		}
		if (!newGL) throw new Error('WebGL not supported')

		LightGLContext.gl = newGL
		addOwnProperties(newGL, LightGLContext.prototype)
		addOwnProperties(newGL, new LightGLContext(newGL))
		//addEventListeners(newGL)
		return newGL
	}
}

// enum WGL_ERROR {
// 	NO_ERROR = WGL.NO_ERROR,
// 	INVALID_ENUM = WGL.INVALID_ENUM,
// 	INVALID_VALUE = WGL.INVALID_VALUE,
// 	INVALID_OPERATION = WGL.INVALID_OPERATION,
// 	INVALID_FRAMEBUFFER_OPERATION = WGL.INVALID_FRAMEBUFFER_OPERATION,
// 	OUT_OF_MEMORY = WGL.OUT_OF_MEMORY,
// 	CONTEXT_LOST_WEBGL = WGL.CONTEXT_LOST_WEBGL,
// }

LightGLContext.prototype.MODELVIEW = LightGLContext.MODELVIEW
LightGLContext.prototype.PROJECTION = LightGLContext.PROJECTION
LightGLContext.prototype.HALF_FLOAT_OES = LightGLContext.HALF_FLOAT_OES


/**
 *
 * Push two triangles:
 * c - d
 * | \ |
 * a - b
 */
export function pushQuad(triangles: int[], flipped: boolean, a: int, b: int, c: int, d: int) {
	if (flipped) {
		triangles.push(
			a, c, b,
			b, c, d)
	} else {
		triangles.push(
			a, b, c,
			b, d, c)
	}
}

function hexIntToGLColor(color: int): GL_COLOR {
	return [(color >> 16) / 255.0, ((color >> 8) & 0xff) / 255.0, (color & 0xff) / 255.0, 1.0]
}
