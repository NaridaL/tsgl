import sourcemaps from 'rollup-plugin-sourcemaps'

export default {
	input: 'out/index.js',
	output: {format: 'umd', file: 'dist/bundle.js'},
	name: 'nla',
	sourcemap: true,
	external: Object.keys(JSON.parse(fs.readFileSync('package.json')).dependencies),
	plugins: [
		sourcemaps()
	],
	onwarn: function (warning) {
		// Suppress this error message... there are hundreds of them. Angular team says to ignore it.
		// https://github.com/rollup/rollup/wiki/Troubleshooting#this-is-undefined
		if (warning.code === 'THIS_IS_UNDEFINED') {
			return
		}
		console.error(warning.message)
	},
}
