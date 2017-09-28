async function setupDemo(gl: LightGLContext) {
    const mesh = Mesh.cube()
    const shader = new Shader<{ color: 'FLOAT_VEC4' }>(`
void main() {
    gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
}`, `
uniform vec4 color;
void main() {
    gl_FragColor = color;
}`)

    // setup camera
    gl.matrixMode(gl.PROJECTION)
    gl.loadIdentity()
    gl.perspective(70, gl.canvas.width / gl.canvas.height, 0.1, 1000)
    gl.lookAt(V(0, -2, 1.5), V3.O, V3.Z)
    gl.matrixMode(gl.MODELVIEW)

    gl.enable(gl.DEPTH_TEST)

    return gl.animate(function (abs, diff) {
        const angleDeg = abs / 1000 * 45
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        gl.loadIdentity()
        gl.rotate(angleDeg, 0, 0, 1)
        gl.scale(1.5)
        gl.translate(-0.5, -0.5, -0.5)

        shader.uniforms({color: [1, 1, 0, 1]}).draw(mesh)
        shader.uniforms({color: [0, 0, 0, 1]}).draw(mesh, gl.LINES)
    })
}

function multiTexture(gl: LightGLContext) {
    const mesh = Mesh.plane()
    const texture = Texture.fromURL('texture.png')
    const texture2 = Texture.fromURL('texture2.png')
    const shader = new Shader<{ texture: 'SAMPLER_2D', texture2: 'SAMPLER_2D' }>(`
  varying vec2 coord;
  void main() {
    coord = LGL_TexCoord;
    gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
  }
`, `
  uniform sampler2D texture;
  uniform sampler2D texture2;
  varying vec2 coord;
  void main() {
    //gl_FragColor = vec4(coord.x, coord.y, 0, 1);
    gl_FragColor = texture2D(texture, coord) - texture2D(texture2, coord);
  }
`)
    gl.clearColor(1, 1, 1, 1)

    // setup camera
    gl.matrixMode(gl.PROJECTION)
    gl.loadIdentity()
    gl.perspective(40, gl.canvas.width / gl.canvas.height, 0.1, 1000)
    gl.lookAt(V(0, -2, 1.5), V3.O, V3.Z)
    gl.matrixMode(gl.MODELVIEW)

    gl.enable(gl.DEPTH_TEST)

    return gl.animate(function (abs, diff) {
        const angleDeg = abs / 1000 * 45
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        gl.loadIdentity()

        //gl.translate(0, 0, -5)
        gl.rotate(angleDeg, 0, 0, 1)
        gl.translate(-0.5, -0.5)

        texture.bind(0)
        texture2.bind(1)
        shader.uniforms({
            texture: 0,
            texture2: 1
        }).draw(mesh)
    })
}

