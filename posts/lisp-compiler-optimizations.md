---
title: "Lisp Compiler Optimizations"
date: "2024-05-30"
tags: ["rust"]
description: "Smaller programs that do less work."
---

I recently added some optimizations to [my compiler](https://healeycodes.com/lisp-to-javascript-compiler) that turns Lisp into JavaScript.

The features I added are constant folding and propagation, and dead-code elimination, which work together to produce smaller programs that do less work.

I chose these features by reading the wiki page for [optimizing compiler](https://en.wikipedia.org/wiki/Optimizing_compiler) and picking a few that I thought I could implement in a night or two. Excluding tests, this required adding [~200 lines of additional Rust code](https://github.com/healeycodes/lisp-to-js) to my compiler.

[Constant propagation](https://en.wikipedia.org/wiki/Constant_folding) involves removing variable bindings that have a known result at compile-time, and replacing the variable references with literal values:

```lisp
; before
(let ((a 1)) a)

; after
(let () 1)
```

Inside the _let_ expression body, the variable `a` has been replaced with the literal value `1`.

[Constant folding](https://en.wikipedia.org/wiki/Constant_folding) simplifies expressions that have a known result at compile-time. Below, a group of arithmetic expressions is replaced by a literal value:

```lisp
; before
(let ((b 2) (c 3))
  (print
    (+
      (+ b 4 c)
      (- b c 7)
  )))
 
; after
(let () (print 1))
```

This simplification wouldn't be possible without performing constant propagation first (`b` and `c` need to be resolved). It's common for different types of compiler optimizations to stack and complement each other like this.

Dead code elimination involves removing code that has no effect on the program's output. For example, when an if-expression's check is known at compile-time, the unused branch (and the check) can be removed entirely:

```lisp
; before
(lambda ()
  (if (< 1 2) 5 6)
)

; after
(lambda ()
  5
)
```

Why do all this? Well, simpler expressions require less run-time operations which makes optimized code run faster. When dead code is removed, the size of the generated JavaScript is smaller. For browsers, this means the script can start executing sooner (due to a smaller download). For servers, this allows a faster start up time because less code needs to be parsed and executed.

## Transforming Code

These optimizations are applied after parsing but before code generation. When adding each optimization, I didn't have to alter the existing code generation logic because optimization is a step that transforms an abstract syntax tree (AST) into a new AST.

The example optimizations in the previous section showed the Lisp source code being altered, rather than the generated JavaScript, because that's how it seems from the compiler's point of view — it's like a more efficient program was passed to the code generation step.

In the compiler:

```rust
// before
let expressions = parse(input); // Lisp code -> AST
println!("{}", compile(expressions)); // AST -> JavaScript

// after
let expressions = parse(input);
let optimized = optimize(expressions); // AST -> AST
println!("{}", compile(optimized));
```

Let's dig into the `optimize` function here. Since optimizations can stack (think of a deeply nested arithmetic expression having multiple “fold events” as it shrinks down a single value), we need to start applying optimizations at the bottom of the AST and then work our way back up.

Take for example, the program `(+ (+ 1 2) (- 3 4))`. The inner expressions must be optimized before the outer expression can be optimized. The two inner expressions are the two bottom nodes of the AST.

The `optimize` function performs a post-order traversal of the AST (similar to a depth-first search) as each expression is folded into a literal value. 

![The AST for (+ (+ 1 2) (- 3 4)) being folded into 2](folding.png)

## For Each Expression

A Lisp program is a list of expressions. The optimization step of my compiler iterates over each expression (and its sub-expressions) and optimizes from the bottom up.

```rust
// Given an AST, attempt to create a more optimized AST
fn optimize(program: Vec<Expression>) -> Vec<Expression> {
    return program
        .into_iter()
        .map(|expr| optimize_expression(expr, &mut HashMap::new()))
        .collect();
}
```

Similar to the `compile` function, described in [my previous post](https://healeycodes.com/lisp-to-javascript-compiler), the `optimize_expression` function here is a long match statement, that recursively calls itself until it reaches the bottom of the AST. The calls then unroll upwards, allowing the root expression to take advantage of already-optimized expressions.

One of the more simple branches of this long match statement is the optimization of if-expressions:

```rust
fn optimize_expression(
    expression: Expression,
    context: &mut HashMap<String, Option<Expression>>,
) -> Expression {
    match expression {
                
        // The best case with if-expressions is to be able to
        // remove the check (and unused branch) entirely, and to place
        // the winning branch into the if-expression's position in the AST
        Expression::IfExpression(if_expr) => {
        
            // Ensure the check expression is optimized
            let check_expr = optimize_expression(if_expr.check, context);
            match check_expr {
                Expression::Atom(ref atom) => match atom {
                
                    // We can only remove dead code when the check can be
                    // folded into a boolean value at compile-time
                    Atom::Boolean(b) => {
                        if *b {
                            return optimize_expression(if_expr.r#true, context);
                        } else {
                            return optimize_expression(if_expr.r#false, context);
                        }
                    }
                    _ => {}
                },
                _ => {}
            }
            
            // The check expression couldn't be folded into a boolean
            // but the parts of the if-expression may be able to be
            // folded into a smaller expressions internally
            return Expression::IfExpression(Box::new(IfExpression {
                check: optimize_expression(check_expr, context),
                r#true: optimize_expression(if_expr.r#true, context),
                r#false: optimize_expression(if_expr.r#false, context),
            }));
        }
        
        // .. other branches
```

Before we look at how the arithmetic expressions are optimized, I'll explain how the *context* argument of `optimize_expression` works. _Let_ expressions can optionally bind variables. These variables can be bound to literals as well as expression results. For example, we can define `a` to be `(+ 1 2)` and then double it and print it.

```lisp
(let ((a (+ 1 2)))
  (print (+ a a)) ; can be optimized to `(print 6)`
)
```

When we're in the middle of optimizing the sum expression, we need to know what `a` is — but when we parse the AST, it will just be the atom `a` which isn't very useful.

The solution for this problem is to store a context object that stores the variable binding after the binding expression has been optimized. In the above example, the context object contains `{a: 3}` during the optimization of the _let_ expression's body.

Let's look at how this happens inside the `optimize_expression` match arm for _let_ expressions.

```rust
// Note: bindings can be reduced to an empty list
// if they all optimize into literals, for example:
// `(let ((a 1)) a)` -> `(let () 1)`
Expression::LetExpression(let_expr) => {
    let mut optimized_bindings: Vec<Binding> = vec![];
    let_expr.bindings.into_iter().for_each(|binding| {
        let binding_expr = optimize_expression(binding.expression, context);

        // When the expression we're about to bind is an atom,
        // we can get rid of the binding and replace instances
        // of this variable with the literal value
        match binding_expr {
            Expression::Atom(ref atom) => match atom {
                                
                // Insert literals, overwriting variables from any higher scopes.
                // Return before pushing the binding so it's removed from the AST
                Atom::Number(n) => {
                    context
                        .insert(
                            binding.symbol,
                            Some(Expression::Atom(Atom::Number(*n)))
                        );
                    return;
                }
                Atom::Boolean(b) => {
                    context
                        .insert(
                            binding.symbol,
                            Some(Expression::Atom(Atom::Boolean(*b)))
                        );
                    return;
                }

                // No need to overwrite symbols that refer to already-tracked
                // and potentially already-optimized values
                Atom::Symbol(s) => match context.get(s) {
                    Some(_) => return,
                    None => {}
                },
                _ => {}
            },
            _ => {}
        }
        
        // This binding can't be removed but may have been optimized internally
        optimized_bindings.push(Binding {
            symbol: binding.symbol,
            expression: binding_expr,
        })
    });

    return Expression::LetExpression(LetExpression {
        bindings: optimized_bindings,
        
        // The let body will be optimized in this sub-call
        expressions: let_expr
            .expressions
            .into_iter()
            .map(|expr| optimize_expression(expr, context))
            .collect(),
    });
}
```

Sum expressions can be folded when all the items are either number literals (or can be folded into number literals). Difference expressions can also be folded if the same invariants hold. Even when these two types of expressions can't be shrunk into atoms, they can still be partially folded. For instance, `(+ 1 a 1)` is the same as `(+ a 2)` or `(+ 2 a)`.

```rust
// `nums` is a Vec<f64> that's built by optimizing sub-expressions
// and collecting any number literals

Op::Plus => {

    // Best case: no expressions after optimization, return atom!
    if optimized_exprs_without_numbers.len() == 0 {
        return Expression::Atom(Atom::Number(nums.iter().sum()));
    }

    // Sum any literals, may reduce add-operations produced at code generation
    optimized_exprs_without_numbers
        .push(Expression::Atom(Atom::Number(nums.iter().sum())));
    return Expression::ArithmeticExpression(Box::new(ArithmeticExpression {
        op: arth_expr.op,
        expressions: optimized_exprs_without_numbers,
    }));
}
```

Less-than and greater-than expressions only accept two arguments, so they can be folded into `true` or `false` values when both arguments are known at compile-time.

## Tests

For this project, I needed tests to ensure minor parser, optimization, or code generation tweaks didn't break something unknown. But the tests also needed to be very copy-and-pastable.

One thing I found productive was to assert on the debug string of the AST result:

```rust
#[test]
fn test_optimize_sub() {
    assert_eq!(
        format!("{:?}", optimize(program().parse(b"(- 1 2)").unwrap())),
        "[Atom(Number(-1.0))]"
    );
}
```

I'm putting off writing an end-to-end test suite where I compare the result of the code generated JavaScript to my handwritten JavaScript. I would write a Lisp program and then the matching JavaScript program, and the test would assert a matching stdout. Maybe I can use the [v8 crate](https://crates.io/crates/v8)? It's probably quicker to use Bash and Node.js.

If I add any more features to this compiler, I'll probably write a quick test framework first.
