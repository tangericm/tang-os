/**
 * UNetFlow — an animated diagram of a U-Net denoising architecture with
 * a packet of data flowing through it: in at the top-left, down the
 * encoder, across the bottleneck, up the decoder, out the top-right.
 * Skip connections pulse as the data passes. Pure SVG + SMIL, so it
 * animates on the compositor and needs zero JavaScript.
 *
 * This is a *diagram*, not a card — it earns the space by showing the
 * exact shape of the work (Tang et al., real-time OCT denoising).
 */
export default function UNetFlow() {
  // three encoder levels (left, descending) mirrored as decoder (right)
  const levels = [
    { y: 46, w: 20, h: 58 },
    { y: 104, w: 20, h: 40 },
    { y: 150, w: 20, h: 26 },
  ];
  const LX = 96; // encoder column x
  const RX = 364; // decoder column x
  const cy = (l: { y: number; h: number }) => l.y + l.h / 2;

  // the route the data packet travels (encoder → bottleneck → decoder)
  const route =
    `M40 ${cy(levels[0])} H${LX}` +
    ` V${cy(levels[1])} ` +
    ` V${cy(levels[2])} ` +
    ` C${LX + 40} 210 ${RX - 40} 210 ${RX} ${cy(levels[2])}` +
    ` V${cy(levels[1])} V${cy(levels[0])} H${RX + 60}`;

  return (
    <svg className="unet" viewBox="0 0 460 230" role="img"
      aria-label="U-Net denoising architecture with data flowing through it">
      <defs>
        <linearGradient id="ublk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(150,132,110,0.5)" />
          <stop offset="1" stopColor="rgba(90,78,64,0.5)" />
        </linearGradient>
        <filter id="uglow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* skip connections — dashed, flowing left→right */}
      {levels.map((l, i) => (
        <line key={`s${i}`} className="unet-skip"
          x1={LX + 20} y1={cy(l)} x2={RX} y2={cy(l)}
          style={{ animationDelay: `${i * 0.25}s` }} />
      ))}

      {/* the route (faint guide the packet rides) */}
      <path id="unet-route" className="unet-route" d={route} />

      {/* encoder + decoder blocks */}
      {levels.map((l, i) => (
        <g key={`b${i}`}>
          <rect className="unet-block" x={LX} y={l.y} width={l.w} height={l.h} rx="4" />
          <rect className="unet-block" x={RX} y={l.y} width={l.w} height={l.h} rx="4" />
        </g>
      ))}
      {/* bottleneck */}
      <rect className="unet-block unet-bottleneck" x={224} y={186} width={32} height={22} rx="4" />

      {/* end labels */}
      <text className="unet-label" x="20" y={cy(levels[0]) + 3} textAnchor="middle">in</text>
      <text className="unet-label" x="440" y={cy(levels[0]) + 3} textAnchor="middle">out</text>

      {/* the travelling data packet */}
      <circle className="unet-packet" r="4.5" filter="url(#uglow)">
        <animateMotion dur="3.4s" repeatCount="indefinite"
          keyPoints="0;1" keyTimes="0;1" calcMode="spline"
          keySplines="0.5 0 0.5 1">
          <mpath href="#unet-route" />
        </animateMotion>
      </circle>
    </svg>
  );
}
