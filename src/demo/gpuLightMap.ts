/// <reference path="../types.d.ts" />
import { clamp, int, M4, TAU, V, V3 } from 'ts3dutils'

import { isWebGL2RenderingContext, Mesh, pushQuad, Shader, Texture, TSGLContext } from 'tsgl'

export { TSGLContext }

/**
 * Draw soft shadows by calculating a light map in multiple passes.
 */
export function gpuLightMap(gl: TSGLContext & WebGL2RenderingContext) {
	if (!isWebGL2RenderingContext(gl)) throw new Error('needs WebGL2')
	gl.getExtension('EXT_color_buffer_float')
	// modified version of https://evanw.github.io/lightgl.js/tests/gpulightmap.html

	let angleX = 0
	let angleY = 0
	if (gl.version !== 2 && (!gl.getExtension('OES_texture_float') || !gl.getExtension('OES_texture_float_linear'))) {
		document.write('This demo requires the OES_texture_float and OES_texture_float_linear extensions to run')
		throw new Error('not supported')
	}
	const texturePlane = Mesh.plane()
	const textureShader = Shader.create(
		`
	attribute vec2 ts_TexCoord;
	varying vec2 coord;
	void main() {
		coord = ts_TexCoord;
		gl_Position = vec4(coord * 2.0 - 1.0, 0.0, 1.0);
	}`,
		`
	precision highp float;
	uniform sampler2D texture;
	varying vec2 coord;
	void main() {
		gl_FragColor = texture2D(texture, coord);
	}`,
	)

	const depthMap = new Texture(1024, 1024, { format: gl.RGBA })
	const depthShader = Shader.create(
		`
	uniform mat4 ts_ModelViewProjectionMatrix;
	attribute vec4 ts_Vertex;
	// GL does not make the fragment position in NDC available, (gl_FragCoord is in window coords)
	// so we have an addition varying pos to calculate it ourselves.
	varying vec4 pos;
	void main() {
	gl_Position = pos = ts_ModelViewProjectionMatrix * ts_Vertex;
	}`,
		`
	precision highp float;
	varying vec4 pos;
	void main() {
		float depth = pos.z / pos.w;
		gl_FragColor = vec4(depth * 0.5 + 0.5);
	}`,
	)

	const shadowTestShader = Shader.create(
		`
  uniform mat4 shadowMapMatrix;
  uniform vec3 light;
  attribute vec4 offsetPosition;
  attribute vec3 ts_Normal;
  attribute vec2 ts_TexCoord;
  varying vec4 shadowMapPos; // position inside the shadow map frustrum
  varying vec3 normal;

  void main() {
    normal = ts_Normal;
    shadowMapPos = shadowMapMatrix * offsetPosition;
    gl_Position = vec4(ts_TexCoord * 2.0 - 1.0, 0.0, 1.0);
  }
`,
		`
	precision highp float;
  uniform float sampleCount;
  uniform sampler2D depthMap;
  uniform vec3 light;
  varying vec4 shadowMapPos;
  varying vec3 normal;
  uniform vec4 res;

  void main() {
    /* Run shadow test */
    const float bias = -0.0025;
    float depth = texture2D(depthMap, shadowMapPos.xy / shadowMapPos.w * 0.5 + 0.5).r;
    float shadow = (bias + shadowMapPos.z / shadowMapPos.w * 0.5 + 0.5 - depth > 0.0) ? 1.0 : 0.0;

    /* Points on polygons facing away from the light are always in shadow */
    float color = dot(normal, light) > 0.0 ? 1.0 - shadow : 0.0;
    gl_FragColor = vec4(vec3(color), 1.0 / (1.0 + sampleCount));
  }
`,
	)

	/**
	 * Wrapper for a Mesh made only of quads (two triangles in a "square") and
	 * an associated automatically UV-unwrapped texture.
	 */
	class QuadMesh {
		mesh = new Mesh()
			.addVertexBuffer('normals', 'ts_Normal')
			.addIndexBuffer('TRIANGLES')
			.addVertexBuffer('coords', 'ts_TexCoord')
			.addVertexBuffer('offsetCoords', 'offsetCoord')
			.addVertexBuffer('offsetPositions', 'offsetPosition')
		index: int = 0
		lightmapTexture: Texture | undefined
		bounds: { center: V3; radius: number } | undefined
		sampleCount: int = 0
		countedQuads = 0

		// Add a quad given its four vertices and allocate space for it in the lightmap
		addQuad(a: V3, b: V3, c: V3, d: V3) {
			// Add vertices
			const vl = this.mesh.vertices.length
			this.mesh.vertices.push(a, b, c, d)

			// Add normal
			const normal = V3.normalOnPoints(a, b, c).unit()
			this.mesh.normals.push(normal, normal, normal, normal)

			// A quad is two triangles
			pushQuad(this.mesh.TRIANGLES, false, vl, vl + 1, vl + 2, vl + 3)

			this.countedQuads++
		}

		addDoubleQuad(a: V3, b: V3, c: V3, d: V3) {
			// Need a separate lightmap for each side of the quad
			this.addQuad(a, b, c, d)
			this.addQuad(a, c, b, d)
		}

		addCube(m4?: M4) {
			;[
				[V3.O, V3.Y, V3.X, V3.XY],
				[V3.Z, new V3(1, 0, 1), new V3(0, 1, 1), V3.XYZ],
				[V3.O, V3.X, V3.Z, new V3(1, 0, 1)],
				[V3.X, new V3(1, 1, 0), new V3(1, 0, 1), new V3(1, 1, 1)],
				[new V3(1, 1, 0), V3.Y, V3.XYZ, new V3(0, 1, 1)],
				[V3.Y, V3.O, new V3(0, 1, 1), V3.Z],
			].forEach(vs => (this.addQuad as any)(...(m4 ? m4.transformedPoints(vs) : vs)))
		}

		compile(texelsPerSide: int) {
			const numQuads = this.mesh.vertices.length / 4
			if (numQuads % 1 != 0) throw new Error('not quads')
			const quadsPerSide = Math.ceil(Math.sqrt(numQuads))

			for (let i = 0; i < numQuads; i++) {
				// Compute location of texture cell
				const s = i % quadsPerSide
				const t = (i - s) / quadsPerSide

				// Coordinates that are on the edge of border texels (to avoid cracks when rendering)
				const rs0 = s / quadsPerSide
				const rt0 = t / quadsPerSide
				const rs1 = (s + 1) / quadsPerSide
				const rt1 = (t + 1) / quadsPerSide
				this.mesh.coords.push([rs0, rt0], [rs1, rt0], [rs0, rt1], [rs1, rt1])

				const half = 1 / texelsPerSide

				const [a, b, c, d] = this.mesh.vertices.slice(i * 4, (i + 1) * 4)

				// Add fake positions
				function bilerp(x: number, y: number) {
					return a
						.times((1 - x) * (1 - y))
						.plus(b.times(x * (1 - y)))
						.plus(c.times((1 - x) * y))
						.plus(d.times(x * y))
				}

				this.mesh.offsetPositions.push(
					bilerp(-half, -half),
					bilerp(1 + half, -half),
					bilerp(-half, 1 + half),
					bilerp(1 + half, 1 + half),
				)

				const s0 = (s + half) / quadsPerSide
				const t0 = (t + half) / quadsPerSide
				const s1 = (s + 1 - half) / quadsPerSide
				const t1 = (t + 1 - half) / quadsPerSide
				this.mesh.offsetCoords.push([s0, t0], [s1, t0], [s0, t1], [s1, t1])
			}
			// Finalize mesh
			this.mesh.compile()
			this.bounds = this.mesh.getBoundingSphere()

			// Create textures
			const textureSize = quadsPerSide * texelsPerSide
			console.log('texture size: ' + textureSize)
			this.lightmapTexture = new Texture(textureSize, textureSize, {
				internalFormat: gl.RGBA32F,
				format: gl.RGBA,
				type: gl.FLOAT,
				filter: gl.LINEAR,
			})

			console.log('compiled quad mesh')
		}

		drawShadow(dir: V3) {
			// Construct a camera looking from the light toward the object
			const r = this.bounds!.radius,
				c = this.bounds!.center
			gl.matrixMode(gl.PROJECTION)
			gl.pushMatrix()
			gl.loadIdentity()
			gl.ortho(-r, r, -r, r, -r, r)
			gl.matrixMode(gl.MODELVIEW)
			gl.pushMatrix()
			gl.loadIdentity()
			const at = c.minus(dir)
			const useY = dir.maxElement() != dir.z
			const up = new V3(+!useY, 0, +useY).cross(dir)
			gl.lookAt(c, at, up)

			// Render the object viewed from the light using a shader that returns the fragment depth
			const mesh = this.mesh
			const shadowMapMatrix = gl.projectionMatrix.times(gl.modelViewMatrix)
			depthMap.drawTo(function(gl) {
				gl.enable(gl.DEPTH_TEST)
				gl.clearColor(1, 1, 1, 1)
				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
				depthShader.draw(mesh)
			})

			//Run the shadow test for each texel in the lightmap and
			//accumulate that onto the existing lightmap contents
			const sampleCount = this.sampleCount++
			depthMap.bind(0)
			this.lightmapTexture!.drawTo(function(gl) {
				gl.enable(gl.BLEND)
				gl.disable(gl.CULL_FACE)
				gl.disable(gl.DEPTH_TEST)
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
				shadowTestShader
					.uniforms({
						shadowMapMatrix: shadowMapMatrix,
						sampleCount: sampleCount,
						light: dir,
					})
					.draw(mesh)
				gl.disable(gl.BLEND)
			})
			depthMap.unbind(0)

			// Reset the transform
			gl.matrixMode(gl.PROJECTION)
			gl.popMatrix()
			gl.matrixMode(gl.MODELVIEW)
			gl.popMatrix()
		}
	}

	// Make a mesh of quads
	const numArcQuads = 32
	const groundTilesPerSide = 5
	const quadMesh = new QuadMesh()
	// Arc of randomly oriented quads
	quadMesh.addCube(M4.product(M4.translate(0, 0, -0.2), M4.rotateAB(V3.XYZ, V3.Z)))
	for (let i = 0; i < numArcQuads; i++) {
		const r = 0.4
		const t = (i / numArcQuads) * TAU
		const center = V(0, 0, Math.sqrt(3) / 2 - 0.2)
			.plus(V(0, 1.5, 0).times(Math.cos(t)))
			.plus(
				V(1, 0, -1)
					.toLength(1.5)
					.times(Math.sin(t)),
			)
		// const center = V3.sphere(0, (i + Math.random()) / numArcQuads * Math.PI)
		const a = V3.randomUnit()
		const b = V3.randomUnit()
			.cross(a)
			.unit()
		quadMesh.addCube(
			M4.product(M4.translate(center), M4.forSys(a, b), M4.scale(r, r, r), M4.translate(-0.5, -0.5, -0.5)),
		)
	}

	// Plane of quads
	for (let x = 0; x < groundTilesPerSide; x++) {
		for (let z = 0; z < groundTilesPerSide; z++) {
			const dx = x - groundTilesPerSide / 2
			const dz = z - groundTilesPerSide / 2
			quadMesh.addQuad(new V3(dx, dz, 0), new V3(dx + 1, dz, 0), new V3(dx, dz + 1, 0), new V3(dx + 1, dz + 1, 0))
		}
	}
	quadMesh.compile(128)

	// The mesh will be drawn with texture mapping
	const mesh = quadMesh.mesh
	const textureMapShader = Shader.create(
		`
		attribute vec4 ts_Vertex;
		uniform mat4 ts_ModelViewProjectionMatrix;
        attribute vec2 offsetCoord;
        varying vec2 coord;
        void main() {
            coord = offsetCoord;
            gl_Position = ts_ModelViewProjectionMatrix * ts_Vertex;
        }
`,
		`
		precision highp float;
        uniform sampler2D texture;
        varying vec2 coord;
        void main() {
            gl_FragColor = texture2D(texture, coord);
        }
`,
	)

	let lastPos = V3.O
	// scene rotation
	gl.canvas.onmousemove = function(e) {
		const pagePos = V(e.pageX, e.pageY)
		const delta = lastPos.to(pagePos)
		if (e.buttons & 1) {
			angleY += delta.x
			angleX = clamp(angleX + delta.y, -90, 90)
		}
		lastPos = pagePos
	}

	let flip = false

	gl.enable(gl.CULL_FACE)
	gl.enable(gl.DEPTH_TEST)

	const lightDir = V3.XYZ
	const ambientFraction = 0.4

	return gl.animate(function(_abs, _diff) {
		const gl = this

		gl.enable(gl.CULL_FACE)
		gl.clearColor(0.9, 0.9, 0.9, 1)
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

		// setup camera
		gl.matrixMode(gl.PROJECTION)
		gl.loadIdentity()
		gl.perspective(70, gl.canvas.width / gl.canvas.height, 0.1, 1000)
		gl.lookAt(V(0, -3, 3), V3.O, V3.Z)

		gl.matrixMode(gl.MODELVIEW)
		gl.loadIdentity()
		gl.rotate(angleX, 1, 0, 0)
		gl.rotate(angleY, 0, 0, 1)

		// Alternate between a shadow from a random point on the sky hemisphere
		// and a random point near the light (creates a soft shadow)
		flip = !flip
		const dir =
			Math.random() < ambientFraction
				? V3.randomUnit()
				: lightDir.plus(V3.randomUnit().times(0.1 * Math.sqrt(Math.random()))).unit()
		quadMesh.drawShadow(dir.z < 0 ? dir.negated() : dir)

		// Draw the mesh with the ambient occlusion so far
		gl.enable(gl.DEPTH_TEST)
		gl.enable(gl.CULL_FACE)
		quadMesh.lightmapTexture!.bind(0)
		textureMapShader.draw(mesh)

		// Draw depth map overlay
		gl.disable(gl.CULL_FACE)
		quadMesh.lightmapTexture!.bind(0)
		gl.viewport(10, 10, 10 + 256, 10 + 256)
		textureShader.draw(texturePlane)
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
	})
}
;(gpuLightMap as any).info = 'LMB-drag to rotate camera.'
