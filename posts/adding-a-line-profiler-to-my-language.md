---
title: "Adding a Line Profiler to My Language"
date: "2024-03-26"
tags: ["python"]
description: "Creating my own developer tooling, and some thoughts on line profilers."
---

When I worked on [profiling and optimizing the interpreter](https://healeycodes.com/profiling-and-optimizing-an-interpreter) for my toy programming language [nodots](https://github.com/healeycodes/nodots-lang), I was missing a tool to help me answer the question: how long does a line of nodots source code take to run? Such a tool would help me measure the impact of my performance improvements, and also help me write faster nodots programs.

When I saw CanadaHonk post a [screenshot](https://twitter.com/CanadaHonk/status/1769502527391744346) of their in-terminal profiler, I remembered this lost idea and started hacking on a feature to track the performance of lines in nodots.

I [added](https://github.com/healeycodes/nodots-lang/pull/5) a new flag to the CLI, `--profile`, that prints performance statistics right next to the program's source code. I implemented my favorite statistics from Python's [cProfile](https://docs.python.org/3/library/profile.html) module; number of calls, the total time of those calls, and how long each call took.

```text
$ python cli.py --profile fib.nd
                                      ncalls  tottime  percall
for (i = 0; i < 21; i = i + 1)
  # recursive (slow)
  fun fib(x)
    if (x == 0 or x == 1)
        return x;
    fi
    return fib(x - 1) + fib(x - 2);  x57270   11.2s    195µs
  nuf
  log(fib(i));                       x42      1.9s     46ms
rof
```

Getting immediate feedback right in my terminal has improved my iteration velocity when testing performance changes to my interpreter. Even with the reduced granularity compared to a more traditional profiling tool, I quite like the combined call statistics in this compact user interface.

## Line Profiler Internals

When the nodots interpreter is executing code, it's evaluating a tree of tokens. Examples of tokens are things like numbers, strings, variables, or function calls. Each token knows its line and column. 

Initially, I tried to track the duration of *everything* on *every* line but the output was a noisy sea of numbers. So I decided to just track function calls for now (most performance profiles track function calls because functions are the basic building blocks of programs and usually represent significant work).

When the profiling flag is enabled, a tracking function gets passed a line and a duration every time a nodots function is called.

```python
def track_call(self, line: int, duration: float):
    if self.profile:
        self.line_durations["calls"].append((line, duration))
```

The duration of each call is measured inside `eval_call`.

```python
def eval_call(node: Tree | Token, context: Context) -> Value:
    # ...

    # measure calls
    start = time.perf_counter()
    current_func = current_func.call_as_func(
        node.children[0].meta.line,
        node.children[0].meta.column,
        eval_arguments(args, context) if args else [],
    )                                              # call duration
    context.track_call(node.children[0].meta.line, time.perf_counter() - start)
```

After a nodots program's execution completes, the durations are converted into line statistics.

```python
def print_line_profile(self, source: str):
    # ...

    # convert raw durations into statistics
    line_info: Dict[int, List[str]] = {}
    for ln, line in enumerate(source.splitlines()):
        line_info[ln] = [
            # ncalls
            f"x{len(line_durs[ln])}",
            # tottime
            f"{format_number(sum(line_durs[ln]))}",
            # percall
            f"{format_number((sum(line_durs[ln]) / len(line_durs[ln])))}",
        ]
```

I also formatted the statistics into human-friendly units:

```python
def format_number(seconds: float) -> str:
    if seconds >= 1:
        return f"{round(seconds, 1)}s"
    elif seconds >= 0.001:
        return f"{int(seconds * 1000)}ms"
    return f"{int(seconds * 1000 * 1000)}µs"
```


The majority of my effort on this feature probably went into displaying the data rather than creating it. The hardest challenge was lining everything up in rows and columns with the correct offset from the source code.

The overhead of all this tracking and processing takes ~130ms of the ~1125ms total in the example at the top of this post.

The current profiling implementation needs quite a lot of memory. Inefficiently, it stores one tuple for every call. The optimal amount of space is bounded to the number of lines of source code (as opposed to the number of calls made during a program's execution). Each line needs to know it's *number of calls* and the *total time taken* — and then statistics can be derived from this data.

## Should More Tooling Support Line-Specific Measurements?

No. Line profiling is quite a zoomed-in perspective. Usually, practitioners are more interested in the per-request or per-function level of performance. And then, if they need more granular information, they'll manually inspect the function, or isolate it and run benchmarks.

Collecting and rolling up line profile data on a wide-scale also introduces complexity for the provider and consumer of this data. Line profiling makes it near-impossible to track performance over time. When you make a code change, your existing data gets voided. Ideally, you can make a change to a function, deploy your code change, and then query your data to see how that function's performance has changed.

But I do find myself wishing that the mainstream programming languages I use had a tool like my line profiler here as it makes it quicker to create and consume performance profiles of small sections of code.
