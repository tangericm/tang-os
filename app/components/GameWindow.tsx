"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Window from "./Window";

/**
 * GameWindow: the offline dinosaur runner, rebuilt properly.
 *
 * The first version was a generic jumper with a monogram for a player. This
 * one follows the real thing: a pixel dinosaur that runs, jumps and ducks,
 * ground cacti and flying pterodactyls (which is what makes ducking matter,
 * since a jump-only game never needs a second verb), a speed ramp, and a
 * day/night flip on a score threshold.
 *
 * Structure is unchanged and deliberate: one fixed-timestep loop at 60 Hz with
 * an accumulator so physics is identical on a 60 and a 144 Hz panel, and ALL
 * mutable state in a single ref. Per-frame React state would re-render sixty
 * times a second to draw something React is not drawing. React owns the score
 * readout and the overlay; the loop owns everything that moves.
 */

const W = 600;
const H = 180;
const GROUND = H - 26;
const GRAVITY = 0.58;
const JUMP = -10.2;
const DUCK_DROP = 1.9; // extra gravity while held, so ducking cuts a jump short
const START_SPEED = 4.2;
const NIGHT_EVERY = 700;

type Obstacle = {
  kind: "cactus" | "bird";
  x: number;
  w: number;
  h: number;
  y: number; // top edge
  variant: number;
};

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

  const g = useRef({
    y: GROUND,
    vy: 0,
    ducking: false,
    speed: START_SPEED,
    obstacles: [] as Obstacle[],
    clouds: [] as { x: number; y: number; s: number }[],
    ticks: 0,
    score: 0,
    night: false,
    flash: 0,
    dead: false,
    raf: 0,
    last: 0,
    acc: 0,
  });

  const reset = useCallback(() => {
    Object.assign(g.current, {
      y: GROUND,
      vy: 0,
      ducking: false,
      speed: START_SPEED,
      obstacles: [],
      clouds: [
        { x: 120, y: 34, s: 0.4 },
        { x: 360, y: 54, s: 0.28 },
        { x: 520, y: 26, s: 0.34 },
      ],
      ticks: 0,
      score: 0,
      night: false,
      flash: 0,
      dead: false,
      acc: 0,
    });
    setScore(0);
  }, []);

  const jump = useCallback(() => {
    const s = g.current;
    if (s.dead) return;
    if (s.y >= GROUND - 0.5) s.vy = JUMP;
  }, []);

  const setDuck = useCallback((on: boolean) => {
    g.current.ducking = on;
  }, []);

  const start = useCallback(() => {
    reset();
    setPhase("running");
  }, [reset]);

  /* ---- one physics step ---- */
  const step = useCallback(() => {
    const s = g.current;
    s.ticks += 1;
    s.speed = START_SPEED + s.ticks / 850;

    s.vy += GRAVITY + (s.ducking && s.y < GROUND ? DUCK_DROP : 0);
    s.y = Math.min(GROUND, s.y + s.vy);
    if (s.y === GROUND) s.vy = 0;

    // spawn: gap scales with speed so the game stays clearable
    const last = s.obstacles[s.obstacles.length - 1];
    const minGap = 165 + s.speed * 15;
    if (!last || last.x < W - minGap - Math.random() * 150) {
      const wantBird = s.score > 180 && Math.random() < 0.28;
      if (wantBird) {
        const lane = Math.floor(Math.random() * 3);
        const y = [GROUND - 58, GROUND - 40, GROUND - 22][lane];
        s.obstacles.push({ kind: "bird", x: W + 20, w: 26, h: 16, y, variant: lane });
      } else {
        const variant = Math.floor(Math.random() * 3);
        const h = [26, 34, 30][variant];
        const w = [12, 14, 26][variant]; // variant 2 is a cluster
        s.obstacles.push({ kind: "cactus", x: W + 20, w, h, y: GROUND - h, variant });
      }
    }

    for (const o of s.obstacles) o.x -= s.speed;
    s.obstacles = s.obstacles.filter((o) => o.x + o.w > -30);

    for (const c of s.clouds) {
      c.x -= s.speed * c.s;
      if (c.x < -60) {
        c.x = W + 40 + Math.random() * 120;
        c.y = 20 + Math.random() * 46;
      }
    }

    // collision against the dino box, which shortens and lowers when ducking
    const dx = 44;
    const grounded = s.y >= GROUND - 0.5;
    const dw = s.ducking && grounded ? 38 : 26;
    const dh = s.ducking && grounded ? 18 : 32;
    const dtop = s.y - dh;
    for (const o of s.obstacles) {
      if (
        o.x < dx + dw - 4 &&
        o.x + o.w > dx + 4 &&
        o.y < s.y - 3 &&
        o.y + o.h > dtop + 3
      ) {
        s.dead = true;
        break;
      }
    }

    s.score = Math.floor(s.ticks / 6);
    const nowNight = Math.floor(s.score / NIGHT_EVERY) % 2 === 1;
    if (nowNight !== s.night) {
      s.night = nowNight;
      s.flash = 22;
    }
    if (s.flash > 0) s.flash -= 1;
  }, []);

  /* ---- render ---- */
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const s = g.current;
    const ink = s.night ? "#f2ede6" : "#6b5c4a";

    ctx.clearRect(0, 0, W, H);
    if (s.night) {
      ctx.fillStyle = "#141110";
      ctx.fillRect(0, 0, W, H);
    }
    if (s.flash > 0) {
      ctx.fillStyle = `rgba(226,170,99,${(s.flash / 22) * 0.18})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.fillStyle = s.night ? "rgba(242,237,230,0.16)" : "rgba(107,92,74,0.22)";
    for (const c of s.clouds) {
      ctx.fillRect(c.x, c.y, 22, 4);
      ctx.fillRect(c.x + 5, c.y - 4, 14, 4);
      ctx.fillRect(c.x + 3, c.y + 4, 17, 3);
    }

    // ground: a line plus scrolling speckle, so speed is legible
    ctx.fillStyle = ink;
    ctx.fillRect(0, GROUND + 1, W, 1.5);
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 26; i++) {
      const x = (i * 51 - ((s.ticks * s.speed) % 51)) | 0;
      ctx.fillRect(x, GROUND + 7, 9, 1.5);
      ctx.fillRect(x + 24, GROUND + 12, 5, 1.5);
    }
    ctx.globalAlpha = 1;

    for (const o of s.obstacles) {
      ctx.fillStyle = ink;
      if (o.kind === "cactus") {
        if (o.variant === 2) {
          drawCactus(ctx, o.x, GROUND, 10, 24);
          drawCactus(ctx, o.x + 14, GROUND, 11, 30);
        } else {
          drawCactus(ctx, o.x, GROUND, o.w, o.h);
        }
      } else {
        const up = Math.floor(s.ticks / 9) % 2 === 0;
        ctx.fillRect(o.x + 8, o.y + 6, 16, 4);
        ctx.fillRect(o.x + 20, o.y + 3, 6, 3);
        ctx.fillRect(o.x, o.y + 7, 9, 3);
        if (up) ctx.fillRect(o.x + 9, o.y - 4, 10, 10);
        else ctx.fillRect(o.x + 9, o.y + 9, 10, 8);
      }
    }

    drawDino(ctx, s, ink);
  }, []);

  /* ---- loop ---- */
  useEffect(() => {
    if (phase !== "running") return;
    const ctx = canvasRef.current?.getContext("2d");
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

  /* idle frame so the canvas is never blank */
  useEffect(() => {
    if (phase === "running") return;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) draw(ctx);
  }, [phase, draw]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDuck(true);
      return;
    }
    if (e.key !== " " && e.key !== "ArrowUp" && e.key !== "Enter") return;
    e.preventDefault();
    if (phase === "running") jump();
    else start();
  }

  function onKeyUp(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") setDuck(false);
  }

  /* touch: upper area jumps, lower strip ducks while held */
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phase !== "running") {
      start();
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientY - r.top > r.height * 0.62) setDuck(true);
    else jump();
  }

  return (
    <Window title="Runner" frameClassName="window-game" {...props}>
      <div
        className="game"
        tabIndex={0}
        role="application"
        aria-label="Dinosaur runner. Space or tap to jump, down arrow or tap low to duck."
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onPointerDown={onPointerDown}
        onPointerUp={() => setDuck(false)}
        onPointerLeave={() => setDuck(false)}
      >
        <div className="game-hud">
          <span className="game-score">{String(score).padStart(5, "0")}</span>
          <span className="game-best">HI {String(best).padStart(5, "0")}</span>
        </div>

        <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />

        {phase !== "running" && (
          <div className="game-overlay">
            <p className="game-msg">
              {phase === "over" ? "Game over" : "Jump the cacti, duck the birds."}
            </p>
            <p className="game-hint">
              {phase === "over" ? "space or tap to retry" : "space to jump · down to duck"}
            </p>
          </div>
        )}
      </div>
    </Window>
  );
}

/* ---- sprites, drawn as rectangles in the spirit of the original ---- */

function drawCactus(
  ctx: CanvasRenderingContext2D,
  x: number,
  base: number,
  w: number,
  h: number
) {
  const armY = base - h * 0.62;
  ctx.fillRect(x + w * 0.32, base - h, w * 0.36, h);
  ctx.fillRect(x, armY, w * 0.3, h * 0.34);
  ctx.fillRect(x, armY, w * 0.3, 3);
  ctx.fillRect(x + w * 0.7, armY + 4, w * 0.3, h * 0.3);
  ctx.fillRect(x + w * 0.7, armY + 4, w * 0.3, 3);
}

function drawDino(
  ctx: CanvasRenderingContext2D,
  s: { y: number; ticks: number; ducking: boolean; dead: boolean },
  ink: string
) {
  const x = 44;
  const grounded = s.y >= GROUND - 0.5;
  const duck = s.ducking && grounded;
  ctx.fillStyle = ink;

  if (duck) {
    const y = s.y - 18;
    ctx.fillRect(x, y + 4, 30, 12); // body, long and low
    ctx.fillRect(x + 28, y, 14, 11); // head
    ctx.fillRect(x + 40, y + 4, 3, 3); // snout
    ctx.fillStyle = "#1c1813";
    ctx.fillRect(x + 36, y + 3, 2.5, 2.5); // eye
    ctx.fillStyle = ink;
    ctx.fillRect(x - 8, y + 6, 9, 4); // tail
    const legPhase = Math.floor(s.ticks / 5) % 2 === 0;
    ctx.fillRect(x + (legPhase ? 6 : 14), y + 16, 5, 4);
    return;
  }

  const y = s.y - 32;
  ctx.fillRect(x + 4, y + 12, 18, 14); // torso
  ctx.fillRect(x + 16, y, 16, 14); // head
  ctx.fillRect(x + 30, y + 8, 4, 4); // snout
  ctx.fillStyle = "#1c1813";
  ctx.fillRect(x + 26, y + 4, 2.5, 2.5); // eye
  ctx.fillStyle = ink;
  ctx.fillRect(x - 4, y + 14, 10, 5); // tail
  ctx.fillRect(x + 12, y + 22, 6, 4); // arm

  if (grounded && !s.dead) {
    const legPhase = Math.floor(s.ticks / 6) % 2 === 0;
    ctx.fillRect(x + 6, y + 26, 5, legPhase ? 6 : 3);
    ctx.fillRect(x + 15, y + 26, 5, legPhase ? 3 : 6);
  } else {
    ctx.fillRect(x + 6, y + 26, 5, 5);
    ctx.fillRect(x + 15, y + 26, 5, 5);
  }
}
