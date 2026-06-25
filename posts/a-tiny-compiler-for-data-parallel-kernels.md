---
title: "A Tiny Compiler for Data-Parallel Kernels"
date: "2026-06-25"
tags: ["python"]
description: "Exploring how compilers lower ordinary loops into explicit data-parallel kernels."
---

A lot of fast code starts as a boring loop.

Modern hardware can perform the same operation on multiple values at once (e.g. [SIMD](https://en.wikipedia.org/wiki/Single_instruction,_multiple_data) and [SIMT](https://en.wikipedia.org/wiki/Single_instruction,_multiple_threads)), and sometimes we write code directly for those execution models but other times, a compiler starts with regular-looking code and rewrites it so multiple loop iterations can run together. I built a [tiny compiler](https://github.com/healeycodes/kernel-lowering) (~180LOC of Python) to understand what that transformation looks like.

My compiler lowers kernels (rewrites them into a simpler, more explicit form where data parallelism is visible). The input is a small hand-written AST, and the output is a lowered IR that I print as Python-like code. Rather than going all the way from source code to instructions, think of this compiler as an intermediate step in a larger compiler.

Let's take a look at an example. Scaling audio is easy to parallelize, but it is still common to write non-explicitly parallel code like this:

```kernel
kernel scale_audio(samples, out, n, volume):
    for i in range(n):
        out[i] = samples[i] * volume
```

My compiler turns it into:

```kernel
kernel scale_audio(samples, out, n, volume):
  vector_for base in range(0, n, LANES):
    let i = (base + lane_id)
    let active = (i < n)
    masked_store(out, i, (masked_load(samples, i, active) * volume), active)
```

The goal is to replace `for` loops with `vector_for` loops, which allow multiple iterations of a loop to be executed in parallel. Each position in that grouped execution is called a _lane_.

## Lanes and Masks

A lane is one independent element position within a grouped execution. For example, if a grouped operation handles four values at once, it has four lanes:

```python
[ 10 | 20 | 30 | 40 ]
   ^    ^    ^    ^
 lane0 lane1 lane2 lane3
```

Each slot is a lane, so when you execute an operation like multiplication across the group, it looks like this:

```python
[10 | 20 | 15 | 30]
*
[ 3 |  3 |  3 |  3]
=
[30 | 60 | 45 | 90]
```

When the code is executed for each lane, they have a unique offset to know which data to operate on. Each lane works on a different logical element, and the grouped operation runs them side by side.

To handle cases where the data is not divisible by the number of lane slots, a per-lane boolean mask is applied to skip out-of-bounds loads and stores. You can think of a mask like `[true, true, false, false]`: the first two lanes are allowed to run, and the last two are ignored. This is useful for the final chunk of an array, where there may not be enough elements left to fill every lane.

A follow-up step would turn the body of the `vector_for` into instructions that target a specific architecture. In the ideal case this can improve performance by a factor of the number of lanes, though memory access and other overheads do play a part.

## Deciding What Can Be Lowered

The lowering pass needs to answer two questions:

1. Can different iterations of this loop run independently?
2. For each value in the loop, is it `uniform` or `varying`?

A `uniform` value is the same for every lane. A `varying` value may be different in each lane. This distinction matters because uniform values are shared across all lanes, while varying values require per-lane computation.

In the audio example, `volume` is uniform and every lane multiplies by the same value. But `i` is varying, because each lane handles a different index, which means `samples[i]` is also varying.

```text
value       kind      why
---------   -------   ----------------------------
volume      uniform   same value in every lane
i           varying   each lane gets a different index
samples[i]  varying   each lane reads a different sample
```

The core of my compiler is a small AST-walking classifier:

```python
# (pseudocode but not far off reality)
def kind(expr, env):
    if expr is a literal:
        return UNIFORM

    if expr is a variable:
        return env[expr.name]

    if expr is a load:
        return VARYING if kind(expr.index, env) == VARYING else UNIFORM

    if expr is a binary expression:
        left = kind(expr.left, env)
        right = kind(expr.right, env)
        return VARYING if VARYING in (left, right) else UNIFORM
```

Before the loop, kernel parameters are assumed to be uniform. Inside the lowered loop, the compiler marks the loop index as varying:

```python
env = {param: UNIFORM for param in kernel.params}
env[i] = VARYING
```

From there, varying-ness flows through the expression. Since `i` is varying, `samples[i]` is varying. Since `samples[i]` is varying, `samples[i] * volume` is varying (even though `volume` itself is uniform).

This classification tells the compiler what to emit. If each lane reads the next adjacent element, like `samples[i]`, the compiler can use a masked load. That keeps the operation grouped while preventing inactive lanes from reading past the end:

```kernel
samples[i] -> masked_load(samples, i, active)
```

But a varying load from an arbitrary per-lane index becomes a gather. A gather is the grouped-load version of "each lane reads from its own address", so the addresses may be different and non-adjacent. For example, in this unoptimized code:

```kernel
kernel color_by_number(color_number, colors, out, n):
    for i in range(n):
        number = color_number[i]
        out[i] = colors[number]
```

Each lane loads a different `number`, so `number` is varying. That means `colors[number]` is not a contiguous load:

```kernel
colors[number] -> gather(colors, number, active)
```

A gather lets each lane read from its own address while still executing as a single grouped operation. It is still parallel work, but the memory access pattern is less regular than `samples[i]`, where the lanes read adjacent elements. That often makes gathers slower, although the cost depends on the architecture.

The full compiled output for the `color_by_number` example above:

```kernel
kernel color_by_number(color_number, colors, out, n):
  vector_for base in range(0, n, LANES):
    let i = (base + lane_id)
    let active = (i < n)
    let number = masked_load(color_number, i, active)
    masked_store(out, i, gather(colors, number, active), active)
```

A real compiler has to deal with much more than this (types, aliasing, control flow, target-specific instructions), including determining whether loop iterations can safely execute independently. My compiler mostly assumes that by sticking to simple kernels that write to `out[i]`, but that was enough for the part I wanted to understand.

## Why This Step Matters

After this lowering pass, grouped execution is explicit in the program. It records which loop iterations run together, which lanes are active, and whether each load can use adjacent addresses or needs per-lane addresses.

That gives a later code-generation pass the structure it needs to emit better instructions. A `masked_load` can become a masked vector load, a `gather` can become a gather instruction, and a `vector_for` can become the loop structure around those operations. Without this kind of analysis, those facts do not exist in the program, so it stays as ordinary scalar operations and misses the chance to use faster instructions.

## Outro

I enjoyed working through this problem of dependency analysis and how-and-when to lower. I avoided some less-efficient steps I've taken with other projects e.g. writing a parser when I don't need to.

If you check the compiler's [source code](https://github.com/healeycodes/kernel-lowering), the inputs are just hard-coded trees:

```python
AST = Kernel(
    "color_by_number",
    ["color_number", "colors", "out", "n"],
    For(
        "i", Lit(0), V("n"),
        Let(
            "number",
            Load("color_number", V("i")),
            Store("out", V("i"), Load("colors", V("number"))),
        ),
    ),
)
```

I originally went further and generated C SIMD code and ran benchmarks on the compiled/uncompiled code but it took the focus away from the core idea that I wanted to learn and land. So I stripped it back to a more pure and higher-level abstraction.

As a treat, I added custom syntax highlighting to this website to support the kernel snippets.
