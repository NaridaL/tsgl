/// <reference types="webgl-strict-types" />
import { assert, int } from 'ts3dutils'

import { currentGL, TSGLContext } from './index'
import GL = WebGLRenderingContextStrict
import GL2 = WebGL2RenderingContext

export interface TextureOptions {
	wrap?: GL.TextureWrap // defaults to WGL.CLAMP_TO_EDGE, or set wrapS and wrapT individually.
	wrapS?: GL.TextureWrap
	wrapT?: GL.TextureWrap
	filter?: GL.TextureMagFilter // defaults to WGL.LINEAR, or set minFilter and magFilter individually.
	minFilter?: GL.TextureMinFilter
	magFilter?: GL.TextureMagFilter
	format?: GL2.TextureFormat // defaults to WGL.RGBA.
	internalFormat?: GL2.TextureInternalFormat
	type?: GL.ReadPixelsType // defaults to WGL.UNSIGNED_BYTE.
	data?: any
}

export class Texture {
	height: int
	width: int
	texture: WebGLTexture
	// e.g. viewerGL.UNSIGNED_BYTE, viewerGL.FLOAT
	internalFormat: GL2.TextureInternalFormat
	format: GL2.TextureFormat
	// e.g. viewerGL.RGBA
	type: GL.ReadPixelsType

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
			if (
				(minFilter !== gl.NEAREST || magFilter !== gl.NEAREST) &&
				!gl.getExtension('OES_texture_float_linear')
			) {
				throw new Error('OES_texture_float_linear is required but not supported')
			}
		} else if (this.type === gl.HALF_FLOAT_OES) {
			if (!gl.getExtension('OES_texture_half_float')) {
				throw new Error('OES_texture_half_float is required but not supported')
			}
			if (
				(minFilter !== gl.NEAREST || magFilter !== gl.NEAREST) &&
				!gl.getExtension('OES_texture_half_float_linear')
			) {
				throw new Error('OES_texture_half_float_linear is required but not supported')
			}
		}

		this.texture = gl.createTexture()!
		gl.bindTexture(gl.TEXTURE_2D, this.texture)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, options.wrap || options.wrapS || gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, options.wrap || options.wrapT || gl.CLAMP_TO_EDGE)
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			this.internalFormat as any,
			width,
			height,
			0,
			this.format as any,
			this.type as any,
			options.data,
		)
	}

	setData(data: ArrayBufferView) {
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)
		this.gl.texImage2D(
			this.gl.TEXTURE_2D,
			0,
			this.format as any,
			this.width,
			this.height,
			0,
			this.format as any,
			this.type as any,
			data as any,
		)
	}

	bind(unit: int) {
		this.gl.activeTexture((this.gl.TEXTURE0 + unit) as GL.TextureUnit)
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)
	}

	unbind(unit: int) {
		this.gl.activeTexture((this.gl.TEXTURE0 + unit) as GL.TextureUnit)
		this.gl.bindTexture(this.gl.TEXTURE_2D, null)
	}

	private framebuffer: WebGLFramebuffer | undefined
	static checkerBoardCanvas: HTMLCanvasElement

	drawTo(render: (gl: TSGLContext) => void): void {
		const gl = this.gl
		const prevFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING)
		if (!this.framebuffer) {
			// create a renderbuffer for the depth component
			const prevRenderbuffer = gl.getParameter(gl.RENDERBUFFER_BINDING)
			const depthRenderbuffer = gl.createRenderbuffer()
			gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderbuffer)
			// DEPTH_COMPONENT16 is the only depth format
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height)
			gl.bindRenderbuffer(gl.RENDERBUFFER, prevRenderbuffer)

			// create a framebuffer to render to
			this.framebuffer = gl.createFramebuffer()!
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0)
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderbuffer)
			if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
				throw new Error('Rendering to this texture is not supported (incomplete this.framebuffer)')
			}
		} else if (prevFramebuffer !== this.framebuffer) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
		}

		const prevViewport = gl.getParameter(gl.VIEWPORT)

		gl.viewport(0, 0, this.width, this.height)
		render(gl)

		// restore previous state
		prevFramebuffer !== this.framebuffer && gl.bindFramebuffer(gl.FRAMEBUFFER, prevFramebuffer)
		gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3])
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
	static fromImage(
		imgElement: HTMLImageElement | HTMLCanvasElement,
		options: TextureOptions = {},
		gl: TSGLContext = currentGL(),
	): Texture {
		const texture = new Texture(imgElement.width, imgElement.height, options, gl)
		try {
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				texture.format as any,
				texture.format as any,
				texture.type as any,
				imgElement,
			)
		} catch (e) {
			if (location.protocol == 'file:') {
				throw new Error('imgElement not loaded for security reasons (serve this page over "http://" instead)')
			} else {
				throw new Error(
					'imgElement not loaded for security reasons (imgElement must originate from the same ' +
						'domain as this page or use Cross-Origin Resource Sharing)',
				)
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
	static fromURLSwitch(url: string, options?: TextureOptions, gl = currentGL()): Texture {
		Texture.checkerBoardCanvas =
			Texture.checkerBoardCanvas ||
			(function() {
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
		// error event doesn't return a reason. Most likely a 404.
		image.onerror = () => {
			throw new Error('Could not load image ' + image.src + '. 404?')
		}
		image.src = url
		return texture
	}

	static fromURL(url: string, options?: TextureOptions, gl = currentGL()): Promise<Texture> {
		return new Promise((resolve, reject) => {
			const image = new Image()
			image.onload = () => resolve(Texture.fromImage(image, options, gl))
			image.onerror = ev => reject('Could not load image ' + image.src + '. 404?' + ev)
			image.src = url
		})
	}
}
