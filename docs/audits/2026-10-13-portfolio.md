# TangOS portfolio audit, October 13, 2026

Applied **Impeccable 4.5.2 audit** and **design-taste-frontend v2**, preserving the established desktop OS identity. This is a bounded audit and content update, not a redesign or a WCAG certification.

## Follow-up: all four original findings resolved

The fixes preserve the desktop identity, project content and public routes.

| Original finding | Resolution | Verification |
| --- | --- | --- |
| Boot delays requested work | Direct URLs skip boot before first paint, including with blocked session storage. Homepage boot ends after 1.1 s instead of 3.1 s; repeat visits skip it. Windows remain visible during their opening movement. | Fresh direct links, repeat visits, homepage timing, keyboard Restart and reduced motion pass. |
| Power touch area | A 46 px menu bar fully contains the 44 × 44 target on narrow screens and coarse pointers, including landscape and tablets. The menu opens immediately below the target. Window zoom, drag and rotation, plus desktop-icon drag bounds, follow the actual bar height. Power uses the amber keyboard focus token. | Touch activation, sleep/wake, menu position and window fit pass at 320 × 568, 390 × 844 and 844 × 390; tablet drag and zoom/rotation pass. |
| Small secondary labels | Project tags and sidebar descriptors are 12 px, with existing names, body text and evidence retaining their hierarchy. | Computed sizes and desktop/mobile wrapping inspected; every project's narrow-pane image containment passes. |
| Literal semantic colors | Accent foreground, accent hover and scrollbar thumb colors now live in root tokens; selection and primary links use those tokens. | Each former literal occurs only in its token definition; the palette stays visually consistent. |

**Follow-up checks:** `npm run verify` passes, including **183/183 crawlability assertions**. The production-preview browser suite passes **19/19 tests**. Impeccable's final mechanical scan returns **zero findings**. Desktop, portrait and short landscape layouts were inspected. Evidence: [desktop](tangos-desktop-fixed.png), [mobile Power menu](power-mobile-fixed.png).

**Performance qualification:** An isolated Lighthouse 13.5.0 mobile run on local production `/projects/rawforge` measures Performance **97**, Accessibility **100**, Best Practices **96**, SEO **100**, FCP **0.9 s**, LCP **2.6 s**, TBT **0 ms** and CLS **0**. Removing the boot delay improves immediate access but does not establish a lower simulated LCP. That lab metric remains above 2.5 s; no field Core Web Vitals or physical-device claim is made. The Best Practices deduction is the two Vercel telemetry script URLs returning 404 on localhost. A run overlapping browser tests measured Performance 95/LCP 2.8 s and is excluded from the comparison because it had competing load.

The initial scores and findings below remain the audit baseline, not the current unresolved backlog. Physical iPhone, Safari and screen-reader checks remain outside this pass.

## Implementation integrity verdict: pass

The site expresses a coherent desktop portfolio rather than a generic landing-page template. Warm Graphite windows, amber focus and selection, a dock, and real project artifacts support the same experience. Research, Engineering, and Hobbies remain separate, existing URLs remain stable, and the new `/projects/rawforge` route derives from the shared catalog.

The mechanical Impeccable detector scanned `app/` after the changes and returned **zero findings**. This does not replace the visual and behavioral checks below.

## Initial Impeccable health score

| Dimension | Score | Evidence and remaining limit |
| --- | --- | --- |
| Accessibility | 3/4 | Labelled controls, keyboard focus, image alternatives, native disclosures and reduced motion; small Power target and secondary typography remain. |
| Performance | 3/4 | Lighthouse mobile performance 97, zero layout shift and zero blocking time; first-visit LCP 2.6 s exceeds the 2.5 s target. |
| Theming | 3/4 | Consistent semantic palette and opaque reading surfaces; some repeated literal colors remain outside the token definitions. |
| Responsive design | 3/4 | Navigation, window geometry and all project visuals pass at 320 px; synthesized touch gestures work; the Power control is still small. |
| Implementation integrity | 4/4 | One project catalog, shared evidence renderer, honest figure provenance and measured-result limits; detector returns no findings. |
| **Total** | **16/20, Good** | **Address the small control and first-visit delay before a broader polish pass.** |

