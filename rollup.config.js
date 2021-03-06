import sourcemaps from 'rollup-plugin-sourcemaps'
import glsl from 'rollup-plugin-glsl'
import * as fs from 'fs'

const pkg = JSON.parse(fs.readFileSync('package.json'))
export default {
	input: 'out/index.js',
	output: [
		{
			format: 'cjs',
			file: 'dist/bundle.js',
			sourcemap: true,
		},
		{
			format: 'es',
			sourcemap: true,
			file: 'dist/bundle.module.js',
		},
	],
	external: Object.keys(pkg.dependencies || {}),
	plugins: [
		sourcemaps(),
		glsl({
			// By default, everything gets included
			include: 'src/**/*.glslx',

			// Undefined by default
			// exclude: ['**/index.html'],

			// Source maps are on by default
			// sourceMap: false
		}),
	],
	onwarn: function(warning, warn) {
		// Suppress this error message... there are hundreds of them. Angular team says to ignore it.
		// https://github.com/rollup/rollup/wiki/Troubleshooting#this-is-undefined
		if ('THIS_IS_UNDEFINED' === warning.code) return
		if ('CIRCULAR_DEPENDENCY' === warning.code) return

		warn(warning)
	},
}
