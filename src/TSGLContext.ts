import chroma from 'chroma-js'
import { addOwnProperties, assert, DEG, int, M4, P3ZX, V, V3 } from 'ts3dutils'
import { glEnumToString } from './KhronosGroupWebGLDebug'

// @ts-ignore
import posCoordVS from '../src/shaders/posCoordVS.glslx'
// @ts-ignore
import sdfRenderFS from '../src/shaders/sdfRenderFS.glslx'
import { makeDebugContext, Mesh, Shader, Texture } from './index'

import GL = WebGLRenderingContextStrict
export type GL_COLOR = [number, number, number, number]
/**
 * There's only one constant, use it for default values. Use chroma-js or similar for actual colors.
 */
export const GL_COLOR_BLACK: GL_COLOR = [0, 0, 0, 1]

export function currentGL(): TSGLContext {
	return TSGLContextBase.gl
}

export function isNumber(obj: any) {
	const str = Object.prototype.toString.call(obj)
	return str == '[object Number]' || str == '[object Boolean]'
}

export type UniformType = V3 | M4 | number[] | boolean | number
export type TSGLContext = TSGLContextBase & (WebGLRenderingContextStrict | WebGL2RenderingContext)
export interface TSGLContextBase extends WebGLRenderingContextStrict {}
export class TSGLContextBase {
	modelViewMatrix: M4 = M4.identity()
	projectionMatrix: M4 = M4.identity()
	static readonly MODELVIEW: { __MATRIX_MODE_CONSTANT: any } = 0 as any
	static readonly PROJECTION: { __MATRIX_MODE_CONSTANT: any } = 1 as any
	MODELVIEW: typeof TSGLContextBase.MODELVIEW
	PROJECTION: typeof TSGLContextBase.PROJECTION

	readonly version: 1 | 2

	static HALF_FLOAT_OES: int = 0x8d61
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
	textCtx!: CanvasRenderingContext2D
	TEXT_TEXTURE_HEIGHT: string
	TEXT_TEXTURE_FONT: string
	textMetrics: FontJsonMetrics
	textAtlas: Texture
	textRenderShader: Shader<any, any>

	protected constructor(
		gl: TSGLContextBase,
		private immediate = {
			mesh: new Mesh().addVertexBuffer('coords', 'ts_TexCoord').addVertexBuffer('colors', 'ts_Color'),
			mode: -1 as GL.DrawMode | -1,
			coord: [0, 0] as [number, number],
			color: [1, 1, 1, 1] as GL_COLOR,
			pointSize: 1,
			shader: Shader.create(
				`
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
		`,
				`
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
        `,
				gl,
			),
		},
	) {
		this.matrixMode(TSGLContextBase.MODELVIEW)
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

	mirror(plane: { normal1: V3; w: number }) {
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
		this.multMatrix(M4.rotate(angleDegrees * DEG, { x, y, z }, this.tempMatrix))
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
		// prettier-ignore
		const viewportToScreenMatrix = new M4([
			w / 2, 0, 0, x + w / 2,
			h / 2, 0, 0, y + h / 2,
			0, 0, 1, 0,
			0, 0, 0, 1,
		])
		return M4.product(viewportToScreenMatrix, this.projectionMatrix, this.modelViewMatrix)
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
		this.immediate.shader.uniforms({ pointSize: pointSize })
	}

	begin(mode: GL.DrawMode) {
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
			1 == args.length && Array.isArray(args[0])
				? args[0]
				: 1 == args.length && 'number' == typeof args[0]
					? hexIntToGLColor(args[0])
					: 1 == args.length && 'string' == typeof args[0]
						? chroma(args[0]).gl()
						: [args[0], args[1], args[2], args[3] || 1]
	}

	texCoord(s: number, t: number): void
	texCoord(coords: [number, number]): void
	texCoord(coords: { x: number; y: number }): void
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
		this.immediate.shader
			.uniforms({
				useTexture: !!TSGLContextBase.gl.getParameter(this.TEXTURE_BINDING_2D),
			})
			.drawBuffers(this.immediate.mesh.vertexBuffers, undefined, this.immediate.mode)
		this.immediate.mode = -1
	}

