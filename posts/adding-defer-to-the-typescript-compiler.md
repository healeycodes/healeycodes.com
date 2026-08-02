---
title: "Adding Go's defer to the TypeScript Compiler"
date: "2026-08-02"
tags: ["typescript"]
description: "Forking tsc to support Go's defer."
---

I wanted to see how difficult it would be to add Go's `defer` statement to the TypeScript compiler, but by the time I finished I was convinced it probably shouldn't exist.

In Go, the `defer` statement delays the execution of a function until the
surrounding function finishes. It's most commonly used to keep resource
acquisition and cleanup together, like acquiring a semaphore:

```go
func withSemaphore(ctx context.Context, sem *semaphore.Weighted) error {
    if err := sem.Acquire(ctx, 1); err != nil {
        return err
    }
    defer sem.Release(1)

    // ... protected work
    return nil
}
```

TypeScript doesn't have a strict equivalent of `defer`. You might use
`try`/`finally`, like:

```ts
async function readFile(path: string) {
    await sema.acquire();
    try {
        // ... use resource
    } finally {
        sema.release();
    }
}
```

But that's kinda ugly.

For fun, we can hack in a `defer` statement to the TypeScript compiler and get
Go-like semantics. Since `defer` doesn't map to an existing JavaScript feature,
we need to output JavaScript code that makes it work at runtime just like it
does in Go.

So the goal is to be able to write TypeScript code like this:

```ts-with-defer
async function readFile(path: string) {
  await sema.acquire();
  defer sema.release(); // New!
}
```

## The TypeScript Compiler

The TypeScript compiler (`tsc`) is mostly a static analysis engine. Its
complexity lies in type-checking a fundamentally dynamic language, and
supporting extremely incremental compilation to meet latency expectations in an
IDE.

Lucky for us, we don't need to worry too much about types or other analysis in
order to add our `defer` statement. `tsc` already has the machinery for
"recognize syntax X, replace it with equivalent syntax Y."

For example, when compiling for ES5:

```ts
class Foo {
    x = 1;
}
```

Might become something like:

```ts
function Foo() {
    this.x = 1;
}
```

Conceptually, adding `defer` means doing another tree rewrite. `tsc` already
performs a number of AST-to-AST transformations (e.g. optional chaining `?.`
becomes conditional expressions) so we don't need to add new tooling.

There's some complexity to dig into, but at a high level, we'll take an AST with
`defer`:

```ts-with-defer
function f() {
    defer cleanup();
    work();
}
```

And transform it into something like:

```ts
function f() {
    const __defers = [];
    try {
        __defers.push(() => cleanup());
        work();
    } finally {
        // Pop and invoke
    }
}
```

First, we need to teach `tsc`'s parser that `defer` is a statement. There's a
list of syntax kinds that we add `DeferStatement` to and we define it as taking
a single expression operand.

There are a few checks we need to perform, like ensuring the `defer` statement
appears inside a function body, making sure that the expression is callable, and
ensuring `tsc` performs its usual recursive checks:

```go
func (c *Checker) checkDeferStatement(node *ast.Node) {
        c.checkGrammarStatementInAmbientContext(node)

        // A defer is tied to the lifetime of its containing function
        fn := ast.GetContainingFunction(node)
        if fn == nil || fn.Body() == nil || !ast.IsBlock(fn.Body()) {
                c.grammarErrorOnNode(node, diagnostics.Defer_statements_can_only_be_used_inside_function_bodies)
        } else if ast.GetFunctionFlags(fn)&ast.FunctionFlagsGenerator != 0 {
                c.grammarErrorOnNode(node, diagnostics.Defer_statements_cannot_be_used_in_generators)
        }

        // Only calls are supported, which keeps capture/lowering unambiguous
        expression := ast.SkipParentheses(node.Expression())
        if !ast.IsCallExpression(expression) {
                c.grammarErrorOnNode(node.Expression(), diagnostics.The_operand_of_a_defer_statement_must_be_a_call_expression)
                c.checkExpression(node.Expression())
                return
        }

        // Reuse normal call checking (callable callee, argument types, etc.)
        c.checkExpression(expression)
}
```

The actual transformation code is quite verbose so rather than reproduce it
here, I'll instead dig into the design decisions I made and tell you more about
how the transform works.

## How I Think defer Should Work

To match Go's behavior, the callee, receiver, and argument values are captured immediately:

```ts-with-defer
let x = 1;
defer console.log(x);
x = 2;
```

