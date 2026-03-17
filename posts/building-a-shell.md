---
title: "Building a Shell"
date: "2026-03-16"
tags: ["c"]
description: "I built a tiny shell in C to learn what fork, execvp, and dup2 are doing under the hood."
---

The shell sits in front of a lot of my work, but I mostly use it for the outcome: running unix commands and scripts, creating branches and making commits. Unlike when I'm writing code, I'm rarely thinking about how the shell itself works under the hood.

So, to dig a bit deeper into shells, I'm going to build a toy one until I run out of time. I have a fresh pot of filter coffee, and I'm awake three hours before everyone else.

A quick look ahead to everything I'm able to support by the end:

```text
./andsh
andsh$ cd /
andsh$ pwd
/
andsh$ echo $HOME
/Users/andrew
andsh$ nosuchcommand
nosuchcommand: No such file or directory
andsh$ echo $?
127
andsh$ printf abc\n | tr a-z A-Z | rev
CBA
andsh$ ec<Tab> hello
andsh$ echo hello
hello
andsh$ <Up>
andsh$ echo hello
hello
andsh$ ^D
```

If you prefer reading C over prose, head straight to [healeycodes/andsh](https://github.com/healeycodes/andsh).

## REPL

A shell is an interactive program before it's a language implementation, and the user experience starts at the prompt. This first step is about building the interactive skeleton: print a prompt, read a line, keep a little state, and leave a clean place to plug execution logic into.

```c
// repl.h

typedef struct {
    int last_status;
    int running;
    int interactive;
} Shell;
```

We also need the classic read-eval-print loop:

```c
// repl.c

int shell_run(Shell *shell) {
    char *line = NULL;
    size_t capacity = 0;

    if (install_signal_handlers() != 0) {
        return 1;
    }

    while (shell->running) {
        int rc = read_line(&line, &capacity, shell);

        if (rc == 0) {
            break;
        }

        if (rc < 0) {
            free(line);
            return 1;
        }

        eval_line(shell, line);
    }

    free(line);
    return shell->last_status;
}
```

`read_line` returns three cases: got a line, hit EOF, or hit a real error.

`eval_line` starts tiny: blank lines do nothing, `exit` stops the shell in-process, and everything else gets treated as an external command.

```c
// inside eval_line

if (strcmp(argv[0], "exit") == 0) {
    shell->running = 0;
    free_argv(argv);
    return shell->last_status;
}

status = execute_external(shell, argv);
```

At the moment, we can run `ls` but we can't run `ls -l` yet. It's interpreted as a single command `"ls -l"`.

## From a Line to argv

Before we add env var expansion and pipes, let's start by splitting a line on spaces and tabs so we can run simple foreground commands like `echo hello world` or `ls -l`.

It will be intentionally incomplete. It still won't handle quotes or redirections, but it will peel off `|` as syntax so we can grow into supporting pipelines later. It's still useful because Unix process APIs want `argv` (argument vector, values passed down to a program when it starts).

First, we need a way to split a line:

```c
// repl.c

static char **tokenize_line(const char *line, int *count_out) {
    while (*p != '\0') {
        while (isspace((unsigned char) *p)) {
            p++;
        }

        if (*p == '|') {
            push_word(&words, &count, &capacity, dup_range(p, 1));
            p++;
            continue;
        }

        // .. copy the next word up to whitespace or |
    }

    *count_out = (int) count;
    return words;
}
```

Which we can call inside our fledgling `eval_line` function to get a stream of shell words before we group them into commands.

```c
// inside eval_line

if (line_is_blank(line)) {
    return 0;
}

words = tokenize_line(line, &word_count);
if (word_count == 0) {
    free_words(words);
    return 0;
}
```

## Running Commands

A shell can't replace itself with a command that it's launching (otherwise the shell would cease to exist after running that command) so it must create a child process to run the command, and wait for it to finish.

The parent shell stays alive and the child process becomes the command.

`execvp` is a convenient call from the `exec` family here. It searches `PATH` and replaces the current process with a new program, using the current process environment.

`waitpid` gives control back to the shell after the command exits.

```c
// repl.c

pid = fork();
if (pid == 0) {
    execvp(argv[0], argv);
    perror(argv[0]);

    // 127: command not found, 126: found but not executable / cannot invoke
    _exit(errno == ENOENT ? 127 : 126);
}

// ..

while (waitpid(pid, &status, 0) < 0) {
    if (errno != EINTR) {
        perror("waitpid");
        shell->last_status = 1;
        return shell->last_status;
    }
}
```

The child uses `_exit` to avoid running parent-inherited libc cleanup in the forked child (can lead to duplicated output and other unintended side effects).

One shell-y detail I wanted to keep was the interrupted wait path. Retrying on `EINTR` keeps the shell from losing track of a child process when the terminal sends an interrupt.

Now we can do real shell things:

```text
./andsh
andsh$ echo hello world
hello world
andsh$ pwd
/Users/andrew/Documents/experiments/andsh
andsh$ ls -l
total 160
-rw-r--r--  1 andrew  staff    194 14 Mar 08:10 Makefile
drwxr-xr-x  7 andrew  staff    224 14 Mar 14:24 src
andsh$ ^D
```

For the process/system call stuff, C is great for writing toy shells. The downsides are things like splitting a line (managing dynamic memory), and later, adding more shell syntax (string lifetimes).

## cd, or How to Get around

One of the core shell rules is that some commands can't run in a child process. For example, if the shell forks and a child calls `chdir` then only the child changes directories; when the child exits, the parent shell is still in the old directory.

This is why `cd` has to be a builtin.

```c
// inside try_builtin

if (strcmp(command->argv[0], "cd") == 0) {
    return run_builtin_cd(shell, command);
}
```

Something I learned for this post is that `HOME` is the conventional default target when running a lone `cd`.

```c
static int run_builtin_cd(Shell *shell, Command *command) {
    const char *target = command->argc == 1 ? getenv("HOME") : command->argv[1];

    if (chdir(target) != 0) {
        perror("cd");
        shell->last_status = 1;
        return shell->last_status;
    }

    shell->last_status = 0;
    return 0;
}
```

Because `run_builtin_cd` runs inside the shell process, the next prompt sees the new directory.

## Env Var Expansion

Before running a command, the shell rewrites parts of the input line. There are a few syntax rules and ordering details here, but for my toy shell I'm just adding env var expansion.

`echo $HOME` shouldn't print `$HOME`, it should print `/Users/andrew`.

I'm just hacking this in. Only whole-word `$NAME` expansion. No quotes, no `${NAME}`, and no splitting rules.

```c
static char *expand_word(const Shell *shell, const char *word) {
    const char *value;

    if (strcmp(word, "$?") == 0) {
        char status[32];
        snprintf(status, sizeof(status), "%d", shell->last_status);
        return strdup(status);
    }

    if (word[0] != '$' || word[1] == '\0') {
        return strdup(word);
    }

    // .. look up NAME in the environment
    value = getenv(word + 1);
    if (value == NULL) {

        // Unset variables expand to the empty string in this toy shell.
        return strdup("");
    }

    return strdup(value);
}
```

Expansion happens after tokenization but before execution. And `|` is syntax, not data, so we don't try to expand it:

```c
for (i = 0; words[i] != NULL; i++) {
    char *expanded;

    if (strcmp(words[i], "|") == 0) {
        continue;
    }

    expanded = expand_word(shell, words[i]);
    free(words[i]);
    words[i] = expanded;
}
```

We expand token-by-token, keeping it simple; and skipping writing a parser.

The special case for `$?` is also nice to leave in the code because it's one of those tiny shell details that makes the prompt feel less fake.

## Piping

A pipe (`|`) is a kernel buffer with one process writing bytes in and another reading bytes out.

`cmd1 | cmd2` connects the stdout of the left command to the stdin of the right command. For `N` commands, you need `N - 1` pipes.

The heavy lifting here will be done by `pipe()`, which creates a one-way channel for interprocess communication. `pipe()` fills the array `pipefd` with two file descriptors. `pipefd[0]` is the read end, and `pipefd[1]` is the write end. Data written to the write end is buffered by the kernel until it is read from the read end.

The core pipe loop runs once per command in the pipeline. Each iteration may create one new pipe for the next command. `prev_read` is the read end carried forward from the previous iteration.

```c
for (i = 0; i < pipeline->count; i++) {
    int pipefd[2] = {-1, -1};

    if (i + 1 < pipeline->count) {
        pipe(pipefd);
    }

    pid = fork();
    if (pid == 0) {

        // .. hook this command up to prev_read / pipefd
        execvp(pipeline->commands[i].argv[0], pipeline->commands[i].argv);
    }

    // .. parent closes what it doesn't need, then carries read end forward
}
```

E.g. for `printf abc | tr a-z A-Z | rev`:

- Left command produces bytes
- Middle command reads, transforms, writes
- Right command reads the final stream

`dup2` lets normal programs work in a pipeline without knowing about the shell. Programs read from stdin and write to stdout. The shell creates a pipe and uses `dup2` to connect these streams.

Below, `dup2(prev_read, STDIN_FILENO);` makes the process read from the previous pipe instead of stdin, and `dup2(pipefd[1], STDOUT_FILENO);` makes its output go into the next pipe instead of the shell prompt. Because the program still reads from stdin and writes to stdout as usual, it works in the pipeline without any special logic.

```c
if (pid == 0) {
    if (prev_read != -1) {
        dup2(prev_read, STDIN_FILENO);
    }

    if (pipefd[1] != -1) {
        dup2(pipefd[1], STDOUT_FILENO);
    }

    if (prev_read != -1) {
        close(prev_read);
    }

    if (pipefd[0] != -1) {
        close(pipefd[0]);
        close(pipefd[1]);
    }
}
```

And now, this shell's demo is looking a little more complete:

```text
./andsh
andsh$ cd /
andsh$ pwd
/
andsh$ echo $HOME
/Users/andrew
andsh$ nosuchcommand
nosuchcommand: No such file or directory
andsh$ echo $?
127
andsh$ printf abc | tr a-z A-Z | rev
CBA
andsh$ ^D
```

## Recap

To recap a bit, I'll step through what happens when `ls $HOME | grep foo` is entered.

It's tokenized into `["ls", "$HOME", "|", "grep", "foo"]`.

Then expanded into `["ls", "/Users/andrew", "|", "grep", "foo"]`.

The flat token list is separated into structured pipeline commands:
- `["ls", "/Users/andrew"]`
- `["grep", "foo"]`

The shell creates a pipe to connect the output of `ls` to the input of `grep`.

The child commands start via `fork`, and `execvp` swaps them into the target programs.

By the wonderful design of Unix: if `grep` reads faster than `ls` writes, it blocks waiting for more data; if `ls` writes faster than `grep` reads, the pipe buffer fills and `ls` temporarily blocks. This synchronization happens automatically through the pipe, while the shell simply waits for both child processes to finish.

The output of `grep` isn't connected to a pipe as it's the last command, and any results are displayed to the user.

## Polishing the REPL: History and Tab Completion

Even though our little REPL runs commands, expands env vars, and builds pipes, the interaction still feels rough. Left and right arrows do not magically work just because you're in a terminal. The terminal just sends escape sequences like `^[[D`.

At the moment, trying to move left and fix a typo ends up looking like this:

```text
./andsh
andsh$ echo ac^[[Db
ac^[[Db
```

Up to now, `getline` has been reading bytes just fine. Now we need something to sit in the middle and give us line editing, history, and completion. One answer is the `readline` library.

The outcome of calling it, is a line to evaluate, and history that can be walked later:

```c
// inside read_line

if (shell->interactive) {
    free(*line);
    *line = readline("andsh$ "); // <--
    if (*line == NULL) {
        fputc('\n', stdout);
        return 0;
    }

    if ((*line)[0] != '\0') {
        add_history(*line);
    }

    return 1;
}
```

There's also a little setup for tab completion and history:

```c
// inside shell_init

if (shell->interactive) {
    rl_readline_name = "andsh";

    rl_catch_signals = 0;

    // Plug in tab completion
    rl_attempted_completion_function = shell_completion;

    // We don't need special paste handling
    rl_variable_bind("enable-bracketed-paste", "off");
    
    // History support
    using_history();
}
```

The API for tab completion involves providing a generator that can cycle through the different matching options.

```c
static char *completion_generator(const char *text, int state) {
    if (state == 0) {

        // Initial setup `text` is e.g. `ech`
        if (build_completion_matches(text) != 0) {
            free_completion_matches();
            return NULL;
        }
    }

    if (g_completion_index >= g_completion_count) {
        return NULL;
    }

    return strdup(g_completion_matches[g_completion_index++]);
}
```

`readline` calls the generator repeatedly until it returns `NULL`. When `state == 0`, we set up the generator by building all the completion matches. After that, the generator hands matches back one at a time (e.g. each time the user presses tab, or all at once for tab-tab-Y).

So, we need a function that takes `text` (partial text) and returns a list of matches. I've chosen to scan the current directory (`.`) for files, followed by all the `$PATH` directories; returning any files that start with the partial text.

```c
static int build_completion_matches(const char *text) {
    free_completion_matches();

    // Inside this function, we're calling `readdir`, `starts_with`,
    // and `add_completion_match` for anything we consider a match.
    if (collect_matches_from_dir(".", text, 0) != 0) {
        return -1;
    }

    path = getenv("PATH");
    // .. split PATH on ':' and scan each directory
}
```

Adding basic tab completion like this really makes me consider the performance implications of shells. I didn't know that some shells might make hundreds of system calls around each prompt to figure out things like completion options.

The final demo:

```text
andsh$ unam<Tab>
andsh$ uname

andsh$ Makef<Tab>
andsh$ Makefile

andsh$ echo hello
hello
andsh$ <Up>
andsh$ echo hello
```

## What's Missing

A lot is missing. `andsh` is usable enough. It could handle maybe 50% of my shell use cases: launching programs, some git commands, and basic pipes into `grep`.

But it's very small and incomplete. No quoting is a big one. `echo "hello world"` is where some people would start when implementing a shell but ... I've written a [lot](https://healeycodes.com/compiling-lisp-to-bytecode-and-running-it) [of](https://healeycodes.com/a-custom-webassembly-compiler) [parsers](https://healeycodes.com/porting-boolrule-to-rust) on this blog already. There's no redirection, so `<`, `>`, and `>>` do not work. Builtins are also minimal, and I only really handle them as standalone commands.

Redirection would add more file descriptor plumbing to execution, and quoting would force the tokenizer to become a real shell lexer.

I think my biggest learnings were the low-level process APIs shells are using under the hood. I don't often work directly with calls like `execvp` and `dup2`.

Read the code at [healeycodes/andsh](https://github.com/healeycodes/andsh), and send me your terminal and shell projects pls.
