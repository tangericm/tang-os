# tang-os

The operating system behind [ericmtang.com](https://ericmtang.com) —
Eric M. Tang's personal site with the look and feel of a modern desktop
OS. Built from scratch with [Next.js](https://nextjs.org) and React,
deployed on Vercel.

No UI framework, no component library, no CSS framework. Five runtime
dependencies, three of which are React and Next. The design system is one
hand-written stylesheet.

More of Eric's work: [github.com/tangericm](https://github.com/tangericm)

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run verify   # typecheck, build, then assert the built HTML
```

## Deploy

Pushing to `main` deploys automatically via Vercel. CI runs `verify` on every
pull request.

## Two documents, one page

The desktop is the site for anyone running JavaScript. Every route also renders
a plain linear HTML document — the same content, from the same data modules —
which is what search engines, link unfurlers, and visitors without scripting
actually receive.

Which one is visible is decided entirely by CSS. `.sitedoc` is clipped by
default, and `public/no-js.css` (loaded from a `<noscript>` link) promotes it
and hides the desktop. Nothing about correct rendering depends on a script
executing; an earlier revision got this backwards and served the fallback
document permanently to any browser that blocked its inline script.

`npm run check:crawlable` reads the prerendered HTML and asserts the parts that
fail silently: content present on every route, canonicals self-referential,
`og:url` matching, no two indexable documents identical, the mirror never
`display: none`. A crawlability regression is invisible in a browser, which is
the whole reason these exist.

## Features

- [x] Boot screen with monogram + progress animation, skipped after the first visit
- [x] Desktop: frosted menu bar, live clock, Aurora wallpaper
- [x] Design tokens (`:root` in `globals.css`) — retheme in one edit
- [x] Draggable, resizable windows with working traffic lights and life-cycle animations
- [x] Dock with magnification, tooltips, and running indicators
- [x] About Me (About This Mac parody) with a keyboard-navigable tab bar
- [x] Projects app: master/detail over six projects, each with a bespoke animated SVG explainer
- [x] Resume: desktop file → document viewer + PDF download
- [x] Terminal: a working shell over the same project data (`ls`, `cat`, `open`, and some jokes)
- [x] Runner: a dinosaur game on `<canvas>`
- [x] Power menu: sleep, restart, shut down
- [x] Real routes and deep links — `/projects/spectral` opens that project
- [x] Crawlable document mirror, JSON-LD, sitemap
- [x] Mobile support
- [ ] Menu bar dropdowns
- [ ] More easter eggs

## Layout

```
app/
  (desktop)/        routes; the layout holds the OS chrome so windows survive navigation
  components/       one file per OS feature
  data/             projects, profile, publications — the single source for every surface
  lib/              routing, metadata, JSON-LD builders
  globals.css       the entire design system
public/no-js.css    the site, for a visitor with no JavaScript
scripts/            build-output assertions
```

## Credits

Original wallpaper artist: **Frankie**, Chief Morale Officer (emeritus).
Photo by Eric; Frankie appears courtesy of Michell. 🐾
