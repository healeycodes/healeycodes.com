---
title: "Building a Runtime with QuickJS"
date: "2026-03-26"
tags: ["c"]
description: "Building a tiny JavaScript runtime on top of QuickJS with timers, file I/O, and an event loop."
---

A JavaScript engine (e.g. V8, JavaScriptCore) executes JavaScript code. It doesn't know about things like files, HTTP requests, or timers.

On the other hand, a JavaScript runtime (e.g. Node.js, Bun) is a more complete environment where JavaScript runs. It contains a JavaScript engine, extra APIs, an event loop and task queues, and platform-specific features.

That's what I'm hacking on today: a [tiny runtime](https://github.com/healeycodes/andjs) with `console.log`, `process.uptime()`, `setTimeout` and `clearTimeout`, `fs.readFileSync` and `fs.readFile`, as well as an event loop and worker pool for file I/O. Built on top of QuickJS.

Here's an example program it can run:

```js
const startedAt = process.uptime();
console.log("runtime booted");

setTimeout(async () => { // Timers
    console.log("uptime:", process.uptime() - startedAt);

    // Sync I/O
    console.log("sync bytes:", fs.readFileSync("Makefile", "utf8").length);

    // Async I/O
    console.log("async bytes:", (await fs.readFile("Makefile", "utf8")).length);
}, 100);
```

## Booting QuickJS from a Custom Executable

QuickJS actually ships with a small shell/runtime built around `qjs.c` and a basic standard library, but I'm not going to re-use any of it. We'll start from scratch.

So, to begin with, we need to boot QuickJS from a custom executable. The smallest useful embedder involves creating an instance of the engine (`JSRuntime`), an execution environment (`JSContext`), and a way to read a code file, evaluate it, and print any exceptions.

```c
int main(int argc, char **argv)
{
    JSRuntime *rt = JS_NewRuntime();
    JSContext *ctx = JS_NewContext(rt);
    int exit_code;

    // ... install globals later

    exit_code = run_file(ctx, argv[1]);

    // ... then run the event loop until timers / async work complete

    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
    return exit_code;
}
```

QuickJS runs JavaScript but we, the host, decide what the global environment looks like; what the input is, and how the outputs are returned to the user.

```c
static int run_file(JSContext *ctx, const char *path)
{
    SourceFile source = {0};
    JSValue result;
    int exit_code = 1;

    if (read_file(path, &source, NULL, 0) != 0) {
        return 1;
    }

    // QuickJS runs the program, and returns a JSValue
    result = JS_Eval(ctx,
        (const char *)source.bytes,
        source.len,
        path,
        JS_EVAL_TYPE_GLOBAL);

    // Report errors
    if (JS_IsException(result)) {
        dump_exception(ctx);
    } else {
        exit_code = 0;
    }

    // Host-created JSValues must be freed!
    JS_FreeValue(ctx, result);
    free_source_file(&source);
    return exit_code;
}
```

We can run something already:

```bash
$ ./andjs example-uncaught-throw.js
Error: test exception
    at <eval> (example-throw.js:1:16)
```

## Adding console.log

Our first problem is that we can't see anything happening unless an error is thrown. Let's solve this by adding a fan-favorite, `console.log`.

A host function receives JavaScript arguments and can stringify them by calling QuickJS functions (i.e. `JS_ToString`).

The `console.log` function that we're adding will be connected by attaching a `console` object to the global object with a `log` function inside, which is wired up to the following C function.

```c
static JSValue js_console_log(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv)
{
    for (int i = 0; i < argc; i++) {
        JSValue string_value;
        const char *text;

        if (i > 0) {
            fputc(' ', stdout);
        }

        // Note: not Node.js-accurate formatting
        string_value = JS_ToString(ctx, argv[i]);
        text = JS_ToCString(ctx, string_value);
        fputs(text, stdout);

        JS_FreeCString(ctx, text);
        JS_FreeValue(ctx, string_value);
    }

    fputc('\n', stdout);
    return JS_UNDEFINED;
}
```

Before QuickJS runs any JavaScript code, we need to first set up the global object.

```c
static int install_console(JSContext *ctx)
{
    JSValue global_obj = JS_GetGlobalObject(ctx);
    JSValue console_obj = JS_NewObject(ctx);
    JSValue log_fn = JS_NewCFunction(ctx, js_console_log, "log", 1);

    JS_SetPropertyStr(ctx, console_obj, "log", log_fn);
    JS_SetPropertyStr(ctx, global_obj, "console", console_obj);

    // ... free temporary handles
    return 0;
}
```

With that configured, let's take a look at our first runtime side-effect:

```bash
# console.log("sum:", 1 + 2, "ok");
$ ./andjs example-log.js
sum: 3 ok
```

## Adding process.uptime()

The first piece of real runtime state we're going to store is the process start time. I've chosen a pretty simple Node.js API to add here, one I don't think I've ever called directly; `process.uptime()`, the number of seconds the process has been running.

This means we're tracking something outside of the engine, rather than `console.log` where we only registered a pure function on the engine's global object.

```c
typedef struct {
    double start_time; // Used by process.uptime()
    int next_timer_id; // (We'll add more timers
    Timer *timers;     // in the next section.)
    // ...
} RuntimeState;
```

QuickJS provides a sensible place to store host state via `JS_SetRuntimeOpaque(...)`, which allows us to associate our own data with the QuickJS runtime abstraction. It stores a user-defined pointer (e.g. we define its type and manage its lifetime). Some QuickJS callbacks receive a `JSRuntime`, which lets us access this state directly, avoiding an extra lookup.

```c
// Declaring, then storing, our custom runtime state for later
RuntimeState *state;

// ..

state = calloc(1, sizeof(*state));
now_monotonic(&state->start_time);
JS_SetRuntimeOpaque(rt, state);
```

An interesting aside here is how we track uptime (as opposed to wallclock time). A monotonic clock moves forward and isn't affected by wallclock adjustments like NTP or the user changing the system time. Wallclock time has none of these properties and it's feasible that, if it powered `process.uptime()`, then sometimes this function would return a negative number!

```c
static JSValue js_process_uptime(JSContext *ctx, JSValueConst this_val,
                                 int argc, JSValueConst *argv)
{
    RuntimeState *state = JS_GetRuntimeOpaque(JS_GetRuntime(ctx));
    double now;

    // ... argument handling
    now_monotonic(&now);

    // Return the difference between now and start
    return JS_NewFloat64(ctx, now - state->start_time);
}
```

Notably, process uptime is not script execution start, so you'll never see a zero.

```bash
# const u = process.uptime();
# console.log(u);
$ ./andjs example-process-uptime.js
0.0003500021994113922
```

## Adding setTimeout and clearTimeout

We're getting closer to one of the reasons I wanted to build this project, and write this post, which is that I wanted to build an event loop from scratch.

The event loop is the scheduler behind JavaScript. First, sync code runs. Then, async work like timers, events, and promises start triggering callbacks, running more sync code (and the cycle continues). The event loop schedules all this work.

Even though we don't have an event loop just yet, we can still queue up work for it to handle. Essentially, that's all a timer is: some queued work.

```c
typedef struct Timer Timer;

struct Timer {
    int id;           // Timeout ID used in JavaScript
    double deadline;  // Monotonic expire time
    JSValue callback; // Reference to the JavaScript callback function
    Timer *next;
};
```

I chose a sorted linked list to store all the scheduled timers because it's fast enough and requires very little code to implement, compared to alternative solutions like a priority queue.

Timers are sorted because, when it's time to run one, and there are multiple that are past their deadline, we only need to read the first item to get started.

```c
static void insert_timer(RuntimeState *state, Timer *timer)
{
    Timer **slot = &state->timers;

    // Find the earliest place in the LL to place it
    while (*slot && (*slot)->deadline <= timer->deadline) {
        slot = &(*slot)->next;
    }

    timer->next = *slot;
    *slot = timer;
}
```

Of course, the downside is that inserting takes O(n) time ... but isn't the code lovely and terse? Albeit CPU cache unfriendly.

To set a timer, we need: the time it should run, and a reference to its callback so that, later, we can get QuickJS to execute the callback at the correct time.

```c
static JSValue js_set_timeout(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv)
{
    RuntimeState *state = JS_GetRuntimeOpaque(JS_GetRuntime(ctx));
    Timer *timer = calloc(1, sizeof(*timer));
    double now;
    int64_t delay_ms = 0;

    // ... validate fn and ms

    now_monotonic(&now);

    timer->id = state->next_timer_id++;
    timer->deadline = now + (double)delay_ms / 1000.0;
    timer->callback = JS_DupValue(ctx, argv[0]);

    insert_timer(state, timer);
    return JS_NewInt32(ctx, timer->id);
}
```

The callback lifetime is host-managed via `JS_DupValue(...)` and `JS_FreeValue(...)`. In QuickJS, values (`JSValue`) are reference-counted. So when we call _dup_, we're saying "hey, I have another reference to this value". And when we call _free_, we're releasing one of those references.

I didn't have too much trouble managing shared data between the runtime and the engine once I understood the APIs (which did not take as long as I would've thought); this shows the care that QuickJS was built with.