	////////// MISCELLANEOUS METHODS
	static gl: TSGLContextBase

	makeCurrent() {
		TSGLContextBase.gl = this
	}

	/**
	 * Starts an animation loop.
	 */
	animate(callback: (this: TSGLContextBase, domHighResTimeStamp: number, timeSinceLast: number) => void): () => void {
		const requestAnimationFrame: typeof window.requestAnimationFrame =
			window.requestAnimationFrame ||
			(window as any).mozRequestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			function(callback: FrameRequestCallback) {
				setTimeout(() => callback(performance.now()), 1000 / 60)
			}
		let time = performance.now(),
			keepUpdating = true
		const update = (now: number) => {
			if (keepUpdating) {
				callback.call(this, now, now - time)
				time = now
				requestAnimationFrame(update)
			}
		}
		requestAnimationFrame(update)
		return () => {
			keepUpdating = false
		}
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
	fullscreen(
		options: {
			paddingTop?: number
			paddingLeft?: number
			paddingRight?: number
			paddingBottom?: number
			camera?: boolean
			fov?: number
			near?: number
			far?: number
		} = {},
	) {
		const top = options.paddingTop || 0
		const left = options.paddingLeft || 0
		const right = options.paddingRight || 0
		const bottom = options.paddingBottom || 0
		if (!document.body) {
			throw new Error(
				"document.body doesn't exist yet (call viewerGL.fullscreen() from " +
					'window.onload() or from inside the <body> tag)',
			)
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
				gl.matrixMode(TSGLContextBase.PROJECTION)
				gl.loadIdentity()
				gl.perspective(
					options.fov || 45,
					gl.canvas.width / gl.canvas.height,
					options.near || 0.1,
					options.far || 1000,
				)
				gl.matrixMode(TSGLContextBase.MODELVIEW)
			}
		}

		window.addEventListener('resize', windowOnResize)
		windowOnResize()
		return this
	}
	getMouseLine(e: MouseEvent): { anchor: V3; dir: V3 }
	getMouseLine(canvasPosX: number, canvasPosY: number): { anchor: V3; dir: V3 }
	getMouseLine(canvasPosXOrE: number | MouseEvent, canvasPosY?: number): { anchor: V3; dir: V3 } {
		if (canvasPosXOrE instanceof MouseEvent) {
			return this.getMouseLine(canvasPosXOrE.offsetX, canvasPosXOrE.offsetY)
		}
		const ndc1 = V(
			(canvasPosXOrE * 2) / this.canvas.offsetWidth - 1,
			(-canvasPosY! * 2) / this.canvas.offsetHeight + 1,
			0,
		)
		const ndc2 = V(
			(canvasPosXOrE * 2) / this.canvas.offsetWidth - 1,
			(-canvasPosY! * 2) / this.canvas.offsetHeight + 1,
			1,
		)
		const inverseProjectionMatrix = this.projectionMatrix.inversed()
		const anchor = inverseProjectionMatrix.transformPoint(ndc1)
		const dir = inverseProjectionMatrix.transformPoint(ndc2).minus(anchor)
		return { anchor, dir }
	}

	viewportFill() {
		this.viewport(0, 0, this.canvas.width, this.canvas.height)
	}

	async setupTextRendering(pngURL: string, jsonURL: string) {
		this.textRenderShader = Shader.create(posCoordVS, sdfRenderFS)
		;[this.textAtlas, this.textMetrics] = await Promise.all([
			Texture.fromURL(pngURL, {
				format: this.LUMINANCE,
				internalFormat: this.LUMINANCE,
				type: this.UNSIGNED_BYTE,
			}),
			fetch(jsonURL).then(r => r.json()),
		])
		// const cs = this.textMetrics.chars
		// const maxY = Object.keys(cs).reduce((a, b) => Math.max(a, cs[b][3]), 0)
		// const minY = Object.keys(cs).reduce((a, b) => Math.min(a, cs[b][3] - cs[b][1]), 0)
		// console.log(maxY, minY)
	}

