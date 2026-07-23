import BootScreen from "./components/BootScreen";
import MenuBar from "./components/MenuBar";
import WindowLayer from "./components/WindowLayer";

/**
 * The home route ("/") — the desktop itself.
 *
 * This file stays tiny on purpose: it just composes the scene. Each OS
 * feature (menu bar, dock, windows...) lives in its own component under
 * app/components/, and the desktop stacks them up.
 */
export default function Desktop() {
  return (
    <main className="desktop">
      <MenuBar />

      {/* Icons + windows (client-side, interactive) */}
      <WindowLayer />

      {/* Coming in later features: <Dock /> */}

      {/* Rendered last so it sits on top, then fades out via CSS */}
      <BootScreen />
    </main>
  );
}
