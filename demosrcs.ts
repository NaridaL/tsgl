// import * as ts from 'typescript'
import * as fs from "fs"
import * as path from "path"
// const program = ts.createProgram(['src/demo.ts'], {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS})
// // const sf = ts.createSourceFile('src/demo.ts', fs.readFileSync('src/demo.ts', 'utf8'), ts.ScriptTarget.ES2015, /*setParentNodes */ true)
// const sf = program.getSourceFiles().find(sf => !!sf.fileName.match("demo.ts"))
// const checker = program.getTypeChecker()
// type LACP = ts.LineAndCharacter & {pos: number}
// const map: {[k: string]: {start: LACP, end: LACP, name: string, doc: string}} = {}
// const blackList = ["ballGrid", "grid3d"]
// ts.forEachChild(sf, node => {
// 	// console.log(ts.SyntaxKind[node.kind], node)
// 	if (ts.isFunctionDeclaration(node)) {
// 		const symbol = checker.getSymbolAtLocation(node.name)
// 		const doc = ts.displayPartsToString(symbol.getDocumentationComment())
// 		const start = ts.getLineAndCharacterOfPosition(sf, node.getStart()) as LACP
// 		start.pos = node.getStart()
// 		const end = ts.getLineAndCharacterOfPosition(sf, node.getEnd()) as ts.LineAndCharacter & {pos: number}
// 		end.pos = node.getEnd()
// 		const name = node.name.getText()
// 		if (blackList.includes(name)) return
// 		map[name] = {start, end, name, doc}
// 	}

// })
const srcFiles = fs.readdirSync("src/demo").filter((f) => f !== "tsconfig.json")
const mdTable =
  "<!--- DEMO-TABLE-START --->\n" +
  "||||\n" +
  "--- | --- | ---\n" +
  srcFiles
    .map((fileName) => {
      const name = path.parse(fileName).name
      const fileContents = fs.readFileSync("./src/demo/" + fileName, "utf8")
      console.log(fileName)
      const match = fileContents.match(/\/\*\*[\s\S]*?\*\//gm)[0]
      const doc = match
        .split(/\r?\n/)
        .slice(1, match[0].length - 2)
        .map((line) => line.trim().substr(2).trim())
        .join("\n")
      console.log(doc)
      return `[${name}](https://naridal.github.io/tsgl/demo.html#${name}) | [src](./src/demo/${name}.ts) | ${doc}\n`
    })
    .join("") +
  "<!--- DEMO-TABLE-END --->\n"

// console.log(map)
// fs.writeFileSync('src/demolines.json', "/* autogenerated by demosrcs.ts */" + JSON.stringify(map), 'utf8')

let readme = fs.readFileSync("readme.md", "utf8") as string
readme = readme.replace(
  /<!--- DEMO-TABLE-START [^]* DEMO-TABLE-END --->/,
  mdTable,
)
fs.writeFileSync("readme.md", readme, "utf8")
