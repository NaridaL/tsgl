import { color } from "chroma.ts"
import { V, V3 } from "ts3dutils"
import { TSGLContext } from "tsgl"

/**
 * Render SDF text.
 */
export async function renderText(gl: TSGLContext) {
  gl.clearColor(1, 1, 1, 1)
  await gl.setupTextRendering(
    "font/OpenSans-Regular.png",
    "font/OpenSans-Regular.json",
  )

  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE)

  gl.enable(gl.BLEND)

  // setup camera
  gl.matrixMode(gl.PROJECTION)
  gl.loadIdentity()
  gl.perspective(70, gl.canvas.width / gl.canvas.height, 0.1, 1000)
  gl.lookAt(V(0, 0, 15), V3.O, V3.Y)
  gl.matrixMode(gl.MODELVIEW)

  gl.enable(gl.DEPTH_TEST)

  return gl.animate(function (abs, _diff) {
    const angleDeg = Math.sin(abs / 10000) * 15
    const textColor = color("brown").darker().gl()
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.loadIdentity()
    gl.rotate(angleDeg, 1, 1, 0)

    gl.pushMatrix()
    gl.translate(-18, 8)
    ;[0, 0.05, 0.1, 0.15, 0.2, 0.5].forEach((gamma) => {
      gl.renderText(
        "sdf text w/ gamma=" + gamma,
        textColor,
        1,
        "left",
        "top",
        gamma,
      )
      gl.translate(0, -1)
    })
    gl.popMatrix()

    gl.pushMatrix()

    gl.translate(-18, 0)
    gl.renderText(
      "This text has\nmultiple newlines\nand a line height of 1.2.",
      [1, 0, 0, 1],
      1,
      "left",
      "middle",
      undefined,
      1.2,
    )

    gl.translate(0, -5)
    gl.renderText("VERY LARGE", [1, 0, 0, 1], 3, "left", "middle")

    gl.translate(0, -3)
    gl.renderText(
      "This text is very small yet remains legible. gamma=0.15",
      [1, 0, 0, 1],
      0.25,
      "left",
      "middle",
      0.15,
    )

    gl.popMatrix()

    gl.pushMatrix()
    gl.translate(0, 8)
    ;["top", "middle", "alphabetic", "bottom"].forEach((baseline) => {
      gl.begin(gl.LINES)
      gl.color("green")
      gl.vertex(0, 0, 0)
      gl.vertex(20, 0, 0)
      gl.vertex(0, -1, 0)
      gl.vertex(0, 1, 0)
      gl.end()

      gl.renderText(
        'baseline="' + baseline + '"|{}() ABC XYZ yjg Ẫß',
        color("blue").gl(),
        1,
        "left",
        baseline as any,
      )

      gl.translate(0, -2.2)
    })
    gl.popMatrix()

    gl.pushMatrix()
    gl.translate(10, -2)
    ;["left", "center", "right"].forEach((align) => {
      gl.begin(gl.LINES)
      gl.color("red")
      gl.vertex(-10, 0, 0)
      gl.vertex(10, 0, 0)
      gl.vertex(0, -1, 0)
      gl.vertex(0, 1, 0)
      gl.end()

      gl.renderText(
        'align="' + align + '"',
        color("blue").gl(),
        1,
        align as any,
        "alphabetic",
      )

      gl.translate(0, -2.2)
    })
    gl.popMatrix()
  })
}