function camera(gl: LightGLContext) {
    let yRot = -10 * DEG
    let zRot = 90 * DEG
    let camera = new V3(0, -5, 1)
    const mesh = Mesh.sphere().computeWireframeFromFlatTriangles().compile()
    const shader = new Shader(`
  varying vec3 normal;
  void main() {
    normal = LGL_Normal;
    gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
  }
`, `
  uniform float brightness;
  varying vec3 normal;
  void main() {
    gl_FragColor = vec4(brightness * (normal * 0.5 + 0.5), 1.0);
  }
`)

    let lastPos = V3.O
    // scene rotation
    gl.canvas.onmousemove = function(e) {
        const pagePos = V(e.pageX, e.pageY)
        const delta = lastPos.to(pagePos)
        if (e.buttons & 1) {
            zRot -= delta.x * 0.25 * DEG
            yRot = clamp(yRot - delta.y * 0.25 * DEG, -85 * DEG, 85 * DEG)
        }
        lastPos = pagePos
    }
    gl.canvas.contentEditable = 'true'
    const keys: {[key: string]: boolean} = {}
    gl.canvas.onkeydown = function (e) {
        keys[e.code] = true
    }
    gl.canvas.onkeyup = function (e) {
        keys[e.code] = false
    }

    gl.clearColor(1, 1, 1, 1)

    // setup camera

    gl.enable(gl.CULL_FACE)
    gl.enable(gl.POLYGON_OFFSET_FILL)
    gl.polygonOffset(1, 1)
    gl.clearColor(0.8, 0.8, 0.8, 1)
    gl.enable(gl.DEPTH_TEST)

    return gl.animate(function (abs, diff) {
        const angleDeg = abs / 1000 * 45
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        gl.loadIdentity()
        const speed = diff / 1000 * 4

        // Forward movement
        const forwardMov = +!!(keys.KeyW || keys.ArrowUp) - +!!(keys.KeyS || keys.ArrowDown)
        const forwardV3 = V3.sphere(zRot, yRot)

        // Sideways movement
        const sideMov = +!!(keys.KeyA || keys.ArrowLeft) - +!!(keys.KeyD || keys.ArrowRight)
        const sideV3 = V3.sphere(zRot + Math.PI / 2, 0)

        const movementV3 = forwardV3.times(forwardMov).plus(sideV3.times(sideMov))
        camera = movementV3.likeO() ? camera : camera.plus(movementV3.toLength(speed))

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        gl.matrixMode(gl.PROJECTION)
        gl.loadIdentity()
        gl.perspective(70, gl.canvas.width / gl.canvas.height, 0.1, 1000)
        gl.lookAt(camera, camera.plus(forwardV3), V3.Z)

        gl.matrixMode(gl.MODELVIEW)
        gl.loadIdentity()
        gl.rotate(-zRot, 0, 0, 1)
        gl.rotate(-yRot, 0, 1, 0)
        gl.translate(-camera.x, -camera.y, -camera.z)

        shader.uniforms({ brightness: 1 }).draw(mesh, gl.TRIANGLES)
        shader.uniforms({ brightness: 0 }).draw(mesh, gl.LINES)
    })

}

function immediateMode(gl: LightGLContext) {

    // setup camera
    gl.matrixMode(gl.PROJECTION)
    gl.loadIdentity()
    gl.perspective(70, gl.canvas.width / gl.canvas.height, 0.1, 1000)
    gl.lookAt(V(0, -2, 1.5), V3.O, V3.Z)
    gl.matrixMode(gl.MODELVIEW)

    gl.enable(gl.DEPTH_TEST)

    return gl.animate(function (abs, diff) {
        const angleDeg = abs / 1000 * 45
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        gl.loadIdentity()
        gl.translate(0, 0, -5)
        gl.rotate(30, 1, 0, 0)
        gl.rotate(angleDeg, 0, 1, 0)

        gl.color(0.5, 0.5, 0.5)
        gl.lineWidth(1)
        gl.begin(gl.LINES)
        for (let i = -10; i <= 10; i++) {
            gl.vertex(i, 0, -10)
            gl.vertex(i, 0, +10)
            gl.vertex(-10, 0, i)
            gl.vertex(+10, 0, i)
        }
        gl.end()

        gl.pointSize(10)
        gl.begin(gl.POINTS)
        gl.color(1, 0, 0); gl.vertex(1, 0, 0)
        gl.color(0, 1, 0); gl.vertex(0, 1, 0)
        gl.color(0, 0, 1); gl.vertex(0, 0, 1)
        gl.end()

        gl.lineWidth(2)
        gl.begin(gl.LINE_LOOP)
        gl.color(1, 0, 0); gl.vertex(1, 0, 0)
        gl.color(0, 1, 0); gl.vertex(0, 1, 0)
        gl.color(0, 0, 1); gl.vertex(0, 0, 1)
        gl.end()

        gl.begin(gl.TRIANGLES)
        gl.color(1, 1, 0); gl.vertex(0.5, 0.5, 0)
        gl.color(0, 1, 1); gl.vertex(0, 0.5, 0.5)
        gl.color(1, 0, 1); gl.vertex(0.5, 0, 0.5)
        gl.end()
    })
}

