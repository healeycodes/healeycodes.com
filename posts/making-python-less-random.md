---
title: "Making Python Less Random"
date: "2024-07-08"
tags: ["c"]
description: "Using ptrace to intercept and modify a process's getrandom syscall."
---

I was working on a game prototype written in Python when I came across a tricky bug. I was able to reproduce it (good), but because it depended on randomness, it was hard to iterate on a fix (bad).

I searched and found that my game had two sources of randomness: `os.urandom` and `random.randint`. I tried to mock them like this:

```python
import os
os.urandom = lambda n: b'\x00' * n
import random
random.randint = lambda a, b: a
```

However, I found an imported third-party library was also calling `random` functions. The library's code wasn't well-structured (e.g., importing modules inside functions). I couldn't mock the call sites without altering the dependency locally.

At this point, I should have pulled the code I was using out of that library, and refactored my game so that all sources of randomness came from some kind of pseudorandom generator function. This way, I could provide fixed seeds for deterministic debugging.

Instead, I took a detour to catch and modify syscalls to `getrandom`.

## Where Does Python's Randomness Come From?

We can debug this using [strace](https://man7.org/linux/man-pages/man1/strace.1.html) to look at the syscalls made by a Python process.

```python
# example.py

import os
os.urandom(8)
```

If we run the above program with `strace python example.py`, we get a fairly verbose output which I've trimmed a bit here:

```bash
# ..
read(3, "import os\nos.urandom(8)\n", 4096) = 24
read(3, "", 4096)                       = 0
close(3)                                = 0
getrandom("\x58\x54\x9d\x43\xbf\x4f\xae\x75", 8, 0) = 8
# ..
```

Every time `os.urandom(n)` is called, `n` number of bytes are requested from [getrandom](https://man7.org/linux/man-pages/man2/getrandom.2.html).

> The getrandom() system call fills the buffer pointed to by buf with up to buflen random bytes.  These bytes can be used to seed user-space random number generators or for cryptographic purposes.

However, `random.randint` is a little different; the module is seeded when it's *imported*.

```python
# example2.py

import random
```

The above program requests `2496` bytes from `getrandom` (even though we haven't actually requested any random numbers yet) in order to seed the module. See the trimmed output from `strace python example2.py` below:

```bash
# ..
getrandom("\xcf\xf3\x34\xf4\x65\x49\xd2\xab\xc2\x65\x26\x0
\xd6\x59\xdd\x4f\x5c\xf5\xa5\x2d\xe7\x65\x25\xca\x0b\x74
\xd3\x40\x94\x8a\xe0\x4f"..., 2496, GRND_NONBLOCK) = 2496
# ..
```

Either way, to achieve deterministic randomness, I need to get between my program and these syscalls to`getrandom`. I'll list all the methods I've heard of, ordered from most tricky to least tricky:

- Compile the Linux kernel with an altered `getrandom` function. Downside: my computer becomes hilarious, obscurely, insecure and vulnerable
- Use [kprobes](https://www.kernel.org/doc/Documentation/kprobes.txt) to hook into the kernel's existing `getrandom` function (ideally with some filtering so it's not *all* calls to `getrandom`)
- Compile a Python binary with a modified [py_urandom function](https://github.com/python/cpython/blob/3bddd07c2ada7cdadb55ea23a15037bd650e20ef/Python/bootstrap_hash.c#L477)
- Use a kernel probe (see: [Kprobes](https://docs.kernel.org/trace/kprobes.html)) to hook into the kernel
- Use `LD_PRELOAD` to alter the call that Python makes to `libc`'s `getrandom` (read more on this in [LD_PRELOAD: The Hero We Need and Deserve](https://blog.jessfraz.com/post/ld_preload/))
- Use [ptrace](https://man7.org/linux/man-pages/man2/ptrace.2.html) (process trace) to intercept and modify the return value of the `getrandom` syscall

Note: I've not included methods like monkey patching (e.g. with [MagicMock](https://docs.python.org/3/library/unittest.mock.html#unittest.mock.MagicMock)) because that requires  a code change and doesn't count.

## Modifying System Calls With ptrace

Given the constraint of no code changes allowed, [ptrace](https://man7.org/linux/man-pages/man2/ptrace.2.html) is well suited for this job. It only affects a specific process and I don't need to recompile my dependencies. About 20 or so lines of C will do it.

> The ptrace() system call provides a means by which one process (the "tracer") may observe and control the execution of another process (the "tracee"), and examine and change the tracee's memory and registers.  It is primarily used to implement breakpoint debugging and system call tracing.
> 

First, I need to find the process ID (PID) of a running Python program, so with bash:

```bash
$ ps aux | grep python
andrew        9792  0.0  0.4  16468  8264 pts/5    S+   16:33   0:00 python
#             ^ PID
```

Here, `9792` is the PID. Then, I want to call my `unrandom` program like this: `./unrandom <pid>`, so my C program starts by reading from `argv`:

```c
// unrandom.c

int main(int argc, char *argv[]) {
  if (argc < 2) {
    fprintf(stderr, "Usage: %s <pid>\n", argv[0]);
    return 1;
  }

  pid_t pid = atoi(argv[1]);
  
  // ..
}
```

Next, we need to attach to the Python process (the tracee) so that `unrandom.c` (the tracer) can gain control.

```c
// Attach to the process with the given PID and initiate tracing (sends a
// SIGSTOP) on the tracee to halt its execution.
if (ptrace(PTRACE_ATTACH, pid, NULL, NULL) == -1) {
  perror("ptrace attach");
  return 1;
}

// Wait for the tracee to stop and become ready for further tracing.
waitpid(pid, 0, 0);
```

The main part of `unrandom` is a loop where we intercept the entry and exit of each syscall.

On the entry, we'll read the tracee's register values and check if the syscall is `getrandom`; if so, then on the exit, we will write to the buffer that the Python process passed as a reference (it expects random bytes to be inside this buffer).

Let's start by debug logging to see what's going on.

```c
for (;;) {
  // Restart the tracee and stop at the next system call entry or exit. Here,
  // we enter the syscall.
  if (ptrace(PTRACE_SYSCALL, pid, 0, 0) == -1) {
    perror("ptrace syscall enter");
    break;
  }
  waitpid(pid, 0, 0);

  // Retrieve the tracee's register values.
  struct user_regs_struct regs;
  if (ptrace(PTRACE_GETREGS, pid, 0, &regs) == -1) {
    perror("ptrace getregs");
    break;
  }

  // Check if the syscall being traced is SYS_getrandom.
  int intercepted = 0;
  if (regs.orig_rax == SYS_getrandom) {
    intercepted = 1;
  }

  // Exit the syscall and wait for the tracee to stop again.
  if (ptrace(PTRACE_SYSCALL, pid, 0, 0) == -1) {
    perror("ptrace syscall exit");
    break;
  }
  waitpid(pid, 0, 0);

  if (intercepted) {
    fprintf(stderr,
      "intercepted getrandom call: regs.rdi = %llu, regs.rsi = %zu\n",
      regs.rdi, regs.rsi);
  }
}
```

I compiled this with `gcc -o unrandom unrandom.c`, started a Python REPL, grabbed the pid, and ran `./unrandom <pid>` in a different session.

My `unrandom` program didn't print anything initially, it let all the non-getrandom syscalls through to the kernel, and back, without interference. But when I ran `os.urandom(8)` in the REPL, `unrandom` logged this:

```bash
intercepted getrandom call: regs.rdi = 140219284068912, regs.rsi = 8
```

If we look up a [system call table](https://blog.rchapman.org/posts/Linux_System_Call_Table_for_x86_64/) for x86-64, we can check what these register values mean:

- rdi: `char __user *buf`
- rsi: `size_t count`

We need to write `count` zero bytes to `*buf` after the syscall exits. It's important that it's *after*; otherwise the syscall exit will overwrite our modifications.

```c
if (intercepted) {
  fprintf(stderr,
    "intercepted getrandom call: regs.rdi = %llu, regs.rsi = %zu\n",
    regs.rdi, regs.rsi);

  unsigned long long buf = regs.rdi;
  size_t count = regs.rsi;

  // Overwrite the buffer contents with zeroes.
  for (size_t i = 0; i < count; i += sizeof(long)) {
    if (ptrace(PTRACE_POKEDATA, pid, buf + i, 0) == -1) {
      perror("ptrace pokedata");
      break;
    }
  }

  // Set the return value to indicate the amount of data written.
  regs.rax = count;

  // Modify the tracee's registers to reflect the changes made.
  if (ptrace(PTRACE_SETREGS, pid, 0, &regs) == -1) {
    perror("ptrace setregs");
    break;
  }
}
```

When a Python process is the tracee of `unrandom`, all `getrandom` syscalls will return zeroes. This means that `os.unrandom` returns as many `\x00` as requested, and `random.randint` returns deterministically random numbers (the same series of numbers, every time the process restarts — internally, it uses the [Mersenne Twister](https://en.wikipedia.org/wiki/Mersenne_Twister) as the core generator).

This is what it looks like in a traced REPL:

```bash
Python 3.11.2 (main, May  2 2024, 6:59:08) [GCC 12.2.0] on linux
Type "help", "copyright", "credits" or "license" for more information.
>>> import os
>>> os.urandom(8)
b'\x00\x00\x00\x00\x00\x00\x00\x00'
>>> os.urandom(8)
b'\x00\x00\x00\x00\x00\x00\x00\x00'
>>> import random
>>> random.randint(0, 10)
5
>>> random.randint(0, 10)
8
>>> random.randint(0, 10)
0
# these last three numbers are the same every time the process restarts!
```

Detour complete. The source code for `unrandom` is [on GitHub](https://github.com/healeycodes/unrandom). I imagine it will run on most x86-64 Linux distributions.

My main resource was the [man page for ptrace](https://man7.org/linux/man-pages/man2/ptrace.2.html). These two blog posts also have helpful code examples and some fun ideas: [Intercepting and Emulating Linux System Calls with Ptrace](https://nullprogram.com/blog/2018/06/23/) and [Modifying System Call Arguments With ptrace](https://www.alfonsobeato.net/c/modifying-system-call-arguments-with-ptrace/).

It was fun digging into system call tracing, so I'm going to do some more research into how the tracing tools I use work under the hood!
