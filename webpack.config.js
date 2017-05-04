var path = require('path')

module.exports = {
	entry: "./src/index.ts",
	output: {
		// export itself to a global var
		libraryTarget: "umd",
		// name of the global var: "Foo"
		library: "ts3dutils",

		filename: "dist/bundle.js",
		sourceMapFilename: "[file].map"
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: 'ts-loader',
				exclude: /node_modules/,
			}
		]
	},
	resolve: {
		modules: ["."],
		extensions: [".tsx", ".ts", ".js"]
	},
	devtool: 'source-map'
};