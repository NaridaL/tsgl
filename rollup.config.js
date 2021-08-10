import glsl from "rollup-plugin-glsl"
import typescriptPlugin from "@rollup/plugin-typescript"
import { terser as terserPlugin } from "rollup-plugin-terser"
import typescript from "typescript"
import * as fs from "fs"

const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"))
export default {
  input: "src/index.ts",
  output: [
    ["es", false],
    ["es", true],
    ["umd", false],
    ["umd", true],
  ].map(([format, compress]) => ({
    format: format,
    entryFileNames: "[name].[format]" + (compress ? ".min" : "") + ".js",
    sourcemap: true,
    sourcemapExcludeSources: true,
    dir: "lib",
    name: pkg.umdGlobal,
    exports: "named",
    globals: pkg.umdGlobals,
    plugins: compress
      ? [
          terserPlugin({
            compress: {
              passes: 3,
              unsafe: true,
              ecma: 7,
            },
            toplevel: true,
            mangle: {
              properties: { regex: /^_/ },
            },
          }),
        ]
      : [],
  })),
  external: Object.keys(pkg.dependencies),
  plugins: [
    typescriptPlugin({ typescript }),
    glsl({
      // By default, everything gets included
      include: "src/**/*.glslx",

      // Undefined by default
      // exclude: ['**/index.html'],

      // Source maps are on by default
      // sourceMap: false
    }),
  ],
  onwarn: function (warning, warn) {
    // Suppress this error message... there are hundreds of them. Angular team says to ignore it.
    // https://github.com/rollup/rollup/wiki/Troubleshooting#this-is-undefined
    if ("THIS_IS_UNDEFINED" === warning.code) return
    if ("CIRCULAR_DEPENDENCY" === warning.code) {
      const m = warning.message.match(/^Circular dependency: (.*) -> .* -> .*$/)
      if (m) {
        const start = m[1]
        if (start.match(/out[/\\]index.js|src[/\\]index.ts/)) {
          // this is a loop of length three starting at the index file: don't warn
          return
        }
      }
    }

    warn(warning)
  },
}