It must print `1`.

An extreme case we need to survive is the callable method being redefined like:

```ts-with-defer
const logger = {
  log(message: string) {
    console.log("old:", message);
  },
};

defer logger.log("hello");

// Everything changes after the defer
logger.log = (message) => {
  console.log("new:", message);
};
```

Even if `logger.log` is reassigned later, the deferred call still invokes
the original method. This matches Go's semantics, where the function value,
receiver, and arguments are all evaluated when execution reaches the `defer`
statement.

Any function that contains at least one `defer` gets a small stack, and each
reached `defer` statement pushes a closure onto that stack. When the function
exits, the stack is drained in reverse order (last-in-first-out).

Registration happens when execution reaches the defer, not when the function
starts. So a `defer` inside an if only runs if that branch ran, and a `defer`
inside a loop registers once per iteration.

So a user writes:

```ts-with-defer
async function readFile(path: string) {
  await sema.acquire();
  defer sema.release();

  return await fs.readFile(path, "utf8");
}
```

Which is transformed like:

```ts
async function readFile(path) {
    const stack = [];

    try {
        await sema.acquire();

        const receiver = sema;
        const method = receiver.release;

        // Register cleanup only if execution reaches the defer statement.
        stack.push(() => method.call(receiver));

        return await fs.readFile(path, "utf8");
    } catch (error) {
        // Save the original error so cleanup can still run.
    } finally {
        // Run registered callbacks in reverse order.
        // In an async function, await each cleanup before moving to the next one.
        // If cleanup also throws, aggregate the failures.
    }
}
```

Rather than invent semantics for `defer await`, I simply reject it as an error.
I worried that a user would assume that the `await` would resolve before the
rest of the function runs. Besides, if the containing function is async, every
deferred call is awaited sequentially during cleanup.

## More On Errors

The cleanup code can fail too, so the transform follows three rules:

- Every deferred call runs, even if an earlier one throws.
- The original error from the function body is preserved.
- If multiple errors occur, they are reported with an `AggregateError`.

Go doesn't need an aggregation policy like this because ordinary errors are
values. A deferred call's returned error is not handled unless the user
explicitly decides to do something with it. JavaScript exceptions are control
flow. So when the compiled `defer` code throws an error it needs to decide
whether that replaces, combines with, or is ignored in favor of the original
failure.

Since async functions turn both throws and rejected awaits into promise
rejection, the transform needs one clear rule for both sync throws and async
cleanup rejections:

```ts-with-defer
async function f() {
  defer asyncCleanup();
  throw new Error("body");
}
```

If `asyncCleanup()` also rejects/throws, `f()` rejects with an `AggregateError`.

```ts
AggregateError([
    Error("body"),
    cleanupError,
]);
```

## So Let's Ship It?

Ironically, implementing `defer` convinced me it doesn't belong in TypeScript.

The more edge cases I implemented, the less convinced I became that `defer`
belongs in TypeScript. Go's `defer` feels way more natural because errors are values
rather than control flow. In TypeScript, once cleanup can throw or reject, you
need policies for aggregation, precedence, and async execution that simply don't
exist in Go (panics are handled through Go's separate panic and recover
semantics).

But hope is not lost. The
[ECMAScript Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management)
proposal tackles the same problem from a different direction.

Take the `async-sema` example from above, instead of `defer`:

```ts-with-defer
async function readFile(path: string) {
  await sema.acquire();
  defer sema.release();
  return await fs.readFile(path, "utf8");
}
```

We can use a
[Disposable](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#using-declarations-and-explicit-resource-management):

```ts-with-using
async function readFile(path: string) {
  using _ = await acquirePermit(sema);

  return await fsReadFile(path, "utf8");
}

// The above assumes a helper like this,
// which could be embedded in the library
async function acquirePermit(sema: Sema): Promise<Disposable> {
  await sema.acquire();

  return {
    [Symbol.dispose]() {
      sema.release();
    },
  };
}
```

I would prefer not to have to define an unused variable like `_` but disposable
resources work by cleaning them up when they fall out of scope.

So my preferred but sadly unsupported syntax would be:

```ts-with-using
async function readFile(path: string) {
  using await acquirePermit(sema); // Not supported!

  return await fsReadFile(path, "utf8");
}
```

You can find the MVP implementation of `defer` on
[this branch of my TypeScript fork](https://github.com/healeycodes/typescript-go/tree/defer-v1).
