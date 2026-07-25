"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Window from "./Window";

/**
 * GameWindow: an endless runner, in the spirit of the offline dinosaur.
 *
 * Written as a single fixed-timestep loop on a canvas rather than as React
 * state, because state per frame would re-render sixty times a second for
 * no reason. React owns the chrome and the score readout; the loop owns
 * everything that moves, and the two meet only at game over.
 *
 * The runner is the ET monogram, so even the toy is on-brand, and the
 * obstacles are B-scan-ish spikes because why not.
 */

const W = 600;
const H = 180;
const GROUND = H - 28;
const GRAVITY = 0.62;
const JUMP = -10.6;
const START_SPEED = 4.4;

type Obstacle = { x: number; w: number; h: number };

type Phase = "ready" | "running" | "over";

export default function GameWindow(props: {
  onClose: () => void;
  onMinimize: () => void;
  motion?: "minimizing" | "closing";
  minimizeTarget?: string;
  zIndex?: number;
  onFocus?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  /* All mutable game state lives in one ref. The loop reads and writes it
     directly; nothing here belongs in React state. */
  const g = useRef({
    y: GROUND,
    vy: 0,
    speed: START_SPEED,
    obstacles: [] as Obstacle[],
    ticks: 0,
    score: 0,
    dead: false,
    raf: 0,
    last: 0,
    acc: 0,
  });

  const reset = useCallback(() => {
    const s = g.current;
    s.y = GROUND;
    s.vy = 0;
    s.speed = START_SPEED;
    s.obstacles = [];
    s.ticks = 0;
    s.score = 0;
    s.dead = false;
    s.acc = 0;
    setScore(0);
  }, []);

  const jump = useCallback(() => {
    const s = g.current;
    if (s.dead) return;
    // only from the ground, so it cannot be spammed into flight
    if (s.y >= GROUND - 0.5) s.vy = JUMP;
  }, []);

  const start = useCallback(() => {
    reset();
    setPhase("running");
  }, [reset]);

  /* one physics step, at a fixed 60 Hz regardless of display refresh rate */
  const step = useCallback(() => {
    const s = g.current;
    s.ticks += 1;
    s.vy += GRAVITY;
    s.y = Math.min(GROUND, s.y + s.vy);
    if (s.y === GROUND) s.vy = 0;

    s.speed = START_SPEED + s.ticks / 900;

    // spawn with a floor on the gap so the game stays possible
    const last = s.obstacles[s.obstacles.length - 1];
    const minGap = 150 + s.speed * 14;
    if (!last || last.x < W - minGap - Math.random() * 130) {
      const h = 20 + Math.random() * 22;
      s.obstacles.push({ x: W + 20, w: 10 + Math.random() * 8, h });
    }

    for (const o of s.obstacles) o.x -= s.speed;
    s.obstacles = s.obstacles.filter((o) => o.x + o.w > -20);

    // collision: runner box vs obstacle box, generous by a pixel or two
    const rx = 44;
    const rw = 22;
    const rTop = s.y - 26;
    for (const o of s.obstacles) {
      if (o.x < rx + rw - 3 && o.x + o.w > rx + 3 && rTop + 26 > GROUND - o.h + 2) {
        s.dead = true;
        break;
      }
    }

    s.score = Math.floor(s.ticks / 6);
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const s = g.current;
    ctx.clearRect(0, 0, W, H);

    // ground line
    ctx.strokeStyle = "rgba(244,241,236,0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, GROUND + 0.5);
    ctx.lineTo(W, GROUND + 0.5);
    ctx.stroke();

    // ground texture, scrolling, so speed is legible
    ctx.strokeStyle = "rgba(244,241,236,0.14)";
    for (let i = 0; i < 18; i++) {
      const x = (i * 46 - ((s.ticks * s.speed) % 46)) | 0;
      ctx.beginPath();
      ctx.moveTo(x, GROUND + 7);
      ctx.lineTo(x + 14, GROUND + 7);
      ctx.stroke();
    }

    // obstacles
    for (const o of s.obstacles) {
      const grad = ctx.createLinearGradient(0, GROUND - o.h, 0, GROUND);
      grad.addColorStop(0, "rgba(226,170,99,0.95)");
      grad.addColorStop(1, "rgba(160,112,58,0.85)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(o.x, GROUND);
      ctx.lineTo(o.x + o.w / 2, GROUND - o.h);
      ctx.lineTo(o.x + o.w, GROUND);
      ctx.closePath();
      ctx.fill();
    }

    // the runner: the ET monogram in a disc
    const cy = s.y - 13;
    ctx.beginPath();
    ctx.arc(55, cy, 13, 0, Math.PI * 2);
    const rg = ctx.createLinearGradient(42, cy - 13, 68, cy + 13);
    rg.addColorStop(0, "#a8845c");
    rg.addColorStop(0.6, "#8a683f");
    rg.addColorStop(1, "#6b4f33");
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "700 11px -apple-system, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ET", 55, cy + 0.5);
  }, []);

  /* the loop. Fixed timestep with an accumulator, so physics is identical
     on a 60 Hz panel and a 144 Hz one. */
  useEffect(() => {
    if (phase !== "running") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const s = g.current;
    s.last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(now - s.last, 60);
      s.last = now;
      s.acc += dt;
      while (s.acc >= 1000 / 60) {
        step();
        s.acc -= 1000 / 60;
        if (s.dead) break;
      }
      draw(ctx);
      if (s.dead) {
        setScore(s.score);
        setBest((b) => Math.max(b, s.score));
        setPhase("over");
        return;
      }
      if (s.score !== score) setScore(s.score);
      s.raf = requestAnimationFrame(frame);
    };
    s.raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(s.raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, step, draw]);

  /* draw one idle frame so the canvas is never blank */
  useEffect(() => {
    if (phase === "running") return;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) draw(ctx);
  }, [phase, draw]);

  /* Space and ArrowUp jump, and also start or restart. Bound to the window
     element rather than document so it never steals keys from the
     terminal. */
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== " " && e.key !== "ArrowUp" && e.key !== "Enter") return;
    e.preventDefault();
    if (phase === "running") jump();
    else start();
  }

  return (
    <Window title="Runner" frameClassName="window-game" {...props}>
      <div
        className="game"
        tabIndex={0}
        role="application"
        aria-label="Endless runner. Press space to jump."
        onKeyDown={onKeyDown}
        onPointerDown={() => (phase === "running" ? jump() : start())}
      >
        <div className="game-hud">
          <span className="game-score">{String(score).padStart(5, "0")}</span>
          <span className="game-best">best {String(best).padStart(5, "0")}</span>
        </div>

        <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />

        {phase !== "running" && (
          <div className="game-overlay">
            <p className="game-msg">
              {phase === "over" ? "You hit a spike." : "Jump the spikes."}
            </p>
            <p className="game-hint">space or click to {phase === "over" ? "retry" : "start"}</p>
          </div>
        )}
      </div>
    </Window>
  );
}
