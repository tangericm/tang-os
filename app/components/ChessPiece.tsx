import { useId, type ReactNode } from "react";
import type { Color, PieceSymbol } from "chess.js";

const PALETTE = {
  w: { stops: ["#ffffff", "#f4ecdd", "#d6c6a8"], edge: "#3a2f25", detail: "#7a6650", light: "#ffffff" },
  b: { stops: ["#625c55", "#38342f", "#181614"], edge: "#0c0a09", detail: "#9a9186", light: "#a39a8f" },
} as const;

const PLINTH = "M10.5 39.2h24c1.1 0 2 .9 2 2v.3c0 1.1-.9 2-2 2h-24c-1.1 0-2-.9-2-2v-.3c0-1.1.9-2 2-2Z";
const DOME = "M11.4 39.2c.2-2.3 1.8-3.6 4.3-3.6h13.6c2.5 0 4.1 1.3 4.3 3.6Z";
const COLLAR = "M14 35.6c.1-1.5 1.2-2.4 3-2.4h11c1.8 0 2.9.9 3 2.4Z";
const BAND = "M15.6 25.4c0-1.3 3.1-2.2 6.9-2.2s6.9.9 6.9 2.2-3.1 1.9-6.9 1.9-6.9-.6-6.9-1.9Z";
const STEM = "M17.8 33.4c1.4-2.2 2-4.6 1.8-7.4h5.8c-.2 2.8.4 5.2 1.8 7.4Z";

