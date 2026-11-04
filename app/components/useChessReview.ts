"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Move } from "chess.js";
import { ChessEngine } from "../lib/chess-engine";
import { reviewMove, type MoveReview, type ReviewMode } from "../lib/chess-review";

type Options = { enabled: boolean; mode: ReviewMode; epoch: number };
type Entry = { before: string; lan: string; quality: ReviewMode; result: MoveReview };
type Cache = { epoch: number; entries: readonly Entry[] };
type Halt = { epoch: number; mode: ReviewMode; error: string };
type Job = { epoch: number; mode: ReviewMode; moves: readonly Move[] };

function sharedLength(cache: Cache, epoch: number, moves: readonly Move[]) {
  if (cache.epoch !== epoch) return 0;
  let i = 0;
  while (i < moves.length && i < cache.entries.length &&
    cache.entries[i].before === moves[i].before && cache.entries[i].lan === moves[i].lan) i++;
  return i;
}

export function useChessReview(moves: readonly Move[], { enabled, mode, epoch }: Options) {
  const [snapshot, setSnapshot] = useState<Cache>({ epoch, entries: [] });
  const saved = useRef(snapshot);
  const active = useRef<Job | null>(null);
  const engine = useRef<ChessEngine | null>(null);
  const [halt, setHalt] = useState<Halt | null>(null);
  const [running, setRunning] = useState(false);
  const paused = halt?.epoch === epoch && halt.mode === mode;

  const cancel = useCallback(() => {
    active.current = null;
    engine.current?.dispose();
    engine.current = null;
  }, []);

  const stop = useCallback(() => {
    cancel();
    setHalt({ epoch, mode, error: "" });
    setRunning(false);
  }, [epoch, mode, cancel]);

  const restart = useCallback(() => { setHalt(null); }, []);

  useLayoutEffect(() => cancel, [cancel]);
  useLayoutEffect(() => {
    const existing = active.current;
    if (existing && enabled && !paused && existing.epoch === epoch && existing.mode === mode &&
      existing.moves.length <= moves.length &&
      existing.moves.every((m, i) => m.lan === moves[i].lan && m.before === moves[i].before)) {
      // A new ply extends the same queue. Let a slow search finish, then consume the appended tail.
      existing.moves = moves;
      return;
    }
    const previous = saved.current;
    const length = sharedLength(previous, epoch, moves);
    // An idle engine stays warm across appended moves and mode changes. In-flight
    // work, disabled sessions and rewritten history must relinquish ownership.
    if (existing || !enabled || paused || previous.epoch !== epoch || length < previous.entries.length) cancel();
    let entries = previous.entries.slice(0, length);
    function publish() {
      const cache = { epoch, entries };
      saved.current = cache;
      setSnapshot(cache);
    }
    if (previous.epoch !== epoch || length !== previous.entries.length) publish();

    const pending = moves.some((_, i) => !entries[i] || (mode === "review" && entries[i].quality !== "review"));
    if (!enabled || paused || !pending) {
      setRunning(false);
      return;
    }
    const job: Job = { epoch, mode, moves };
    active.current = job;
    setRunning(true);
    async function run() {
      let worker: ChessEngine | undefined;
      try {
        worker = engine.current ??= new ChessEngine();
        await worker.ready;
        const history: string[] = [];
        for (let i = 0; i < job.moves.length; i++) {
          if (active.current !== job) return;
          const move = job.moves[i];
          if (!entries[i] || (mode === "review" && entries[i].quality !== "review")) {
            const result = await reviewMove(worker, move, history, mode, entries[i - 1]?.result);
            if (active.current !== job) return;
            entries = [...entries];
            entries[i] = { before: move.before, lan: move.lan, quality: mode, result };
            publish();
          }
          history.push(move.lan);
        }
      } catch (reason) {
        if (active.current === job) {
          worker?.dispose();
          if (engine.current === worker) engine.current = null;
          setHalt({ epoch, mode, error: reason instanceof Error ? reason.message : "Analysis failed." });
        }
      } finally {
        if (active.current === job) {
          active.current = null;
          setRunning(false);
        }
      }
    }
    void run();
  }, [enabled, mode, epoch, moves, paused, cancel]);

  const visible = sharedLength(snapshot, epoch, moves);
  const entries = moves.map((_, i) => i < visible ? snapshot.entries[i] : undefined);
  const reviews = entries.map(entry => entry?.result);
  return { reviews, qualities: entries.map(entry => entry?.quality), running: enabled && !paused && running,
    completed: entries.filter(entry => entry && (mode === "live" || entry.quality === "review")).length,
    total: moves.length, error: paused ? halt.error : "", stop, restart };
}

export default useChessReview;
