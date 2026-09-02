---
title: "What Makes LLM Tokenization Slow?"
date: "2026-09-02"
tags: ["rust"]
description: "Exploring the performance of byte-pair encoding by optimizing a GPT-2 tokenizer."
---

LLMs receive sequences of token IDs instead of raw text. For example, the GPT-2 tokenizer encodes `what's the weather in goldshire?` into `[10919, 338, 262, 6193, 287, 3869, 10932, 30]`.

While it's a small part of the overall latency of a modern LLM call, tokenization does sit on the hot path. In some LLM products, it may even happen multiple times, e.g. to decide if it's time to compress the context, estimating cost, or how to route the prompt when it lands in the provider's infrastructure.

I wanted to learn more about how tokenization works and what the performance constraints are. I chose to study GPT-2's [reference encoder](https://github.com/openai/gpt-2/blob/master/src/encoder.py) because it's compact and readable. Even though this post will be fairly GPT-2-specific, the underlying ideas and performance considerations haven't changed that much in the time since.

As you'll see in the following sections, I converted GPT-2's reference encoder to Rust and then tried to make it a lot faster.

## Quick Intro to Byte-Pair Encoding

GPT-2 uses [byte-pair encoding](https://en.wikipedia.org/wiki/Byte-pair_encoding), or BPE. It converts arbitrary UTF-8 text into a reversible sequence of token IDs. It starts from byte symbols and uses a trained list of merge ranks to make common sequences into single tokens.

Before this, GPT-2 runs a [regex](https://github.com/openai/gpt-2/blob/master/src/encoder.py#L53C20-L53C113) over the input to divide it into regions that BPE will process separately (word-like text, numbers, contractions, punctuation, and whitespace).

```text
what's the weather in goldshire?
             |
             v
[what] ['s] [ the] [ weather] [ in] [ goldshire] [?]
```

This pre-tokenization step stops BPE from merging across obvious changes in text type. For example, ` goldshire` and `?` are separate regions, so BPE should not try to merge across that boundary. The goal of the regex is to provide some weak assumptions about where useful boundaries probably exist.

GPT-2 needs all 256 byte values as its base alphabet in order to represent arbitrary UTF-8 without an unknown-token fallback. Literal bytes include spaces, controls, and invalid standalone UTF-8 values, so `encoder.py` maps them to safe visible Unicode symbols for string-based BPE, e.g. UTF-8 `é` is bytes `c3 a9`, represented as `Ã©`.

In the GPT-2 source, `vocab.bpe` lists the pairs that may merge, with earlier lines having higher priority. I've trimmed it to show all the pairs needed to merge ` goldshire`:

```text
rank   left   right
----   ----   -----
4      r      e
52     Ġ      g
79     l      d
211    Ġg     o
301    i      re
1221   s      h
3613   Ġgo    ld
10676  sh     ire
```

After merging, the token strings are looked up in `encoder.json` which contains every token in GPT-2's vocabulary (256 base byte tokens and ~50k merged byte-sequence tokens).

```text
base byte symbols     token ID
-----------------     --------
a                     64
b                     65
Ġ  (space)            220

merged BPE pieces     token ID
------------------    --------
the                   1169
ing                   278
Ġhello                23748
Ġworld                995
```

So here's the complete path for ` goldshire`:

```text
Ġ | g | o | l | d | s | h | i | r | e
                                \___/
                                r + e, rank 4

Ġ | g | o | l | d | s | h | i | re
  -> Ġg | o | l | d | s | h | i | re
  -> Ġg | o | ld | s | h | i | re
  -> Ġgo | ld | s | h | i | re
  -> Ġgo | ld | s | h | ire
  -> Ġgo | ld | sh | ire
  -> Ġgold | sh | ire
  -> Ġgold | shire

Ġgold -> 3869
shire -> 10932
```

Each round chooses the valid pair with the lowest rank. A merge can create a new pair, so BPE cannot just scan from left to right.

` goldshire` takes eight merge rounds to become two IDs. The full sentence takes 24 rounds to become eight IDs.

## Baseline Version

GPT-2's [`encoder.py`](https://github.com/openai/gpt-2/blob/master/src/encoder.py) ports fairly simply to Rust. I've used the same regex, byte map, merge ranks, and `encoder.json`. And it returns the complete `Vec<u32>` (same interface). I tried to keep the control flow roughly the same as the reference so it's easier to follow.

```rust
pub fn encode(input: &str) -> Vec<u32> {
    tokenizer().encode(input)
}

fn encode(&self, input: &str) -> Vec<u32> {
    self.pattern.find_iter(input)
        // Each match is one independent BPE region.
        .flat_map(|item| self.merge(item.unwrap().as_str()))
        // Final BPE pieces map to GPT-2 token IDs.
        .map(|piece| self.token_ids[&self.symbols[piece]])
        .collect()
}
```

Here's the outer encode loop and the repeated merge loop:

```rust
loop {
    let best = pieces.windows(2)
        // The earliest vocab.bpe line has the best rank.
        .filter_map(|pair| {
            self.merge_ranks
                .get(&(pair[0], pair[1]))
                .map(|&(rank, result)| {
                    (pair[0], pair[1], rank, result)
                })
        })
        .min_by_key(|pair| pair.2);

    let Some((first, second, _, result)) = best else {
        return pieces;
    };

    // Apply this merge wherever the pair occurs.
    pieces = merge_all(pieces, first, second, result);
}
```

I verified the final ID sequence against the Python reference for a few different inputs to make sure it was correct. My benchmarks measure tokenizer time on an M1 Pro.

My Rust version keeps `encoder.py`'s cache shape (byte-to-Unicode encoded regex match to merged BPE symbols) but unlike the reference's unbounded cache, I capped it at 256 LRU entries to approximate a bounded production cache. This cache is not persisted between `encode` calls.

I'll use the same two inputs throughout: the first 32 KiB of Moby-Dick and 8 MiB of React source code. I also use random ASCII and base64-like text in the background for adversarial checks for the merge-loop section.

I take the median of nine calls after one untimed setup call.

```text
                         Moby-Dick, 32 KiB       React, 8 MiB
Python encoder.py             42.43 ms              0.7 MiB/s
Rust baseline                  7.01 ms              6.0 MiB/s
```

This Rust port is a great place to start but it's not yet a clever tokenizer. The lowest hanging fruit to improve is the repeated whole-sequence scan in its merge loop.


## Version 2: An Attempt to Merge Faster

The baseline version repeatedly scans every adjacent pair to find the lowest-ranked pair and then merges it and scans again. This is a direct port of the reference version, so while it's clear and easier to understand, it revisits most of a long match after every merge. ` goldshire` needs eight rounds despite producing only two final tokens.

Below are the first four merges from the real ` goldshire` trace. GPT-2 chooses the lowest-ranked valid adjacent pair (not the leftmost pair or the longest token). So `r+e`, which has rank 4, wins before the leading-space pair, even though it is near the end of the match.

The important bit to take away is that each merge can expose another candidate.

```text
Ġ | g | o | l | d | s | h | i | r | e
                                \___/
                                r + e, rank 4

Ġ | g | o | l | d | s | h | i | re
\___/
 Ġ + g, rank 52

Ġg | o | l | d | s | h | i | re
         \___/
         l + d, rank 79

Ġg | o | ld | s | h | i | re
\____/
Ġg + o, rank 211
```

Instead of doing a full rescan, we can use a priority queue of candidate pairs (to avoid looking up the matches which stayed the same) and a linked-list sequence of symbols (because a merge only needs to update its two new neighbours).

I'll show the priority queue draining towards the end of ` goldshire`'s merges here:

```text
round 5: [Ġgo]--[ld]--[s]--[h]--[ire]
queue:   (s,h) 1221  (Ġgo,ld) 3613  (h,ire) 10439

round 6: [Ġgo]--[ld]--[sh]--[ire]
queue:   (Ġgo,ld) 3613  (sh,ire) 10676

round 7: [Ġgold]--[sh]--[ire]
queue:   (sh,ire) 10676

round 8: [Ġgold]--[shire]
queue:   empty (merges complete)
```

A min-priority queue selects the next pair type by its GPT-2 rank and an indexed linked list keeps neighbours available after a merge. Pair positions are checked again when popped because earlier merges can make queued entries stale.

But wait! The benchmarks say this _is not_ a speed-up:

```text
                         Moby-Dick, 32 KiB       React, 8 MiB
Rust baseline                  7.01 ms              6.0 MiB/s
Heap and neighbours            9.25 ms              5.4 MiB/s
```

The reference loop has bad-looking asymptotics per regex match but these matches are often small. I checked their sizes after trying the heap optimization. At this smaller scale, linear scans of contiguous memory are cheap while the heap adds pair maps, stale entries, node indirection, sorting, and branches. And all of this doesn't amortize well.

```text
Input                  Matches       Average     P90      Max
Moby-Dick, 32 KiB      7,632         4.29 B      8 B      17 B
React, 8 MiB           1,862,860     4.50 B      9 B      89 B
```

Heaps aren't bad though. In fact, OpenAI's [tiktoken](https://github.com/openai/tiktoken) uses a separate heap and compact-state path for pieces that are at least 100 bytes.

## Version 3: Use Bytes Directly

My V3 is inspired by [tiktoken](https://github.com/openai/tiktoken)'s public `src/lib.rs`. It is a small GPT-2-compatible reimplementation.

We can decode GPT-2's `encoder.json` entries to raw bytes once during setup. In GPT-2, IDs 0 through 255 are the base byte tokens. Learned merge results receive subsequent IDs in merge priority order. Among learned merge tokens, a lower ID means an earlier vocab.bpe merge so token ID minus 256 is that merge's zero-based rank.

Hopefully this comparison makes that a bit clearer:

```text
baseline:

b" goldshire"
  -> translate each byte into GPT-2's Unicode alphabet
  -> Ġ | g | o | l | d | s | h | i | r | e
  -> use vocab.bpe to choose merges between symbol pairs
  -> Ġgold | shire
  -> look up the finished symbols in encoder.json
  -> [3869, 10932]

V3:

b" goldshire"
  -> keep offsets into these original bytes
  -> use one map: byte sequence -> token ID / merge rank
  -> b" gold" | b"shire"
  -> [3869, 10932]
```

While we're merging a match, any active parts are adjacent ranges in the unchanged input bytes, so their concatenation is already a borrowed contiguous byte slice. Looking that slice up in the decoded vocabulary tells us whether it is a legal GPT-2 merge candidate. Its ID gives the merge priority because of GPT-2's vocabulary construction.

```text
vocab.bpe                     decoded encoder.json

rank 4:     r + e             b"re"     -> token ID 260
rank 52:    Ġ + g             b" g"     -> token ID 308
rank 79:    l + d             b"ld"     -> token ID 335

smaller merged-token ID  <=>  earlier merge  <=>  higher priority
```

Another benefit of this decoding is that sometimes we can go from a complete regex match (like `the` or `wow`) directly to the final token ID (in this case `1169` or `42773`).

```rust
let bytes = piece.as_bytes();

// A learned token needs no BPE work at all.
if let Some(&token) = ranks.get(bytes) {
    return vec![token];
}
```

V3 also brings a new memory layout to minimize allocations.

On a BPE cache miss, V3 allocates a byte-to-Unicode cache key, a `Vec<Part>` for surviving byte boundaries, cache storage for the merged result, and the output token IDs. The original input bytes are never moved or copied.

```text
fixed input bytes

offset:   0   1   2   3   4
          | a | b | c | e |

initial boundary vector

part:    [0]       [1]       [2]       [3]       [4]
rank:  rank("ab") rank("bc") rank("ce")  none      none
                    ^
                    lowest rank wins

current pieces:  a | b | c | e
```

Merging `b + c` doesn't create a `b"bc"` string. It removes the boundary at byte offset 2. The current pieces are always the ranges between surviving offsets.

```text
merge b + c

before:  offsets [0] [1] [2] [3] [4]
                          ^
                          delete this boundary

after:   offsets [0] [1]     [3] [4]
pieces:             a |  bc   | e

new candidates:
bytes[0..3] = b"abc"       a + bc
bytes[1..4] = b"bce"       bc + e
```

The merge loop is then:
1. Find the smallest non-`u32::MAX` rank.
2. Update the candidate at that boundary and the one on its left.
3. Remove the boundary to its right. The vector shifts later entries in place.
4. Repeat.
5. Stop when no part has a valid rank, which means no two remaining neighbouring byte ranges form a vocabulary token.

```rust
struct Part {
    start: usize,
    rank: u32, // Candidate merged-token ID, or u32::MAX.
}

// Allocate once. The input bytes never change.
let mut parts = initial_parts(bytes);

while let Some((index, _)) = lowest_rank(&parts) {
    // Recheck the two candidates that will touch after removal.
    update_rank(bytes, &mut parts, index.saturating_sub(1));
    update_rank(bytes, &mut parts, index);

    // Delete one boundary. Vec shifts entries but does not reallocate.
    parts.remove(index + 1);
}
```

After all eight merges in ` goldshire`, the boundary vector is `[0, 5, 10]`, which defines the final byte ranges. The output `Vec<u32>` is filled by borrowing each final byte slice as a key in the decoded vocabulary map.

```text
original bytes:  b" goldshire"
final offsets:   [0]       [5]       [10]
final ranges:     \________/ \________/
                  b" gold"   b"shire"
                     |           |
                     v           v
                   3869        10932

output: Vec<u32> = [3869, 10932]
```

I also copied tiktoken's use of `FxHashMap` (over Rust's general-purpose hash map).

```text
Variant                         Moby-Dick, 32 KiB    React, 8 MiB
-----------------------------   -----------------   -----------
Python encoder.py                42.43 ms            0.7 MiB/s
Rust baseline                     7.01 ms            6.0 MiB/s
Heap and neighbours               9.25 ms            5.4 MiB/s
V3 check vocabulary first         3.09 ms           9.4 MiB/s
V3 check cache first              3.23 ms            8.8 MiB/s
tiktoken-rs r50k_base             2.15 ms           11.7 MiB/s
```

V3 vocabulary-first is roughly 2.3x faster than the Rust baseline for Moby-Dick and 1.6x faster on React. Direct vocabulary lookup and compact contiguous state beat a complicated global data structure for this workload.

After reducing merge work, the regex part becomes the largest single measured stage, and cache and output conversion also become more visible.

```text
stage              V1 Moby  V2 Moby  V3 Moby  V1 React  V2 React  V3 React
regex                 29%      20%      55%       39%       35%       55%
byte mapping           4%       3%       9%        6%        5%        9%
cache                  3%       2%      10%        4%        4%        8%
BPE merging           51%      69%       9%       40%       47%        8%
lookup/output         13%       6%      17%       11%       10%       20%
```

So where does LLM tokenization spend its time? The answer for GPT-2 (some of this should generalize) is regex matching, merging, and look-ups.

Tokenization is not slow because any one step is complex but rather because it needs to perform a huge number of tiny regex, look-up, and merge operations on very small pieces of text.

## Ending Thoughts

Some product features need a rough size instead of token IDs. Fixed estimates like `input.len() / N` are nearly free because they don't need to tokenize at all.

```text
estimated tokens = input bytes / N
```

You can even choose `N` based on what you know about the input, e.g. whether it is a code file.

All the versions of my tokenizer received a complete string but a service will often receive a request body in chunks, or an application may add to a prompt incrementally. But chunk counts are not additive! A later chunk can change a regex region or finish a BPE merge from the previous chunk:

```text
count(" goldshi") + count("re")
  = 2 + 1
  = 3

count(" goldshire")
  = 2
```

```text
tokens("hello ") + tokens("world")
  = [31373, 220] + [6894]

tokens("hello world")
  = [31373, 995]
```

I didn't dig into streaming tokenization for this article but it seems like an interesting problem. A safe tail is not only a BPE problem because future bytes can also alter the pre-tokenizer's regex boundaries. [tiktoken](https://github.com/openai/tiktoken) has `encode_with_unstable` which encodes a string into stable tokens and _possible completion_ sequences.

In terms of performance takeaways, it's a common one: contiguous scans are cheap! One experiment I ran but didn't write-up was using [Rayon](https://github.com/rayon-rs/rayon) to handle regex matches in parallel. It was a little faster for some inputs but not dramatically (and the performance was a bit unpredictable). While complete regex matches can be processed independently, the matches are so small that coordination/scheduling tends to dominate.

My measurements and findings are for GPT-2's byte-level BPE, regex, and vocabulary construction. Modern tokenizers can use different vocabularies, normalizers, regexes, and special-token rules. But the underlying work is roughly the same.

My email is on my [home page](https://healeycodes.com). Let me know if I got something wrong, or if I missed an important optimization :)
