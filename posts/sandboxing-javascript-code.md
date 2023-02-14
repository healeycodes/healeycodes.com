---
title: "Sandboxing JavaScript Code"
date: "2023-02-12"
tags: ["javascript"]
description: "An overview of the sandboxing landscape, and some experiments with Deno."
---

I've been enjoying playing around on [Val Town](https://www.val.town/) lately. Val Town can be described a few ways; a cloud scripting site, a runnable github gists, or [end-programmer programming](https://val-town.notion.site/End-programmer-Programming-a749beb4a9b143f2990f575fb7e59b33). I first came across it in a [Show HN thread](https://news.ycombinator.com/item?id=34343122).

> A "val" is a JavaScript/TypeScript function or value that runs on our servers. We aim to get you from idea to running code in seconds: type code, run it, get its API endpoint, schedule it - all from the browser, in a couple keystrokes.

You can do cute stuff like email yourself with `console.email` and call other people's scripts with `@yourFriend.bar()`. Here's a screenshot of me composing a val with autocomplete showing someone else's utility function — it can be auto-completed with Enter or followed with Command+Click like navigating a code base.

![A screenshot of Val Town. Autocomplete offers a utility function for formatting a basic authentication header.](val-town.png)

Playing around on Val Town, and writing a few small vals, got me thinking about how this stuff works — how they run my code on their server *securely*. The answer is sandboxing (also see: [workload isolation](https://fly.io/blog/sandboxing-and-workload-isolation/)).

*Sandboxing* is a technique of isolating the execution environment of the code, so that malicious code can't access sensitive information or harm the system. We're surrounded by sandboxes, really. You're reading this in a web browser which itself is a sandbox. If you're on an iPhone, that browser is wrapped with Apple's App Sandbox, and then layers of iOS sandboxes after that. It's sandboxes all the way down.

The sandbox that Val Town currently uses is [vm2](https://github.com/patriksimek/vm2) which runs untrusted code in the same process as the parent program. User-supplied code is transformed and evaluated in a locked down section of the same JavaScript environment. You can't submit `process.exit(0)` and kill the server *but* you could find a new vm2 security bug ([here's an example](https://github.com/patriksimek/vm2/issues/467#issuecomment-1247515828)) and remotely execute code within the parent program.

Per a [recent newsletter](https://blog.val.town/blog/val-town-newsletter-3#2bcad60775d141e9a3e5c72f31a0d168), Val Town are moving to a more secure runtime soon.

## My Own Mini Cloud Platform

During my final week at The Recurse Center, I wanted to build a mini cloud platform for my friends. Inspired by Val Town, I wanted to support little JavaScript programs.

I don't trust my friends not to hack my server so I needed to sandbox the JavaScript code they were sending me. After reading more about vm2's [history of breakouts](https://github.com/patriksimek/vm2/issues/338), I wanted a more secure solution.

AWS Fargate, AWS Lambda, and [Fly.io](http://Fly.io), all use [Firecracker](https://github.com/firecracker-microvm/firecracker/)'s lightweight virtualization technology to securely run user code. I went and read Julia Evan's [blog post](https://jvns.ca/blog/2021/01/23/firecracker--start-a-vm-in-less-than-a-second/), where she sets up Firecracker's MicroVMs for a personal project. While reading it, I thought: wow! secure AND fast. But, although it's well-suited for this problem space, setting up Firecracker seemed non-trivial so I decided I wouldn't be able to get it up and running in a few days.

My goal remained: run a service somewhere that my friends can send JavaScript code to be executed — and I was running out of time.

Next, I read about how CloudFlare's Worker platform does [Cloud Computing without Containers](https://blog.cloudflare.com/cloud-computing-without-containers/) by using [V8 Isolates](https://v8docs.nodesource.com/node-0.8/d5/dda/classv8_1_1_isolate.html) — a feature of the V8 JavaScript engine that powers Chrome, Deno, Node.js, and others. Isolates allow you to run multiple, isolated instances of JavaScript code in a single process. Each Isolate is a separate instance of the V8 engine, with its own memory heap, garbage collector, and JavaScript context. Letting you run code in a sandboxed environment.

CloudFlare actually go a few steps further than just relying on Isolates, they disallow timers and multithreading, use dynamic process isolation, and do periodic whole-memory shuffling. You can read more about this in [Mitigating Spectre and Other Security Threats](https://blog.cloudflare.com/mitigating-spectre-and-other-security-threats-the-cloudflare-workers-security-model/), or in the paper they co-authored called [Dynamic Process Isolation](https://arxiv.org/abs/2110.04751).

Let's get crisp about my threat model. While my friends are certainly crafty, and could feasibly find some kind of security hole in a less secure sandbox like vm2, I don't think they will find an internet-threatening zero day vulnerability.

## Sandboxing With Deno

I wanted to write application code, rather than my own isolation library. So instead of working with V8 bindings ([in Rust](https://github.com/denoland/rusty_v8), or [in Go](https://github.com/rogchap/v8go)) I tried to abuse Deno's permissions model to get something up and running quickly. Unlike Node.js, Deno is secure by default, and you opt in granular [permissions](https://deno.land/manual@v1.26.0/getting_started/permissions) like file, network, and environment access. These permissions helped me carve the boundaries of a sandbox.

The project I shipped, [deno-script-sandbox](https://github.com/healeycodes/deno-script-sandbox), has an API where users can send JavaScript/TypeScript programs and receive the evaluation result (stdout/stderr). When the API receives source code, it's written to disk, and then a sandbox program with limited permissions dynamically imports the code, executes it, and the result (stdout/stderr) is returned to the user.

The architecture roughly looks like this:

![deno-script-arch.png](deno-script-arch.png)

Here are the key lines (from [api.ts](https://github.com/healeycodes/deno-script-sandbox/blob/main/api.ts)) with some added comments:

```tsx
const cmd = [
      "deno",
      "run",
      // Limit memory usage
      `--v8-flags=--max-old-space-size=${SCRIPT_MEMORY_LIMIT}`,
      // The sandbox can only access the user's script file
      `--allow-read=${scriptPath}`,
      // The sandbox can only `fetch` to the proxy
      `--allow-net=${PROXY_LOCATION}`,
      "./sandbox.ts",
      `scriptId=${scriptId}`,
      `scriptPath=${scriptPath}`,
    ];

    // Limit how many scripts we're running at once
    const release = await conurrencyMutex.acquire();
    const scriptProcess = Deno.run({ cmd, stderr: "piped", stdout: "piped" });
    release();

    setTimeout(async () => {
        // (Error handling code has been removed for brevity)
        scriptProcess.kill();
        scriptProcess.close();
        await Deno.remove(scriptPath);
    }, SCRIPT_TIME_LIMIT);
```

The sandbox program is given the minimal permissions it needs to achieve its task. It's also passed a scriptId that doubles as an authentication ticket for the proxy. `fetch` is wrapped so that web requests pass through the proxy endpoint of the API (even if users call the hidden `__realFetch` function, it doesn't give them extra capabilities). The user's original resource is passed via headers.

Based off the sandbox's authentication ticket, the proxy can add any number of limitations like allowlisting URLs, a max number of requests per script, limitations around the bandwidth usage, etc.

The sandbox program is pretty small, so here's the code in its entirety:

```tsx
const scriptId = Deno.args[0] /* `scriptId=b` */.split("=")[1];
const scriptPath = Deno.args[1] /* `scriptPath=/a/b.ts` */.split("=")[1];
const scriptProxy = "http://localhost:3001/proxy";
const scriptAuthHeaders = {
  "x-script-id": scriptId,
};

const realFetch = fetch;
globalThis.fetch = (
  input: string | Request | URL,
  init: RequestInit = {},
) => {
  init.headers = {
    ...init.headers,
    ...scriptAuthHeaders,
    "x-script-fetch": input.toString(),
  };
  return realFetch(scriptProxy, init);
};

try {
  // Here's where we run user code
  await import(scriptPath);
} catch (e) {
  console.error(e);
}
```

The main downside of this approach is performance. The code needs to be written to disk and an entire Deno process needs to be spawned. That's a major cold boot penalty. Also, there aren't any control levers to limit the CPU usage of each of these processes.

A few of my friends tried to escape the sandbox and crash the server but … they weren't able to! A valiant attempt tried to over-consume heap memory:

```tsx
const a = [];
for (let i = 0; i < 9000000000; i++) {
    a.push(i)
}
```

But since we're passing `--max-old-space-size` to Deno, the heap space is locked down.

Mission complete. It's not exactly Deno's [Isolate Cloud](https://deno.com/blog/anatomy-isolate-cloud) but it works. 

## Going Lower Level

Happy that my duct-taped-together solution achieved my mini cloud platform goal, I wanted to look a little deeper at the steps required to build an Isolate sandbox the right way.

The [hello world example](https://github.com/denoland/rusty_v8/blob/main/examples/hello_world.rs) for using Deno's V8 bindings requires quite a bit of knowledge about V8 to be productive. Instead, I looked into using Deno's internal libraries (performance-focus Rust code). [Roll your own JavaScript runtime](https://deno.com/blog/roll-your-own-javascript-runtime) by Bartek Iwańczuk goes through the steps to build a CLI that executes JavaScript files (using Deno's internal libraries) and shows how to add on functionality to the runtime (reading to, writing, and deleting files).

I've put up a [repository](https://github.com/healeycodes/deno-isolate-web-request) with my experiments to get basic web requests working in the toy runtime. It doesn't use Deno-isms like zero-copy, and I only implement about 1% of the functionally of something like `fetch`, but you can do stuff like:

```jsx
const getExample = await request.get("http://healeycodes.com", {
  "someHeaderKey": "someHeaderValue",
});
console.log({
  status: getExample.status,
  headers: getExample.headers,
  url: getExample.url,
  body: getExample.body,
});
```

I was quite impressed by Deno's interfaces for V8. The Deno-to-V8 connection is straightforwards and accessible (compared to using V8 directly in C or C++) without giving up fine-grained control over things like performance and security. [A Guide to Deno Core](https://denolib.gitbook.io/guide/advanced/interaction-with-v8) is fantastic documentation too.

Reading through Deno's `fetch` implementation — both the [Rust parts](https://github.com/denoland/deno/blob/main/ext/fetch/lib.rs) and the [JavaScript parts](https://github.com/denoland/deno/tree/main/ext/fetch) — reveals the complexity of building a production ready web-standards-based runtime.

## Unexplored Ideas

I didn't read too deeply into the issues around executing multiple pieces of untrusted code in the same process. But if you want to dig a little deeper on that, [this HN thread](https://news.ycombinator.com/item?id=31740885) is the place to be. It includes Fly.io's CEO going back and forth with the tech lead for CloudFlare Workers, including asides by tptacek who wrote this [banger-of-an-post](https://fly.io/blog/sandboxing-and-workload-isolation/) about workload isolation on Fly's blog.

Going through resources on V8 (like the codebase, the projects blog posts, or famous papers) probably wouldn't have been a waste of time but I wanted to ship some code rather than read for a week. I did enjoy reading [an in-depth post](https://github.blog/2022-06-29-the-chromium-super-inline-cache-type-confusion/) about a recent remote code execution bug in Chromium though.

There are other JavaScript engines (like [QuickJS](https://bellard.org/quickjs/)) that are a little easier to work with compared to V8 — but most of the smaller engines don't have any promises around security capabilities (nor are they deployed and attacked at Chrome/V8's scale). There are [JavaScript/TypeScript bindings](https://github.com/justjake/quickjs-emscripten) for QuickJS by [justjake](https://github.com/justjake/quickjs-emscripten) if you want to play around with that.

A recently-released [JS to WebAssembly toolchain](https://github.com/Shopify/javy) by Shopify looks promising for evaluating code within a secure sandbox (see: [WebAssembly's security model](https://webassembly.org/docs/security/)). Many people point to WebAssembly as the future of securely running untrusted code — with almost every mainstream programming language having some kind of capability to be compiled down to WebAssembly.

Like any excursion that takes you deeper down the stack, I return a little scared about the [software mountain](https://xkcd.com/2347/) we build on, and curious to go back for more.

<small>Thanks to [Samuel Eisenhandler](https://samgeo.codes/) for providing feedback on an early draft.</small>
