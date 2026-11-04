"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { Chess, type Color, type Move, type Square } from "chess.js";
import Window from "./Window";
import ChessBoard from "./ChessBoard";
import ChessPiece from "./ChessPiece";
import ChessReviewPanel from "./ChessReviewPanel";
import ChessLesson, { type Lesson, type ChessMotion } from "./ChessLesson";
import { useChessReview } from "./useChessReview";
import { CHESS_LEVELS, gameStatus, undoTurn, type ChessLevel } from "../lib/chess-game";
import { ChessEngine } from "../lib/chess-engine";
import { GRADE_SYMBOLS } from "../lib/chess-grades";
import "./chess.css";

type Props = Omit<ComponentProps<typeof Window>, "title" | "children" | "frameClassName"> & { active?: boolean };
type Dialog = "new" | "difficulty" | "display" | "resign" | "help" | null;
const paths = {
  plus: "M12 5v14M5 12h14", undo: "m8 4-5 5 5 5M4 9h9a7 7 0 0 1 0 14",
  flip: "M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4", more: "M5 12h.01M12 12h.01M19 12h.01",
  spark: "m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z",
  first: "M5 5v14m12-14-8 7 8 7", prev: "m15 5-8 7 8 7", next: "m9 5 8 7-8 7", last: "M19 5v14M7 5l8 7-8 7",
} as const;

function Icon({ name }: { name: keyof typeof paths }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor"
    strokeWidth={name === "more" ? 3.5 : 1.7} strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}
function notation(move: Move) {
  return `${move.before.split(" ")[5]}${move.color === "w" ? "." : "…"}${move.san}`;
}

