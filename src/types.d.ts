declare module "*.json" {
  const x: any
  export = x
}
declare module "*.stl" {
  const x: Blob
  export = x
}
declare module "gl-format-compiler-error" {
  function formatCompilerError(
    errLog: string,
    src: string,
    type: number,
  ): { long: string; short: string }
  export default formatCompilerError
}