Four findings: **P0 0, P1 0, P2 2, P3 2**. No blocker was observed in the tested portfolio flows. Broader assistive-technology and device testing could reveal additional issues.

## Initial prioritized findings (resolved above)

### P2: The decorative boot screen delays the work

- **Location:** `app/globals.css:191`, `app/components/BootScreen.tsx:10`.
- **Category:** Performance and information hierarchy.
- **Evidence:** The exit animation begins after 2.4 s and fades for another 0.7 s. A fresh-session Lighthouse mobile run on `/projects/rawforge` measured LCP 2.6 s, FCP 0.9 s, TBT 0 ms and CLS 0. The effect is hidden on repeat sessions and for reduced motion.
- **Impact:** A visitor opening a direct project link initially sees branding instead of the requested work, despite the content already being available.
- **Recommendation:** Shorten the boot sequence or reserve it for the homepage. Keep direct project links immediate.
- **Suggested command:** `/impeccable optimize`.

### P2: Power is a small touch target

- **Location:** `app/globals.css:2206` (`.power-button`), `app/components/PowerMenu.tsx:117`.
- **Category:** Responsive design and accessibility.
- **Evidence, corrected in follow-up:** The base button is 26 × 22 CSS pixels. The existing phone override declares 44 × 44, but its target extends above the 30 px bar and viewport. Coarse-pointer layouts wider than 640 px retain the small base size. The initial report's claim that the phone rule also rendered 26 × 22 was inaccurate. Collection controls and mobile window controls are 44 px tall.
- **Impact:** Power is harder to activate accurately on a phone. It misses Impeccable's 44 × 44 target; this observation alone is not a determination of a WCAG AA violation because target-spacing exceptions need separate assessment.
- **Recommendation:** Expand the interactive area on touch layouts while retaining the small glyph.
- **Suggested command:** `/impeccable adapt`.

### P3: Secondary labels are harder to read than the prose

- **Location:** `app/globals.css:1493` (`.proj-tag`), `app/globals.css:2824` (sidebar kind text).
- **Category:** Accessibility and visual hierarchy.
- **Evidence:** Tags and sidebar descriptors render at 11 px; body copy is 15 px and workflow/caption text is 13 px. The new workflow stays readable at the phone breakpoint and uses text rather than tiny SVG node labels.
- **Impact:** Low-vision visitors may need extra zoom for skills and project descriptors. This is a readability recommendation, not a font-size-based WCAG failure.
- **Recommendation:** Raise meaningful secondary labels to 12-13 px; keep the project name and evidence visually primary.
- **Suggested command:** `/impeccable typeset`.

### P3: Some foreground colors bypass the palette tokens

- **Location:** `app/globals.css:2808-2820` (scrollbar, selection, primary link).
- **Category:** Theming.
- **Evidence:** The project styles repeat `#21170e` as the accent foreground and use literal scrollbar and hover colors alongside the semantic variables.
- **Impact:** A future palette change requires finding several literals instead of updating one definition. The current palette is visually consistent.
- **Recommendation:** Promote repeated semantic roles to tokens during the next palette edit; avoid an unrelated stylesheet rewrite.
- **Suggested command:** `/impeccable extract`.

These are small, recurring readability and token-maintenance issues, not a reason to replace the desktop format. Finish any chosen fixes with `/impeccable polish`, then rerun `/impeccable audit`. The commands can be applied independently or together.

## Taste v2 assessment

**Mode:** preserve the existing portfolio. **Design read:** a personal computational-imaging portfolio for hiring managers and technical peers, using a warm dark desktop OS. **Dials:** DESIGN_VARIANCE 6, MOTION_INTENSITY 5, VISUAL_DENSITY 5, inferred from the incumbent windowed layout and interactions.

