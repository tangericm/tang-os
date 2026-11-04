"use client";

import { useEffect, useRef, useState, type ComponentProps, type KeyboardEvent } from "react";
import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import Window from "./Window";
import ChessPiece from "./ChessPiece";
import { CHESS_LEVELS, gameStatus, undoTurn } from "../lib/chess-game";
import { ChessEngine } from "../lib/chess-engine";

const NAMES: Record<PieceSymbol, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
const PROMOTIONS = ["q", "r", "b", "n"] as const;
type Props = Omit<ComponentProps<typeof Window>, "title" | "children" | "frameClassName"> & { active?: boolean };

export default function GameWindow({ active = true, ...props }: Props) {
  const [game] = useState(() => new Chess());
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const [player, setPlayer] = useState<Color>("w");
  const [nextSide, setNextSide] = useState<Color>("w");
  const [levelId, setLevelId] = useState("novice");
  const level = CHESS_LEVELS.find((item) => item.id === levelId) ?? CHESS_LEVELS[1];
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState<Square | null>(null);
  const [focused, setFocused] = useState<Square>("e2");
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [engineState, setEngineState] = useState("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const promotionRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLOListElement>(null);
  const history = game.history({ verbose: true });
  const last = history.at(-1);
  const over = game.isGameOver();
  const canPlay = active && !over && !confirmNew && !promotion && game.turn() === player;
  const legal = selected ? game.moves({ square: selected, verbose: true }) : [];
  const files = (flipped ? "hgfedcba" : "abcdefgh").split("");
  const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const squares = ranks.flatMap((rank) => files.map((file) => `${file}${rank}` as Square));

  function changed() {
    generation.current++;
    setSelected(null);
    setPromotion(null);
    setRevision((value) => value + 1);
  }

  useEffect(() => {
    if (!active || confirmNew || game.isGameOver()) {
      setEngineState("paused");
      return;
    }
    if (game.turn() === player) {
      setError("");
      setEngineState("ready");
      return;
    }
    let cancelled = false;
    let engine: ChessEngine | undefined;
    const ticket = generation.current;
    const fen = game.fen();
    setError("");
    setEngineState("loading");
    async function run() {
      try {
        engine = new ChessEngine();
        await engine.ready;
        if (cancelled || ticket !== generation.current) return;
        setEngineState("thinking");
        const move = await engine.move(fen, level, game.moves({ verbose: true }).map((item) => item.lan),
          game.history({ verbose: true }).map((item) => item.lan));
        if (cancelled || ticket !== generation.current || game.fen() !== fen) return;
        game.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] });
        changed();
      } catch (reason) {
        if (cancelled || ticket !== generation.current) return;
        setEngineState("error");
        setError(reason instanceof Error ? reason.message : "Could not load Stockfish. Please retry.");
      }
    }
    void run();
    // Each engine turn owns its worker. Termination also cancels loading, so stale results
    // cannot reach a reset/undone game. Later workers reuse the cached engine assets.
    return () => { cancelled = true; engine?.dispose(); };
  }, [active, confirmNew, game, level, player, retry, revision]);

  useEffect(() => {
    if (promotion) promotionRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [promotion]);
  useEffect(() => {
    const list = historyRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [revision]);

  function move(from: Square, to: Square, promote?: string) {
    game.move({ from, to, promotion: promote });
    changed();
  }

  function choose(square: Square) {
    if (!canPlay) return;
    const destination = legal.find((item) => item.to === square);
    if (selected && destination) {
      if (destination.isPromotion()) setPromotion({ from: selected, to: square });
      else move(selected, square);
    } else setSelected(game.get(square)?.color === player && selected !== square ? square : null);
  }

  function boardKey(event: KeyboardEvent<HTMLButtonElement>, square: Square) {
    if (event.key === "Escape") { setSelected(null); return; }
    const index = squares.indexOf(square);
    const row = Math.floor(index / 8), col = index % 8;
    const destinations: Record<string, number> = {
      ArrowLeft: row * 8 + Math.max(0, col - 1), ArrowRight: row * 8 + Math.min(7, col + 1),
      ArrowUp: Math.max(0, row - 1) * 8 + col, ArrowDown: Math.min(7, row + 1) * 8 + col,
      Home: row * 8, End: row * 8 + 7,
    };
    const destination = destinations[event.key];
    if (destination === undefined) return;
    event.preventDefault();
    const next = squares[destination];
    setFocused(next);
    boardRef.current?.querySelector<HTMLButtonElement>(`[data-square="${next}"]`)?.focus();
  }

  function reset() {
    game.reset();
    setPlayer(nextSide);
    setFlipped(nextSide === "b");
    setFocused(nextSide === "b" ? "e7" : "e2");
    setConfirmNew(false);
    changed();
  }

  function cancelPromotion() {
    setPromotion(null);
    if (promotion) boardRef.current?.querySelector<HTMLButtonElement>(`[data-square="${promotion.from}"]`)?.focus();
  }

  const status = over ? gameStatus(game, player)
    : error ? "Engine unavailable — retry to continue"
    : engineState === "thinking" ? "Stockfish is thinking…"
    : gameStatus(game, player);
  const captured = history.filter((item) => item.color === player && item.captured).map((item) => item.captured!);

  return (
    <Window title="Chess" frameClassName="window-game" {...props}>
      <div className="chess">
        <div className="chess-heading">
          <div><span className="chess-eyebrow">A little time to think</span><h2>Your next move.</h2></div>
          <span className="chess-local"><span />On-device engine</span>
        </div>
        <div className="chess-layout">
          <div className="chess-table">
            <div className="chess-player">
              <span className="chess-avatar"><ChessPiece type="n" color={player === "w" ? "b" : "w"} /></span>
              <div><strong>Stockfish</strong><small>{level.label} · ≈{level.elo} Elo</small></div>
              <span className="chess-engine-state" data-state={engineState}>{engineState === "loading" ? "Loading…" : engineState === "thinking" ? "Thinking…" : engineState === "error" ? "Offline" : ""}</span>
            </div>
            <div className="chess-board-wrap">
              <div className="chess-board" role="group" aria-label="Chessboard" aria-describedby="chess-keyboard-help" ref={boardRef}>
                {squares.map((square, index) => {
                  const piece = game.get(square);
                  const target = legal.some((item) => item.to === square);
                  const dark = (square.charCodeAt(0) + Number(square[1])) % 2 === 0;
                  const check = piece?.type === "k" && piece.color === game.turn() && game.isCheck();
                  const label = `${square}, ${piece ? `${piece.color === "w" ? "white" : "black"} ${NAMES[piece.type]}` : "empty"}${target ? ", legal move" : ""}`;
                  return <button key={square} type="button" data-square={square}
                    className={`chess-square ${dark ? "chess-dark" : "chess-light"}${selected === square ? " chess-selected" : ""}${last?.from === square || last?.to === square ? " chess-last" : ""}${check ? " chess-check" : ""}`}
                    aria-label={label} aria-pressed={selected === square} aria-disabled={!canPlay}
                    tabIndex={square === focused ? 0 : -1} onFocus={() => setFocused(square)}
                    onKeyDown={(event) => boardKey(event, square)} onClick={() => choose(square)}>
                    {index % 8 === 0 && <span className="chess-rank" aria-hidden="true">{square[1]}</span>}
                    {index >= 56 && <span className="chess-file" aria-hidden="true">{square[0]}</span>}
                    {piece && <ChessPiece type={piece.type} color={piece.color} />}
                    {target && <span className={piece ? "chess-capture-ring" : "chess-legal-dot"} />}
                  </button>;
                })}
              </div>
              {promotion && <div className="chess-promotion" role="group" aria-label="Choose promotion" ref={promotionRef}
                onKeyDown={(event) => { if (event.key === "Escape") cancelPromotion(); }}>
                <strong>Promote your pawn</strong>
                <div>{PROMOTIONS.map((piece) => <button key={piece} aria-label={`Promote to ${NAMES[piece]}`} onClick={() => {
                  const destination = promotion.to;
                  move(promotion.from, destination, piece);
                  boardRef.current?.querySelector<HTMLButtonElement>(`[data-square="${destination}"]`)?.focus();
                }}><ChessPiece type={piece} color={player} /></button>)}</div>
                <button className="chess-text-button" onClick={cancelPromotion}>Cancel</button>
              </div>}
            </div>
            <div className="chess-player chess-you">
              <span className="chess-avatar"><ChessPiece type="k" color={player} /></span>
              <div><strong>You</strong><small>Playing {player === "w" ? "White" : "Black"}</small></div>
              <div className="chess-captured" aria-label={`You captured ${captured.length} pieces`}>{captured.map((piece, index) => <ChessPiece key={index} type={piece} color={player === "w" ? "b" : "w"} />)}</div>
            </div>
          </div>
          <aside className="chess-sidebar" aria-label="Game controls">
            <div className="chess-settings">
              <label htmlFor="chess-difficulty">Difficulty</label>
              <select id="chess-difficulty" value={levelId} onChange={(event) => { generation.current++; setLevelId(event.target.value); }}>
                {CHESS_LEVELS.map((item) => <option key={item.id} value={item.id}>{item.label} · ≈{item.elo}</option>)}
              </select>
              <label htmlFor="chess-side">Play as</label>
              <select id="chess-side" value={nextSide} onChange={(event) => setNextSide(event.target.value as Color)}>
                <option value="w">White · move first</option><option value="b">Black · move second</option>
              </select>
              {nextSide !== player && <small className="chess-side-note">Applies to your next game.</small>}
              <button className="chess-new" onClick={() => {
                if (history.length) { generation.current++; setConfirmNew(true); } else reset();
              }}>New game <span aria-hidden="true">↗</span></button>
            </div>
            {confirmNew && <div className="chess-confirm" role="group" aria-label="Confirm new game">
              <p>Start a new game? This game will be cleared.</p>
              <button onClick={reset}>Start game</button><button onClick={() => setConfirmNew(false)}>Keep playing</button>
            </div>}
            <div className="chess-status" role="status" aria-live="polite"><span className={over ? "chess-status-dot chess-finished" : "chess-status-dot"} />{status}</div>
            {error && <div className="chess-error" role="alert"><p>{error}</p><button onClick={() => setRetry((value) => value + 1)}>Retry engine</button></div>}
            <div className="chess-history-heading"><h3>Moves</h3><span>{history.length ? `${Math.ceil(history.length / 2)} played` : "A fresh board"}</span></div>
            <ol className="chess-history" aria-label="Move history" ref={historyRef}>
              {history.filter((_, index) => index % 2 === 0).map((item, index) => <li key={index}>
                <span>{index + 1}.</span><span>{item.san}</span><span>{history[index * 2 + 1]?.san ?? "…"}</span>
              </li>)}
            </ol>
            {!history.length && <p className="chess-empty">Every game starts with a possibility.</p>}
            <div className="chess-actions">
              <button disabled={!history.some((item) => item.color === player) || confirmNew} onClick={() => { if (undoTurn(game, player)) changed(); }}>Undo turn</button>
              <button onClick={() => setFlipped((value) => !value)}>Flip board</button>
            </div>
          </aside>
        </div>
        <footer className="chess-footer">
          <p id="chess-keyboard-help">Select a piece, then its destination. Arrow keys to navigate; Enter to select.</p>
          <details><summary>About the engine & ratings</summary><p>Stockfish 19 runs on your device. Elo labels are approximate, not calibrated ratings. Beginner and Novice add occasional weaker moves; device speed and search time affect strength.</p><p><a href="/engine/Copying.txt" target="_blank" rel="noreferrer">GPLv3 license</a> · <a href="https://github.com/nmrugg/stockfish.js/tree/v19.0.1" target="_blank" rel="noreferrer">Exact engine source</a> · <a href="/engine/SOURCE.md" target="_blank" rel="noreferrer">Build & credits</a></p></details>
        </footer>
      </div>
    </Window>
  );
}