async function renderToTexture(gl: LightGLContext) {
    const mesh = Mesh.load(await fetch('gazebo.json').then(response => response.json()))
    const sinVertices = arrayFromFunction(32, i => {
        const x = lerp(-PI, PI, i / 31)
        const y = sin(x)
        return new V3(x / 7.64, y / 7.64, 0)
    })
    const cyl = Mesh.offsetVertices(sinVertices, V3.Z, false)
    const plane = Mesh.plane()
    const texture = Texture.fromURL('texture.png')
    const overlay = new Texture(1024, 1024)
    const meshShader = new Shader(`
  varying vec3 normal;
  void main() {
    normal = LGL_Normal;
    gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
  }
`, `
  varying vec3 normal;
  void main() {
    gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
  }
`)
    const planeShader = new Shader(`
  varying vec2 coord;
  void main() {
    coord = LGL_TexCoord.xy;
    gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
  }
`, `
  uniform sampler2D texture;
  uniform sampler2D overlay;
  varying vec2 coord;
  void main() {
    gl_FragColor = (texture2D(overlay, coord) + texture2D(texture, coord)) / 2.0;
  }
`)

    gl.clearColor(1,1,1,1)
    gl.enable(gl.DEPTH_TEST)


    return gl.animate(function(abs, diff) {
        const angleDeg = abs / 1000 * 20

        gl.pushMatrix()
        overlay.drawTo(function(gl: LightGLContext) {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            gl.matrixMode(gl.PROJECTION)
            gl.loadIdentity()
            gl.perspective(60, 1, 0.1, 1000)
            gl.lookAt(V(0, -2, 0.5), V(0,0,0.5), V3.Z)
            gl.matrixMode(gl.MODELVIEW)
            gl.loadIdentity()
            gl.rotate(angleDeg, 0, 0, 1)
            gl.rotate(90, 1, 0, 0)
            gl.scale(0.01, 0.01, 0.01)
            meshShader.draw(mesh)
        })
        gl.popMatrix()

        gl.matrixMode(gl.PROJECTION)
        gl.loadIdentity()
        gl.perspective(70, gl.canvas.width / gl.canvas.height, 0.1, 1000)
        gl.lookAt(V(0, -2, 1), V(0.5,0,0), V3.Z)
        gl.matrixMode(gl.MODELVIEW)

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        texture.bind(0)
        overlay.bind(1)
        planeShader.uniforms({
            texture: 0,
            overlay: 1
        })

        gl.loadIdentity()
        //gl.rotate(angleDeg, 0, 0, 1)
        //gl.rotate(30 * DEG, 1, 0, 0)
        //gl.rotate(90, 0,0,1)
        planeShader.draw(cyl)

        gl.loadIdentity()
        gl.rotate(90, 1,0,0)
        gl.translate(0.5, 0)
        planeShader.draw(plane)
    })
}

