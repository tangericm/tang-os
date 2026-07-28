/**
 * The single place the TangOS version number is written down.
 *
 * It used to live as a string literal inside the terminal's `uname` handler,
 * which meant it drifted every time: v0.19 shipped to production reporting
 * 0.18, because bumping it was a separate act of memory from cutting the
 * release. One constant, imported wherever the version is displayed, makes
 * "update the version" a single edit that cannot be half-done.
 *
 * Bump this IN THE SAME COMMIT as the release, so the running site always
 * reports the version it actually is.
 */
export const TANGOS_VERSION = "0.30.3";

/** Codename stays put unless the palette changes. */
export const TANGOS_CODENAME = "warm graphite";
