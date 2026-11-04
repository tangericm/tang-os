import { Chess } from "chess.js";
import type { ChessLevel } from "./chess-game";

export interface AnalysisLine {
  depth: number;
  score: { type: "cp" | "mate"; value: number };
  /** W + D/2 from Stockfish's WDL for the side to move at the search root. */
  points: number;
  pv: string[];
}
interface AnalysisOptions { multiPV: number; time: number; searchMoves?: readonly string[] }

type Search = {
  info?: (line: string) => void;
  finish: (best: string) => void;
  reject: (error: Error) => void;
  legal: readonly string[];
  timer: ReturnType<typeof setTimeout>;
};

const uciMove = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
function parseInfo(line: string): { rank: number; line: AnalysisLine } | undefined {
  if (/\b(upperbound|lowerbound)\b/.test(line)) return;
  const depth = Number(/\bdepth (\d+)\b/.exec(line)?.[1]);
  const rank = Number(/\bmultipv (\d+)\b/.exec(line)?.[1]);
  const score = /\bscore (cp|mate) (-?\d+)\b/.exec(line);
  const wdl = /\bwdl (\d+) (\d+) (\d+)\b/.exec(line);
  const pv = /\bpv (.+)$/.exec(line)?.[1].split(/\s+/);
  if (!depth || !rank || !score || !wdl || !pv?.every(move => uciMove.test(move))) return;
  const [win, draw, loss] = wdl.slice(1).map(Number);
  if (win + draw + loss !== 1000) return;
  return { rank, line: { depth, pv, score: { type: score[1] as "cp" | "mate", value: Number(score[2]) },
    points: (win + draw / 2) / 1000 } };
}

function legalVariation(fen: string, line: AnalysisLine): boolean {
  const game = new Chess(fen);
  try {
    for (const lan of line.pv) game.move({ from: lan.slice(0, 2), to: lan.slice(2, 4), promotion: lan[4] });
    return true;
  } catch { return false; }
}

/** A single-worker UCI client. Dispose cancels initialization and search together. */
export class ChessEngine {
  readonly ready: Promise<void>;
  private worker: Worker;
  private initialized = false;
  private disposed = false;
  private resolveReady!: () => void;
  private rejectReady!: (reason: Error) => void;
  private loadTimer: ReturnType<typeof setTimeout>;
  private search: Search | null = null;

  constructor(
    createWorker = () => new Worker("/engine/stockfish-19-lite-single.js"),
    private random = Math.random,
  ) {
    this.worker = createWorker();
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.loadTimer = setTimeout(() => this.fail(new Error("Stockfish took too long to load. Please retry.")), 15000);
    this.worker.onerror = (event) => {
      event.preventDefault();
      this.fail(new Error("Could not load Stockfish. Please retry."));
    };
    this.worker.onmessage = (event: MessageEvent) => {
      if (this.disposed || typeof event.data !== "string") return;
      for (const line of event.data.split(/\r?\n/)) this.receive(line.trim());
    };
    this.worker.postMessage("uci");
  }

  private receive(line: string) {
    if (line === "uciok") {
      this.worker.postMessage("setoption name Hash value 16");
      this.worker.postMessage("isready");
    } else if (line === "readyok") {
      clearTimeout(this.loadTimer);
      this.initialized = true;
      this.resolveReady();
    } else if (line.startsWith("info ") && this.search?.info) {
      this.search.info(line);
    } else if (line.startsWith("bestmove ") && this.search) {
      const search = this.search;
      this.search = null;
      clearTimeout(search.timer);
      const best = line.split(/\s+/)[1];
      if (!search.legal.includes(best)) {
        search.reject(new Error("Stockfish returned an invalid move. Please retry."));
        return;
      }
      search.finish(best);
    }
  }

  private assertIdle() {
    if (this.disposed) throw new Error("Search cancelled");
    if (!this.initialized) throw new Error("Stockfish is still loading");
    if (this.search) throw new Error("A search is already running");
  }