Clearing a timer is simpler. We delete it, free memory, and return `undefined`.

```c
static JSValue js_clear_timeout(JSContext *ctx, JSValueConst this_val,
                                int argc, JSValueConst *argv)
{
    RuntimeState *state = JS_GetRuntimeOpaque(JS_GetRuntime(ctx));
    int32_t id;
    Timer **slot = &state->timers;

    // ... convert argv[0] to id

    while (*slot) {
        if ((*slot)->id == id) {
            Timer *timer = *slot;
            *slot = timer->next;
            JS_FreeValue(ctx, timer->callback);
            free(timer);
            break;
        }
        slot = &(*slot)->next;
    }

    return JS_UNDEFINED;
}
```

These two functions, `js_set_timeout` and `js_clear_timeout`, are set on the global object like `console`. As we step into the more heady runtime internals, I’ll be able to show fewer code snippets without spamming you, but the wiring is mostly the same.

At this point, we're able to schedule as many timers as our heap will allow; but they stay waiting until the next section.

## Adding the Event Loop

The host, not QuickJS, decides when callbacks (e.g. timers) run.

```js
setTimeout(() => {
  console.log('A'); // inside timer callback

  // schedules a QuickJS job (here, a promise continuation / microtask)
  Promise.resolve().then(() => console.log('A+'));
}, 0);

setTimeout(() => {
  console.log('B'); // inside timer callback (runs later)
}, 5);

console.log('sync'); // runs before any timer callbacks
```

