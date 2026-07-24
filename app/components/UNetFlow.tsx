/**
 * UNetFlow, an accurate diagram of the self-fusion denoising network.
 *
 * What makes it self-fusion, and not a plain U-Net denoiser, is visible
 * in the diagram: the input is THREE adjacent B-scans (n−1, n, n+1),
 * and the network is trained to reproduce a slow, registration-based
 * 7-frame self-fusion result, distilled into a multi-scale U-Net that
 * runs at video rate. A data packet rides the encoder → bottleneck →
 * decoder path; the skip connections carry high-res detail across.
 *
 * Pure SVG + SMIL, animates on the compositor, zero JavaScript.
 */

const ENC_R = 176; // encoder bars right-aligned here
const DEC_L = 324; // decoder bars left-aligned here

// four levels; bars narrow with depth (spatial downsampling)
const L = [
  { y: 44, w: 74 },
  { y: 82, w: 56 },
  { y: 120, w: 40 },
  { y: 158, w: 26 }, // bottleneck level
];
const BH = 14;
const mid = (i: number) => L[i].y + BH / 2;

export default function UNetFlow() {
  // route the data packet travels: input → down encoder → bottleneck → up decoder → output
  const encMidX = (i: number) => ENC_R - L[i].w / 2;
  const decMidX = (i: number) => DEC_L + L[i].w / 2;
  const route =
    `M22 ${mid(0)} H${encMidX(0)}` +
    ` L${encMidX(1)} ${mid(1)} L${encMidX(2)} ${mid(2)} L${encMidX(3)} ${mid(3)}` +
    ` C${encMidX(3) + 70} 214 ${decMidX(3) - 70} 214 ${decMidX(3)} ${mid(3)}` +
    ` L${decMidX(2)} ${mid(2)} L${decMidX(1)} ${mid(1)} L${decMidX(0)} ${mid(0)} H478`;

  return (
    <svg className="unet" viewBox="0 0 500 210" role="img"
      aria-label="Self-fusion denoising network: three adjacent B-scans in, denoised frame out">
      <defs>
        <linearGradient id="ublk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(158,140,116,0.55)" />
          <stop offset="1" stopColor="rgba(96,82,66,0.55)" />
        </linearGradient>
        <filter id="uglow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* INPUT, a little stack of 3 adjacent B-scans (the self-fusion signature) */}
      <g className="unet-frames">
        <rect x="10" y={mid(0) - 15} width="26" height="20" rx="2.5" />
        <rect x="6" y={mid(0) - 11} width="26" height="20" rx="2.5" />
        <rect x="2" y={mid(0) - 7} width="26" height="20" rx="2.5" className="unet-frame-front" />
      </g>
      <text className="unet-label" x="18" y={mid(0) + 22} textAnchor="middle">n−1, n, n+1</text>

      {/* skip connections, dashed, flowing left→right at each shared level */}
      {[0, 1, 2].map((i) => (
        <line key={`s${i}`} className="unet-skip"
          x1={ENC_R} y1={mid(i)} x2={DEC_L} y2={mid(i)}
          style={{ animationDelay: `${i * 0.22}s` }} />
      ))}

      {/* faint guide the packet rides */}
      <path id="unet-route" className="unet-route" d={route} />

      {/* encoder (left, narrowing) + decoder (right, widening) feature maps */}
      {L.map((l, i) => (
        <g key={`b${i}`}>
          <rect className="unet-block" x={ENC_R - l.w} y={l.y} width={l.w} height={BH} rx="3" />
          <rect className="unet-block" x={DEC_L} y={l.y} width={l.w} height={BH} rx="3" />
        </g>
      ))}

      {/* OUTPUT, the single denoised frame */}
      <rect className="unet-frame-front" x="466" y={mid(0) - 12} width="28" height="24" rx="2.5" />
      <text className="unet-label" x="480" y={mid(0) + 24} textAnchor="middle">denoised</text>

      {/* the travelling data packet */}
      <circle className="unet-packet" r="4.5" filter="url(#uglow)">
        <animateMotion dur="3.6s" repeatCount="indefinite"
          keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.55 1">
          <mpath href="#unet-route" />
        </animateMotion>
      </circle>
    </svg>
  );
}
