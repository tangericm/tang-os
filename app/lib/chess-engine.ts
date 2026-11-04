import type { ChessLevel } from "./chess-game";

/** A single-worker UCI client. Dispose cancels initialization and search together. */
export class ChessEngine {
  readonly ready: Promise<void>;
  private worker: Worker;
  private initialized = false;
  private disposed = false;
  private resolveReady!: () => void;
  private rejectReady!: (reason: Error) => void;
  private loadTimer: ReturnType<typeof setTimeout>;
  private search: {
    resolve: (move: string) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
    legal: readonly string[];
    level: ChessLevel;
  } | null = null;

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
    } else if (line.startsWith("bestmove ") && this.search) {
      const search = this.search;
      this.search = null;
      clearTimeout(search.timer);
      const best = line.split(/\s+/)[1];
      if (!search.legal.includes(best)) {
        search.reject(new Error("Stockfish returned an invalid move. Please retry."));
        return;
      }
      const move = search.level.mistakes && this.random() < search.level.mistakes
        ? search.legal[Math.floor(this.random() * search.legal.length)] : best;
      search.resolve(move);
    }
  }

  move(fen: string, level: ChessLevel, legal: readonly string[], history?: readonly string[]): Promise<string> {
    if (this.disposed) return Promise.reject(new Error("Search cancelled"));
    if (!this.initialized) return Promise.reject(new Error("Stockfish is still loading"));
    if (this.search) return Promise.reject(new Error("A search is already running"));
    const limited = level.elo >= 1320;
    this.worker.postMessage(`setoption name UCI_LimitStrength value ${limited}`);
    this.worker.postMessage(limited ? `setoption name UCI_Elo value ${level.elo}` : "setoption name Skill Level value 0");
    this.worker.postMessage(history
      ? `position startpos${history.length ? ` moves ${history.join(" ")}` : ""}`
      : `position fen ${fen}`);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.fail(new Error("Stockfish stopped responding. Please retry.")), 15000);
      this.search = { resolve, reject, timer, legal, level };
      this.worker.postMessage(`go movetime ${level.time}${level.depth ? ` depth ${level.depth}` : ""}`);
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
