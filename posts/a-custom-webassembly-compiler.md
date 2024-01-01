---
title: "A Custom WebAssembly Compiler"
date: "2023-12-30"
tags: ["python"]
description: "Making my programming language 4000x quicker, and adding a static type checker."
---

Over the Christmas break, I built a static type checker and WebAssembly compiler for my toy programming language [nodots](https://github.com/healeycodes/nodots-lang). When I say *compiler*, I mean some code that consumes an abstract syntax tree and produces WebAssembly without relying on any existing toolchains.

I've written about this language twice before on this blog ([Adding For Loops to an Interpreter](https://healeycodes.com/adding-for-loops-to-an-interpreter), [Profiling and Optimizing an Interpreter](https://healeycodes.com/profiling-and-optimizing-an-interpreter)). However, those posts aren't required reading as the only existing code I reused for this project was the [grammar file](https://github.com/healeycodes/nodots-lang/blob/main/grammar_static.py) which defines the language syntax.

Here's an example of a typed nodots program that calculates the n-th Fibonacci number using recursive calls. To work out the 25th number, this highly inefficient algorithm uses ~243k function calls, which makes it great for benchmarking the previous tree-walk interpreter of nodots vs. the compiled version that I've been hacking on.

```text
fn fib(i32 n) -> i32
  if (n == 0)
    return 0;
  fi
  if (n == 1)
    return 1;
  fi
  return fib(n - 1) + fib(n - 2);
nf
```

As WebAssembly, this runs in ~0.7ms, around 4000x faster than the tree-walk interpreter version. It's also a few orders of magnitude smaller. The binary of this program is 134 bytes when encoded in base64. This is *much* smaller than: a Python runtime, the Lark parsing library, and a 1k LOC interpreter!

## Compiling to WebAssembly

WebAssembly is a binary instruction format for a [stack-based](https://en.wikipedia.org/wiki/Stack_machine) virtual machine that most commonly runs in browsers and Node.js. Some use cases include running performance sensitive code (although, communicating between JavaScript and WebAssembly adds significant overhead), or calling and running C/Rust/Go code within an isolated context.

There's also a human-friendly [text format](https://webassembly.github.io/spec/core/text/conventions.html) (known as **W**eb**A**ssembly **T**ext aka WAT) that appears when you view the source of a WebAssembly module in your browser's developer tools. It's a rendering of a module's abstract syntax into [S-expressions](https://en.wikipedia.org/wiki/S-expression).

If you are familiar with at least one programming language, you could probably spend an afternoon reading some [example programs](https://github.com/eliben/wasm-wat-samples/tree/main) before writing your own programs.

My compiler emits this text format of WebAssembly. Here's an example module that exports a function that adds two numbers together. The goal of my compiler project was to output code that looks like the below snippet (comments added afterwards).

```wasm
;; add.wat

(module
    ;; a function that accepts two numbers and returns a number
    (func $add (export "add") (param $a i32) (param $b i32) (result i32)
        (local.get $a)
        (local.get $b)
        (i32.add)

        ;; you could also write this as:
        ;; (i32.add (local.get $a) (local.get $b))
    )
)
```

## Traversing the Tree

My compiler emits code in a single pass. The abstract syntax tree is traversed using "visit functions" for each node type (a loose implementation of the [Visitor pattern](https://en.wikipedia.org/wiki/Visitor_pattern)). [Lark](https://github.com/lark-parser/lark) consumes the [grammar definition of nodots](https://github.com/healeycodes/nodots-lang/blob/main/grammar_static.py) and produces a tree of nodes and children.

Let's explore how the function body from above (the source code: `a + b;`) is handled by [compiler.py](https://github.com/healeycodes/nodots-lang/blob/main/compiler.py). I've included a slice of functions (with extra comments, and types removed for readability) to show this flow.

```python
# generate the parser
parser = Lark(
    GRAMMAR,
    start="program",
    parser="lalr",
    keep_all_tokens=True,
    propagate_positions=True,
)

# compiler state, used for emitting code
# and static type checking
class Context:
    scope = {}
    func_return_ntype = None
    wat = "(module\n"

    def write(self, code):
        self.wat += f"{code}"

    def finish(self):
        self.wat += ")\n"
        return self.wat

# compile nodots source code to wat code
def compile(source, context):
    root = parser.parse(source) # root node
    visit_declaration(root, context)

    # write the wat code to stdout
    print(context.wat)
```

The visit functions all accept the same parameters; a node and the compiler context. When the node evaluates to a type, that type is returned so that the program can be type checked. In nodots, there are four kinds of statements that follow a declaration.

```python
def visit_declaration(node, context):
    for child in node.children:

        # "a + b;" is an expression statement
        if child.data == "expression_stmt":
            visit_expression_stmt(child, context)
        elif child.data == "fun_stmt":
            visit_fun_stmt(child, context)
        elif child.data == "return_stmt":
            visit_return_stmt(child, context)
        elif child.data == "if_stmt":
            visit_if_stmt(child, context)
```

There are a few visit functions that get called between `visit_declaration` and `visit_term` (which handles addition and subtraction) but they are no-ops in the case of `a + b;`.

```python
def visit_term(node, context) -> Ntype:
    if len(node.children) == 1:
        return visit_factor(node.children[0], context)

    # used for error reporting
    line, col = node.meta.line, node.meta.column

    op = "add" if node.children[1] == "+" else "sub"

    # (see visit_primary below)
    # emits "(local.get $a)"
    left_nytpe = visit_factor(node.children[0], context)

    # (see visit_primary below)
    # emits "(local.get $b)"
    right_nytpe = visit_factor(node.children[2], context)

    # exit if we notice a user type error
    if type(left_nytpe) != type(right_nytpe):
        raise Exception(
            f"type error {node.children[1]}: mismatched types got {left_nytpe} and {right_nytpe} ({line}:{col})"
        )

    # emits "(i32.add)"
    context.write(f"({left_nytpe}.{op})\n")

    # return the type of this term expression so that we
    # can error if, for example, this i32 term expression
    # is being assigned to a f64 variable
    return left_nytpe
```

After a few more no-op visit function calls (not shown here), we arrive at a primary node where `a` and `b` can be type checked (they are both valid as they're function parameters), and can be encoded as instructions that look up local variables.

```python
def visit_primary(node, context):
    line, col = node.meta.line, node.meta.column
    inner = node.children[0]

    # handle literals like "1" or "1.0"
    if isinstance(inner, Token):
        if "." in inner:
            context.write(f"(f64.const {inner})\n")
            return F64()
        else:
            context.write(f"(i32.const {inner})\n")
            return I32()

    # handle variables like "a" or "b"
    if inner.data == "identifier":
        identifier = inner.children[0]
        
        # check that the identifier is a local variable
        # e.g. defined by "i64 a = 1" or function params
        if identifier in context.scope:
            context.write(f"(local.get ${identifier})\n")
            return context.scope[identifier]
        raise Exception(f"unknown identifier: {identifier} ({line}:{col})")
    raise Exception("unreachable")
```

These last two visit functions are some of the more simple examples of "node handling" in this compiler. When handling more complicated nodes, e.g. functions, the code tends to get quite messy. There's lots of referring to magic indexes like `node.children[1].children[0].value` which I use somewhere to get the identifier of an assignment. This kind of code is hard to understand and quite brittle.

To fix this, I could parse Lark's abstract syntax tree into my own structure with better typing and utility functions for getting/validating the different properties of each node. I haven't implemented this yet because I'm still in the design/prototype stage.

The somewhat hacky journey I took allowed me to get to the end quicker (a working compiler) and to discover and solve the unknown-unknowns. The same goes for working with Python, it helped me move quick but, if I was selling a compiler product, I'm not sure I would want to maintain it in a dynamic language. Abstract syntax trees are very dynamic and (IME) it's harder to get IntelliSense working in dynamic languages for them.

## If Statements

For this version of nodots, I changed the existing grammar to include types and removed some language features to make this compiler easier to implement. So after getting some simple programs working, I've been going through and adding stuff back.

The latest thing I've added support for is if statements. The two code changes required were satisfyingly small. in order for Lark to parse this new construct, I needed to add the syntax for `if_stmt` to the [grammar definition](https://github.com/healeycodes/nodots-lang/blob/main/grammar_static.py), as well as making it part of a declaration (aka a statement).

```text
declaration     : fun_stmt | return_stmt | if_stmt | expression_stmt
if_stmt         : "if" "(" expression ")" declaration* "fi"
```

This means the parse step will look for the keyword `if`, an open parenthesis `(`, an arbitrary expression like `n == 0`, a close parenthesis `)`, an optional list of statements or a single statement like `return n;`, and finally the closing keyword `fi`.

The recursive Fibonacci program has such an if statement:

```text
if (n == 0)
  return 0;
fi
```

Which compiles down to:

```wasm
;; push n onto the stack
(local.get $n)
;; push 0 onto the stack
(i32.const 0)
;; pop both, check if they are equal
;; and then push the result (1 or 0)
(i32.eq)

;; if 1 is on the stack 
(if
  (then
    ;; return 1
    (i32.const 1)
    (return)
  )
)

;; else keep running instructions
```

The visit function here uses the existing building blocks of the compiler. I didn't consult any resources on how to "emit code". I believe this way of emitting literal code from these functions is bad design, and I should probably be writing objects to a list so that I can add optimization passes (etc.) in the future.

```python
def visit_if_stmt(node, context):
    line, col = node.meta.line, node.meta.column

    # in this example, visit_expression emits:
    # (local.get $n)
    # (i32.const 1)
    # (i32.eq)
    ntype = visit_expression(node.children[2], context)

    # webassembly uses i32 for the condition (1 is true)
    if type(ntype) != I32:
        raise Exception(
            f"type error if: expected {I32()} got {ntype} ({line}:{col})"
        )

    context.write(
        """(if
      (then\n"""
    )

    for i in range(3, len(node.children)):

        # skip "if", "(", ")", and "fi"
        if isinstance(node.children[i], Token):
            continue

        # handle each statement from the body
        visit_declaration(node.children[i], context)

    # close it up
    context.write(")\n)\n")
```

## Running WAT

It's a shame that I can't point Node.js at a `.wat` file and have it convert it to binary without any libraries and then execute it. However, the available tooling and documentation for WebAssembly is quite good. [Wabt](https://github.com/WebAssembly/wabt) or [Binaryen](https://github.com/WebAssembly/binaryen) can be used to convert `.wat` → `.wasm` so that can be run by Node.js/browser/etc.

I wanted a quick way to end-to-end test my compiler after every code change. I saw that the [online demo](https://webassembly.github.io/wabt/demo/wat2wasm/) for wat2wasm had a C++ library compiled to JavaScript using Emscripten. I included this file ([libwabt.js](https://github.com/WebAssembly/wabt/blob/9fdd024249b6b181d98a4164700ca6ee09f970d9/docs/demo/libwabt.js)) in the nodots repository so I can just run `./compile.sh` to test that everything works (in a few milliseconds).

My [wat2wasm.js](https://github.com/healeycodes/nodots-lang/blob/dcf9aadc049667e5d1979c62388706e7c6ef6438/wasm/wat2wasm.js) script reads WAT code from stdin, turns it into a binary buffer, and then executes it with some debug information.

## The Future

Adding a feature like if statements is pretty straightforward because the structure of nodots source code closely matches the WebAssembly instructions required (a happy coincidence). So adding an "else" block, or for loops, or a ternary operator, have a fairly defined path of implementation. Another easy one would be to add support for all the math instructions like the remainder operator or converting i32 to f64 and vice versa.

The harder, and more fun, ideas I have are like: bringing back dynamically sized data structures like lists and maps (which I removed from this version), or functional programming stuff like map/each/reduce and higher-order functions.

Dynamic memory is an interesting one. The two paths for this are adding a garbage collector — which would be quite an undertaking considering there isn't a runtime at the moment — or by providing a C-like API with malloc/free. I could take inspiration from [walloc](https://github.com/wingo/walloc) (a small malloc implementation in C, specifically for WebAssembly).

The current static type checking could always be better. It catches obvious stuff like assigning, or returning the wrong type:

```text
fn fib(i32 n) -> f64
  if (n == 0)

    # type error return: expected f64 got i32 (4:5)
    return 0;
  fi

# ..
```

But it isn't smart enough to know that a function definitely contains a return statement that *will* be called. To get around WebAssembly errors caused by missing return statements, the compiler appends an empty value instruction to the end of all functions e.g. `(i32.const 0)`.

I have a naive idea for how to support return type checking which is to assert that all branches contain a return statement. I'm going to seek out some type theory and see if I can do better than this (send me any recommendations).

If I want to procrastinate on the decision of where I go next, I could always write a syntax highlighter so that nodots code blocks (like the ones in this post) aren't rendered as plain text.

<small>Thanks to [Dov Alperin](https://dov.dev/) and [James Little](https://jameslittle.me/) for providing feedback on an early draft.</small>