	cachedSDFMeshes: {
		[str: string]: Mesh & { TRIANGLES: int[]; coords: number[]; width: number; lineCount: int }
	} = {}

	getSDFMeshForString(str: string) {
		assert(this.textMetrics)
		return (
			this.cachedSDFMeshes[str] ||
			(this.cachedSDFMeshes[str] = createTextMesh(this.textMetrics, this.textAtlas, str))
		)
	}

	renderText(
		string: string,
		color: GL_COLOR,
		size = 1,
		xAlign: 'left' | 'center' | 'right' = 'left',
		baseline: 'top' | 'middle' | 'alphabetic' | 'bottom' = 'bottom',
		gamma = 0.05,
		lineHeight = 1.2,
	) {
		const strMesh = this.getSDFMeshForString(string)
		this.pushMatrix()
		this.scale(size)
		const xTranslate = { left: 0, center: -0.5, right: -1 }
		const yTranslate = {
			top: -this.textMetrics.ascender / this.textMetrics.size,
			middle: (-this.textMetrics.ascender - this.textMetrics.descender) / 2 / this.textMetrics.size,
			alphabetic: 0,
			bottom: -this.textMetrics.descender / this.textMetrics.size,
		}
		// console.log('yTranslate[baseline]', yTranslate[baseline])
		this.translate(xTranslate[xAlign] * strMesh.width, yTranslate[baseline], 0)
		this.multMatrix(M4.forSys(V3.X, V3.Y, new V3(0, -lineHeight, 0)))
		this.textAtlas.bind(0)
		this.textRenderShader
			.uniforms({ texture: 0, u_color: color, u_debug: 0, u_gamma: gamma, u_buffer: 192 / 256 })
			.draw(strMesh)
		this.popMatrix()

		// gl.uniform1f(shader.u_debug, debug ? 1 : 0)

		// gl.uniform4fv(shader.u_color, [1, 1, 1, 1])
		// gl.uniform1f(shader.u_buffer, buffer)
		// gl.drawArrays(gl.TRIANGLES, 0, vertexBuffer.numItems)

		// gl.uniform4fv(shader.u_color, [0, 0, 0, 1])
		// gl.uniform1f(shader.u_buffer, 192 / 256)
		// gl.uniform1f(shader.u_gamma, (gamma * 1.4142) / scale)
		// gl.drawArrays(gl.TRIANGLES, 0, vertexBuffer.numItems)
	}

	static create(
		options: Partial<GL.WebGLContextAttributes & { canvas: HTMLCanvasElement; throwOnError: boolean }> = {},
	): TSGLContext {
		const canvas = options.canvas || document.createElement('canvas')
		if (!options.canvas) {
			canvas.width = 800
			canvas.height = 600
		}
		if (!('alpha' in options)) options.alpha = false
		let newGL: any = undefined
		try {
			newGL = canvas.getContext('webgl2', options)
			newGL && (newGL.version = 2)
			if (!newGL) {
				newGL = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options)
				newGL && (newGL.version = 1)
			}
			console.log('getting context')
		} catch (e) {
			console.log(e, 'Failed to get context')
		}
		if (!newGL) throw new Error('WebGL not supported')
		if (options.throwOnError) {
			newGL = makeDebugContext(newGL, (err, funcName) => {
				throw new Error(glEnumToString(err) + ' was caused by ' + funcName)
			})
		}

