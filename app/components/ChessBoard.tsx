"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Chess, Color, Move, PieceSymbol, Square } from "chess.js";
import { GRADE_SYMBOLS } from "../lib/chess-grades";
import type { MoveGrade } from "../lib/chess-review";
import ChessPiece from "./ChessPiece";

type Props = {
  game: Chess; player: Color; flipped: boolean; disabled: boolean; lastMove?: Move; motion?: Move;
  badge?: { square: Square; grade: MoveGrade; key: string };
  arrow?: { from: Square; to: Square };
  onMove: (from: Square, to: Square, promotion?: string) => void;
};

const NAMES: Record<PieceSymbol, string> = { p:"pawn", n:"knight", b:"bishop", r:"rook", q:"queen", k:"king" };
const PROMOTIONS = ["q", "r", "b", "n"] as const;
const squares = Array.from({ length: 64 }, (_, i) =>
  `${"abcdefgh"[i % 8]}${8 - Math.floor(i / 8)}` as Square);
const reversed = [...squares].reverse();

function coordinates(square: Square, flipped: boolean) {
  const column = square.charCodeAt(0) - 97;
  const row = 8 - Number(square[1]);
  return { x: flipped ? 7 - column : column, y: flipped ? 7 - row : row };
}

type Travel = { from: Square; to: Square; piece: PieceSymbol };
function travel(move: Move): Travel[] {
  const pieces: Travel[] = [{ from: move.from, to: move.to, piece: move.piece }];
  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    const kingSide = move.isKingsideCastle();
    const rank = move.from[1];
    pieces.push({ from: `${kingSide ? "h" : "a"}${rank}` as Square,
      to: `${kingSide ? "f" : "d"}${rank}` as Square, piece: "r" });
  }
  return pieces;
}

function overlayStyle(from: Square, to: Square, flipped: boolean): CSSProperties {
  const origin = coordinates(from, flipped);
  const end = coordinates(to, flipped);
  return {
    left: `${origin.x * 12.5}%`, top: `${origin.y * 12.5}%`,
    "--move-x": `${(end.x - origin.x) * 100}%`, "--move-y": `${(end.y - origin.y) * 100}%`,
  } as CSSProperties;
}

function BestArrow({ from, to, flipped }: { from: Square; to: Square; flipped: boolean }) {
  const a = coordinates(from, flipped), b = coordinates(to, flipped);
  const dx = b.x - a.x, dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (!length) return null;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return <svg className="chess-best-arrow" viewBox="0 0 8 8" aria-hidden="true" focusable="false">
    <g transform={`translate(${a.x + .5} ${a.y + .5}) rotate(${angle})`}>
      <line x1=".17" y1="0" x2={length - .32} y2="0" stroke="currentColor" strokeWidth=".13" strokeLinecap="round" />
      <path d={`M ${length - .45} -.24 L ${length - .03} 0 L ${length - .45} .24 Z`} fill="currentColor" />
    </g>
  </svg>;
}

