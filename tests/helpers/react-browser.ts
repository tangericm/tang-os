import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

export function browserModule(name: string, filename: string, compile = true) {
  const raw = readFileSync(filename, "utf8");
  return browserSource(name, raw, compile);
}

export function browserSource(name: string, raw: string, compile = true) {
  const source = compile ? ts.transpileModule(raw, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText : raw;
  return `modules[${JSON.stringify(name)}]=function(require,exports,module){\n${source}\n};`;
}

/** Small isolated harness for the actual production React components/hooks. */
export function reactBrowserRuntime() {
  const packages = { react: "react", "react-dom": "react-dom", "react-dom/client": "react-dom-client", "react/jsx-runtime": "react-jsx-runtime", scheduler: "scheduler" };
  return `const modules={},cache={};function require(name){if(!cache[name]){const m=cache[name]={exports:{}};modules[name](require,m.exports,m);}return cache[name].exports;}
    ${Object.entries(packages).map(([name, file]) => browserModule(name,
      path.join(path.dirname(require.resolve(name.split("/")[0])), "cjs", `${file}.production.js`), false)).join("\n")}
    ${browserModule("chess.js", require.resolve("chess.js"), false)}`;
}
