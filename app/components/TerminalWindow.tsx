"use client";

import { useEffect, useRef, useState } from "react";
import Window from "./Window";
import { PROJECTS } from "../data/projects";

/**
 * TerminalWindow: a real shell, not a prop.
 *
 * The temptation with something like this is to make it a gag that prints
 * one joke. It earns its place instead by being a second, faster route to
 * the same content the Projects window holds, reading the very same
 * PROJECTS array, so `ls` and `cat` can never fall out of step with what
 * the GUI shows. Someone who would rather type than click gets a way
 * through, and there are a couple of jokes hidden in it anyway.
 */

type Passthrough = {
  onClose: () => void;
  onMinimize: () => void;
  motion?: "minimizing" | "closing";
  minimizeTarget?: string;
  zIndex?: number;
  onFocus?: () => void;
  /** so `open projects` can actually open the Projects window */
  onOpenApp?: (id: "about" | "projects" | "resume" | "game") => void;
};

type Line = { kind: "in" | "out" | "err" | "note"; text: string };

const PROMPT = "eric@tangos ~ %";

const BANNER: Line[] = [
  { kind: "note", text: "TangOS terminal · type `help` for the command list" },
];

/** wrap long output so it reads as a paragraph rather than one endless row */
function wrap(text: string, width = 72): string[] {
  const words = text.split(" ");
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > width) {
      out.push(line.trim());
      line = w;
    } else {
      line += " " + w;
    }
  }
  if (line.trim()) out.push(line.trim());
  return out;
}

export default function TerminalWindow({ onOpenApp, ...props }: Passthrough) {
  const [lines, setLines] = useState<Line[]>(BANNER);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIndex, setHIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // keep the newest output in view
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  function push(...next: Line[]) {
    setLines((prev) => [...prev, ...next]);
  }

  function out(text: string) {
    return { kind: "out" as const, text };
  }

  function run(raw: string) {
    const cmd = raw.trim();
    if (!cmd) return;
    push({ kind: "in", text: cmd });
    setHistory((h) => [...h, cmd]);
    setHIndex(-1);

    const [name, ...rest] = cmd.split(/\s+/);
    const arg = rest.join(" ").toLowerCase();

    switch (name.toLowerCase()) {
      case "help":
        push(
          out("ls                list projects"),
          out("cat <project>     print a project summary"),
          out("open <app>        open about | projects | resume | game"),
          out("whoami            short version"),
          out("skills            what I work in"),
          out("contact           how to reach me"),
          out("clear             clear the screen"),
          out("history           commands this session"),
          out("play              launch the runner")
        );
        break;

      case "ls":
        PROJECTS.forEach((p) =>
          push(out(`${p.id.padEnd(10)} ${p.name}`))
        );
        push({ kind: "note", text: "try `cat tracking`" });
        break;

      case "cat": {
        if (!arg) {
          push({ kind: "err", text: "cat: missing project. try `ls`" });
          break;
        }
        const p = PROJECTS.find(
          (x) => x.id === arg || x.name.toLowerCase().includes(arg)
        );
        if (!p) {
          push({ kind: "err", text: `cat: ${arg}: no such project` });
          break;
        }
        push(out(p.name), { kind: "note", text: `${p.group} · ${p.kind}` }, out(""));
        wrap(p.blurb).forEach((l) => push(out(l)));
        push(out(""), out(`tags: ${p.tags.join(", ")}`));
        p.links.forEach((l) => push({ kind: "note", text: `${l.label}: ${l.href}` }));
        break;
      }

      case "open": {
        const target = arg as "about" | "projects" | "resume" | "game";
        if (!["about", "projects", "resume", "game"].includes(target)) {
          push({ kind: "err", text: "open: try about, projects, resume or game" });
          break;
        }
        onOpenApp?.(target);
        push({ kind: "note", text: `opening ${target}...` });
        break;
      }

      case "whoami":
        wrap(
          "Eric Tang. PhD in biomedical engineering, Vanderbilt. I build imaging systems and the software that makes them useful: real-time denoising, closed-loop tracking, scanner control. Mostly the part where physics and a training loop have to agree."
        ).forEach((l) => push(out(l)));
        break;

      case "skills":
        push(
          out("languages   Python, C++, MATLAB, TypeScript"),
          out("ml          PyTorch, LibTorch, TorchScript, CUDA"),
          out("vision      OpenCV, YOLOv4, stereo calibration, registration"),
          out("systems     real-time acquisition, GPU pipelines, controls")
        );
        break;

      case "contact":
        push(
          { kind: "note", text: "email     eric.tang22@gmail.com" },
          { kind: "note", text: "github    github.com/tangericm" },
          { kind: "note", text: "linkedin  linkedin.com/in/eric-tang-a09524ab" }
        );
        break;

      case "clear":
        setLines([]);
        break;

      case "history":
        if (!history.length) push({ kind: "note", text: "nothing yet" });
        history.forEach((h, i) => push(out(`${String(i + 1).padStart(3)}  ${h}`)));
        break;

      case "play":
      case "game":
        onOpenApp?.("game");
        push({ kind: "note", text: "launching runner..." });
        break;

      /* --- the jokes --- */
      case "sudo":
        push({ kind: "err", text: "eric is not in the sudoers file. This incident has been reported." });
        break;
      case "uname":
        push(out("TangOS 0.17 (warm graphite) x86_64"));
        break;
      case "date":
        push(out(new Date().toString()));
        break;
      case "exit":
      case "logout":
        push({ kind: "note", text: "there is no escape. use the red button." });
        break;
      case "rm":
        push({ kind: "err", text: "rm: I have seen what you are about to type. no." });
        break;
      case "vim":
      case "emacs":
        push({ kind: "note", text: "not falling for that one." });
        break;

      default:
        push({ kind: "err", text: `${name}: command not found` });
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      run(input);
      setInput("");
      return;
    }
    // up/down walks the history, the way a shell does
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      if (!history.length) return;
      const next =
        e.key === "ArrowUp"
          ? hIndex < 0
            ? history.length - 1
            : Math.max(0, hIndex - 1)
          : hIndex < 0
            ? -1
            : Math.min(history.length - 1, hIndex + 1);
      setHIndex(next);
      setInput(next < 0 ? "" : history[next]);
    }
  }

  return (
    <Window title="Terminal" frameClassName="window-term" {...props}>
      {/* clicking anywhere in the shell should put the caret back */}
      <div className="term" onPointerDown={() => inputRef.current?.focus()}>
        <div className="term-scroll" ref={scrollRef}>
          {lines.map((l, i) => (
            <p className={`term-line term-${l.kind}`} key={i}>
              {l.kind === "in" && <span className="term-prompt">{PROMPT}</span>}
              {l.text || " "}
            </p>
          ))}

          <p className="term-line term-entry">
            <span className="term-prompt">{PROMPT}</span>
            <input
              ref={inputRef}
              className="term-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              aria-label="Terminal input"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </p>
        </div>
      </div>
    </Window>
  );
}
