import { JSDOM } from "jsdom";

const dom = new JSDOM("<div id='root'></div>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });

const { createComponent, createResource, createSignal, For, startTransition, Suspense, batch } =
  await import("solid-js");
const { render } = await import("solid-js/web");
const { createStore, reconcile } = await import("solid-js/store");

const mode = process.argv[2] || "pending";
if (mode !== "pending" && mode !== "batch") {
  throw new Error("Expected mode: pending or batch");
}
const [key, setKey] = createSignal(0);
const [state, setState] = createStore({
  data: [
    { symbol: "A", value: 0 },
    { symbol: "B", value: 0 }
  ]
});
let resolveResource;

function Child() {
  const [resource] = createResource(key, id =>
    id === 0 ? Promise.resolve("ready") : new Promise(resolve => (resolveResource = resolve))
  );
  return [
    resource,
    createComponent(For, {
      get each() {
        return state.data;
      },
      children: row =>
        createComponent(For, {
          each: ["symbol", "value"],
          children: column => () => row[column]
        })
    })
  ];
}

const dispose = render(
  () =>
    createComponent(Suspense, {
      fallback: "loading",
      get children() {
        return createComponent(Child, {});
      }
    }),
  document.getElementById("root")
);
await Promise.resolve();
await Promise.resolve();
const pending = startTransition(() => setKey(1));
await Promise.resolve();

for (let step = 1; step <= 30000; step++) {
  const update = () =>
    setState(
      "data",
      reconcile(
        [
          { symbol: step % 2 ? "A" : "B", value: step },
          { symbol: step % 2 ? "C" : "D", value: step }
        ],
        { key: "symbol" }
      )
    );
  if (mode === "batch") batch(update);
  else void startTransition(update);
  await new Promise(resolve => setImmediate(resolve));
  if (step % 1000 === 0) {
    global.gc();
    console.log(step, (process.memoryUsage().heapUsed / 2 ** 20).toFixed(1), "MiB");
  }
}

resolveResource("done");
await pending;
global.gc();
console.log("after resolution", (process.memoryUsage().heapUsed / 2 ** 20).toFixed(1), "MiB");
dispose();
