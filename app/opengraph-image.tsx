import { ImageResponse } from "next/og";

/**
 * The social preview card.
 *
 * Generated rather than exported as a PNG, so it cannot drift out of sync
 * with the site: the colours below are the same tokens globals.css uses,
 * and if the theme changes this changes with it. Next picks this file up
 * automatically and emits the og:image and twitter:image tags.
 *
 * Note this runs through Satori, not a browser. Flexbox only, no grid, and
 * every element holding more than one child needs an explicit display.
 */

export const alt =
  "Eric M. Tang, high-speed imaging, machine learning and computer vision.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#f4f1ec";
const AMBER = "#e2aa63";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(140deg, #2a231b 0%, #1b1712 55%, #14100c 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* a warm bloom in the corner, standing in for the wallpaper */}
        <div
          style={{
            position: "absolute",
            top: -260,
            right: -200,
            width: 720,
            height: 720,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(226,170,99,0.20) 0%, rgba(226,170,99,0) 70%)",
          }}
        />

        {/* the same monogram as the boot screen, tab icon and About avatar */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 92,
              height: 92,
              borderRadius: "50%",
              background: "linear-gradient(145deg, #a8845c 0%, #8a683f 60%, #6b4f33 100%)",
              color: "#fff",
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            ET
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: 26,
              fontSize: 22,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "rgba(244,241,236,0.50)",
            }}
          >
            ericmtang.com
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, color: INK, lineHeight: 1.05 }}>
            Eric M. Tang
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: 34,
              color: "rgba(244,241,236,0.74)",
              lineHeight: 1.3,
            }}
          >
            High-speed imaging &amp; machine learning
          </div>
          <div style={{ display: "flex", marginTop: 34, alignItems: "center" }}>
            <div style={{ display: "flex", width: 56, height: 3, background: AMBER, borderRadius: 2 }} />
            <div
              style={{
                display: "flex",
                marginLeft: 20,
                fontSize: 25,
                color: "rgba(244,241,236,0.56)",
              }}
            >
              computer vision · deep learning · GPU pipelines · real-time systems
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
