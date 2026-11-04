"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Chess, type Move, type Square } from "chess.js";
import ChessBoard from "./ChessBoard";
import { continuationMoves, describeMove, moveHint } from "../lib/chess-coach";
import { ChessEngine } from "../lib/chess-engine";
import { reviewMove, type MoveReview } from "../lib/chess-review";

export type Lesson = { kind: "best" | "played" | "practice"; move: Move; result: MoveReview; history: readonly string[] };
export type ChessMotion = "normal" | "fast" | "off";

type Props = { lesson: Lesson; flipped: boolean; active: boolean; motionStyle: ChessMotion; onClose: () => void };

/** Teaching owns a disposable board and a snapshot of the reviewed line. */
export default function ChessLesson({ lesson, flipped, active, motionStyle, onClose }: Props) {
  const { kind, move, result, history } = lesson;
  const practice = kind === "practice";
  const line = useMemo(() => continuationMoves(move.before, kind === "played" ? result.playedLine : result.bestLine), [move, result, kind]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hint, setHint] = useState(0);
  const [attempt, setAttempt] = useState<Move>();
  const [feedback, setFeedback] = useState("");
  const [checking, setChecking] = useState(false);
  const [motion, setMotion] = useState<Move>();
  const engine = useRef<ChessEngine | null>(null);
  const generation = useRef(0);
  const navigation = useRef<HTMLElement>(null);
  const section = useRef<HTMLElement>(null);
  const fen = practice ? attempt?.after ?? move.before : line[step - 1]?.after ?? move.before;
  const board = useMemo(() => new Chess(fen), [fen]);
  const motionMs = motionStyle === "fast" ? 160 : 240;

  function cancelAttempt() {
    generation.current++;
    engine.current?.dispose();
    engine.current = null;
  }
  useLayoutEffect(() => cancelAttempt, []);
  useEffect(() => {
    if (!active) {
      setPlaying(false); cancelAttempt(); setChecking(false);
      if (checking) setFeedback("Practice paused. Try again when you’re ready.");
    }
  }, [active]);
  useLayoutEffect(() => {
    if (!active) return;
    if (practice && !attempt) section.current?.querySelector<HTMLButtonElement>('.chess-square[tabindex="0"]')?.focus({ preventScroll: true });
    else if (!practice) navigation.current?.focus({ preventScroll: true });
  }, [active, practice, attempt]);
  useLayoutEffect(() => {
    if (active && practice && hint >= 2 && !attempt) section.current?.querySelector<HTMLButtonElement>('.chess-square[tabindex="0"]')?.focus({ preventScroll: true });
  }, [active, practice, hint, attempt]);
  useEffect(() => {
    const pause = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  useEffect(() => {
    if (!motion) return;
    const timer = setTimeout(() => setMotion(undefined), motionMs + 20);
    return () => clearTimeout(timer);
  }, [motion, motionMs]);
  function animate(next?: Move) {
    setMotion(motionStyle === "off" || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? undefined : next);
  }
  function go(next: number) {
    const bounded = Math.max(0, Math.min(next, line.length));
    animate(bounded === step + 1 ? line[bounded - 1] : undefined);
    setStep(bounded);
  }
  useEffect(() => {
    if (!playing || !active || practice) return;
    if (step >= line.length) { setPlaying(false); return; }
    const timer = setTimeout(() => { animate(line[step]); setStep(step + 1); }, 900);
    return () => clearTimeout(timer);
  }, [playing, active, practice, step, line, motionStyle]);

  async function tryMove(from: Square, to: Square, promotion?: string) {
    if (!active || checking || attempt || motion) return;
    const trial = new Chess(move.before).move({ from, to, promotion });
    setAttempt(trial); animate(trial);
    if (trial.lan === result.bestLan) { setFeedback("You found the suggested move. " + describeMove(trial)); return; }
    const token = ++generation.current;
    setChecking(true); setFeedback("Checking your idea…");
    try {
      const worker = new ChessEngine();
      engine.current = worker;
      await worker.ready;
      const reviewed = await reviewMove(worker, trial, history, "review");
      if (generation.current !== token) return;
      setFeedback(reviewed.depth >= 8 && reviewed.loss < .05 ? `Another good move. ${reviewed.explanation}`
        : reviewed.depth < 8 ? `This quick line is inconclusive. ${reviewed.explanation}` : `There is a stronger idea. ${reviewed.explanation}`);
    } catch {
      if (generation.current === token) setFeedback("This attempt could not be checked. Try again or view the suggested move.");
    } finally {
      if (generation.current === token) { engine.current?.dispose(); engine.current = null; setChecking(false); }
    }
  }

  const shown = practice ? attempt : line[step - 1];
  const suggested = practice && !attempt && hint >= 2 ? line[0] : !practice ? line[step] : undefined;
  const arrow = suggested ? { from: suggested.from, to: suggested.to, tone: kind === "played" && suggested.color !== move.color ? "danger" as const : "suggestion" as const } : undefined;

  return <section className="chess-lesson" ref={section} aria-label={practice ? "Practice position" : "Continuation"}>
    <ChessBoard game={board} player={move.color} flipped={flipped} disabled={!practice || !active || checking || Boolean(attempt)}
      motion={motion} lastMove={shown} arrow={arrow} onMove={tryMove} />
    <div className="chess-lesson-tools">
      <div className="chess-lesson-heading"><strong>{practice ? "Try the position" : kind === "best" ? "Suggested line" : "Your move’s continuation"}</strong>
        <button type="button" onClick={onClose}>Return to move</button></div>
      {practice ? <>
        <p className="chess-lesson-status" role="status">{feedback || (hint >= 2 && line[0] ? `Suggested move: ${line[0].san}, ${line[0].from} to ${line[0].to}. ${describeMove(line[0])}`
          : hint > 0 && line[0] ? moveHint(line[0]) : `Find a good move for ${move.color === "w" ? "White" : "Black"}.`)}</p>
        <div className="chess-lesson-actions">
          {attempt && <button type="button" onClick={() => { cancelAttempt(); setAttempt(undefined); setMotion(undefined); setChecking(false); setFeedback(""); }}>Try again</button>}
          {!attempt && hint < 2 && <button type="button" onClick={() => setHint(value => value + 1)}>{hint === 0 ? "Hint" : "Show suggested move"}</button>}
        </div>
      </> : <>
        <nav aria-label="Continuation navigation" tabIndex={-1} ref={navigation} onKeyDown={event => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault(); event.stopPropagation(); setPlaying(false); go(step + (event.key === "ArrowLeft" ? -1 : 1));
          }
        }}>
          <button type="button" aria-label="Start of continuation" disabled={step === 0} onClick={() => { setPlaying(false); go(0); }}>↤</button>
          <button type="button" aria-label="Previous continuation move" disabled={step === 0} onClick={() => { setPlaying(false); go(step - 1); }}>←</button>
          <button type="button" aria-label={playing ? "Pause continuation" : "Play continuation"} disabled={!line.length} aria-pressed={playing}
            onClick={() => { if (step === line.length) go(0); setPlaying(value => !value); }}>{playing ? "Ⅱ" : "▶"}</button>
          <button type="button" aria-label="Next continuation move" disabled={step === line.length} onClick={() => { setPlaying(false); go(step + 1); }}>→</button>
          <span>{step} / {line.length}</span>
        </nav>
        <div className="chess-line-notation" aria-label="Continuation moves">{line.map((reply, i) => <button type="button" key={i}
          aria-label={`${reply.before.split(" ")[5]}${reply.color === "w" ? "." : "…"}${reply.san}`}
          aria-current={step === i + 1 ? "step" : undefined} onClick={() => { setPlaying(false); go(i + 1); }}>{reply.san}</button>)}</div>
        <p className="chess-lesson-status" role="status">{shown ? describeMove(shown) : line.length ? "Explore the engine’s suggested continuation." : "No continuation is available for this position."}</p>
      </>}
    </div>
  </section>;
}
