import { AABB, clamp, DEG, V, V3 } from 'ts3dutils'

import { Mesh, Shader, Texture, TSGLContext } from 'tsgl'

import cessnaJSON from '../../cessna.json'

/**
 * Draw shadow of a mesh using a shadow map.
 */
export function shadowMap(gl: TSGLContext) {
	//const mesh = await fetch('dodecahedron.stl')
	//    .then(r => r.blob())
	//    .then(Mesh.fromBinarySTL)
	//    .then(mesh => mesh.translate(0,1,0).scale(5).compile())
	const mesh = Mesh.load(cessnaJSON)

	let angleX = 20
	let angleY = 20
	let useBoundingSphere = true
	const cube = Mesh.cube()
	const sphere = Mesh.sphere(2)
		.computeWireframeFromFlatTriangles()
		.compile()
	const plane = Mesh.plane()
		.translate(-0.5, -0.5)
		.scale(300, 300, 1)
	const depthMap = new Texture(1024, 1024, { format: gl.RGBA })
	const texturePlane = Mesh.plane()
	const boundingSphere = mesh.getBoundingSphere()
	const boundingBox = mesh.getAABB()
	const frustrumCube = Mesh.cube()
		.scale(2)
		.translate(V3.XYZ.negated())
	const colorShader = Shader.create(
		`
	uniform mat4 ts_ModelViewProjectionMatrix;
	attribute vec4 ts_Vertex;
  void main() {
    gl_Position = ts_ModelViewProjectionMatrix * ts_Vertex;
  }
`,
		`
	precision highp float;
  uniform vec4 color;
  void main() {
    gl_FragColor = color;
  }
`,
	)
	const depthShader = Shader.create(
		`
	uniform mat4 ts_ModelViewProjectionMatrix;
	attribute vec4 ts_Vertex;
  varying vec4 pos;
  void main() {
    gl_Position = pos = ts_ModelViewProjectionMatrix * ts_Vertex;
  }
`,
		`
	precision highp float;
  varying vec4 pos;
  void main() {
    float depth = pos.z / pos.w;
    gl_FragColor = vec4(depth * 0.5 + 0.5);
  }
`,
	)
	const displayShader = Shader.create(
		`
	uniform mat4 ts_ModelViewMatrix;
	uniform mat3 ts_NormalMatrix;
	uniform mat4 ts_ModelViewProjectionMatrix;
	attribute vec4 ts_Vertex;
	attribute vec3 ts_Normal;
  uniform mat4 shadowMapMatrix;
  uniform vec3 light;
  varying vec4 coord;
  varying vec3 normal;
  varying vec3 toLight;
  void main() {
    toLight = light - (ts_ModelViewMatrix * ts_Vertex).xyz;
    normal = ts_NormalMatrix * ts_Normal;
    gl_Position = ts_ModelViewProjectionMatrix * ts_Vertex;
    coord = shadowMapMatrix * gl_Position;
  }
`,
		`
	precision highp float;
  uniform sampler2D depthMap;
  varying vec4 coord;
  varying vec3 normal;
  varying vec3 toLight;
  void main() {
    float shadow = 0.0;
    if (coord.w > 0.0) {
      float depth = 0.0;
      vec2 sample = coord.xy / coord.w * 0.5 + 0.5;
      if (clamp(sample, 0.0, 1.0) == sample) {
        float sampleDepth = texture2D(depthMap, sample).r;
        depth = (sampleDepth == 1.0) ? 1.0e9 : sampleDepth;
      }
      if (depth > 0.0) {
        float bias = -0.002;
        shadow = clamp(300.0 * (bias + coord.z / coord.w * 0.5 + 0.5 - depth), 0.0, 1.0);
      }
    }
    float ambient = 0.1;
    float diffuse = max(0.0, dot(normalize(toLight), normalize(normal)));
    gl_FragColor = vec4((normal * 0.5 + 0.5) * mix(ambient, 1.0, diffuse * (1.0 - shadow)), 1.0);
  }
`,
	)
	const textureShader = Shader.create(
		`
  varying vec2 coord;
  attribute vec2 ts_TexCoord;
  void main() {
    coord = ts_TexCoord;
    gl_Position = vec4(coord * 2.0 - 1.0, 0.0, 1.0);
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

	gl.canvas.contentEditable = 'true'
	gl.canvas.addEventListener('keypress', () => {
		useBoundingSphere = !useBoundingSphere
	})

	gl.enable(gl.DEPTH_TEST)

	function cameraForBoundingSphere(light: V3, sphere: typeof boundingSphere) {
		const distance = sphere.center.minus(light).length()
		const angle = 2 * Math.asin(sphere.radius / distance)
		gl.matrixMode(gl.PROJECTION)
		gl.loadIdentity()
		gl.perspective(angle / DEG, 1, distance - sphere.radius, distance + sphere.radius)
		gl.matrixMode(gl.MODELVIEW)
		gl.loadIdentity()
		gl.lookAt(light, sphere.center, V3.Y)
	}

	function cameraForBoundingBox(light: V3, boundingBox: AABB) {
		const center = boundingBox.min.plus(boundingBox.max).div(2)
		const axisZ = center.minus(light).unit()
		const axisX = axisZ.cross(new V3(0, 1, 0)).unit()
		const axisY = axisX.cross(axisZ)
		let near = Number.MAX_VALUE
		let far = -Number.MAX_VALUE
		let slopeNegX = 0
		let slopePosX = 0
		let slopeNegY = 0
		let slopePosY = 0

		// Loop over all the points and find the maximum slope for each direction.
		// Incidentally, this algorithm works for convex hulls of any shape and will
		// return the optimal bounding frustum for every hull.
		const bbPoints = boundingBox.corners()
		for (const point of bbPoints) {
			const toPoint = point.minus(light)
			const dotZ = toPoint.dot(axisZ)
			const slopeX = toPoint.dot(axisX) / dotZ
			const slopeY = toPoint.dot(axisY) / dotZ
			slopeNegX = Math.min(slopeNegX, slopeX)
			slopeNegY = Math.min(slopeNegY, slopeY)
			slopePosX = Math.max(slopePosX, slopeX)
			slopePosY = Math.max(slopePosY, slopeY)
			near = Math.min(near, dotZ)
			far = Math.max(far, dotZ)
		}

		// Need to fit an oblique view frustum to get optimal bounds
		gl.matrixMode(gl.PROJECTION)
		gl.loadIdentity()
		gl.frustum(slopeNegX * near, slopePosX * near, slopeNegY * near, slopePosY * near, near, far)
		gl.matrixMode(gl.MODELVIEW)
		gl.loadIdentity()
		gl.lookAt(light, center, V3.Y)
	}

	return gl.animate(function(abs) {
		const time = abs / 1000
		// Move the light around
		const light = new V3(100 * Math.sin(time * 0.2), 25, 20 * Math.cos(time * 0.2))

		// Construct a camera looking from the light toward the object. The view
		// frustum is fit so it tightly encloses the bounding volume of the object
		// (sphere or box) to make best use of shadow map resolution. A frustum is
		// a pyramid shape with the apex chopped off.
		if (useBoundingSphere) {
			cameraForBoundingSphere(light, boundingSphere)
		} else {
			cameraForBoundingBox(light, boundingBox)
		}

		// Render the object viewed from the light using a shader that returns the
		// fragment depth.
		const shadowMapMatrix = gl.projectionMatrix.times(gl.modelViewMatrix)
		depthMap.unbind(0)
		depthMap.drawTo(function() {
			gl.clearColor(1, 1, 1, 1)
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
			depthShader.draw(mesh)
		})

		const shadowMapMatrixInversed = shadowMapMatrix.inversed()

		// Set up the camera for the scene
		gl.clearColor(0, 0, 0, 1)
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
		gl.matrixMode(gl.PROJECTION)
		gl.loadIdentity()
		gl.perspective(45, gl.canvas.width / gl.canvas.height, 1, 1000)
		gl.matrixMode(gl.MODELVIEW)
		gl.loadIdentity()
		gl.translate(0, 0, -100)
		gl.rotate(angleX, 1, 0, 0)
		gl.rotate(angleY, 0, 1, 0)

		// Draw view frustum
		gl.pushMatrix()
		gl.translate(light)
		colorShader
			.uniforms({
				color: [1, 1, 0, 1],
			})
			.draw(sphere, gl.LINES)
		gl.popMatrix()

		gl.pushMatrix()
		gl.multMatrix(shadowMapMatrixInversed)
		colorShader
			.uniforms({
				color: [1, 1, 0, 1],
			})
			.draw(frustrumCube, gl.LINES)
		gl.popMatrix()

		// Draw the bounding volume
		gl.pushMatrix()
		if (useBoundingSphere) {
			gl.translate(boundingSphere.center)
			gl.scale(boundingSphere.radius)
			colorShader
				.uniforms({
					color: [0, 1, 1, 1],
				})
				.draw(sphere, gl.LINES)
		} else {
			gl.translate(boundingBox.min)
			gl.scale(boundingBox.size())
			colorShader
				.uniforms({
					color: [0, 1, 1, 1],
				})
				.draw(cube, gl.LINES)
		}
		gl.popMatrix()

		// Draw mesh
		depthMap.bind(0)
		displayShader
			.uniforms({
				shadowMapMatrix: shadowMapMatrix.times(gl.projectionMatrix.times(gl.modelViewMatrix).inversed()),
				light: gl.modelViewMatrix.transformPoint(light),
				depthMap: 0,
			})
			.draw(mesh)

		// Draw plane
		gl.pushMatrix()
		gl.rotate(-90, 1, 0, 0)
		displayShader.draw(plane)
		gl.popMatrix()

		// Draw depth map overlay
		gl.viewport(10, 10, 10 + 256, 10 + 256)
		textureShader.draw(texturePlane)
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
	})
}
;(shadowMap as any).info = 'Press any key to toggle between sphere- or AABB-based camera clipping.'
