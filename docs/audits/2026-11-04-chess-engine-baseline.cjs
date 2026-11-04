// Diagnostic only. Runs the bundled engine's Node CLI; this is not browser timing.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const Module = require('node:module');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '../..');
const projectRequire = Module.createRequire(path.join(root, 'package.json'));
const ts = projectRequire('typescript');
const { Chess } = projectRequire('chess.js');
function loadSource(relative) {
  const filename = path.join(root, relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod.require = id => id === './chess-coach' ? loadSource('app/lib/chess-coach.ts') : projectRequire(id);
  mod._compile(compiled, filename);
  return mod.exports;
}
const { ChessEngine } = loadSource('app/lib/chess-engine.ts');
const { reviewMove } = loadSource('app/lib/chess-review.ts');
let processes = 0;
class CliWorker {
  constructor() {
    processes++;
    this.onmessage = null;
    this.onerror = null;
    this.process = spawn(process.execPath, [path.join(root, 'public/engine/stockfish-19-lite-single.js')], {
      stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true
    });
    let buffer = '';
    this.process.stdout.on('data', chunk => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        this.onmessage?.({ data: line });
      }
    });
    this.process.on('error', () => this.onerror?.({ preventDefault() {} }));
    this.process.stderr.on('data', chunk => { this.stderr = (this.stderr || '') + chunk; });
  }
  postMessage(command) { this.process.stdin.write(command + '\n'); }
  terminate() { this.process.kill(); }
}
function summary(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = p => +sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)].toFixed(1);
  return { count: sorted.length, min: +sorted[0].toFixed(1), median: percentile(.5), p95: percentile(.95), max: +sorted.at(-1).toFixed(1) };
}
const game = new Chess();
const san = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5'];
const moves = san.map(move => game.move(move));
async function run(mode, reuse, repetitions) {
  const rows = [], starts = [], batches = [];
  const processStart = processes;
  for (let run = 0; run < repetitions; run++) {
    let engine;
    const history = [];
    const batchStart = performance.now();
    let previous;
    try {
      for (let ply = 0; ply < moves.length; ply++) {
        const start = performance.now();
        let startup = 0;
        if (!engine) {
          engine = new ChessEngine(() => new CliWorker());
          await engine.ready;
          startup = performance.now() - start;
          starts.push(startup);
        }
        const reviewStart = performance.now();
        const result = await reviewMove(engine, moves[ply], history, mode, previous);
        rows.push({ run, ply, san: moves[ply].san, startupMs: +startup.toFixed(1), searchAndValidationMs: +(performance.now() - reviewStart).toFixed(1), totalMs: +(performance.now() - start).toFixed(1), depth: result.depth, grade: result.grade });
        previous = result;
        history.push(moves[ply].lan);
        if (!reuse) { engine.dispose(); engine = null; }
      }
    } finally { engine?.dispose(); }
    batches.push(performance.now() - batchStart);
  }
  return { mode, reuse, repetitions, processes: processes - processStart, startupMs: summary(starts), perPlyTotalMs: summary(rows.map(r => r.totalMs)), searchAndValidationMs: summary(rows.map(r => r.searchAndValidationMs)), batchMs: summary(batches), depth: summary(rows.map(r => r.depth)), rows };
}
(async () => {
  // Exercise OS file cache and JIT once before recording, then run alternating scenarios.
  const warmup = await run('live', true, 1);
  const results = [];
  for (let repeat = 0; repeat < 3; repeat++) {
    for (const reuse of (repeat % 2 ? [true, false] : [false, true])) results.push(await run('live', reuse, 1));
  }
  results.push(await run('review', true, 1));
  const groups = [false, true].map(reuse => {
    const group = results.filter(r => r.mode === 'live' && r.reuse === reuse);
    const rows = group.flatMap(r => r.rows);
    return { mode: 'live', reuse, processes: group.reduce((s, r) => s + r.processes, 0), perPlyTotalMs: summary(rows.map(r => r.totalMs)), startupMs: summary(rows.filter(r => r.startupMs > 0).map(r => r.startupMs)), searchAndValidationMs: summary(rows.map(r => r.searchAndValidationMs)), batchMs: summary(group.map(r => r.batchMs.median)), depth: summary(rows.map(r => r.depth)) };
  });
  const output = { date: '2026-11-04', sourceCommit: require('node:child_process').execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim(), node: process.version, platform: process.platform, method: 'Node CLI diagnostic using actual unmodified ChessEngine/reviewMove and bundled WASM; warm OS cache; 12 Ruy Lopez plies; 3 alternating fresh-process vs reused-process batches; no network, browser rendering, or mobile CPU throttle; reused engines retain transposition tables so grade/depth differences are recorded, not asserted equivalent', san, warmup: { processes: warmup.processes }, groups, results };
  const destination = path.join(root, 'docs/audits/2026-11-04-chess-engine-baseline.json');
  fs.writeFileSync(destination, JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify({ destination, groups, review: results.at(-1) }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
