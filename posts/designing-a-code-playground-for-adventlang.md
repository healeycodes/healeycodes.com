---
title: "Designing a Code Playground for Adventlang"
date: "2021-12-18"
tags: ["go"]
description: "Using Web Workers and WebAssembly to build a speedy UI."
---

I'm nine puzzles into my challenge to design and use a programming language to solve 2021's [Advent of Code](https://adventofcode.com/). I wrote about how and why I created Adventlang in a [previous post](https://healeycodes.com/designing-a-programming-language-for-advent-of-code). Today, I'm here to announce that I got side tracked and shipped a [code playground](https://healeycodes.github.io/adventlang/) so that you (and by you, I mean me) can write and execute Adventlang programs in a web browser, which makes it easier to share runnable code snippets with friends. Another goal was to speed up the write → execute loop.

![The code playground's user interface. Input section, run button, output section.](full.png)

Adventlang's interpreter is written with Go. The CLI interpreter runs programs by accepting a filename via command line arguments. The main function reads the file and passes both the filename (for stack traces) and source code to `RunProgram`. This same function is used when importing modules too (by using the returned context, aka scope, instead of the output).

```go
func RunProgram(filename string, source string) (string, *Context, error)
```

To get it to run in a web browser, I compiled the `web/run.go` entry point to [WebAssembly](https://github.com/golang/go/wiki/WebAssembly) (Wasm). Go functions aren't automatically exported to the browser environment but you can use the [syscall/js package](https://pkg.go.dev/syscall/js) to alter the global scope — which then allows JavaScript to call `RunProgram`.

```go
// web/run.go

// ..

func main() {
    // A function called `adventlang` will be set on the global scope
	js.Global().Set("adventlang", js.FuncOf(run))

	// Leave a channel open to ensure this program
	// is running when called from JavaScript land
	// (channels are pipes that connect concurrent goroutines)
	c := make(chan struct{}, 0)
	<-c
}

func run(this js.Value, args []js.Value) interface{} {

	// A bit of validation
	if len(args) != 1 {
		return js.ValueOf("error: run(source) takes a single argument")
	}

	// All stack traces will use "web" as the filename
	result, _, err := adventlang.RunProgram("web", args[0].String())
	if err != nil {
		return js.ValueOf(fmt.Sprintf("uh oh..\n\n %v", err.Error()))
	}

	// js.ValueOf returns a JavaScript type depending on
	// a variable's Go type (here, it's always a string)
	return js.ValueOf(result)
}
```

To run our Wasm module in the browser, we need Go's JavaScript support file (`wasm_exec.js`) to provide an [importObject](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/instantiateStreaming#parameters) (you can think of this as necessary “glue code”). It can be found distributions of Go 1.11 onwards. To keep the version in sync with the system's Go installation, I added a line to the code playground's build script:

```bash
# build_wasm.sh

# Get matching version of wasm_exec for Go installation
cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" docs/wasm_exec.js
# Compile!
GOOS=js GOARCH=wasm go build -o docs/adventlang.wasm web/run.go
```

WIth `wasm_exec.js` and `adventlang.wasm` ready to be fetched by the browser, we can call [WebAssembly.instantiateStreaming](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/instantiateStreaming), and `go.run()`, to export a function to JavaScript Land that will run arbitrary user code! A more general step-by-step guide to setting up Wasm projects can be found on [Go's WebAssembly wiki](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/instantiateStreaming).

The source code for the code playground can be found in [/docs](https://github.com/healeycodes/adventlang/tree/main/docs). It's vanilla JavaScript, and plain CSS, mostly written in an [index.html](https://github.com/healeycodes/adventlang/blob/main/docs/index.html) file.

## Don't Block The Main Thread

The first version of the code playground loaded the Wasm module and ran user programs — but not very gracefully. The browser tab was unresponsive during code execution with no way for the user to cancel the action. This is because Wasm and JavaScript share the same execution thread. Infinite loops crashed the tab, just like if you enter the developer console and type `while (true) {}`.

[MDN Web Docs](https://developer.mozilla.org/en-US/docs/Glossary/Main_thread) reminds us why this is:

> The main thread is where a browser processes user events and paints. By default, the browser uses a single thread to run all the JavaScript in your page, as well as to perform layout, reflows, and garbage collection. This means that long-running JavaScript functions can block the thread, leading to an unresponsive page and a bad user experience.
> 

[Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) allow us to run tasks in background threads and communicate via [messaging](https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage). This means if we run the Wasm module in its own worker, the worker will be blocked instead of the main thread — which means the user doesn't have a buggy, frozen page.

## Improving UX with a Worker Pool

I freed up the main thread by moving the Wasm execution to a worker. But I noticed that the first time the user ran their code there was a delay while the worker loaded `wasm_exec.js` and the Wasm module. The user was also restricted to a single execution thread. So if they wrote an infinite loop in Adventlang, the single worker would never respond to that request or additional requests. Their main thread would be free but they'd need to refresh to run any other code.

So to fix these two problems — 1) slow initial respond time, 2) single execution thread — I moved to something similar to a worker pool model:

When the code playground loads, spin up a worker:

```js
// worker.js

// A synchronous import
importScripts("wasm_exec.js");

// This block runs as soon as the worker is created
// this "preloading" is relevant for the initial worker
// to ensure the UI reacts quickly to the first request
const runtime = (async () => {
  const go = new self.Go();
  const wasm = await fetch("adventlang.wasm");
  const result = await WebAssembly.instantiateStreaming(wasm, go.importObject);
  go.run(result.instance);
})();

onmessage = async (e) => {
  await runtime;

  const start = Date.now();

  // Adventlang output is sent to stdout.
  // In the Wasm build, it goes to console.log
  // which we capture here
  let logs = "";
  self.console.log = (s) => (logs += `${s}\n`);

  // Pass user code to the exported Wasm function
  self.adventlang(e.data);

  // Reply to index.html
  postMessage([logs, Date.now() - start]);
};
```

When a user runs code, use the idle worker, or spawn a new worker, and terminate the 'stale' worker running old code:
    
```js
// index.html

// Retrieve an idle worker or spawn a new one
function getWorker() {
    let worker = workerPool.find(worker => worker.ready);
    if (!worker) {
        worker = {
                    id: Math.random(),
                    ready: true,
                    instance: new Worker('worker.js')
                };
        workerPool.push(worker);
    }
    return worker
}

// Start pool with one idle worker
getWorker();

// Terminate and remove any running workers _apart_ from `id`
function garbageCollect(id) {
    workerPool.forEach(worker => {
        if (worker.id != id) {
            worker.instance.terminate();
        }
    })
    workerPool = workerPool.filter(worker => worker.id == id);
}

// Execute input code via worker and display resulting output
function run() {
    const worker = getWorker();
    worker.ready = false;

    // Pass code to the worker
    const result = worker.instance.postMessage(input.value);

    // Kill any other running workers (they're stale now!)
    garbageCollect(worker.id);

    // Here's the asynchronous part
    worker.instance.onmessage = (e) => {
        // This runs once the worker has finished
        // executing user code
        output.value = e.data[0];
        worker.ready = true;
    }
}
```
    

In the below diagram, a user runs code twice (the second run being requested before the first finishes). An idle worker is consumed and then terminated when the newer request enters the system. A running Wasm module cannot be paused or stopped mid-execution — which is why it's necessary to terminate stale workers.

![Example flow of an idle worker being replaced.](worker_2.png)

## Other Niceties

I added a dropdown with example programs for users to play around with and picked snippets that show a range of the languages features. I also added a timer that measures the run time inside the worker.

![The Quicksort example in the playground.](quicksort.png)

I want to write a syntax reference either on or linked from the code playground. Some feedback I received was that when visiting the page, users were unsure how to start writing code and what language features were available. This is expected as I'm in the process of expanding a personal language to be more approachable.

## Unexplored Ideas

Having more than one worker in the pool would reduce the chances of having to spin up a new worker. However, it would be less respectful of a user's resources, which is why I didn't ship it.

I didn't try compiling Adventlang to JavaScript with [GopherJS](https://github.com/gopherjs/gopherjs) — I believe the performance would be comparable, and that I'd still need to use the worker pool.

I didn't use a code editor library (I was looking at minimal ones, like [CodeJar](https://medv.io/codejar/)). I'm glad that I *didn't* because currently there's no build step for the code playground which makes it about 100x more maintainable for me long term.

There is no syntax highlighting. This I'm still looking into. The syntax is close enough to JavaScript that I should be able to lift some logic out of an open source implementation. Perhaps I can export tokens from my parser (kinda similar to how the syntax highlighting in [Ink By Example](https://healeycodes.com/learning-the-ink-programming-language) works). Although, this would be too slow for live-updates because Adventlang is a tree-walk interpreter.

A first step for syntax highlighting would be to shade the matching parenthesis and curly bracket sections.

<br>

.. I should really get back to solving those puzzles now.

<br>

Thanks to [James Little](https://twitter.com/jameslittle230) for comments/corrections/discussion.