async function shadowMap(gl: LightGLContext) {

    //const mesh = await fetch('dodecahedron.stl')
    //    .then(r => r.blob())
    //    .then(Mesh.fromBinarySTL)
    //    .then(mesh => mesh.translate(0,1,0).scale(5).compile())
    const mesh = Mesh.load(await fetch('cessna.json').then(r => r.json()))

    let angleX = 20
    let angleY = 20
    let useBoundingSphere = true
    const cube = Mesh.cube()
    const sphere = Mesh.sphere(2).computeWireframeFromFlatTriangles().compile()
    const plane = Mesh.plane().translate(-0.5, -0.5).scale(300, 300, 1)
    const depthMap = new Texture(1024, 1024, { format: gl.RGBA })
    const texturePlane = Mesh.plane()
    const boundingSphere = mesh.getBoundingSphere()
    const boundingBox = mesh.getAABB()
    const frustrumCube = Mesh.cube().scale(2).translate(V3.XYZ.negated())
    const colorShader = new Shader(`
  void main() {
    gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
  }
`, `
  uniform vec4 color;
  void main() {
    gl_FragColor = color;
  }
`)
    const depthShader = new Shader(`
  varying vec4 pos;
  void main() {
    gl_Position = pos = LGL_ModelViewProjectionMatrix * LGL_Vertex;
  }
`, `
  varying vec4 pos;
  void main() {
    float depth = pos.z / pos.w;
    gl_FragColor = vec4(depth * 0.5 + 0.5);
  }
`)
    const displayShader = new Shader(`
  uniform mat4 shadowMapMatrix;
  uniform vec3 light;
  varying vec4 coord;
  varying vec3 normal;
  varying vec3 toLight;
  void main() {
    toLight = light - (LGL_ModelViewMatrix * LGL_Vertex).xyz;
    normal = LGL_NormalMatrix * LGL_Normal;
    gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
    coord = shadowMapMatrix * gl_Position;
  }
`, `
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
`)
    const textureShader = new Shader(`
  varying vec2 coord;
  void main() {
    coord = LGL_TexCoord;
    gl_Position = vec4(coord * 2.0 - 1.0, 0.0, 1.0);
  }
`, `
  uniform sampler2D texture;
  varying vec2 coord;
  void main() {
    gl_FragColor = texture2D(texture, coord);
  }
`)

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
    gl.canvas.onkeydown = function(e) {
        useBoundingSphere = !useBoundingSphere
    }

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


    return gl.animate(function(abs, diff) {
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
        colorShader.uniforms({
            color: [1, 1, 0, 1]
        }).draw(sphere, gl.LINES)
        gl.popMatrix()

        gl.pushMatrix()
        gl.multMatrix(shadowMapMatrixInversed)
        colorShader.uniforms({
            color: [1, 1, 0, 1]
        }).draw(frustrumCube, gl.LINES)
        gl.popMatrix()

        // Draw the bounding volume
        gl.pushMatrix()
        if (useBoundingSphere) {
            gl.translate(boundingSphere.center)
            gl.scale(boundingSphere.radius)
            colorShader.uniforms({
                color: [0, 1, 1, 1]
            }).draw(sphere, gl.LINES)
        } else {
            gl.translate(boundingBox.min)
            gl.scale(boundingBox.size())
            colorShader.uniforms({
                color: [0, 1, 1, 1]
            }).draw(cube, gl.LINES)
        }
        gl.popMatrix()

        // Draw mesh
        depthMap.bind(0)
        displayShader.uniforms({
            shadowMapMatrix: shadowMapMatrix.times(gl.projectionMatrix.times(gl.modelViewMatrix).inversed()),
            light: gl.modelViewMatrix.transformPoint(light),
            depthMap: 0
        }).draw(mesh)

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

//function rayTracing() {
//
//
//    let angleX = 30
//    let angleY = 10
//    const gl = LightGLContext.create()
//    const mesh = Mesh.plane()
//    const shader = new Shader(`
//  uniform vec3 ray00;
//  uniform vec3 ray10;
//  uniform vec3 ray01;
//  uniform vec3 ray11;
//  varying vec3 initialRay;
//
//  void main() {
//    vec2 t = LGL_Vertex.xy * 0.5 + 0.5;
//    initialRay = mix(mix(ray00, ray10, t.x), mix(ray01, ray11, t.x), t.y);
//    gl_Position = LGL_Vertex;
//  }
//`, `
//  const float INFINITY = 1.0e9;
//  uniform vec3 eye;
//  varying vec3 initialRay;
//
//  float intersectSphere(vec3 origin, vec3 ray, vec3 sphereCenter, float sphereRadius) {
//    vec3 toSphere = origin - sphereCenter;
//    float a = dot(ray, ray);
//    float b = 2.0 * dot(toSphere, ray);
//    float c = dot(toSphere, toSphere) - sphereRadius * sphereRadius;
//    float discriminant = b * b - 4.0 * a * c;
//    if (discriminant > 0.0) {
//      float t = (-b - sqrt(discriminant)) / (2.0 * a);
//      if (t > 0.0) return t;
//    }
//    return INFINITY;
//  }
//
//  void main() {
//    vec3 origin = eye, ray = initialRay, color = vec3(0.0), mask = vec3(1.0);
//    vec3 sphereCenter = vec3(0.0, 1.6, 0.0);
//    float sphereRadius = 1.5;
//
//    for (int bounce = 0; bounce < 2; bounce++) {
//      /* Find the closest intersection with the scene */
//      float planeT = -origin.y / ray.y;
//      vec3 hit = origin + ray * planeT;
//      if (planeT < 0.0 || abs(hit.x) > 4.0 || abs(hit.z) > 4.0) planeT = INFINITY;
//      float sphereT = intersectSphere(origin, ray, sphereCenter, sphereRadius);
//      float t = min(planeT, sphereT);
//
//      /* The background is white */
//      if (t == INFINITY) {
//        color += mask;
//        break;
//      }
//
//      /* Calculate the intersection */
//      hit = origin + ray * t;
//      if (t == planeT) {
//        /* Look up the checkerboard color */
//        vec3 c = fract(hit * 0.5) - 0.5;
//        float checkerboard = c.x * c.z > 0.0 ? 1.0 : 0.0;
//        color += vec3(1.0, checkerboard, 0.0) * mask;
//        break;
//      } else {
//        /* Get the sphere color and reflect a new ray for the next iteration */
//        vec3 normal = (hit - sphereCenter) / sphereRadius;
//        ray = reflect(ray, normal);
//        origin = hit;
//        mask *= 0.8 * (0.5 + 0.5 * max(0.0, normal.y));
//      }
//    }
//
//    gl_FragColor = vec4(color, 1.0);
//  }
//`)
//
//
//    let lastPos = V3.O
//    // scene rotation
//    gl.canvas.onmousemove = function(e) {
//        const pagePos = V(e.pageX, e.pageY)
//        const delta = lastPos.to(pagePos)
//        if (e.buttons & 1) {
//            angleY += delta.x
//            angleX = clamp(angleX + delta.y, -90, 90)
//        }
//        lastPos = pagePos
//    }
//
//    return gl.animate(function(abs, diff) {
//        // Camera setup
//        gl.loadIdentity()
//        gl.translate(0, 0, -10)
//        gl.rotate(angleX, 1, 0, 0)
//        gl.rotate(angleY, 0, 1, 0)
//
//        // Get corner rays
//        const w = gl.canvas.width
//        const h = gl.canvas.height
//        const tracer = new Raytracer()
//        shader.uniforms({
//            eye: tracer.eye,
//            ray00: tracer.getRayForPixel(0, h),
//            ray10: tracer.getRayForPixel(w, h),
//            ray01: tracer.getRayForPixel(0, 0),
//            ray11: tracer.getRayForPixel(w, 0)
//        })
//
//        // Trace the rays
//        shader.draw(mesh)
//
//        // Draw debug output to show that the raytraced scene lines up correctly with
//        // the rasterized scene
//        gl.color(0, 0, 0, 0.5)
//        gl.enable(gl.BLEND)
//        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
//        gl.begin(gl.LINES)
//        for (let s = 4, i = -s; i <= s; i++) {
//            gl.vertex(-s, 0, i)
//            gl.vertex(s, 0, i)
//            gl.vertex(i, 0, -s)
//            gl.vertex(i, 0, s)
//        }
//        gl.end()
//        gl.disable(gl.BLEND)
//    })
//
//}

async function gpuLightMap(gl: LightGLContext) {
    // modified version of https://evanw.github.io/lightgl.js/tests/gpulightmap.html

    const gazebo = Mesh.load(await fetch('gazebo.json').then(response => response.json()))

    let angleX = 0
    let angleY = 0
    if (!gl.getExtension('OES_texture_float') || !gl.getExtension('OES_texture_float_linear')) {
        document.write('This demo requires the OES_texture_float and OES_texture_float_linear extensions to run')
        throw new Error('not supported')
    }
    const texturePlane = Mesh.plane()
    const textureShader = new Shader(`
  varying vec2 coord;
  void main() {
    coord = LGL_TexCoord;
    gl_Position = vec4(coord * 2.0 - 1.0, 0.0, 1.0);
  }
`, `
  uniform sampler2D texture;
  varying vec2 coord;
  void main() {
    gl_FragColor = texture2D(texture, coord);
  }
`)

    const texture = Texture.fromURL('texture.png')
    const depthMap = new Texture(1024, 1024, {format: gl.RGBA})
    const depthShader = new Shader(`
  varying vec4 pos;
  void main() {
    gl_Position = pos = LGL_ModelViewProjectionMatrix * LGL_Vertex;
  }
`, `
  varying vec4 pos;
  void main() {
    float depth = pos.z / pos.w;
    gl_FragColor = vec4(depth * 0.5 + 0.5);
  }
`)

    const shadowTestShader = new Shader(`
  uniform mat4 shadowMapMatrix;
  uniform vec3 light;
  attribute vec4 offsetPosition;
  varying vec4 shadowMapPos; // position inside the shadow map frustrum
  varying vec3 normal;

  void main() {
    normal = LGL_Normal;
    shadowMapPos = shadowMapMatrix * offsetPosition;
    gl_Position = vec4(LGL_TexCoord * 2.0 - 1.0, 0.0, 1.0);
  }
`, `
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
`)

    /**
     * Wrapper for a Mesh made only of quads (two triangles in a "square") and
     * an associated automatically UV-unwrapped texture.
     */
    class QuadMesh {
        mesh = new Mesh()
            .addVertexBuffer('normals', 'LGL_Normal')
            .addIndexBuffer('TRIANGLES')
            .addVertexBuffer('coords', 'LGL_TexCoord')
            .addVertexBuffer('offsetCoords', 'offsetCoord')
            .addVertexBuffer('offsetPositions', 'offsetPosition')
        index: int = 0
        lightmapTexture: Texture | undefined
        bounds: { center: V3, radius: number } | undefined
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
            [
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
                this.mesh.coords.push(
                    [rs0, rt0],
                    [rs1, rt0],
                    [rs0, rt1],
                    [rs1, rt1])

                const half = 1 / texelsPerSide

                const [a,b,c,d] = this.mesh.vertices.slice(i * 4, (i + 1) * 4)
                // Add fake positions
                function bilerp(x: number, y: number) {
                    return a.times((1-x)*(1-y)).plus(b.times(x*(1-y)))
                        .plus(c.times((1-x)*y)).plus(d.times(x*y))
                }

                this.mesh.offsetPositions.push(
                    bilerp(-half, -half),
                    bilerp(1 + half, -half),
                    bilerp(-half, 1 + half),
                    bilerp(1 + half, 1 + half))

                const s0 = (s + half) / quadsPerSide
                const t0 = (t + half) / quadsPerSide
                const s1 = (s + 1 - half) / quadsPerSide
                const t1 = (t + 1 - half) / quadsPerSide
                this.mesh.offsetCoords.push(
                    [s0, t0],
                    [s1, t0],
                    [s0, t1],
                    [s1, t1])

            }
            // Finalize mesh
            this.mesh.compile()
            this.bounds = this.mesh.getBoundingSphere()

            // Create textures
            const textureSize = quadsPerSide * texelsPerSide
            console.log('texture size: ' + textureSize)
            this.lightmapTexture = new Texture(textureSize, textureSize,
                {format: gl.RGBA, type: gl.FLOAT, filter: gl.LINEAR})
        }

        drawShadow(dir: V3) {
            // Construct a camera looking from the light toward the object
            const r = this.bounds!.radius, c = this.bounds!.center
            gl.matrixMode(gl.PROJECTION)
            gl.pushMatrix()
            gl.loadIdentity()
            gl.ortho(-r, r, -r, r, -r, r)
            gl.matrixMode(gl.MODELVIEW)
            gl.pushMatrix()
            gl.loadIdentity()
            const at = c.minus(dir)
            const useY = (dir.maxElement() != dir.z)
            const up = new V3(+!useY, 0, +useY).cross(dir)
            gl.lookAt(c, at, up)

            // Render the object viewed from the light using a shader that returns the fragment depth
            const mesh = this.mesh
            const shadowMapMatrix = gl.projectionMatrix.times(gl.modelViewMatrix)
            depthMap.drawTo(function (gl) {
                gl.enable(gl.DEPTH_TEST)
                gl.clearColor(1, 1, 1, 1)
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
                depthShader.draw(mesh)
            })

            //Run the shadow test for each texel in the lightmap and
            //accumulate that onto the existing lightmap contents
            const sampleCount = this.sampleCount++
            depthMap.bind(0)
            this.lightmapTexture!.drawTo(function (gl) {
                gl.enable(gl.BLEND)
                gl.disable(gl.CULL_FACE)
                gl.disable(gl.DEPTH_TEST)
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
                shadowTestShader.uniforms({
                    shadowMapMatrix: shadowMapMatrix,
                    sampleCount: sampleCount,
                    light: dir,
                }).draw(mesh)
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
    quadMesh.addCube(M4.multiplyMultiple(
        M4.translate(0, 0, -0.2),
        M4.rotateAB(V3.XYZ, V3.Z)))
    for (let i = 0; i < numArcQuads; i++) {
        const r = 0.4
        const t = i / numArcQuads * TAU
        const center = V(0, 0, Math.sqrt(3) / 2 - 0.2).plus(V(0, 1.5,0).times(Math.cos(t))).plus(V(1, 0,-1).toLength(1.5).times(Math.sin(t)))
        // const center = V3.sphere(0, (i + Math.random()) / numArcQuads * Math.PI)
        const a = V3.randomUnit()
        const b = V3.randomUnit().cross(a).unit()
        quadMesh.addCube(M4.multiplyMultiple(
            M4.translate(center),
            M4.forSys(a, b),
            M4.scale(r,r,r),
            M4.translate(-0.5,-0.5,-0.5)))
        // quadMesh.addDoubleQuad(
        //     center.minus(a).minus(b),
        //     center.minus(a).plus(b),
        //     center.plus(a).minus(b),
        //     center.plus(a).plus(b)
        // )
    }

    // Plane of quads
    for (let x = 0; x < groundTilesPerSide; x++) {
        for (let z = 0; z < groundTilesPerSide; z++) {
            const dx = x - groundTilesPerSide / 2
            const dz = z - groundTilesPerSide / 2
            quadMesh.addQuad(
                new V3(dx, dz, 0),
                new V3(dx + 1, dz, 0),
                new V3(dx, dz + 1, 0),
                new V3(dx + 1, dz + 1, 0)
            )
        }
    }
    quadMesh.compile(128)

// The mesh will be drawn with texture mapping
    const mesh = quadMesh.mesh
    const textureMapShader = new Shader(`
        attribute vec2 offsetCoord;
        varying vec2 coord;
        void main() {
            coord = offsetCoord;
            gl_Position = LGL_ModelViewProjectionMatrix * LGL_Vertex;
        }
`, `
        uniform sampler2D texture;
        varying vec2 coord;
        void main() {
            gl_FragColor = texture2D(texture, coord);
        }
`)


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

    let frame = 0
    return gl.animate(function (abs, diff) {
        frame++
         //if (frame % 60 != 0) return
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
        const dir = Math.random() < ambientFraction
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