/** Original Staunton-style pieces: turned silhouettes on a stepped base, lit from the left. */
export default function ChessPiece({ type, color }: { type: PieceSymbol; color: Color }) {
  const id = useId().replace(/:/g, "");
  const tone = PALETTE[color];
  const fill = `url(#${id})`;
  const ink = color === "w" ? tone.edge : tone.light;
  const line = { fill: "none", stroke: tone.detail, strokeWidth: .9, strokeLinecap: "round" } as const;
  const shine = { fill: "none", stroke: tone.light, strokeWidth: 1.1, strokeLinecap: "round", strokeOpacity: color === "w" ? .95 : .55 } as const;
  const base = (small = false): ReactNode => small ? <>
    <path d="M13.4 39.4c.3-2.1 1.8-3.4 4-3.4h10.2c2.2 0 3.7 1.3 4 3.4Z" />
    <path d="M12.5 39.4h20c1 0 1.8.8 1.8 1.8v.4c0 1-.8 1.8-1.8 1.8h-20c-1 0-1.8-.8-1.8-1.8v-.4c0-1 .8-1.8 1.8-1.8Z" />
  </> : <><path d={COLLAR} /><path d={DOME} /><path d={PLINTH} /></>;

  return (
    <svg viewBox="0 0 45 45" aria-hidden="true" className={`chess-piece chess-piece-${color}`}
      fill={fill} stroke={tone.edge} strokeWidth="1.35" strokeLinejoin="round">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2=".25">
          <stop offset="0" stopColor={tone.stops[0]} />
          <stop offset=".5" stopColor={tone.stops[1]} />
          <stop offset="1" stopColor={tone.stops[2]} />
        </linearGradient>
      </defs>
      {type === "p" && <>
        <path d="M16.4 36c2.4-3 3.6-6.6 3.5-11.2h5.2c-.1 4.6 1.1 8.2 3.5 11.2Z" />
        <path d="M16.6 25.4c0-1.4 2.6-2.4 5.9-2.4s5.9 1 5.9 2.4-2.6 1.8-5.9 1.8-5.9-.4-5.9-1.8Z" />
        <circle cx="22.5" cy="16.4" r="6.1" />
        <path d="M18.9 14.6a4 4 0 0 1 2.9-3.2" {...shine} />
        <path d="M19.6 33.2c.9-1.7 1.4-3.6 1.5-5.6" {...shine} />
        {base(true)}
      </>}
      {type === "r" && <>
        <path d="M16.2 33.4 17.4 17h10.2l1.2 16.4Z" />
        <path d="M13.6 7.6h3.8v2.8h3.2V7.6h3.8v2.8h3.2V7.6h3.8v7c0 1.3-1 2.4-2.4 2.4H16c-1.4 0-2.4-1.1-2.4-2.4Z" />
        <path d="M13.9 13.4h17.2M16.9 29.8h11.2" {...line} />
        <path d="M18.6 19.2l-.6 9" {...shine} />
        <path d="M15.3 9.2v3" {...shine} />
        {base()}
      </>}
      {type === "n" && <>
        <g transform="translate(-1.6 0)">
          <path d="M16.6 35.6c.3-3.8 2-6.4 4.6-8.6 1.3-1.1 1.4-2.5.5-3.4-1.4.6-2.9.9-4.7 1.3-1.8.4-3.4.8-4.9.3-1.6-.5-1.7-2-.9-3.3C13 18.7 16.3 14.4 19.6 11.5c1.1-1 2.4-1.6 3.8-1.9l2-4.2 1.7 4.2c4.5 1.6 7.4 6.4 7.6 12.6.2 5.2-.6 9.6-1.9 13.4Z" />
          <path d="M27.6 11.2c3.5 2.3 5.4 6.2 5.6 10.8.2 4.4-.5 8.3-1.6 11.8" {...line} />
          <path d="m29.7 13.7-1.5 1.1m3 1.9-1.7.8m2.7 2.6-1.8.4m2.1 3.1h-1.8m1.6 3.6-1.7-.3" {...line} />
          <path d="M12.4 25.2c1.3-.1 2.6-.5 3.8-1M21.4 23.6c-1.5-1-2.3-2.6-2.1-4.4" {...line} />
          <path d="M19.2 15.7c.7-.7 1.7-.8 2.4-.3-.6.8-1.6 1-2.4.3Z" fill={ink} stroke="none" />
          <circle cx="12.9" cy="22.3" r=".75" fill={ink} stroke="none" />
          <path d="M14.4 18.8c1.4-2.2 3-4.2 4.8-5.8" {...shine} />
          <path d="M19.4 33.4c.6-2.4 1.8-4.2 3.4-5.6" {...shine} />
        </g>
        {base()}
      </>}
      {type === "b" && <>
        <path d="M18.2 33.4c1.6-2.6 2.3-5.4 2.2-8.4h4.2c-.1 3 .6 5.8 2.2 8.4Z" />
        <path d="M22.5 10.4c-3.8 3-7.3 7.1-7.3 10.4 0 3.1 3.1 4.4 7.3 4.4s7.3-1.3 7.3-4.4c0-3.3-3.5-7.4-7.3-10.4Z" />
        <path d="M16.4 25.4c0-1.3 2.7-2.2 6.1-2.2s6.1.9 6.1 2.2-2.7 1.9-6.1 1.9-6.1-.6-6.1-1.9Z" />
        <circle cx="22.5" cy="8.7" r="2" />
        <path d="m25.7 13.8-4 5.5" fill="none" stroke={ink} strokeWidth="1.7" strokeLinecap="round" />
        <path d="M17.2 21.9c3.4 1.2 7.2 1.2 10.6 0" {...line} />
        <path d="M18 19c.5-1.9 1.7-3.7 3.2-5.3" {...shine} />
        <path d="M20.4 32c.8-1.7 1.2-3.4 1.3-5" {...shine} />
        {base()}
      </>}
      {type === "q" && <>
        <path d={STEM} />
        <path d="M12.6 13.8 16.2 23.6h12.6l3.6-9.8-3 4.8-1.8-7.4-2.4 6.2-2.7-7.6-2.7 7.6-2.4-6.2-1.8 7.4Z" />
        <path d={BAND} />
        {[[12.6, 13.6], [17.4, 11], [22.5, 9.6], [27.6, 11], [32.4, 13.6]].map(([cx, cy]) =>
          <circle key={cx} cx={cx} cy={cy} r="1.85" />)}
        <path d="M17 21.4c3.6.9 7.4.9 11 0" {...line} />
        <path d="M17.4 20.4l-1.6-4.2" {...shine} />
        <path d="M20.3 32c.8-1.5 1.2-3.1 1.2-4.6" {...shine} />
        {base()}
      </>}
      {type === "k" && <>
        <path d={STEM} />
        <path d="M14.2 23.4c-2-3.8-1.2-8 2.4-9.3 2.5-.9 4.5.2 5.9 1.5 1.4-1.3 3.4-2.4 5.9-1.5 3.6 1.3 4.4 5.5 2.4 9.3Z" />
        <path d="M21.3 3.6h2.4v2.5h2.5v2.4h-2.5v3.3h-2.4V8.5h-2.5V6.1h2.5Z" />
        <circle cx="22.5" cy="13.3" r="1.8" />
        <path d={BAND} />
        <path d="M22.5 15.8v6.6M16.6 21.3c3.8 1 8 1 11.8 0" {...line} />
        <path d="M15.4 20.4c-.6-1.9-.3-3.8 1.2-4.8" {...shine} />
        <path d="M20.3 32c.8-1.5 1.2-3.1 1.2-4.6" {...shine} />
        {base()}
      </>}
    </svg>
  );
}
