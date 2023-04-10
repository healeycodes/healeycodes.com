---
title: "Adding For Loops to an Interpreter"
date: "2023-01-16"
tags: ["python"]
description: "Extending an existing tree-walk interpreter step by step."
---

I’m in the middle of a programming retreat at the [Recurse Center](https://www.recurse.com/) (W2’23), and one of the projects I’ve been working on is an interpreter for a language I designed called [nodots](https://github.com/healeycodes/nodots-lang).

It’s called *nodots* because I had some trouble in a [previous language](https://github.com/healeycodes/adventlang) when it came to mutating via dot access. So I decided: no dots this time (okay, fine, you can use dots for floats).

It’s a dynamic language with strong types. It’s got variables, functions, logic, and a few more things — but no for loops (yet).

```text
# recursive fibonacci!
fun fib(x)
  if (x == 0 or x == 1)
    return x;
  fi
  return fib(x - 1) + fib(x - 2);
nuf
log(fib(10));
```

## Brief Evaluation Tour

*nodots* is a tree-walk interpreter implemented in Python. It uses the [Lark](https://github.com/lark-parser/lark) parsing toolkit to build a [Tree](https://lark-parser.readthedocs.io/en/latest/classes.html#tree) of nodes from some source code. The interpreter then starts at the root of the tree and recursively visits the child nodes, processing each node according to its type and the context of the parent node.

Given a program like `log(1 + 2);`, the parser uses the language’s [grammar](https://github.com/healeycodes/nodots-lang/blob/main/grammar.py) to construct a tree that looks a bit like below (I’ve trimmed some node levels for brevity).

```text
program
 declaration
  statement
   call
    identifier  log
    arguments
     term
      call
       number   1
      call
       number   2
```

Program state is stored in a context object, sometimes called a value table. The one-line program above doesn’t insert any variables but it does look up `log` to find a standard library function.

A child context is created when the scope deepens, like inside a *nodots* function. A reference to the root context object, or some child or grand-child context, is passed around during the evaluation step of the interpreter. When evaluating an identifier, the most local scope is checked first, and then the next scope up is checked, over and over, until the root scope when an error is thrown. Similar to JavaScript’s scoping rules.

Our one-line program’s tree requires a high number of function calls, and a high amount of memory allocation, relative to the computation required (this is why tree-walk interpreters are slower than [the alternatives](https://en.wikipedia.org/wiki/Interpreter_(computing\)#Variations)). Here’s a trimmed list of function calls made by the interpreter, in order: 

```python
# root node and root context
eval_program(node, context)
eval_declaration(node, context)
eval_statement(node, context)

# look up `log` and find a function
eval_identifier(node, context)

# call the function with
eval_call(node, context)

# arguments that must be evaluated
eval_arguments(node, context)

# there's a single argument,
# an addition sub-tree
eval_term(node, context)

# evaluate the left term
eval_call(node, context)

# evaluate the right term
eval_call(node, context)

# `3` is sent to standard out
```

## For Loop Syntax

In the C tradition of programming languages, a for loop has three parts; initial, limit, and increment. This is what the syntax will look like in *nodots.*

```text
for (i = 0; i < 5; i = i + 1)
  log(i);
rof
```

So here, the initial is `i = 0;` which creates a variable inside the for loop’s scope, the limit is `i < 5` which is checked before each iteration, and the increment is `i = i + 1`.

If we try to execute this example code, we get a parsing error like:

```text
Unexpected token Token('SEMICOLON', ';') at line 3, column 11.
```

We need to alter the language’s grammar so the parser understands our new feature.

The for loop’s parts are expressions which the interpreter already supports. The body contains any number of declarations — like a variable assignment, an expression, or even another for loop.

We use existing grammar rules, and evaluation logic, as building blocks to reuse abstractions that are already covered by the language’s test suite.

```diff
- statement       : expression_stmt | return_stmt | if_stmt
+ statement       : expression_stmt | return_stmt | if_stmt | for_stmt
expression_stmt : expression? ";"
return_stmt     : "return" expression? ";"
if_stmt         : "if" "(" expression ")" declaration* "fi"
+ for_stmt        : "for" "(" expression_stmt expression_stmt expression ")" declaration* "rof"
```

When we execute the example code again, we no longer get a parsing error (yay) so the tree is constructed, and then evaluated and … we get a new error.

```text
File "/Users/andrew/Documents/GitHub/nodots-lang/interpreter.py", line 457, in eval_statement
    raise Exception("unreachable")
```

The interpreter doesn’t know how to evaluate a for statement. Let’s fix that.

```diff
def eval_statement(node: Tree, context: Context) -> ReturnValue | Value:
    for child in node.children:
        if child.data == "expression_stmt":
            return eval_expression_stmt(child, context)
        elif child.data == "return_stmt":
            return eval_return_stmt(child, context)
        elif child.data == "if_stmt":
            return eval_if_stmt(child, context)
+        elif child.data == "for_stmt":
+            return eval_for_stmt(child, context)
    raise Exception("unreachable")
```

And the new function, `eval_for_stmt`:

```python
def eval_for_stmt(node: Tree, context: Context):
    # we create a child context of the current scope
    # so the for loop body can alter existing
    # variables but doesn't "pollute" the outer
    # scope with new variables
    for_context = context.get_child_context()
    
    # Tree contains a list of children of type
    # List[Tree | Token], we can throw away
    # the "for", "(", ")", and "rof" tokens
    parts: List[Tree] = []
    for child in node.children:
        if isinstance(child, Tree):
            parts.append(child)

    # grab the for loop's parts
    initial_expr_stmt, limit_expr_stmt, increment_expr = parts[:3]

    # we start by evaluating the intial part
    # which is `i = 0` in our example code 
    eval_expression_stmt(initial_expr_stmt, for_context)

    while True:

		# evaluate the limit (`i < 5`)
        limit_check = eval_expression_stmt(limit_expr_stmt, for_context)

        # throw a language error if the type isn't BoolValue
        limit_check.check_type(
            limit_expr_stmt.meta.line,
            limit_expr_stmt.meta.column,
            "BoolValue",
            "expected boolean",
        )

        # stop looping if the limit evaluates to false
        if not limit_check.value:
            break

        # the for loop body contains an any number of
        # declaration nodes which we evaluate in order
        for decl_expr in parts[3:]:

            # `log(i);`
            eval_declaration(decl_expr, for_context)

        # `i = i + 1`
        eval_expression(increment_expr, for_context)
    return NilValue(None)
```

Now, when we execute our example code, the program runs and logs out the value of `i` five times. Success!

## Language Tests

When I write small languages, I like to add tests as soon as possible because iterating on syntax and evaluation logic can have spider-y effects. You never know what you’re going to break.

For *nodots*, the test suite is `./run_tests.sh` which checks type hints with Mypy, executes the test programs, and checks the final declaration’s result value. For example, we can perform a bunch of math calls that gives us some unique answer and then assert that the answer is correct. I find these black box tests better than unit tests because the internals of languages change very frequently during their early days!

See [this design note](https://craftinginterpreters.com/chunks-of-bytecode.html#design-note) in Crafting Interpreters for an overview for why and how you should test your language.

The most obvious test case for the feature we just added is: does the for loop run the correct number of times, and maybe another test case is: are we bleeding out a declaration into the outer scope? This second issue could cause hard to debug bugs for users (aka me).

```python
# for loop iteration
# and access to outer scope
assert_or_log(
    interpret("""
sum = 0;
for (i = 0; i < 5; i = i + 1)
  sum = sum + i;
rof
sum;
""").value, 10) # 0 + 1 + 2 + 3 + 4
```

The don’t-bleed-into-the-outer-scope test uses the same setup but we stringify the result because it’s a language error instead of a language value.

```python
# new variables should be isolated
assert_or_log(
    str(interpret("for (i = 0; i < 5; i = i + 1) rof i;")),
    "1:35 [error] unknown variable 'i'",
)
```

## Adding Break and Continue Statements

The keywords `break` and `continue` are part of the minimum feature set one expects from a for loop.

Here’s some new example code that breaks out of the for loop, and as a result, never mutates the variable more than once.

```text
a = 0;
for (i = 0; i < 5; i = i + 1)
  a = a + 1;
  break;
rof
a; # should be `1`
```

If we run this example before making any changes, *nodots* tries to look up `break` as if it’s a variable, and we get the following error:

```text
5:3 [error] unknown variable 'break'
```

Like before, we start with a grammar change because we’re adding new statements.

```diff
- statement       : expression_stmt | return_stmt | if_stmt | for_stmt
+ statement       : expression_stmt | return_stmt | if_stmt | for_stmt | break_stmt | continue_stmt
expression_stmt : expression? ";"
return_stmt     : "return" expression? ";"
if_stmt         : "if" "(" expression ")" declaration* "fi"
for_stmt        : "for" "(" expression_stmt expression_stmt expression ")" declaration* "rof"
+ break_stmt      : "break" ";"
+ continue_stmt   : "continue" ";"
```

Now, when we run our example we get a new error, similar to before. We’ve added a new statement but our interpreter doesn’t know how to evaluate it yet.

```text
File "/Users/andrew/Documents/GitHub/nodots-lang/interpreter.py", line 473, in eval_statement
    raise Exception("unreachable")
```

A break statement and a continue statement behave similar to return statements. When we hit them, we want to stop executing the current section, and “trampoline” up the call stack to some place where they can be handled.

As our interpreter is implemented in a high level language like Python, we have such a tool available to us. We can raise, and catch, exceptions.

```python
class BreakEscape(Exception):
    pass

class ContinueEscape(Exception):
    pass
```

We’ll raise these after hitting a break or continue statement. Inside `eval_statement` we add:

```diff
elif child.data == "for_stmt":
  return eval_for_stmt(child, context)
+ elif child.data == "break_stmt":
+     raise BreakEscape()
+ elif child.data == "continue_stmt":
+     raise ContinueEscape()
```

These exceptions should be caught while we’re executing the body of a for loop, so inside `eval_for_stmt` we alter the section we added earlier.

```diff
for decl_expr in parts[3:]:
+    try:
+        eval_declaration(decl_expr, for_context)
+     except BreakEscape:
+        return NilValue(None)
+     except ContinueEscape:
+        break
```

Finally, we can confirm our change with two test cases.

```python
# break stops a for loop
assert_or_log(
    interpret("""
a = 0;
for (i = 0; i < 5; i = i + 1)
  a = a + 1;
  break;
rof
a;
""").value, 1) # `1` because `a = a + 1;` runs once

# continue skips to the next iteration
assert_or_log(
    interpret("""
a = 0;
for (i = 0; i < 5; i = i + 1)
  continue;
  a = 1;
rof
a;
""").value, 0) # `=` because `a = 1;` never happens
```

## Links

This blog post covers two commits to [nodots](https://github.com/healeycodes/nodots-lang):

- Add basic for loop support ([50faa7f](https://github.com/healeycodes/nodots-lang/commit/50faa7fd40d7d36d4ff60ad1c2428708667c452e))
- Add continue and break statements ([513a2e7](https://github.com/healeycodes/nodots-lang/commit/513a2e71d667ad88a3675f22f7e0cf3ed3145590))

The latter commit also has logic to handle a case that we didn’t cover. When `break;` or `continue;` appears outside of a for loop body, the user should hit a helpful error.

Most of what I know about interpreters, I learned from [Crafting Interpreters](https://craftinginterpreters.com/), the [Ink blog](https://dotink.co), the [Oak blog](https://oaklang.org/posts/), or another book called Language Implementation Patterns. I recommend the first resource, Crafting Interpreters, as it assumes less prior knowledge and has wonderful illustrations!

<small>Thanks to [Samuel Eisenhandler](https://samgeo.codes) for providing feedback on an early draft.</small>
