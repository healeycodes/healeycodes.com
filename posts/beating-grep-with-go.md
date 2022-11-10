---
title: "Beating grep with Go"
date: "2022-04-26"
tags: ["go"]
description: "Writing a fast file searching program and benchmarking it."
---

Andrew Gallant's [ripgrep introduction post](https://blog.burntsushi.net/ripgrep/) showed us that classic Unix tools like `grep` (and its later iterations like `ag`) can be dramatically improved in the areas of raw performance, user-experience, and correctness. These [modern Unix tools](https://github.com/ibraheemdev/modern-unix) (like `ripgrep`, `bat`, `jq`, `exa`, or `fd`) aren't quite drop-in replacements but they're close enough to avoid paper cuts, and for [most use cases](https://github.com/BurntSushi/ripgrep#why-shouldnt-i-use-ripgrep) are better than the originals in a programmer's daily workflow.

Gallant's treatise on file searching, and the benchmarks and analysis, got me excited about searching, and the conclusion of his post rings true:

> String searching is an old problem in computer science, but there is still plenty of work left to do to advance the state of the art.

I set out to beat macOS Monterey's default `grep` (2.6.0-FreeBSD) in a microbenchmark that represents my daily file searching. I chose Go because I like writing Go programs.

The tool I built for this post is called `grup` and lives inside my [terminal tools monorepo](https://github.com/healeycodes/tools) which is a project to take ownership over the commands I run every day.

## How to Search Files Quickly

Make [system calls](https://man7.org/linux/man-pages/man2/lstat.2.html), the less the better. Traverse directories, search files in parallel, and try not to look at every character. The recommended directory traversal function in Go is `filepath.WalkDir` but this walks files in lexical order by sorting them. In my personal use-case of `grep`, I don't need deterministic output. Instead I hand-wrote a traversal function that passes search jobs to waiting search workers over a channel.

A large number of search workers in Go routines is the real performance win over `grep` here. Go routines play very nicely with blocking system calls and [add very little overhead](https://utcc.utoronto.ca/~cks/space/blog/programming/GoSchedulerAndSyscalls). The other optimizations here almost don't register in comparison. These search workers zoom over my SSD gobbling up bytes.

`grep` is single threaded, my version is multithreaded, end of article, etc.

A naïve string search will look at every single character. Instead, I use the [Boyer–Moore string-search algorithm](https://en.wikipedia.org/wiki/Boyer%E2%80%93Moore_string-search_algorithm). Specifically, I use the [internal implementation](https://go.googlesource.com/go/+/go1.18.1/src/strings/search.go) from Go's standard library. I've changed the types to be `[]byte` instead of `string` to make less allocations but aside from that it's copy and pasted. To support regular expressions, a `Regexp` object is [compiled](https://pkg.go.dev/regexp#Compile) once.

`grep` doesn't report line numbers from binary files by default. It just prints `Binary file FOO matches`. This means we can do the same and stop reading binary files when we hit a match. There are different ways to tell if a file is binary but the one I used is: does `NUL` appear in the first buffer?

In practice, you probably want to skip binary files. This is one of the key wins of `ripgrep` — and how it fits into the standard development workflow so well. By default, it ignores the same files as your `.gitignore`, it also avoids hidden files and binary files.

## The Benchmark

Here's something I commonly do: search 99k files (1.3GB), in 11k directories, for two matches. A recursive fixed string search with an output that displays the line count for the text file match but not the binary file match (standard `grep` behaviour).

The required output (in any order):

```text
Binary file react/.git/index matches
8:    "directory": "packages/react-fetch"
```

Setup:

- Apple M1 Pro 16GB RAM
- Clone facebook/react @ `6d3b6d0f`
- Build it: `yarn build`
- Run each bench command five times to warm disk cache
- Run each bench command with `time` five times and take average (.000 accuracy)

I've included `ripgrep` and `sift` (the fastest grep-like Go-based tool I could find). The arguments to each tool ensure that every command does the same work.

```bash
# 13.0.0 -SIMD -AVX (compiled)
rg -uuu -n packages/react-fetch react/
# 0.87s user 4.44s system 702% cpu 0.756 total

# sift 0.9.0 (darwin/arm64)
sift -n packages/react-fetch react/
# 1.55s user 4.33s system 688% cpu 0.854 total

# f6a04efd
grup -n packages/react-fetch react/
# 1.66s user 3.50s system 523% cpu 0.986 total

# (BSD grep, GNU compatible) 2.6.0-FreeBSD
grep -F -r -n packages/react-fetch react/
# 8.64s user 1.23s system 99% cpu 9.883 total
```

As expected, the massively parallel tools (all sitting at 500%+ CPU) beat the stock `grep` by an order of magnitude. I didn't expect `grup` to be this fast as my early versions were quite naïve with no parallelism or string search optimizations (it used to be 10x slower on this benchmark). Maybe I shouldn't be *too* surprised. After all, I'm arranging very fast standard library functions in the right order and watching it go brrr.

My first version of `grup` was slow and impractical. It remains impractical, and feature-less, but at least it's not slow! Maybe I'll dare to describe [healeycodes/tools](https://github.com/healeycodes/tools) as [blazing fast](https://twitter.com/acdlite/status/974390255393505280).

## Benchmarks (continued)

After I published this post, Gallant ([@burntsushi5](https://twitter.com/burntsushi5)) [suggested](https://twitter.com/burntsushi5/status/1519279733703331841) comparing regex searches. I repeated the same setup steps as above and used his query. It matches two terms across two text files.

```bash
rg -uuu "\w{10} Facebook" react/
# 0.82s user 3.76s system 328% cpu 1.395 total

sift -n "\w{10} Facebook" react/
# 58.07s user 3.24s system 610% cpu 10.044 total

grup -n -re "\w{10} Facebook" react/
# 42.32s user 3.20s system 449% cpu 10.119 total

grep -r -n "\w{10} Facebook" react/
# 20.49s user 1.50s system 95% cpu 22.988 total
```

Here `ripgrep` pulls far in front. This specific benchmark stresses the regex implementation more than anything else. `ripgrep` is built on top of [Rust's regex engine](https://github.com/rust-lang/regex) which uses finite automata, [SIMD](https://github.com/BurntSushi/ripgrep/discussions/1822), and aggressive literal optimizations.

[More](https://twitter.com/burntsushi5/status/1519337194061766660) [thoughts](https://twitter.com/burntsushi5/status/1519345971053965315) by Gallant on these results:

> Yeah, Go's regex engine really hurts you there!

> Also, GNU grep should do well here too. It should get the 'Facebook' literal and look for lines containing that. And then only run the full regex engine on those lines. So you can actually work-around a slow regex engine. (It's also worthwhile if you have a fast regex engine!)

If we look at the user time in the regex benchmark results, we can see that `grep` is much more efficient than `grup` and `sift`. However, the brute force multithreaded approach of `grup` and `sift` means that `grep` falls behind.

## Next Steps

I need to profile more to figure out the most impactful optimizations but there are a few obvious ones like parallel directory traversal à la `ripgrep`. Also, faster output with a buffer — currently each line match is a print call!

There's also product features I could add to round out the tool (right now, `grup` is effectively a technical demo); like common flags, syntax highlighting, ignoring hidden/binary files. Plus, I've always wanted to ship an application via [Homebrew](https://brew.sh/).

## Further Reading

I have tried to keep my gushing to a minimum but you really should go and read Gallant's [ripgrep introduction post](https://blog.burntsushi.net/ripgrep/). It's amazing, and inspired me to hack together this tool and have a go at implementing some of the ideas I found within.

- [https://blog.burntsushi.net/ripgrep/](https://blog.burntsushi.net/ripgrep/)
- [https://about.sourcegraph.com/podcast/andrew-gallant/](https://about.sourcegraph.com/podcast/andrew-gallant/)
- [https://github.com/ggreer/the_silver_searcher#how-is-it-so-fast](https://github.com/ggreer/the_silver_searcher#how-is-it-so-fast)
- [https://lists.freebsd.org/pipermail/freebsd-current/2010-August/019310.html](https://lists.freebsd.org/pipermail/freebsd-current/2010-August/019310.html)
- [https://benhoyt.com/writings/scandir/](https://benhoyt.com/writings/scandir/)
- [https://boyter.org/posts/faster-literal-string-matching-in-go/](https://boyter.org/posts/faster-literal-string-matching-in-go/)