Running expired timers involves finding them, and then triggering JavaScript execution with `JS_Call(...)`.

Importantly, after we trigger a callback, we need to drain pending QuickJS jobs so that promise continuations run before the next timer or I/O callback. In this case, those pending jobs are promise reaction jobs, often thought of as microtasks.

```c
static int run_expired_timers(JSContext *ctx)
{
    RuntimeState *state = JS_GetRuntimeOpaque(JS_GetRuntime(ctx));
    double now;

    now_monotonic(&now);

    while (state->timers && state->timers->deadline <= now) {
        JSValue result;
        Timer *timer = state->timers;

        state->timers = timer->next;
        result = JS_Call(ctx, timer->callback, JS_UNDEFINED, 0, NULL);

        // ... free timer, report exception

        drain_pending_jobs(JS_GetRuntime(ctx));
        now_monotonic(&now);
    }

    return 0;
}
```

Since I've planned ahead, and I know where we're going (async I/O!), the event loop shape here is already trending towards supporting different types of callbacks.

Each step inside the event loop like `run_expired_timers` and `run_completed_file_jobs` drains pending QuickJS jobs after every callback. This gives the ordering I want here: promise continuations queued by a callback run before the next timer or I/O callback.

```c
static int run_event_loop(JSContext *ctx)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    RuntimeState *state = JS_GetRuntimeOpaque(rt);

    while (state->timers || runtime_has_async_work(state) || JS_IsJobPending(rt)) {
        struct timeval timeout;
        struct timeval *timeout_ptr;

        run_expired_timers(ctx);
        run_completed_file_jobs(ctx); // No-op for now; coming soon in next section
        drain_pending_jobs(rt);

        if (!state->timers && !runtime_has_async_work(state) && !JS_IsJobPending(rt)) {
            break;
        }

        // Find the earliest timer
        compute_wait_timeout(state, &timeout, &timeout_ptr);

        // Sleep until I/O completes or the next timer expires
        wait_for_events(state, timeout_ptr);
    }

    return 0;
}
```

