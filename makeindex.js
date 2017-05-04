/**
 * Created by aval on 04.05.2017.
 */
const fs = require('fs')

const path = process.argv[2]
function walkSync(dir, filelist) {
	var fs = fs || require('fs'),
		files = fs.readdirSync(dir);
	filelist = filelist || [];
	files.forEach(function(file) {
		if (fs.statSync(dir + file).isDirectory()) {
			filelist = walkSync(dir + file + '/', filelist);
		}
		else {
			filelist.push(file);
		}
	});
	return filelist;
};
const index = [].concat.apply([], walkSync('./src/')
	.filter(file => file !== 'index.ts' && file.match(/\.ts|.tsx$/))
	.map(file => {
		const [, name, extension] = file.match((/(.*)(\.ts|.tsx)$/))
		return [`export {default as ${name}} from './${name}'`,
				`export * from './${name}'`]
	}))
	.join('\n')
fs.writeFileSync('./src/index.ts', index)