- **Identity and system:** Preserve the native system type, amber accent, window radius hierarchy, opaque detail pane, dock and traffic lights. This site's OS metaphor justifies its clock, running indicators and desktop controls. The pinned dark theme and warm palette override generic dual-theme and palette-rotation defaults in Taste v2.
- **Content hierarchy:** The research/engineering/hobby distinction works. Plain-language blurbs and optional technical detail make the work skimmable without discarding experimental limits. The boot-screen delay is the main first-impression weakness.
- **Evidence:** Actual scientific imagery, native capture screenshots, an optical ray trace and playable hobby projects give each entry a concrete subject. RAWForge's figures are explicitly simulator UI evidence. Device findings are qualified as iPhone 15 Pro measurements, and production hardening is stated without implying an App Store release.
- **TangOS entry:** Retired the tiny window-lifecycle SVG. A real desktop screenshot leads to the useful architecture: a project URL selects work, a shared TypeScript catalog supplies content, and desktop interactions and server-rendered HTML serve different visitors. The explanation renders as readable text on phones.
- **Motion:** Window transitions communicate state; the dock reacts only to suitable pointer/motion preferences; the research sequence can be paused. RAWForge and TangOS explanations add no automatic animation. Reduced-motion coverage passes.
- **Consistency:** New evidence uses existing figure, caption, workflow and disclosure patterns. No dependency or alternate visual system was added. Existing published routes and primary navigation labels remain intact.
- **Pre-flight:** Checked real imagery, caption accuracy, palette/radii, CTA wrapping, body contrast, mobile collapse, keyboard behavior, overflow and reduced motion. New copy contains no em/en-dash separators or invented metrics. Marketing-only rules about hero stacks, logo walls, bento cells and marquees are inapplicable to this preserved windowed portfolio.

**Verdict:** The desktop identity is worth retaining. The updated entries are more useful and grounded in evidence. Improve arrival speed and small text/targets before spending effort on additional visual effects.

## Verification and diagnostic qualifications

- `npm run verify`: typecheck and production build pass, with **183/183 crawlability assertions**. Canonicals, metadata, sitemap, unique route documents and all ten projects are present.
- `npm run test:browser`: **16/16 tests pass** against the production preview. Coverage includes 1440/768/390 px collection navigation, Back/Forward, RAWForge reload/deep links and figures, TangOS replacement content, keyboard focus and comparisons, reduced motion, no-JavaScript content, simulator overlays, and mobile geometry at 320 × 568, 390 × 844 and 844 × 390.
- Mobile tests synthesize Chromium touch input for dock swipes, window actions and image comparisons. This proves emulated gestures, not physical iPhone or Safari behavior.
- Visual inspection: homepage, RAWForge and TangOS at desktop and 390 px; browser regression checks inspect every project image for load and narrow-pane containment.
- Lighthouse 13.5.0, mobile simulation, local production `/projects/rawforge`: **Performance 97, Accessibility 97, Best Practices 96, SEO 100**. These are one lab run, not field Core Web Vitals. INP was not measured.
- Lighthouse's contrast flag sampled the fading, `aria-hidden` boot caption (4.17:1 during that sample). The earlier sample was 2.81:1. This is a transient animation finding, not evidence that settled project prose fails contrast. Settled project secondary text blends to about **8.84:1** over `#221d18`; amber text is about **8.09:1**. The recommended boot simplification addresses the transient too.
- The two console 404s in the final Lighthouse run were Vercel Analytics and Speed Insights URLs on localhost. They are hosting-specific and are not treated as broken portfolio assets. All project image assertions pass. A staging screenshot asset was absent during an initial local run; the final server includes it and the final test run verifies it.
- No blanket accessibility certification, physical-device test, exhaustive game/terminal test, or new camera-hardware validation was performed. The audit findings are documented without changing unrelated site behavior.

## Figure provenance

`public/rawforge-recipe.webp` and `public/rawforge-shoot.webp` are resized WebP conversions of the public RAWForge repository's `docs/design/screenshots/20260905-refined-steps.png` and `20260905-refined-shoot.png`. They are simulator captures from September 5, 2026, reviewed alongside the workflow and interface-verification documents. Pixel content was not retouched. The `refined-shoot` image predates the later viewfinder size adjustment.

`public/tangos-desktop.webp` is a real 1280 × 720 browser screenshot of this checkout's production homepage on October 13, 2026, converted to WebP. It is not a generated mockup.

Audit evidence: [RAWForge mobile](rawforge-mobile.jpg), [RAWForge desktop workflow](rawforge-workflow-desktop.jpg), [TangOS mobile workflow](tangos-workflow-mobile.jpg).
