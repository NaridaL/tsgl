import * as opentype from "opentype.js"
const font = opentype.loadSync("font/OpenSans-Regular.ttf")
console.log(
	JSON.stringify({
		ascender: (24 * font.ascender) / font.unitsPerEm,
		descender: (24 * font.descender) / font.unitsPerEm,
	}),
)
console.log(Object.keys(font))
