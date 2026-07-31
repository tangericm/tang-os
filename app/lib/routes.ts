import { PROJECTS } from "../data/projects";

/**
 * The URL contract, in one place because both halves of the app read it: the
 * server renders a document per route, and the client window manager decides
 * which app is open from the same path. Two parsers would drift, and the way
 * they drift is a URL that server-renders one thing and hydrates into another.
 *
 * Path segments rather than a query string, and that is a constraint rather
 * than a preference. `usePathname()` returns the real path during static
 * prerender on both server and client, so the two agree by construction and
 * there is no hydration mismatch to dodge. `useSearchParams()` returns empty
 * during prerender and forces a Suspense boundary, which would opt the whole
 * route out of static generation. A hash never reaches the server at all, so
 * it can carry neither a <title> nor a canonical.
 *
 * The URL names ONE app: the one you arrived at, or the last one you opened.
 * Windows stacked on top of it are ephemeral and do not rewrite it. Encoding
 * the full window stack produces things like /?open=about,terminal&front=
 * terminal, which is neither shareable nor rankable, and it makes the Back
 * button a click log.
 */

export type AppId = "about" | "projects" | "resume" | "terminal" | "game";

export type Route = {
  app: AppId;
  /** only meaningful when app === "projects" */
  project: string | null;
};

/** Matches ProjectsWindow's own default, so a bare /projects and a cold open
 *  of the app land on the same thing. Derived rather than restated: the window
 *  selects PROJECTS[0], so reordering the list used to leave this pointing at
 *  whatever project happened to lead before. */
export const DEFAULT_PROJECT = PROJECTS[0].id;

export const HOME: Route = { app: "about", project: null };

/** The routes that exist as files. /projects/[id] is generated per project. */
export const STATIC_ROUTES = ["/", "/projects", "/resume", "/terminal", "/play"] as const;

export function isProjectId(id: string): boolean {
  return PROJECTS.some((p) => p.id === id);
}

/**
 * Project ids that were once public and have since been renamed.
 *
 * `/projects/spectral` and `/projects/speckle` were live URLs before the
 * denoising project was renamed to `denoiser`, and both are in the
 * previously-published sitemap. Without this it does not 404 -- `parseRoute`
 * falls back to the desktop -- which is worse than a 404, because the visitor
 * silently lands on the wrong thing with no sign anything went wrong.
 * Resolving them keeps the old links working.
 *
 * Add an entry whenever a project id changes; never remove one, since the old
 * URL stays indexed long after the rename.
 */
const LEGACY_PROJECT_IDS: Record<string, string> = {
  spectral: "denoiser",
  speckle: "denoiser",
};

/** The current id for a possibly-legacy one, or null if it is neither. */
export function canonicalProjectId(id: string): string | null {
  if (isProjectId(id)) return id;
  const renamed = LEGACY_PROJECT_IDS[id];
  return renamed && isProjectId(renamed) ? renamed : null;
}

/**
 * Path → which app is open. Anything unrecognised falls back to the desktop
 * rather than throwing: this runs during render on both sides, and a URL that
 * 404s is the router's problem to report, not this function's.
 */
export function parseRoute(pathname: string): Route {
  /* Trailing slashes: Next normalises them away in production but a hand-typed
     URL can still carry one, and "/projects/" must not read as a project id. */
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  if (path === "/resume") return { app: "resume", project: null };
  if (path === "/terminal") return { app: "terminal", project: null };
  if (path === "/play") return { app: "game", project: null };
  if (path === "/projects") return { app: "projects", project: null };

  const project = path.startsWith("/projects/") ? path.slice("/projects/".length) : null;
  if (project) {
    const canonical = canonicalProjectId(project);
    if (canonical) return { app: "projects", project: canonical };
  }

  return HOME;
}

/** The inverse. Every push in the app goes through this so a renamed route is
 *  one edit rather than a grep. */
export function hrefFor(app: AppId, project?: string | null): string {
  switch (app) {
    case "about":
      return "/";
    case "projects":
      return project ? `/projects/${project}` : "/projects";
    case "resume":
      return "/resume";
    case "terminal":
      return "/terminal";
    case "game":
      return "/play";
  }
}
