import sourcemaps from 'rollup-plugin-sourcemaps'
import typescriptPlugin from 'rollup-plugin-typescript'
import nodeResolve from 'rollup-plugin-node-resolve'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'
import multiEntry from 'rollup-plugin-multi-entry'
import glsl from 'rollup-plugin-glsl'
import replace from 'rollup-plugin-replace'
import rollupJSON from 'rollup-plugin-json'
import alias from 'rollup-plugin-alias'
import * as typescript from 'typescript'
import * as fs from 'fs'

export default {
	input: 'src/demo/*.ts',
	output: {
		format: 'iife',
		file: 'dist/demo.js',
		name: 'demo',
		sourcemap: true,
	},
	external: [],
	plugins: [
		multiEntry(),
		nodeResolve({
			// use "module" field for ES6 module if possible
			module: true, // Default: true

			// use "jsnext:main" if possible
			// – see https://github.com/rollup/rollup/wiki/jsnext:main
			jsnext: true, // Default: false

			// use "main" field or index.js, even if it's not an ES6 module
			// (needs to be converted from CommonJS to ES6
			// – see https://github.com/rollup/rollup-plugin-commonjs
			// main: false, // Default: true

			// some package.json files have a `browser` field which
			// specifies alternative files to load for people bundling
			// for the browser. If that's you, use this option, otherwise
			// pkg.browser will be ignored
			browser: true, // Default: false

			// not all files you want to resolve are .js files
			extensions: ['.js', '.json'], // Default: ['.js']

			// whether to prefer built-in modules (e.g. `fs`, `path`) or
			// local ones with the same names
			preferBuiltins: false, // Default: true

			// Lock the module search in this path (like a chroot). Module defined
			// outside this path will be mark has external
			//   jail: '/my/jail/path', // Default: '/'

			// If true, inspect resolved files to check that they are
			// ES2015 modules
			// modulesOnly: true, // Default: false

			// Any additional options that should be passed through
			// to node-resolve
			//   customResolveOptions: {
			// 	moduleDirectory: 'js_modules'
			//   }
		}),
		replace({
			"process.env.NODE_ENV": JSON.stringify(process.env.BUILD || "development"),
		}),
		sourcemaps(),
		typescriptPlugin({
			typescript,
			declarationMap: undefined,
		}),
		alias({
			tsgl: __dirname + '/src/index',
		}),
		glsl({
			// By default, everything gets included
			include: 'src/**/*.glslx',

			// Undefined by default
			// exclude: ['**/index.html'],

			// Source maps are on by default
			// sourceMap: false
		}),
		rollupJSON(),
		process.env.ROLLUP_WATCH &&
			serve({
				open: true,
				openPage: '/demo.html',
				contentBase: '.',
			}),
			// 	{
			// 	contentBase: '.',
			// 	open: true,
			// 	host: 'localhost',
			// 	port: 10002
			// }
		process.env.ROLLUP_WATCH && livereload(),
	].filter(x => x),
	onwarn: function(warning, warn) {
		// Suppress this error message... there are hundreds of them. Angular team says to ignore it.
		// https://github.com/rollup/rollup/wiki/Troubleshooting#this-is-undefined
		if (warning.code === 'THIS_IS_UNDEFINED') {
			return
		}
		warn(warning)
	},
}