Our runtime needs a way to sleep until something happens without burning CPU; and be able to wake up promptly. For these wake-up events, I've chosen a kernel pipe (regular readers will remember these pipes from last week's [Building a Shell](https://healeycodes.com/building-a-shell)).

The workers, running on separate threads, will use this wakeup pipe to report when they've completed a task. The event loop, over in the runtime's main thread, uses `select()` to monitor the wakeup pipe's file descriptor until it's ready for reading. Additionally, the earliest timer is set as `select()`'s timeout so that the event loop can stop waiting on the wakeup pipe and go and handle timer callbacks.

```c
static int wait_for_events(RuntimeState *state, struct timeval *timeout_ptr)
{
    fd_set read_fds;

    FD_ZERO(&read_fds);
    FD_SET(state->wakeup_pipe[0], &read_fds);

    // Wait for data to be written to the wakeup pipe until the timeout
    select(state->wakeup_pipe[0] + 1, &read_fds, NULL, NULL, timeout_ptr);

    if (FD_ISSET(state->wakeup_pipe[0], &read_fds)) {
        clear_wakeup_pipe(state);
    }

    return 0;
}
```

The wakeup pipe will not deliver the completed work e.g. the contents of a file that's been read. It will only deliver a single byte (literally `1`) to signal that some work has been done. The async file jobs are stored in a linked list that contains the promise's `resolve` and `reject` functions (as `JSValue`s), along with the bytes that have been read. But more on that when we get to async I/O.

First we need to handle plain old sync I/O.

## Adding fs.readFileSync

Sync file I/O is easy to implement because the main thread can just block. For the API, although Node.js-like, I've kept it quite narrow; just `path` and only `utf8`.

The host reads a file and either returns a JavaScript string or throws an error.

```c
static JSValue js_fs_read_file_sync(JSContext *ctx, JSValueConst this_val,
                                    int argc, JSValueConst *argv)
{
    SourceFile source = {0};
    const char *path;
    const char *encoding;
    char error_buf[512] = {0};

    // ... convert args to C strings
    // ... reject anything except "utf8"

    // Simple read util, reads file bytes into `source`
    if (read_file(path, &source, error_buf, sizeof(error_buf)) != 0) {
        return JS_ThrowInternalError(ctx, "%s", error_buf);
    }

    return JS_NewStringLen(ctx, (const char *)source.bytes, source.len);
}
```

Here we use QuickJS's `JS_NewStringLen` to create a new `JSValue` for QuickJS to copy into its managed memory and eventually garbage collect. Unlike `JS_NewString`, which expects a null-terminated C string, `JS_NewStringLen` is better when you have a buffer with a known length and want to avoid a call to `strlen`.

## Adding fs.readFile with a Worker Pool

When `fs.readFile` is called, the resolution (or rejection) of the created promise becomes the responsibility of the runtime.

The promise object is created in the host and passed back to the engine. The host keeps references to the promise's `resolve` and `reject` functions, so when the task is complete it can call one of them and then let QuickJS run the follow-up promise jobs.

In order to support parallel I/O, I went with a threaded worker pool. These workers never run JavaScript. They get a task like "read file at $path" and go and get those bytes. There's a pending job queue (with path names) and a completed job queue (with file bytes or errors). The workers take a job from the pending queue, do it, and then put the result in the complete queue.

Workers write `1` to the wakeup pipe to signal the main thread (where `select()` is monitoring) so that it can call `resolve` or `reject` with the result.

Async file jobs are stored in a linked list, with references to the `resolve` and `reject` functions. We're also adding some new runtime state: a mutex (since the main thread and workers will be reading and writing shared memory), and a `pthread_cond_t` so the main thread can signal workers to check the pending queue.

```c
typedef struct AsyncFileJob AsyncFileJob;

struct AsyncFileJob {
    char *path;
    JSValue resolve;     // JavaScript function reference
    JSValue reject;      // JavaScript function reference
    uint8_t *bytes;      // Maybe file content
    size_t len;
    char *error_message; // Maybe error
    AsyncFileJob *next;
};

typedef struct {
    // ...
    pthread_mutex_t mutex;
    pthread_cond_t worker_cond; // For waking up worker
    int wakeup_pipe[2];         // Worker uses to signal main thread
    size_t active_file_jobs;    // The count, so runtime can exit

    AsyncFileJob *pending_jobs_head;
    AsyncFileJob *pending_jobs_tail;
    AsyncFileJob *completed_jobs_head;
    AsyncFileJob *completed_jobs_tail;

    pthread_t workers[WORKER_COUNT];
} RuntimeState;
```

This is all the runtime state we'll need to add in order to implement the features I listed at the start. The rest of the work is driving these queues. First, the C function that `readFile` calls into when a program wants to read some file content async.

A promise is created and returned, a pending job is queued up, and the worker is signalled.

```c
static JSValue js_fs_read_file(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    RuntimeState *state = JS_GetRuntimeOpaque(JS_GetRuntime(ctx));
    JSValue promise;
    JSValue resolving_funcs[2];
    AsyncFileJob *job;

    // ... validate (path, "utf8")

    promise = JS_NewPromiseCapability(ctx, resolving_funcs);

    job = calloc(1, sizeof(*job));
    job->path = strdup(path);
    job->resolve = resolving_funcs[0];
    job->reject = resolving_funcs[1];

    pthread_mutex_lock(&state->mutex);
    state->active_file_jobs++; // Track active jobs so the runtime can exit when it's zero
    enqueue_async_file_job(&state->pending_jobs_head, &state->pending_jobs_tail, job);
    pthread_cond_signal(&state->worker_cond); // Signal worker
    pthread_mutex_unlock(&state->mutex);

    return promise;
}
```

Over in the worker, it waits for the "new job signal" with `pthread_cond_wait` (with some checks to see if it should tear itself down). It then dequeues the pending job, reads a file, and writes the result to the complete job queue.

As mentioned earlier, the worker doesn't know anything about JavaScript. It just runs a little bit of C code.

```c
static void *worker_main(void *opaque)
{
    RuntimeState *state = opaque;

    for (;;) {
        AsyncFileJob *job;
        SourceFile source = {0};
        char error_buf[512] = {0};

        pthread_mutex_lock(&state->mutex);
        while (!state->pending_jobs_head && !state->stop_workers) {

            // Wait for signal
            pthread_cond_wait(&state->worker_cond, &state->mutex);
        }

        if (state->stop_workers && !state->pending_jobs_head) {
            pthread_mutex_unlock(&state->mutex);
            break;
        }

        job = dequeue_async_file_job(&state->pending_jobs_head, &state->pending_jobs_tail);
        pthread_mutex_unlock(&state->mutex);

        if (!job) {
            continue;
        }

        // Workers only move C data around.
        if (read_file(job->path, &source, error_buf, sizeof(error_buf)) == 0) {
            job->bytes = source.bytes;
            job->len = source.len;
        } else {
            job->error_message = strdup(error_buf);
        }

        pthread_mutex_lock(&state->mutex);
        enqueue_async_file_job(&state->completed_jobs_head, &state->completed_jobs_tail, job);
        pthread_mutex_unlock(&state->mutex);

        signal_event_loop(state); // Writes 1 to wakeup pipe
    }
}
```

In the runtime's main thread, after the event loop has received an event, it's time to handle the completed file jobs. We start by locking and consuming the completed jobs, and then calling the stored `resolve` or `reject` functions causing the promise to become fulfilled or rejected. This schedules follow-up QuickJS jobs but doesn't start them just yet.

Those pending QuickJS jobs are executed with `drain_pending_jobs` which calls `JS_ExecutePendingJob` on each.


```c
static int run_completed_file_jobs(JSContext *ctx)
{
    RuntimeState *state = JS_GetRuntimeOpaque(JS_GetRuntime(ctx));
    AsyncFileJob *jobs;

    pthread_mutex_lock(&state->mutex);
    jobs = state->completed_jobs_head;
    state->completed_jobs_head = NULL;
    state->completed_jobs_tail = NULL;
    pthread_mutex_unlock(&state->mutex);

    while (jobs) {
        AsyncFileJob *job = jobs;
        JSValue arg;
        JSValue result;

        jobs = jobs->next;

        if (job->error_message) {
            arg = new_error_value(ctx, job->error_message);
            result = JS_Call(ctx, job->reject, JS_UNDEFINED, 1, (JSValueConst *)&arg);
        } else {
            arg = JS_NewStringLen(ctx, (const char *)job->bytes, job->len);
            result = JS_Call(ctx, job->resolve, JS_UNDEFINED, 1, (JSValueConst *)&arg);
        }

        JS_FreeValue(ctx, arg);
        JS_FreeValue(ctx, result);

        // Important: this is what lets await continue.
        drain_pending_jobs(JS_GetRuntime(ctx));

        // ... free the completion record
    }

    return 0;
}
```

Everything has been building up to the fairly terse `run_event_loop`, where all the async work is waited on.

On receiving an event, the event loop runs expired timers, delivers file job results into the engine, drains pending QuickJS jobs, and then exits or starts waiting for more events.

```c
static int run_event_loop(JSContext *ctx)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    RuntimeState *state = JS_GetRuntimeOpaque(rt);

    while (state->timers || runtime_has_async_work(state) || JS_IsJobPending(rt)) {
        struct timeval timeout;
        struct timeval *timeout_ptr;

        run_expired_timers(ctx);
        run_completed_file_jobs(ctx);
        drain_pending_jobs(rt);

        if (!state->timers && !runtime_has_async_work(state) && !JS_IsJobPending(rt)) {
            break;
        }

        compute_wait_timeout(state, &timeout, &timeout_ptr);
        wait_for_events(state, timeout_ptr);
    }

    return 0;
}
```

As async work continues to be created, the core of the event loop continues to run and loop!

Note: I haven't verified how semantically close my runtime is to Node.js's priority of I/O vs timers.

For fun, I benchmarked my runtime against Node.js `v24.14.0` on an Apple M1 Pro. The benchmark is reading ten 1MB files using `Promise.all`.

Overall time (includes startup):
- `node`  27.7 ms ± 0.4 ms
- `andjs` 7.2 ms ± 0.3 ms

File-read portion:
- `node`  3.828 ms
- `andjs` 4.620 ms

It's no surprise that QuickJS, and a barebones runtime, has a faster startup. That's one of QuickJS's value propositions as an engine. To get comparatively close on the file-read portion is quite nice.

Although, not much is being measured. There isn't really much overhead you can put on top of ten small file-read tasks. But measuring things is fun nonetheless!

Grab the runtime source code at [healeycodes/andjs](https://github.com/healeycodes/andjs).