export default function GameWindow({ active = true, ...props }: Props) {
  const [game] = useState(() => new Chess());
  const [revision, setRevision] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const history = useMemo(() => game.history({ verbose: true }), [game, revision]);
  const [player, setPlayer] = useState<Color>("w");
  const [level, setLevel] = useState<ChessLevel>(CHESS_LEVELS[1]);
  const [draftSide, setDraftSide] = useState<Color>("w");
  const [draftLevel, setDraftLevel] = useState<ChessLevel>(CHESS_LEVELS[1]);
  const [flipped, setFlipped] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);
  const [resigned, setResigned] = useState(false);
  const [review, setReview] = useState(false);
  const [selected, setSelected] = useState(-1);
  const [inspected, setInspected] = useState<number | null>(null);
  const [showBest, setShowBest] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [motionStyle, setMotionStyle] = useState<ChessMotion>("normal");
  const [motion, setMotion] = useState<Move>();
  const [engineState, setEngineState] = useState("ready");
  const [engineError, setEngineError] = useState("");
  const [retry, setRetry] = useState(0);
  const historyRef = useRef<HTMLOListElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const over = resigned || game.isGameOver();
  const browsing = review || inspected !== null || showBest || lesson !== null;
  const paused = !active || dialog !== null || browsing;
  const analysis = useChessReview(history, { enabled: active && !dialog && lesson?.kind !== "practice", mode: review ? "review" : "live", epoch });
  const coachIndex = inspected ?? history.findLastIndex(move => move.color === player);
  const ply = review ? selected : coachIndex;
  const current = history[ply];
  const grade = analysis.reviews[ply];
  const alternative = Boolean(showBest && grade && current);
  const displayFen = alternative ? current.before : browsing ? current?.after ?? history[0]?.before : undefined;
  const boardGame = useMemo(() => displayFen ? new Chess(displayFen) : game, [displayFen, game]);
  const arrow = alternative && grade ? { from: grade.bestLan.slice(0, 2) as Square, to: grade.bestLan.slice(2, 4) as Square } : undefined;

  function record(move: Move) {
    setMotion(motionStyle === "off" || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? undefined : move);
    setRevision(n => n + 1);
  }
  useEffect(() => {
    if (!motion) return;
    const timer = setTimeout(() => setMotion(undefined), motionStyle === "fast" ? 180 : 260);
    return () => clearTimeout(timer);
  }, [motion, motionStyle]);

  // One turn owns its search and its pacing timer. Navigation, undo and setup cancel both.
  useLayoutEffect(() => {
    setEngineError("");
    if (paused || over) { setEngineState("paused"); return; }
    if (game.turn() === player) { setEngineState("ready"); return; }
    let cancelled = false;
    let worker: ChessEngine | undefined;
    let release!: () => void;
    const pace = new Promise<void>(resolve => { release = resolve; });
    const timer = setTimeout(release, 1250);
    const fen = game.fen();
    setEngineState("loading");
    async function search() {
      try {
        worker = new ChessEngine();
        await worker.ready;
        if (cancelled) return;
        setEngineState("thinking");
        const lan = await worker.move(fen, level, game.moves({ verbose: true }).map(m => m.lan), history.map(m => m.lan));
        await pace;
        if (cancelled || game.fen() !== fen) return;
        record(game.move({ from: lan.slice(0, 2), to: lan.slice(2, 4), promotion: lan[4] }));
      } catch (e) {
        if (!cancelled) {
          setEngineState("error");
          setEngineError(e instanceof Error ? e.message : "Stockfish could not finish this turn.");
        }
      } finally {
        worker?.dispose();
        clearTimeout(timer);
      }
    }
    void search();
    return () => { cancelled = true; clearTimeout(timer); release(); worker?.dispose(); };
  }, [game, history, level, over, paused, player, retry, motionStyle]);

  useLayoutEffect(() => {
    const node = dialogRef.current;
    if (!active) { setDialog(null); setMenu(false); }
    if (active && dialog) { if (node && !node.open) node.showModal(); }
    else if (node?.open) node.close();
  }, [active, dialog]);
  useEffect(() => {
    if (!menu) return;
    function outside(e: PointerEvent) { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") { setMenu(false); menuButton.current?.focus(); }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [menu]);
  useEffect(() => {
    if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [history]);

  useEffect(() => {
    if (review) navigationRef.current?.focus({ preventScroll: true });
  }, [review]);

  function live() {
    setReview(false); setInspected(null); setShowBest(false); setLesson(null);
  }
  function openReview() {
    setMenu(false); setMotion(undefined); setInspected(null); setShowBest(false); setLesson(null);
    setSelected(history.length - 1); setReview(true);
  }
  function navigate(index: number) {
    setSelected(Math.max(-1, Math.min(index, history.length - 1))); setShowBest(false); setLesson(null);
  }
  function openDialog(next: Dialog) {
    setMenu(false); setLesson(null); setMotion(undefined);
    if (next === "new" || next === "difficulty") { setDraftLevel(level); setDraftSide(player); }
    setDialog(next);
  }
  function startGame() {
    game.reset(); setPlayer(draftSide); setLevel(draftLevel); setFlipped(draftSide === "b");
    setMotion(undefined); setResigned(false); setDialog(null); live();
    setEpoch(n => n + 1); setRevision(n => n + 1);
  }
  function undo() {
    if (!undoTurn(game, player)) return;
    setMotion(undefined); setResigned(false); live(); setRevision(n => n + 1);
  }
  function selectHistory(index: number) {
    setLesson(null);
    if (review) navigate(index);
    else { setInspected(index); setMotion(undefined); setShowBest(false); }
  }
  function openLesson(kind: Lesson["kind"]) {
    if (!current || !grade) return;
    setShowBest(false); setMotion(undefined);
    setLesson({ kind, move: current, result: grade, history: history.slice(0, ply).map(move => move.lan) });
  }
  function moveButton(index: number) {
    const move = history[index], result = analysis.reviews[index];
    if (!move) return "…";
    return <button type="button" aria-label={`${notation(move)}${result ? ` · ${result.grade}` : ""}`}
      aria-pressed={browsing && index === ply} onClick={() => selectHistory(index)}>
      {move.san}{result && <b data-grade={result.grade.toLowerCase()} aria-hidden="true">{GRADE_SYMBOLS[result.grade]}</b>}
    </button>;
  }
  const status = resigned ? "You resigned — Stockfish wins" : gameStatus(game, player);
  const badgeIndex = browsing ? ply : history.length - 1;
  const badgeMove = history[badgeIndex], badgeGrade = analysis.reviews[badgeIndex];
  const badge = badgeMove && badgeGrade && !alternative ? { square: badgeMove.to, grade: badgeGrade.grade, key: `${epoch}-${badgeIndex}-${badgeMove.lan}` } : undefined;
  const opponent = player === "w" ? "b" : "w";
  const visibleHistory = browsing ? history.slice(0, Math.max(0, ply + (alternative ? 0 : 1))) : history;
  const captured = visibleHistory.filter(m => m.color === player && m.captured);
  const coachOwner = current?.color === player ? "Your" : "Stockfish’s";
  const dialogName = dialog === "new" ? "New game" : dialog === "difficulty" ? "Opponent level" : dialog === "display" ? "Board settings" : dialog === "resign" ? "Resign game?" : "Help & engine";

  return <Window title="Chess" frameClassName="window-game" {...props}>
    <div className="chess" data-reviewing={review} data-lesson={Boolean(lesson)} data-motion={motionStyle} onKeyDownCapture={event => {
      if (!review || dialog || lesson || event.nativeEvent.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof HTMLElement && event.target.closest("input, select, textarea")) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault(); event.stopPropagation(); navigate(selected + (event.key === "ArrowLeft" ? -1 : 1));
      }
    }}>
      <div className="chess-toolbar">
        {browsing ? <button type="button" className="chess-back" onClick={() => { live(); menuButton.current?.focus(); }}><Icon name="prev"/>Back to game</button>
          : <button type="button" className="chess-new" onClick={() => openDialog("new")}><Icon name="plus" /> New game</button>}
        <div className="chess-tools">
          <button type="button" className="chess-icon-button" aria-label="Undo turn" title="Undo turn"
            disabled={!history.some(m => m.color === player) || review || Boolean(lesson)} onClick={undo}><Icon name="undo" /></button>
          <button type="button" className="chess-icon-button" aria-label="Flip board" title="Flip board" onClick={() => setFlipped(value => !value)}><Icon name="flip" /></button>
          <div className="chess-menu-wrap" ref={menuRef}>
            <button type="button" className="chess-icon-button" ref={menuButton} aria-label="More options" title="More options"
              aria-expanded={menu} onClick={() => setMenu(value => !value)}><Icon name="more" /></button>
            {menu && <div className="chess-menu" role="group" aria-label="Chess options">
              <button type="button" onClick={() => openDialog("difficulty")}>Opponent level</button>
              <button type="button" onClick={() => openDialog("display")}>Board settings</button>
              {!review && <button type="button" disabled={!history.length} onClick={openReview}>Review game</button>}
              {!over && <button type="button" onClick={() => openDialog("resign")}>Resign</button>}
              <button type="button" onClick={() => openDialog("help")}>Help &amp; engine</button>
            </div>}
          </div>
        </div>
      </div>
      <div className="chess-layout">
        <div className="chess-table">
          <div className="chess-player">
            <span className="chess-avatar"><ChessPiece type="n" color={opponent} /></span>
            <div><strong>Stockfish</strong><small>{level.label} · ≈{level.elo} Elo</small></div>
            <span className="chess-engine-state" data-state={engineState}>
              {engineState === "thinking" ? <>Thinking<span className="chess-thinking" aria-hidden="true"><i /><i /><i /></span></> :
                engineState === "loading" ? "Loading…" : engineState === "error" ? "Offline" : ""}
            </span>
          </div>
          {lesson ? <ChessLesson key={`${epoch}-${ply}-${lesson.kind}`} lesson={lesson} flipped={flipped} active={active && !dialog}
            motionStyle={motionStyle} onClose={() => { setLesson(null); menuButton.current?.focus({ preventScroll: true }); }} /> :
          <ChessBoard key={epoch} game={boardGame} player={player} flipped={flipped} lastMove={alternative ? undefined : browsing ? current : history.at(-1)}
            disabled={paused || over || engineState === "error"} motion={browsing ? undefined : motion} badge={badge} arrow={arrow}
            onMove={(from, to, promotion) => { if (!paused && !over && !motion && game.turn() === player) record(game.move({ from, to, promotion })); }} />}
          {!lesson && <div className="chess-player chess-you">
            <span className="chess-avatar"><ChessPiece type="k" color={player} /></span>
            <strong>You</strong>
            <div className="chess-captured" aria-label={`You captured ${captured.length} pieces`}>
              {captured.map((m, i) => <ChessPiece key={i} type={m.captured!} color={opponent} />)}
            </div>
            {!browsing && <div className="chess-status" role="status">
              {engineError ? "Engine unavailable — retry to continue" : engineState === "thinking" || engineState === "loading" ? "Stockfish is thinking…" : status}
            </div>}
          </div>}
          {lesson ? null : review ? <nav className="chess-review-nav" aria-label="Review navigation" aria-keyshortcuts="ArrowLeft ArrowRight" tabIndex={-1} ref={navigationRef}>
            {(["first","prev","next","last"] as const).map((name,i) => <button key={name} type="button"
              className="chess-icon-button" aria-label={["First position","Previous move","Next move","Last position"][i]}
              disabled={i < 2 ? selected === -1 : selected >= history.length - 1}
              onClick={() => navigate([-1,selected - 1,selected + 1,history.length - 1][i])}><Icon name={name} /></button>)}
            <span>{selected + 1} / {history.length}</span>
          </nav> : browsing ? <div className="chess-status">
            <span>{alternative ? "Suggested move" : "Earlier position"} · {current && notation(current)}</span>
          </div> : null}
          {engineError && <div className="chess-error" role="alert"><p>{engineError}</p>
            <button type="button" onClick={() => setRetry(value => value + 1)}>Retry engine</button></div>}
        </div>
        <aside className="chess-sidebar" aria-label="Game details">
          {review ? <ChessReviewPanel moves={history} reviews={analysis.reviews} selected={selected} onSelect={navigate}
            running={analysis.running} completed={analysis.completed} quality={analysis.qualities[selected]} error={analysis.error} onStop={analysis.stop}
            onRestart={analysis.restart} showBest={alternative} onToggleBest={() => { setLesson(null); setShowBest(value => !value); }}
            onLesson={openLesson} lessonOpen={Boolean(lesson)} /> : <>
            {over && <div className="chess-result"><strong>{status}</strong><p>{history.length} {history.length === 1 ? "move" : "moves"} played</p>
              <button type="button" onClick={openReview}>Review game</button></div>}
            <section className="chess-coach" aria-label="Coach" aria-live="polite" aria-atomic="true">
              <div className="chess-coach-title"><Icon name="spark" /><h3>Coach</h3><small>Live</small></div>
              {current && grade ? <div key={`${epoch}-${ply}-${current.lan}`} className="chess-coach-feedback">
                <div className="chess-coach-grade" data-grade={grade.grade.toLowerCase()}>
                  <b className="chess-grade-symbol">{GRADE_SYMBOLS[grade.grade]}</b><strong>{grade.grade}</strong>
                  <small>{coachOwner} {notation(current)}</small>
                </div>
                <p>{grade.explanation}</p>
                {grade.bestLan !== current.lan && !alternative && <button type="button" className="chess-text-button"
                  disabled={Boolean(lesson)} onClick={() => setShowBest(true)}>Try {grade.bestSan}</button>}
                <div className="chess-coach-actions"><button type="button" className="chess-text-button" disabled={Boolean(lesson)} onClick={() => openLesson("best")}>Show line</button>
                  <button type="button" className="chess-text-button" disabled={Boolean(lesson)} onClick={() => openLesson("practice")}>Try again</button></div>
              </div> : <p className="chess-coach-placeholder">{current ? (analysis.error ? "Move grade unavailable." : "Looking at your move…") :
                "Play a move to see your coach’s feedback."}</p>}
              {analysis.error && <button type="button" className="chess-text-button" title={analysis.error} onClick={analysis.restart}>Retry analysis</button>}
              <details className="chess-grade-info"><summary>About grades</summary>
                <p>Full-strength Stockfish estimates, independent of opponent difficulty. Grades can change with search depth. Brilliant and Great use conservative checks. These are TangOS grades, not Chess.com’s classifications.</p></details>
            </section>
          </>}
          <div className="chess-history-heading"><h3>Moves</h3><span>{Math.ceil(history.length / 2)} played</span></div>
          <ol className="chess-history" aria-label="Move history" ref={historyRef}>
            {history.filter((_, i) => i % 2 === 0).map((_, i) => <li key={i}><span>{i + 1}.</span>
              <span>{moveButton(i * 2)}</span><span>{moveButton(i * 2 + 1)}</span></li>)}
          </ol>
          {!history.length && <p className="chess-empty">No moves yet.</p>}
        </aside>
      </div>
      <p id="chess-keyboard-help" className="sr-only">Use arrow keys to navigate the board. Press Enter to select a piece and its destination.</p>
      <dialog className="chess-dialog" aria-label={dialogName} ref={dialogRef}
        onCancel={event => { event.preventDefault(); setDialog(null); }}>
        {dialog === "new" || dialog === "difficulty" ? <>
          <h2>{dialog === "new" ? "New game" : "Opponent level"}</h2>
          <fieldset className="chess-levels"><legend>Difficulty</legend>{CHESS_LEVELS.map(item => <label key={item.id}>
            <input type="radio" name="chess-level" checked={item === draftLevel} onChange={() => setDraftLevel(item)} />
            <span><strong>{item.label}</strong><small>≈{item.elo} Elo</small></span></label>)}</fieldset>
          {dialog === "new" && <fieldset className="chess-sides"><legend>Play as</legend>{(["w","b"] as const).map(color => <label key={color}>
            <input type="radio" name="chess-side" checked={color === draftSide} onChange={() => setDraftSide(color)} />
            <span><ChessPiece type="k" color={color} />{color === "w" ? "White" : "Black"}</span></label>)}</fieldset>}
          {history.length > 0 && dialog === "new" && <p className="chess-dialog-note">Starting a new game clears this game.</p>}
          <div className="chess-dialog-actions"><button type="button" onClick={() => setDialog(null)}>Cancel</button>
            <button type="button" className="chess-primary" onClick={() => {
              if (dialog === "new") startGame(); else { setLevel(draftLevel); setDialog(null); }
            }}>{dialog === "new" ? "Start game" : "Apply level"}</button></div>
        </> : dialog === "display" ? <>
          <h2>Board settings</h2>
          <fieldset className="chess-motion-options"><legend>Piece animation</legend>{(["normal", "fast", "off"] as const).map(style => <label key={style}>
            <input type="radio" name="chess-motion" checked={motionStyle === style} onChange={() => setMotionStyle(style)} />{style === "normal" ? "Normal" : style === "fast" ? "Fast" : "Off"}</label>)}</fieldset>
          <p>Reduced-motion preferences are respected in every mode.</p>
          <div className="chess-dialog-actions"><button type="button" onClick={() => setDialog(null)}>Close</button></div>
        </> : dialog === "resign" ? <>
          <h2>Resign game?</h2><p>Stockfish wins. You can still review every move.</p>
          <div className="chess-dialog-actions"><button type="button" onClick={() => setDialog(null)}>Keep playing</button>
            <button type="button" className="chess-primary" onClick={() => {
              setResigned(true); setDialog(null); setMotion(undefined); live();
            }}>Resign</button></div>
        </> : dialog === "help" ? <>
          <h2>Help &amp; engine</h2><p>Select a piece, then a highlighted square. Use arrow keys and Enter to play with the keyboard.</p>
          <p>Stockfish 19 runs on your device. Elo targets are approximate. Beginner and Novice sometimes choose a weaker legal move.</p>
          <p><a href="/engine/Copying.txt" target="_blank" rel="noreferrer">GPLv3 license</a> · <a
            href="https://github.com/nmrugg/stockfish.js/tree/v19.0.1" target="_blank" rel="noreferrer">Exact engine source</a> · <a
            href="/engine/SOURCE.md" target="_blank" rel="noreferrer">Build &amp; credits</a></p>
          <div className="chess-dialog-actions"><button type="button" onClick={() => setDialog(null)}>Close</button></div>
        </> : null}
      </dialog>
    </div>
  </Window>;
}