export default function ChessBoard({ game, player, flipped, disabled, lastMove, motion, badge, arrow, onMove }: Props) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [focused, setFocused] = useState<Square>(player === "w" ? "e2" : "e7");
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const promotionRef = useRef<HTMLDivElement>(null);
  const fen = game.fen();
  useLayoutEffect(() => { setSelected(null); setPromotion(null); }, [fen, disabled, flipped]);
  useLayoutEffect(() => {
    if (promotion) promotionRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [promotion]);

  const order = flipped ? reversed : squares;
  const canPlay = !disabled && !promotion && !motion && game.turn() === player && !game.isGameOver();
  const legal = selected ? game.moves({ square: selected, verbose: true }) : [];
  const moving = motion ? travel(motion) : [];
  const victim = motion?.captured ? (motion.isEnPassant() ? `${motion.to[0]}${motion.from[1]}` as Square : motion.to) : undefined;

  function focusSquare(square: Square) {
    boardRef.current?.querySelector<HTMLButtonElement>(`button[data-square="${square}"]`)?.focus();
  }
  function choose(square: Square) {
    if (!canPlay) return;
    const destination = legal.find(move => move.to === square);
    if (selected && destination) {
      if (destination.isPromotion()) setPromotion({ from: selected, to: square });
      else { setSelected(null); onMove(selected, square); }
    } else setSelected(game.get(square)?.color === player && selected !== square ? square : null);
  }
  function boardKey(event: KeyboardEvent<HTMLButtonElement>, square: Square) {
    if (event.key === "Escape") { setSelected(null); return; }
    const index = order.indexOf(square);
    const row = Math.floor(index / 8), col = index % 8;
    const navigation: Record<string, number> = {
      ArrowLeft: row * 8 + Math.max(0, col - 1), ArrowRight: row * 8 + Math.min(7, col + 1),
      ArrowUp: Math.max(0, row - 1) * 8 + col, ArrowDown: Math.min(7, row + 1) * 8 + col,
      Home: row * 8, End: row * 8 + 7,
    };
    if (navigation[event.key] === undefined) return;
    event.preventDefault();
    focusSquare(order[navigation[event.key]]);
  }
  function cancelPromotion() {
    if (promotion) focusSquare(promotion.from);
    setPromotion(null);
  }

  return <div className="chess-board-wrap">
    <div className="chess-board" role="group" aria-label="Chessboard" aria-describedby="chess-keyboard-help" ref={boardRef}>
      {order.map((square, index) => {
        const piece = game.get(square);
        const target = legal.find(move => move.to === square);
        const dark = (square.charCodeAt(0) + Number(square[1])) % 2 === 0;
        const check = piece?.type === "k" && piece.color === game.turn() && game.isCheck();
        const grade = badge?.square === square ? badge : undefined;
        const label = `${square}, ${piece ? `${piece.color === "w" ? "white" : "black"} ${NAMES[piece.type]}` : "empty"}${target ? ", legal move" : ""}`;
        const classes = ["chess-square", dark ? "chess-dark" : "chess-light", selected === square && "chess-selected",
          (lastMove?.from === square || lastMove?.to === square) && "chess-last", check && "chess-check"];
        return <button key={square} type="button" data-square={square} className={classes.filter(Boolean).join(" ")}
          aria-label={label} aria-description={grade?.grade} aria-pressed={selected === square} aria-disabled={!canPlay}
          tabIndex={square === focused ? 0 : -1} onFocus={() => setFocused(square)}
          onKeyDown={event => boardKey(event, square)} onClick={() => choose(square)}>
          {index % 8 === 0 && <span className="chess-rank" aria-hidden="true">{square[1]}</span>}
          {index >= 56 && <span className="chess-file" aria-hidden="true">{square[0]}</span>}
          {piece && !moving.some(item => item.to === square) && <ChessPiece type={piece.type} color={piece.color} />}
          {target && <span className={target.captured ? "chess-capture-ring" : "chess-legal-dot"} />}
          {grade && <span key={grade.key} className="chess-move-badge" data-grade={grade.grade.toLowerCase()}
            title={grade.grade} aria-hidden="true">{GRADE_SYMBOLS[grade.grade]}</span>}
        </button>;
      })}
      {motion && victim && motion.captured && <span key={`victim-${motion.after}`} className="chess-captured-piece"
        aria-hidden="true" data-victim-square={victim} style={overlayStyle(victim, victim, flipped)}>
        <ChessPiece type={motion.captured} color={motion.color === "w" ? "b" : "w"} />
      </span>}
      {motion && moving.map(({ from, to, piece }) => <span key={`${motion.after}-${from}`} className="chess-moving-piece"
        aria-hidden="true" data-piece={piece} data-from={from} data-to={to} style={overlayStyle(from, to, flipped)}>
        <ChessPiece type={piece} color={motion.color} />
      </span>)}
      {arrow && <BestArrow {...arrow} flipped={flipped} />}
    </div>
    {promotion && <div className="chess-promotion" role="group" aria-label="Choose promotion" ref={promotionRef}
      onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); cancelPromotion(); } }}>
      <strong>Promote your pawn</strong>
      <div>{PROMOTIONS.map(piece => <button key={piece} type="button" aria-label={`Promote to ${NAMES[piece]}`} onClick={() => {
        onMove(promotion.from, promotion.to, piece);
        focusSquare(promotion.to);
        setPromotion(null);
        setSelected(null);
      }}><ChessPiece type={piece} color={player} /></button>)}</div>
      <button type="button" className="chess-text-button" onClick={cancelPromotion}>Cancel</button>
    </div>}
  </div>;
}
