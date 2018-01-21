import {assert, int} from 'ts3dutils'

import {currentGL, LightGLContext} from './LightGLContext'

export interface TextureOptions {
	wrap?: number // defaults to WGL.CLAMP_TO_EDGE, or set wrapS and wrapT individually.
	wrapS?: number
	wrapT?: number
	filter?: number // defaults to WGL.LINEAR, or set minFilter and magFilter individually.
	minFilter?: number
	magFilter?: number
	format?: number // defaults to WGL.RGBA.
	type?: number // defaults to WGL.UNSIGNED_BYTE.
}

export class Texture {
	height: int
	width: int
	texture: WebGLTexture
	// e.g. viewerGL.UNSIGNED_BYTE, viewerGL.FLOAT
	format: int
	// e.g. viewerGL.RGBA
	type: int

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
	constructor(width: int, height: int, options: TextureOptions = {}, readonly gl = currentGL()) {
		this.texture = gl.createTexture()!
		gl.handleError() // in case createTexture returns null & fails
		this.width = width
		this.height = height
		this.format = options.format || gl.RGBA
		this.internalFormat = options.internalFormat || gl.RGBA
		this.type = options.type || gl.UNSIGNED_BYTE
		const magFilter = options.filter || options.magFilter || gl.LINEAR
		const minFilter = options.filter || options.minFilter || gl.LINEAR
		if (this.type === gl.FLOAT) {
			if (gl.version != 2 && !gl.getExtension('OES_texture_float')) {
				throw new Error('OES_texture_float is required but not supported')
			}
			if ((minFilter !== gl.NEAREST || magFilter !== gl.NEAREST) && !gl.getExtension('OES_texture_float_linear')) {
				throw new Error('OES_texture_float_linear is required but not supported')
			}
		} else if (this.type === LightGLContext.HALF_FLOAT_OES) {
			if (!gl.getExtension('OES_texture_half_float')) {
				throw new Error('OES_texture_half_float is required but not supported')
			}
			if ((minFilter !== gl.NEAREST || magFilter !== gl.NEAREST) && !gl.getExtension('OES_texture_half_float_linear')) {
				throw new Error('OES_texture_half_float_linear is required but not supported')
			}
		}
		gl.bindTexture(gl.TEXTURE_2D, this.texture)
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, options.wrap || options.wrapS || gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, options.wrap || options.wrapT || gl.CLAMP_TO_EDGE)
		gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, width, height, 0, this.format, this.type, options.data)
	}

	setData(data: ArrayBufferView) {
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.format, this.width, this.height, 0, this.format, this.type, data)
	}

	bind(unit: int) {
		this.gl.activeTexture(this.gl.TEXTURE0 + unit)
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)
	}

	unbind(unit: int) {
		this.gl.activeTexture(this.gl.TEXTURE0 + unit)
		this.gl.bindTexture(this.gl.TEXTURE_2D, null)
	}

	private framebuffer: WebGLFramebuffer
	private renderbuffer: WebGLRenderbuffer & { width: number, height: number }
	static checkerBoardCanvas: HTMLCanvasElement

	canDrawTo() {
		const gl = this.gl
		this.framebuffer = this.framebuffer || gl.createFramebuffer()
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0)
		const result = gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		return result
	}

	drawTo(callback: (gl: LightGLContext) => void): void {
		const gl = this.gl
		this.framebuffer = this.framebuffer || gl.createFramebuffer()
		this.renderbuffer = this.renderbuffer || gl.createRenderbuffer() as any
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
		gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer)
		if (this.width != this.renderbuffer.width || this.height != this.renderbuffer.height) {
			this.renderbuffer.width = this.width
			this.renderbuffer.height = this.height
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height)
		}
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0)
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.renderbuffer)
		// if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
		// 	throw new Error('Rendering to this texture is not supported (incomplete this.framebuffer)')
		// }
		const viewport = gl.getParameter(gl.VIEWPORT)
		gl.viewport(0, 0, this.width, this.height)

		callback(gl)

		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		gl.bindRenderbuffer(gl.RENDERBUFFER, null)
		gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3])
	}

	swapWith(other: Texture): void {
		assert(this.gl == other.gl)
		let temp
		temp = other.texture
		other.texture = this.texture
		this.texture = temp

		temp = other.width
		other.width = this.width
		this.width = temp

		temp = other.height
		other.height = this.height
		this.height = temp
	}

	/**
	 * Return a new texture created from `imgElement`, an `<img>` tag.
	 */
	static fromImage(imgElement: HTMLImageElement | HTMLCanvasElement, options: TextureOptions, gl: LightGLContext = currentGL()): Texture {
		options = options || {}
		const texture = new Texture(imgElement.width, imgElement.height, options, gl)
		try {
			gl.texImage2D(gl.TEXTURE_2D, 0, texture.format, texture.format, texture.type, imgElement)
		} catch (e) {
			if (location.protocol == 'file:') {
				throw new Error('imgElement not loaded for security reasons (serve this page over "http://" instead)')
			} else {
				throw new Error('imgElement not loaded for security reasons (imgElement must originate from the same ' +
					'domain as this page or use Cross-Origin Resource Sharing)')
			}
		}
		if (options.minFilter && options.minFilter != gl.NEAREST && options.minFilter != gl.LINEAR) {
			gl.generateMipmap(gl.TEXTURE_2D)
		}
		return texture
	}

	/**
	 * Returns a checkerboard texture that will switch to the correct texture when it loads.
	 */
	static fromURL(url: string, options: TextureOptions = {}, gl = currentGL()): Texture {
		Texture.checkerBoardCanvas = Texture.checkerBoardCanvas || (function () {
			const c = document.createElement('canvas').getContext('2d')
			if (!c) throw new Error('Could not create 2d canvas.')
			c.canvas.width = c.canvas.height = 128
			for (let y = 0; y < c.canvas.height; y += 16) {
				for (let x = 0; x < c.canvas.width; x += 16) {
					//noinspection JSBitwiseOperatorUsage
					c.fillStyle = (x ^ y) & 16 ? '#FFF' : '#DDD'
					c.fillRect(x, y, 16, 16)
				}
			}
			return c.canvas
		})()
		const texture = Texture.fromImage(Texture.checkerBoardCanvas, options)
		const image = new Image()
		image.onload = () => Texture.fromImage(image, options, gl).swapWith(texture)
		image.src = url
		return texture
	}
}