  private position(fen: string, history?: readonly string[]) {
    this.worker.postMessage(history
      ? `position startpos${history.length ? ` moves ${history.join(" ")}` : ""}`
      : `position fen ${fen}`);
  }

  private run(go: string, callbacks: Omit<Search, "timer">) {
    const timer = setTimeout(() => this.fail(new Error("Stockfish stopped responding. Please retry.")), 15000);
    this.search = { ...callbacks, timer };
    this.worker.postMessage(go);
  }

  async move(fen: string, level: ChessLevel, legal: readonly string[], history?: readonly string[]): Promise<string> {
    this.assertIdle();
    const limited = level.elo >= 1320;
    this.worker.postMessage("setoption name MultiPV value 1");
    this.worker.postMessage("setoption name UCI_ShowWDL value false");
    this.worker.postMessage(`setoption name UCI_LimitStrength value ${limited}`);
    this.worker.postMessage(limited ? `setoption name UCI_Elo value ${level.elo}` : "setoption name Skill Level value 0");
    this.position(fen, history);
    return new Promise((resolve, reject) => {
      this.run(`go movetime ${level.time}${level.depth ? ` depth ${level.depth}` : ""}`, {
        legal, reject, finish: best => resolve(level.mistakes && this.random() < level.mistakes
          ? legal[Math.floor(this.random() * legal.length)] : best),
      });
    });
  }

  async analyze(fen: string, legal: readonly string[], history: readonly string[] | undefined,
    { multiPV, time, searchMoves }: AnalysisOptions): Promise<AnalysisLine[]> {
    this.assertIdle();
    const candidates = searchMoves ?? legal;
    if (!Number.isInteger(multiPV) || multiPV < 1 || multiPV > 3 || !Number.isInteger(time) || time < 1 || time > 2000 ||
      !candidates.length || new Set(candidates).size !== candidates.length ||
      (searchMoves && searchMoves.some(move => !legal.includes(move)))) throw new Error("Invalid analysis request");
    const count = Math.min(candidates.length, multiPV);
    const depths = new Map<number, Map<number, AnalysisLine>>();
    this.worker.postMessage("setoption name UCI_LimitStrength value false");
    this.worker.postMessage("setoption name Skill Level value 20");
    this.worker.postMessage("setoption name UCI_ShowWDL value true");
    this.worker.postMessage(`setoption name MultiPV value ${count}`);
    this.position(fen, history);
    return new Promise((resolve, reject) => {
      this.run(`go movetime ${time}${searchMoves ? ` searchmoves ${searchMoves.join(" ")}` : ""}`, {
        legal: candidates, reject,
        info: text => {
          const parsed = parseInfo(text);
          if (!parsed || parsed.rank > count || !candidates.includes(parsed.line.pv[0])) return;
          const rows = depths.get(parsed.line.depth) ?? new Map<number, AnalysisLine>();
          rows.set(parsed.rank, parsed.line);
          depths.set(parsed.line.depth, rows);
        },
        finish: () => {
          for (const depth of [...depths.keys()].sort((a, b) => b - a)) {
            const rows = depths.get(depth)!;
            if (rows.size !== count) continue;
            const lines = Array.from({ length: count }, (_, index) => rows.get(index + 1)!);
            if (new Set(lines.map(line => line.pv[0])).size === count && lines.every(line => legalVariation(fen, line))) {
              resolve(lines);
              return;
            }
          }
          reject(new Error("Stockfish returned incomplete analysis. Please retry."));
        },
      });
    });
  }

  private fail(error: Error) {
    if (this.disposed) return;
    this.disposed = true;
    clearTimeout(this.loadTimer);
    this.rejectReady(error);
    if (this.search) {
      clearTimeout(this.search.timer);
      this.search.reject(error);
      this.search = null;
    }
    this.worker.onmessage = null;
    this.worker.onerror = null;
    this.worker.terminate();
  }

  dispose() { this.fail(new Error("Search cancelled")); }
}