		TSGLContextBase.gl = newGL
		addOwnProperties(newGL, TSGLContextBase.prototype)
		addOwnProperties(newGL, new TSGLContextBase(newGL))
		//addEventListeners(newGL)
		return newGL
	}

	fixCanvasRes() {
		this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio
		this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio
		this.viewport(0, 0, this.canvas.width, this.canvas.height)
	}
}
export namespace TSGLContext {
	/**
	 * `create()` creates a new WebGL context and augments it with more methods. The alpha channel is disabled
	 * by default because it usually causes unintended transparencies in the canvas.
	 */
	export const create = TSGLContextBase.create
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

TSGLContextBase.prototype.MODELVIEW = TSGLContextBase.MODELVIEW
TSGLContextBase.prototype.PROJECTION = TSGLContextBase.PROJECTION
TSGLContextBase.prototype.HALF_FLOAT_OES = TSGLContextBase.HALF_FLOAT_OES

/**
 *
 * Push two triangles:
 * ```
 c - d
 | \ |
 a - b
 ```
 */
export function pushQuad(triangles: int[], flipped: boolean, a: int, b: int, c: int, d: int) {
	// prettier-ignore
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

interface FontJsonMetrics {
	family: string
	style: string

	// buffer refers to the width of the margin around glyph bounding boxes with distance values
	buffer: int
	size: number

	// [width, height, horiBearingX, horiBearingY, horiAdvance, posX, posY]
	// see https://www.freetype.org/freetype2/docs/tutorial/step2.html
	chars: { [char: string]: [number, number, number, number, number, number, number] }

	descender: number
	ascender: number
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

function createTextMesh(fontMetrics: FontJsonMetrics, fontTextureAtlas: Texture, str: string, lineHeight = 1) {
	const mesh = new Mesh().addIndexBuffer('TRIANGLES').addVertexBuffer('coords', 'ts_TexCoord')

	let cursorX = 0
	let cursorY = 0

	function drawGlyph(chr: string) {
		const metric = fontMetrics.chars[chr]
		if (!metric) return

		const [width, height, horiBearingX, horiBearingY, horiAdvance, posX, posY] = metric
		const { size, buffer } = fontMetrics
		const quadStartIndex = mesh.vertices.length

		// buffer = margin on texture
		if (width > 0 && height > 0) {
			// Add a quad (= two triangles) per glyph.
			const left = (cursorX + horiBearingX - buffer) / size
			const right = (cursorX + horiBearingX + width + buffer) / size
			const bottom = (horiBearingY - height - buffer) / size
			const top = (horiBearingY + buffer) / size
			mesh.vertices.push(
				new V3(left, bottom, cursorY / size),
				new V3(right, bottom, cursorY / size),
				new V3(left, top, cursorY / size),
				new V3(right, top, cursorY / size),
			)

			const coordsLeft = posX / fontTextureAtlas.width
			const coordsRight = (posX + width + 2 * buffer) / fontTextureAtlas.width
			const coordsBottom = (posY + height + 2 * buffer) / fontTextureAtlas.height
			const coordsTop = posY / fontTextureAtlas.height
			mesh.coords.push(
				[coordsLeft, coordsBottom],
				[coordsRight, coordsBottom],
				[coordsLeft, coordsTop],
				[coordsRight, coordsTop],
			)
			// mesh.coords.push([0, 0], [0, 1], [1, 0], [1, 1])

			pushQuad(mesh.TRIANGLES, false, quadStartIndex, quadStartIndex + 1, quadStartIndex + 2, quadStartIndex + 3)
		}

		// pen.x += Math.ceil(horiAdvance * scale);
		cursorX += horiAdvance
	}

	for (let i = 0; i < str.length; i++) {
		const chr = str[i]
		if ('\n' == chr) {
			cursorX = 0
			cursorY += lineHeight * fontMetrics.size
		} else {
			drawGlyph(chr)
		}
	}

	return Object.assign(mesh.compile(), { width: cursorX / fontMetrics.size, lineCount: cursorY + 1 })
}
