---
title: "Counting Words at SIMD Speed"
date: "2025-08-13"
tags: ["c"]
description: "Rewriting a word counting program five times until it's 500x faster."
---

I've written some progressively faster word counting programs. First, we'll start with Python, and then we'll drop down to C, and finally, we'll use single instruction, multiple data (SIMD) programming to go as fast as possible.

The task is to count the words in an ASCII text file. For example, `Hello there!` contains `2` words, and my 1 GiB benchmark text file contains 65 million words.

At a high level: read bytes, scan while tracking minimal state, write the count to stdout.

These are the results from my Apple M1 Pro that I'll dig into:

- Python (byte loop): `89.6 s`
- Python + re: `13.7 s`
- C (scalar loop): `1.205 s`
- C + ARM NEON SIMD: `249 ms`
- C + ARM NEON SIMD + threads: `181 ms`

You can also jump straight to the [source files](https://github.com/healeycodes/counting-words-at-simd-speed).

## First try (89.6 seconds)

Here's a reasonable first attempt, but you might spot some obvious performance-related deficiencies.

We read each byte and check if it's part of a set of whitespace characters, while tracking the word count, and whether there was previous whitespace.

```python
# 0_mvp.py

ws = set(b" \n\r\t\v\f")
prev_ws = True
words = 0
with open(sys.argv[1], "rb") as f:
    for byte_value in f.read():
        cur_ws = byte_value in ws
        if not cur_ws and prev_ws:
            words += 1
        prev_ws = cur_ws

print(words)
```

This program is horrendously slow. It takes 89.6 seconds on my Apple M1 Pro. Python code runs for every byte, incurring interpreter dispatch and object checks again and again.

## Using CPython efficiently (13.7 seconds)

There's a big improvement we can make before having to leave Python behind. We can make the program faster by making sure all the work happens in C, in tight loops, with no per-byte Python overhead.

CPython's `re` module is a thin Python wrapper around a C extension named `_sre`, "Secret Labs' Regular Expression Engine." Patterns are parsed in Python into a compact bytecode, then executed by the C engine. So a call like `re.finditer(pattern, data)` spends nearly all of its time inside C, scanning contiguous memory with pointer arithmetic and table lookups.

```python
# 1_c_regex.py

words = 0
with open(sys.argv[1], "rb") as f:
    pattern = rb"[^ \n\r\t\v\f]+"
    data = f.read()
    words = sum(1 for _ in re.finditer(pattern, data))

print(words)

```

This version is ~6× faster than the initial Python version.

## First try in C (1205 milliseconds)

I think the above Python version is very close to the limit that we can get with straightforward Python (e.g. no NumPy, no threads).

By porting our first Python attempt to C, we're rewarded with a ~74× speedup.

```c
// 2_mvp.c

size_t nread = fread(data, 1, file_size, fp);
fclose(fp);
// ..

size_t words = 0;
bool prev_ws = true;
for (size_t i = 0; i < nread; ++i)
{
    unsigned char c = data[i];
    bool cur_ws = is_ws(c);
    if (!cur_ws && prev_ws)
    {
        ++words;
    }
    prev_ws = cur_ws;
}

free(data);
printf("%zu\n", words);
```

Why is it so much quicker? Before, `re.finditer(...)` was creating a Python `Match` object for every word (millions of heap allocations + GC pressure).

The regex engine was also doing extra work when it searched, matched, backtracked, and performed bookkeeping. Even though that's in C, it's still building Python objects for the iterator.

In comparison, this version's C loop is a single pass over bytes with two booleans (`prev_ws`, `cur_ws`) and a simple branch. Compilers turn this into very tight code, i.e., no per-word allocations, and no callbacks into the interpreter.

## Adding SIMD (249 milliseconds)

[Single instruction, multiple data](https://en.wikipedia.org/wiki/Single_instruction,_multiple_data) (SIMD) is a form of data-level parallelism where one instruction operates on multiple data elements in parallel. For example, we can create a mask of all the space characters in a 16-byte chunk of our input, with one instruction, like this:

```c
// bytes: [H , e , l , l , o ,   ,   ,   , t , h , e , r , e , ! ,   ,   ]
// ws1:   [00, 00, 00, 00, 00, FF, FF, FF, 00, 00, 00, 00, 00, 00, FF, FF]
uint8x16_t ws1 = vceqq_u8(bytes, vdupq_n_u8(' '));
```

But our word counting program doesn't require us to count the _space characters_. We need to count non-whitespace bytes that immediately follow a whitespace byte (any of six different whitespace characters).

Looping over each 16-byte chunk from our buffer, we need to:

- Load the bytes into a register
- Create a whitespace mask
- Create a previous-byte whitespace mask
- Create a word-start mask (combine the whitespace and previous-byte whitespace mask)
- Sum the word-start mask to get the word count for this chunk
- Carry forward the whitespace state

Here's the core section of this C version with NEON SIMD instructions, showing examples of what the masks look like.

```c
// 3_simd.c

size_t words = 0;

// (0) Previous-byte whitespace (defaults to whitespace for start-of-file)
uint8x16_t prev_ws_vec = vdupq_n_u8(prev_ws ? 0xFF : 0x00);

size_t nvec = nread & ~(size_t)15;
for (; i < nvec; i += 16)
{
    // (1) Load 16-bytes from buffer
    // [H , e , l , l , o ,   ,   ,   , t , h , e , r , e , ! ,   ,   ]
    uint8x16_t bytes = vld1q_u8(buffer + i);

    // (2) Per-lane whitespace masks (0xFF for ws, 0x00 for non-ws)
    uint8x16_t ws1 = vceqq_u8(bytes, vdupq_n_u8(' '));
    uint8x16_t ws2 = vceqq_u8(bytes, vdupq_n_u8('\n'));
    uint8x16_t ws3 = vceqq_u8(bytes, vdupq_n_u8('\r'));
    uint8x16_t ws4 = vceqq_u8(bytes, vdupq_n_u8('\t'));
    uint8x16_t ws5 = vceqq_u8(bytes, vdupq_n_u8('\v'));
    uint8x16_t ws6 = vceqq_u8(bytes, vdupq_n_u8('\f'));

    // (3) Combine all masks into a single mask
    // [00, 00, 00, 00, 00, FF, FF, FF, 00, 00, 00, 00, 00, 00, FF, FF]
    uint8x16_t ws = vorrq_u8(ws1, ws2);
    ws = vorrq_u8(ws, ws3);
    ws = vorrq_u8(ws, ws4);
    ws = vorrq_u8(ws, ws5);
    ws = vorrq_u8(ws, ws6);

    // (4) Previous-byte whitespace for each lane
    // [FF, 00, 00, 00, 00, 00, FF, FF, FF, 00, 00, 00, 00, 00, 00, FF]
    uint8x16_t prev_ws_shifted = vextq_u8(prev_ws_vec, ws, 15);

    // (5) Word start mask: non-ws AND prev-ws (two word starts, 'H' and 't')
    // [FF, 00, 00, 00, 00, 00, 00, 00, FF, 00, 00, 00, 00, 00, 00, 00]
    uint8x16_t non_ws = vmvnq_u8(ws);
    uint8x16_t start_mask = vandq_u8(non_ws, prev_ws_shifted);

    // (6) Convert lanes to 1 by shifting right by 7 bits
    // [1 , 0 , 0 , 0 , 0 , 0 , 0 , 0 , 1 , 0 , 0 , 0 , 0 , 0 , 0 , 0 ]
    uint8x16_t ones = vshrq_n_u8(start_mask, 7); // 2 ones

    // (7) Sum all lanes
    words += (size_t)vaddvq_u8(ones); // 2

    // (8) Carry state for the next iteration
    prev_ws_vec = ws;
}

// Remainder is handled with a scalar loop 
```

This SIMD version is 5× faster because it does less work per byte of input.

Even though there are many more lines of code, it compiles down to efficient operations that run on 16-byte chunks. The compiler (`clang -O3`) adds further optimizations. For example, there are six `vceqq_u8` calls in this version, for each of the whitespace characters: `b" \n\r\t\v\f"`.

This doesn't result in six vector compare-equal (`cmeq`) instructions because the compiler is able to work out that, while we need exact-match checks for `' '` and `'\n'`, there are more efficient steps for the following groups:

- `'\t'` (`0x09`) and `'\r'` (`0x0D`)
    - Perform a bitwise AND with `0xFB` and check if the result equals `0x09`.
        
        Both `0x0D & 0xFB = 0x09` and `0x09 & 0xFB = 0x09`.
        
- `'\v'` (`0x0B`) and `'\f'` (`0x0C`)
    - Add `0xF5` (unsigned 8-bit add with wraparound) and check if the result is less than `2`.
        
        Adding `0xF5` gives either `0x00` or `0x01`, both of which are `< 2`.

While it *looks* like more instructions are touching the data, the key thing is that we're replacing an expensive sequence (another equality compare + mask merge + constant load) with a very cheap transform plus a single comparison.

Finding the rest of the compiler's optimizations is left as an exercise to the reader: https://godbolt.org/z/81r9Ts8Wb.

## Using the rest of the CPU (181 milliseconds)

When we applied SIMD instructions above, we reached near-optimal single-core performance. However, my laptop and the device you’re reading this on have multiple cores — which my programs haven't been using.

Counting the number of words in a text file is a classic example of something that can be parallelized across threads. The file can be chunked up, and then each chunk is handed to a thread to count the words. When each thread finishes, their counts are summed.

There is one wrinkle, in that we need to check the previous byte to the start of the chunk so we understand the current whitespace state.

For example, with an input like `[a,  ,M , i, c, r, o, s, e, c, o, n, d,  ,  ,  ]`.

Thread one gets `[a,  ,M , i, c, r, o, s]` and counts `a` and `M` as word-starts (2).

Thread two gets `[e, c, o, n, d,  ,  ,  ]` but knows that the `e` is not a word-start (0).

The word count is the sum of these totals: `2 + 0 = 2`.

The previous version's "count words" function is unchanged, but we call per-chunk.

```c
// 4_threads.c

// Count words in a contiguous memory range using NEON, given the starting prev-ws state
static size_t count_words_neon(
  const unsigned char *data,
  size_t len,
  bool prev_ws
)

// Args for each thread
typedef struct ThreadArgs
{
    const unsigned char *base;
    size_t length;
    bool start_prev_ws; // Derived from previous byte or SOF
    size_t result;
} ThreadArgs;

// Worker which handles an equal chunk of the file
static void *worker(void *p)
{
    ThreadArgs *args = (ThreadArgs *)p;
    args->result = count_words_neon(args->base, args->length, args->start_prev_ws);
    return NULL;
}

int main(int argc, char **argv)
{
    // .. 
    
    size_t launched = 0;
    for (size_t t = 0; t < max_threads; ++t)
    {
        size_t start = t * chunk;
        if (start >= filesize)
            break;
        size_t end = start + chunk;
        if (end > filesize)
            end = filesize;
        size_t len = end - start;
    
        // For each chunk, we need to seed with the previous-byte whitespace.
        // Start-of-file is "as if" preceded by whitespace
        bool start_prev_ws = true; 
        if (start > 0)
        {
            start_prev_ws = is_ws_scalar(data[start - 1]);
        }
    
        args[launched].base = data + start;
        args[launched].length = len;
        args[launched].start_prev_ws = start_prev_ws;
        args[launched].result = 0;
    
        if (pthread_create(&threads[launched], NULL, worker, &args[launched]) != 0)
        {
            perror("pthread_create");
            free(data);
            return 1;
        }
        ++launched;
    }
    
    size_t total_words = 0;
    for (size_t i = 0; i < launched; ++i)
    {
        (void)pthread_join(threads[i], NULL);
        total_words += args[i].result;
    }
    
    // ..
    printf("%zu\n", total_words);
    return 0;
}
```

My expectation was that this version would be N times faster with N threads than the previous version. This was based on the fact that the work that each thread is doing is entirely independent and each can saturate a CPU core. But it is only ~1.38 times faster.

My understanding is that my NEON loop is already so fast that it's likely limited by memory bandwidth, not CPU speed. So once one or two threads are streaming bytes at near-max RAM speed, the extra threads just fight over the same bandwidth giving little benefit.

The final results:

```c
./bench.sh
Benchmark 1: python3 0_mvp.py bench.txt
  Time (mean ± σ):     89.556 s ±  7.214 s    [User: 87.205 s, System: 0.484 s]
  Range (min … max):   82.393 s … 96.820 s    3 runs

Benchmark 2: python3 1_c_regex.py bench.txt
  Time (mean ± σ):     13.739 s ±  0.136 s    [User: 13.433 s, System: 0.158 s]
  Range (min … max):   13.659 s … 13.896 s    3 runs

Benchmark 3: ./bin/2_mvp bench.txt
  Time (mean ± σ):      1.205 s ±  0.008 s    [User: 1.015 s, System: 0.115 s]
  Range (min … max):    1.198 s …  1.214 s    3 runs

Benchmark 4: ./bin/3_simd bench.txt
  Time (mean ± σ):     249.2 ms ±   6.3 ms    [User: 79.5 ms, System: 100.5 ms]
  Range (min … max):   243.8 ms … 262.6 ms    11 runs

Benchmark 5: ./bin/4_threads bench.txt
  Time (mean ± σ):     181.1 ms ±   4.1 ms    [User: 96.5 ms, System: 93.5 ms]
  Range (min … max):   177.4 ms … 193.7 ms    16 runs

Summary
  ./bin/4_threads bench.txt ran
    1.38 ± 0.05 times faster than ./bin/3_simd bench.txt
    6.65 ± 0.16 times faster than ./bin/2_mvp bench.txt
   75.84 ± 1.86 times faster than python3 1_c_regex.py bench.txt
  494.38 ± 41.35 times faster than python3 0_mvp.py bench.txt
```

With the SIMD + threads version processing at ~5.52 GiB/s.

If the SIMD stuff went over your head, [Why do we even need SIMD instructions?](https://lemire.me/blog/2025/08/09/why-do-we-even-need-simd-instructions/) is a great introduction by Daniel Lemire who's written a lot of interesting stuff about SIMD optimizations e.g. [Scan HTML faster with SIMD instructions: Chrome edition](https://lemire.me/blog/2024/06/08/scan-html-faster-with-simd-instructions-chrome-edition/).

Let me know if I've missed any obvious optimizations.

All the source files, and the benchmark script, can be found at [healeycodes/counting-words-at-simd-speed](https://github.com/healeycodes/counting-words-at-simd-speed).
