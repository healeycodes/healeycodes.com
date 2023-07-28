---
title: "Running Untrusted Python Code"
date: "2023-07-27"
tags: ["python"]
description: "Using seccomp and setrlimit to build a Python sandbox."
---

For a side-project, I needed to run some untrusted Python code.

I would usually sandbox untrusted code inside a virtual machine. Either with a managed service like Fargate, Lambda, or Fly Machines; or if there were specific requirements (e.g. performance, cost) perhaps I would use a primitive like a Firecracker microVM or a V8 isolate.

Since it's a side-project, I can do something less secure and more fun – like using a separate process with some limits applied to it. My understanding is that sandboxing untrusted code inside a separate process is something that used to be more common but, after many CVEs, it's now less common.

You can go straight to trying to break out of my sandbox here: [untrusted-python.vercel.app](https://untrusted-python.vercel.app/), view the [source code](https://github.com/healeycodes/untrusted-python), or keep on reading.

I will update this post if (more like when!) someone finds a security hole in it.

## How it works

When the API receives some code, it spins up a new Python process. When the process starts, it has regular permissions and no resource limits. It then applies limits to itself (which can't be revoked) and then calls the guest code with [`exec`](https://docs.python.org/3/library/functions.html#exec). After this last step, the process isn't trusted.

The input is source code and the output is stdout/stderr.

I have side-stepped the common mistake of building a sandbox in application land e.g. by removing access to parts of the runtime.

In Python, removing builtins *seems* like it will stop people being able to access the system:

```python
# ImportError: __import__ not found
exec("import os; os.system('ls')", {'builtins': {}})
```

But program languages (and especially dynamic programming languages) allow you to do funky things, like walking up a class tree and dancing across frames:

```python
# remove builtins, now we're safe!
__builtins__ = {}

import os # ImportError: __import__ not found

# .. until someone gets the builtins back
lookup = lambda n: [x for x in (1).__class__.__base__.__subclasses__() if x.__name__ == n][0]
try:
    lookup('Codec')().decode('')
except lookup('BaseException') as e:
    del lookup
    __builtins__ = e.__traceback__.tb_next.tb_frame.f_globals['__builtins__']

import os # works!

# (source https://old.reddit.com/r/Python/comments/hftnp/ask_rpython_recovering_cleared_globals/c1v3l4i/)
```

## seccomp

When you hand out virtual machines, you don't need to hide parts of the runtime. If a user decides to start deleting system files, that's fine! The output of the sandbox will be broken/undefined/errored but it doesn't matter. Everything is discarded in the end.

When using a separate process as a sandbox, you need something that sits between the program and the system – and when a user tries to delete a system file they should hit a meaningful error like `EPERM: operation not permitted` so they understand they've run into a permissions issue.

For my sandbox, the layer between the process and the system is [seccomp](https://man7.org/linux/man-pages/man2/seccomp.2.html) (secure computing mode) – a feature of the Linux kernel restricts a process from calling any system call apart from `exit`, `sigreturn`, `read` or `write` (to already open file descriptors).

You can also set [seccomp filters](https://man.archlinux.org/man/seccomp.2.en#SECCOMP_SET_MODE_FILTER) to specify which system calls are allowed or not allowed, and what error code should be returned.

That's what I do:

```python
import pyseccomp as seccomp

def drop_perms():
    # respond with EPERM: operation not permitted so users can tell
    # they're being blocked from doing something
    filter = seccomp.SyscallFilter(seccomp.ERRNO(seccomp.errno.EPERM))

    # allow `write`ing to two already-opened files stdout and stderr
    filter.add_rule(
        seccomp.ALLOW, "write", seccomp.Arg(0, seccomp.EQ, sys.stdout.fileno())
    )
    filter.add_rule(
        seccomp.ALLOW, "write", seccomp.Arg(0, seccomp.EQ, sys.stderr.fileno())
    )

    # load the filter in the kernel
    filter.load()
```

This method of filtering system calls isn't super flexible e.g. you can't specify which files are allowed to be read or written to – just file descriptors.

Note: I avoided namespaces/cgroups to make it a little easier to ship something.

## setrlimit

As well as system calls, you also need to worry about resources. My sandbox runs on the smallest Fly Machine size so there aren't many resources to go around. If someone sends up `while True: pass` it's going to start eating up a CPU core.

You can limit wall clock time from the outside with a timeout like this:

```python
proc = subprocess.Popen(
  [sys.executable, "./sandbox.py", code],
  stdout=subprocess.PIPE,
  stderr=subprocess.PIPE,
)

try:
    stdout, stderr = proc.communicate(code, timeout=2)
except subprocess.TimeoutExpired:
    proc.kill()
```

But during that timeout, what if some code tries to fill all available memory? Or writes GBs of data to stdout/stderr?

[setrlimit](https://linux.die.net/man/2/setrlimit) is one of the answers for this – a system call that allows a process to set resource limits on itself/its child processes. There are different limits available but I picked out the ones I'm concerned about. `RLIMIT_CPU` (overall CPU time), `RLIMIT_AS` (maximum virtual memory size), and `RLIMIT_FSIZE` (maximum size of files created by the process).

Python lets you call into this from the standard library module [resource](https://docs.python.org/3/library/resource.html).

```python
import resource

def set_mem_limit():
    # virtual memory
    resource.setrlimit(resource.RLIMIT_AS, (MEMORY_LIMIT, MEMORY_LIMIT))
    # cpu time
    resource.setrlimit(resource.RLIMIT_CPU, (CPU_TIME_LIMIT, CPU_TIME_LIMIT))
    # write limit i.e. don't allow an infinite stream to stdout/stderr
    resource.setrlimit(resource.RLIMIT_FSIZE, (WRITE_LIMIT, WRITE_LIMIT))
```

I suspect I'm missing an important limit here. If some Python code is able to monopolise a system resource in a way that the API or another sandbox process is affected I would consider it a security hole.

Let me know if you can break something here. DDoSing is cheating!

## More on sandboxes

As part of my Python sandbox research, I read about [The failure of pysandbox](https://lwn.net/Articles/574215/):

> I now agree that putting a sandbox in CPython is the wrong design. There are too many ways to escape the untrusted namespace using the various introspection features of the Python language. To guarantee the [safety] of a security product, the code should be [carefully] audited and the code to review must be as small as possible. Using pysandbox, the "code" is the whole Python core which is a really huge code base. For example, the Python and Objects directories of Python 3.4 contain more than 126,000 lines of C code.

Which prompted me to *just wrap it in seccomp*.

[Pypy's sandbox](https://doc.pypy.org/en/latest/sandbox.html) seems pretty promising if you need to productionize a Python sandbox (and, for some reason, you can't use virtual machines).

A few months ago I wrote about [sandboxing JavaScript code](https://healeycodes.com/sandboxing-javascript-code) and built a TypeScript sandbox with Deno. Shortly after publishing it, I received a few bug bounties for reporting sandbox-related exploits in Val Town's runtime. They fixed these issues by shipping [Restricted Library Mode](https://blog.val.town/blog/restricted-library-mode). After poking at it, it seems like an additional isolation implemented with [Workers](https://developer.mozilla.org/en-US/docs/Web/API/Worker). JavaScript (and its various runtimes) have features that make sandboxing/isolation a little easier than Python because JavaScript always has sandboxes in mind (i.e. web browsers).

One idea I'm noodling around with is sandboxing SQLite at the process level – using a mixture of its [run-time limits](https://www.sqlite.org/c3ref/limit.html), and using [ptrace](https://man7.org/linux/man-pages/man2/ptrace.2.html) to restrict access to any file that isn't the main database file or one of SQLite's [nine types of temporary files](https://www.sqlite.org/tempfiles.html).
