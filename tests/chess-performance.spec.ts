import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { browserModule, browserSource, reactBrowserRuntime } from "./helpers/react-browser";

declare global {
  interface Window {
    measureChessPly: (san: string) => void;
    unmountChessMeasure: () => void;
    chessMeasure: { workers: number; initialization: number[]; latency: number[]; depths: number[]; grades: string[] };
  }
}

async function mount(page: Page, baseline: boolean, baselineSource: string) {
  await page.goto("/engine/SOURCE.md");
  await page.setContent('<div id="measure-root"></div>');
  const hook = baseline ? browserSource("Hook", baselineSource)
    : browserModule("Hook", "app/components/useChessReview.ts");
  await page.addScriptTag({ content: `(()=>{
    ${reactBrowserRuntime()}
    ${browserModule("../lib/chess-engine", "app/lib/chess-engine.ts")}
    ${browserModule("./chess-coach", "app/lib/chess-coach.ts")}
    ${browserModule("../lib/chess-review", "app/lib/chess-review.ts")}
    ${hook}
    const stats=window.chessMeasure={workers:0,initialization:[],latency:[],depths:[],grades:[]};
    const NativeWorker=window.Worker;
    window.Worker=new Proxy(NativeWorker,{construct(target,args){
      const worker=Reflect.construct(target,args);
      if(String(args[0]).includes("/engine/")){
        stats.workers++;
        const start=performance.now();
        worker.addEventListener("message",event=>{if(event.data==="readyok")stats.initialization.push(performance.now()-start)});
      }
      return worker;
    }});
    const React=require("react"),DOM=require("react-dom"),root=require("react-dom/client").createRoot(document.querySelector("#measure-root"));
    const game=new (require("chess.js").Chess)(),starts=[];
    function Fixture({moves}){
      const state=require("Hook").useChessReview(moves,{enabled:true,mode:"live",epoch:0});
      React.useEffect(()=>{
        if(!state.running&&state.completed===moves.length&&moves.length){
          const i=moves.length-1;
          stats.latency[i]=performance.now()-starts[i];
          stats.depths[i]=state.reviews[i].depth;
          stats.grades[i]=state.reviews[i].grade;
        }
      },[state.running,state.completed,moves]);
      return React.createElement("div",{id:"measure-state","data-completed":state.completed,"data-running":state.running},state.error);
    }
    DOM.flushSync(()=>root.render(React.createElement(Fixture,{moves:[]})));
    window.measureChessPly=san=>{
      game.move(san);const moves=game.history({verbose:true});starts[moves.length-1]=performance.now();
      DOM.flushSync(()=>root.render(React.createElement(Fixture,{moves})));
    };
    window.unmountChessMeasure=()=>DOM.flushSync(()=>root.unmount());
  })();` });
}

test("real browser engine retains one worker across drained queues; record before/after latency", async ({ page }, testInfo) => {
  test.setTimeout(180000);
  let baselineSource: string;
  try { baselineSource = execFileSync("git", ["show", "973a65c:app/components/useChessReview.ts"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
  catch { test.skip(true, "Historical benchmark baseline is unavailable in this checkout"); return; }
  const moves = ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"];
  const runs: Array<Window["chessMeasure"] & { baseline: boolean; batch: number }> = [];
  for (let batch = 0; batch < 3; batch++) {
    for (const baseline of (batch % 2 ? [false, true] : [true, false])) {
      await mount(page, baseline, baselineSource);
      for (let i = 0; i < moves.length; i++) {
        await page.evaluate(san => window.measureChessPly(san), moves[i]);
        await expect(page.locator("#measure-state")).toHaveAttribute("data-completed", String(i + 1), { timeout: 20000 });
        await expect(page.locator("#measure-state")).toHaveAttribute("data-running", "false");
        await expect(page.locator("#measure-state")).toHaveText("");
      }
      const sample = await page.evaluate(() => window.chessMeasure);
      expect(sample.workers).toBe(baseline ? moves.length : 1);
      expect(sample.latency).toHaveLength(moves.length);
      runs.push({ baseline, batch, ...sample });
      await page.evaluate(() => window.unmountChessMeasure());
    }
  }
  const stats = (values: number[]) => {
    const sorted = values.toSorted((a, b) => a - b);
    return { n: values.length, medianMs: sorted[Math.ceil(sorted.length / 2) - 1], p95Ms: sorted[Math.ceil(sorted.length * .95) - 1] };
  };
  const groups = [true, false].map(baseline => {
    const group = runs.filter(run => run.baseline === baseline);
    return { baseline, workers: group.reduce((sum, run) => sum + run.workers, 0), latency: stats(group.flatMap(run => run.latency)), initialization: stats(group.flatMap(run => run.initialization)) };
  });
  const output = testInfo.outputPath("analysis-worker-comparison.json");
  writeFileSync(output, JSON.stringify({ method: "Browser Worker, real bundled WASM, actual baseline/current review hook and current grading code; 3 alternating batches of 6 plies; drained queues; no opponent or rendering animation; latency is move append to published grade, not field INP; local device, uncontrolled OS load, no throttling; retained hash state may change grades and depth", groups, runs }, null, 2));
  await testInfo.attach("analysis-worker-comparison", { path: output, contentType: "application/json" });
});
