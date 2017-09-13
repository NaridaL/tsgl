



function currentGL(): LightGLContext {
    return LightGLContext.gl
}
const WGL = WebGLRenderingContext
function isNumber(obj: any) {
	const str = Object.prototype.toString.call(obj)
	return str == '[object Number]' || str == '[object Boolean]'
}
type UniformType = V3 | M4 | number[] | boolean | number
class LightGLContext extends WebGLRenderingContext {
	modelViewMatrix: M4 = new M4()
	projectionMatrix: M4 = new M4()
	static readonly MODELVIEW = {}
	static readonly PROJECTION = {}
	MODELVIEW = {}
	PROJECTION = {}


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
    public drawCallCount: int
    public projectionMatrixVersion: int
	public modelViewMatrixVersion: int

	protected constructor() {
		super()
	}

	init() {
		this.modelViewMatrix = new M4()
		this.projectionMatrix = new M4()
        this.drawCallCount = 0
        this.projectionMatrixVersion = 0
        this.modelViewMatrixVersion = 0
		this.tempMatrix = new M4()
		this.resultMatrix = new M4()
		this.modelViewStack = []
		this.projectionStack = []
		/////////// IMMEDIATE MODE
		// ### Immediate mode
		//
		// Provide an implementation of OpenGL's deprecated immediate mode. This is
		// depricated for a reason: constantly re-specifying the geometry is a bad
		// idea for performance. You should use a `GL.Mesh` instead, which specifies
		// the geometry once and caches it on the graphics card. Still, nothing
		// beats a quick `viewerGL.begin(WGL.POINTS); viewerGL.vertex(1, 2, 3); viewerGL.end();` for
		// debugging. This intentionally doesn't implement fixed-function lighting
		// because it's only meant for quick debugging tasks.
		this.immediate = {
			mesh: new Mesh()
                .addVertexBuffer('coords', 'LGL_TexCoord')
                .addVertexBuffer('colors', 'LGL_Color'),
			mode: -1,
			coord: [0, 0, 0, 0],
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
}`, `
uniform sampler2D texture;
uniform float pointSize;
uniform bool useTexture;
varying vec4 color;
varying vec2 coord;
void main() {
	gl_FragColor = color;
	if (useTexture) gl_FragColor *= texture2D(texture, coord.xy);
}`) }
		this.matrixMode(LightGLContext.MODELVIEW)
	}

	/// Implement the OpenGL modelview and projection matrix stacks, along with some other useful GLU matrix functions.

	matrixMode(mode: any): void {
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

	modelViewMode() {
		Object.defineProperty(LightGLContext.gl, 'currentMatrix', {
			get: function () {
				return this.modelViewMatrix
			},
			set: function (val) {
				this.modelViewMatrix = val
			},
			writable: true
		})
		this.currentMatrixName = 'modelViewMatrix'
		this.stack = this.modelViewStack
	}

	projectionMode(): void {
		this.currentMatrixName = 'projectionMatrix'
		this.stack = this.projectionStack
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

	mirror(plane: {normal1: V3, w: number}) {
	    this.multMatrix(M4.mirror(plane))
    }

	perspective(fovDegrees: number, aspect: number, near: number, far: number, result?: M4) {
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
            0, 0, 0, 1
        ])
        return M4.multiplyMultiple(viewportToScreenMatrix, this.projectionMatrix, this.modelViewMatrix)
    }


	/////////// IMMEDIATE MODE
	// ### Immediate mode
//
// Provide an implementation of OpenGL's deprecated immediate mode. This is
// depricated for a reason: constantly re-specifying the geometry is a bad
// idea for performance. You should use a `GL.Mesh` instead, which specifies
// the geometry once and caches it on the graphics card. Still, nothing
// beats a quick `viewerGL.begin(WGL.POINTS); viewerGL.vertex(1, 2, 3); viewerGL.end();` for
// debugging. This intentionally doesn't implement fixed-function lighting
// because it's only meant for quick debugging tasks.

    private immediate: {
        mesh: Mesh & { coords: [number, number][], vertices: V3[], colors: GL_COLOR[] },
        mode: DRAW_MODES | -1,
        coord: [number, number],
        color: GL_COLOR,
        pointSize: number,
        shader: Shader
    }

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
            (1 == args.length && Array.isArray(args[0])) ? args[0] :
            (1 == args.length && 'number' == typeof args[0]) ? hexIntToGLColor(args[0]) :
            (1 == args.length && 'string' == typeof args[0]) ? chroma(args[0]).gl() :
                [args[0], args[1], args[2], args[3] || 0]
    }

    texCoord(s: number, t: number): void
    texCoord(coords: [number, number]): void
    texCoord(coords: {x: number, y: number}): void
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
            useTexture: !!LightGLContext.gl.getParameter(WGL.TEXTURE_BINDING_2D)
        }).drawBuffers(this.immediate.mesh.vertexBuffers, undefined, this.immediate.mode)
        this.immediate.mode = -1
    }


	////////// MISCELLANEOUS METHODS
    static gl: LightGLContext
	makeCurrent() {
		LightGLContext.gl = this
	}

	/**
	 * Starts an animation loop which calls {@link onupdate} and {@link ondraw}
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
		const update = (domHighResTimeStamp: number) => {
		    const now = performance.now()
            callback.call(this, now, now - time)
            time = now
            keepUpdating && requestAnimationFrame(update)
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
		far?: number} = {}) {

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
		const gl = this

		function windowOnResize() {
			gl.canvas.width = window.innerWidth - left - right
			gl.canvas.height = window.innerHeight - top - bottom
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
	    const errorCode = this.getError()
        if (0 !== errorCode) {
			throw new Error('' + errorCode + WGL_ERROR[errorCode])
		}
	}


    /**
     * `create()` creates a new WebGL context and augments it with more methods. The alpha channel is disabled
     * by default because it usually causes unintended transparencies in the canvas.
     */
    static create(options: {canvas?: HTMLCanvasElement, alpha?: boolean} = {}): LightGLContext {
        const canvas = options.canvas || document.createElement('canvas')
        if (!options.canvas) {
            canvas.width = 800
            canvas.height = 600
        }
        if (!('alpha' in options)) options.alpha = false
        let newGL: LightGLContext | undefined = undefined
        try {
            newGL = canvas.getContext('webgl', options) as LightGLContext
            console.log('getting context')
        } catch (e) {
            console.log(e, newGL)
        }
        try {
            newGL = newGL || canvas.getContext('experimental-webgl', options) as LightGLContext
        } catch (e) {
            console.log(e, newGL)
        }
        if (!newGL) throw new Error('WebGL not supported')

        addOwnProperties(newGL, LightGLContext.prototype)
        LightGLContext.gl = newGL
        newGL.init()
        //addEventListeners(newGL)
        return newGL
    }
}
enum WGL_ERROR {
    NO_ERROR = WGL.NO_ERROR,
    INVALID_ENUM = WGL.INVALID_ENUM,
    INVALID_VALUE = WGL.INVALID_VALUE,
    INVALID_OPERATION = WGL.INVALID_OPERATION,
    INVALID_FRAMEBUFFER_OPERATION = WGL.INVALID_FRAMEBUFFER_OPERATION,
    OUT_OF_MEMORY = WGL.OUT_OF_MEMORY,
    CONTEXT_LOST_WEBGL = WGL.CONTEXT_LOST_WEBGL,
}

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
function pushQuad(triangles: int[], flipped: boolean, a: int, b: int, c: int, d: int) {
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

/**
 * These are all the draw modes usable in OpenGL ES
 */
enum DRAW_MODES {
    POINTS = WGL.POINTS,
    LINES = WGL.LINES,
    LINE_STRIP = WGL.LINE_STRIP,
    LINE_LOOP = WGL.LINE_LOOP,
    TRIANGLES = WGL.TRIANGLES,
    TRIANGLE_STRIP = WGL.TRIANGLE_STRIP,
    TRIANGLE_FAN = WGL.TRIANGLE_FAN
}
type DRAW_MODES_ENUM = keyof typeof DRAW_MODES
const x: DRAW_MODES_ENUM = 'TRIANGLES'
type GL_COLOR = [number, number, number, number]
const GL_COLOR_BLACK: GL_COLOR = [0, 0, 0, 1]// there's only one constant, use it for default values. Use chroma-js or similar for actual colors.
const SHADER_VAR_TYPES = ['FLOAT', 'FLOAT_MAT2', 'FLOAT_MAT3', 'FLOAT_MAT4', 'FLOAT_VEC2', 'FLOAT_VEC3', 'FLOAT_VEC4', 'INT', 'INT_VEC2', 'INT_VEC3', 'INT_VEC4', 'UNSIGNED_INT']
const DRAW_MODE_CHECKS: {[type: string]: (x: int) => boolean} = {
    [DRAW_MODES.POINTS]: x => true,
    [DRAW_MODES.LINES]: x => 0 == x % 2, // divisible by 2
    [DRAW_MODES.LINE_STRIP]: x => x > 2, // need at least 2
    [DRAW_MODES.LINE_LOOP]: x => x > 2, // more like > 3, but oh well
    [DRAW_MODES.TRIANGLES]: x => 0 == x % 3, // divisible by 3
    [DRAW_MODES.TRIANGLE_STRIP]: x => x > 3,
    [DRAW_MODES.TRIANGLE_FAN]: x => x > 3
}
