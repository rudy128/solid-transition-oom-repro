# Solid pending transition OOM reproduction

This small Solid app renders nested `<For>` lists into jsdom. A resource inside `<Suspense>` stays pending while the app repeatedly replaces a keyed store list through `startTransition`. The list has two live rows and reuses four keys. On Node 24 with a 96 MiB heap limit, retained heap grows until Node reports `JavaScript heap out of memory` after roughly 11,000 to 12,000 updates. The script does not inject an allocation failure.

## Run

Use Node 24 and install the locked dependencies:

```sh
npm ci
npm run repro
```

The script prints retained heap every 1,000 updates. It should end with a fatal heap OOM before completing 30,000 updates. For the control, use:

```sh
npm run control
```

The control keeps the same resource pending and performs the same updates through `batch` instead of `startTransition`. It completes 30,000 updates with roughly 23 MiB of retained heap on the tested machine. The exact OOM point depends on the Node build and memory limit.

## What this shows

During the pending transition, `Transition.sources` accumulates signals from rows that have left the two-row list. In a source build, it held about 20,000 entries after 5,000 updates. Memory returned near baseline once the resource resolved in an unconstrained run. This is retention for the lifetime of a pending transition, rather than a leak after that transition completes.

This reproduces a Solid-caused OOM path under this workload. It does **not** establish the cause of [solidjs/solid#4680](https://github.com/solidjs/solid/issues/4680), which reported an ordinary `batch` update and did not provide evidence of a pending transition.
