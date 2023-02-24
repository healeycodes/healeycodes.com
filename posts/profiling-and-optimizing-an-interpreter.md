---
title: "Profiling and Optimizing an Interpreter"
date: "2023-01-19"
tags: ["python"]
description: "Rewriting library code to speed up my interpreter benchmark by 28%."
---

In my last post, I [added for loops to my interpreter](https://healeycodes.com/adding-for-loops-to-an-interpreter) for the [nodots](https://github.com/healeycodes/nodots-lang) programming language. Today, I'm profiling and optimizing the same interpreter.

Let's set some goals and requirements.

- The interpreter should execute a benchmark program X% faster
- My total time spent on research and coding should not exceed a few hours

I'm not sure what a good *X* value is here. Perhaps 25% faster? Something that feels like progress. The time limit on research/coding is because otherwise I could just spend days rewriting the interpreter (e.g. in a faster language than Python) to achieve the goal.

Almost immediately, we're bumping into the limitations of the tree-walk architecture of *nodots*.

- The interpreter needs to recursively walk through the entire parse tree. This is especially impactful for programs with large or complex parse trees.
- Because the interpreter needs to keep the entire parse tree in memory, it can use a lot of memory. Again, this is most true for large programs/complex parse trees.
- A lack of optimization paths. Advanced techniques that other types of interpreters have, such as JIT compilation or static superinstructions, just aren't available.

## Quick Note on Optimizing Software

To prioritize development efficiency, you should [Profile Before Optimizing](http://wiki.c2.com/?ProfileBeforeOptimizing):

> Write code according to constraints besides performance (clarity, flexibility, brevity). Then, after the code is actually written:
> 
> 1. See if you actually need to speed it up.
> 2. Profile the code to see where it's actually spending its time.
> 3. Focus on the few high-payoff areas and leave the rest alone.

Profiling before optimizing code allows you to identify which specific parts of your code are causing performance bottlenecks, so you know where to focus any optimization efforts. Without profiling, you may spend a lot of time and effort optimizing parts of your code that are not actually causing performance issues. Additionally, profiling can also help you identify potential bugs or other issues in your code that may be contributing to poor performance.

With interpreters, I'm most interested in optimizing things that happen over and over. I'm interested in performance wins that scale with the amount of computation a user is doing.

## The Benchmark Program

To measure the current performance, and any improvements, we'll be using a naive recursive fibonacci function that runs in a loop. The parse tree it creates has 193 nodes and it also generates a ton of stack frames. It takes 803ms to run on an M1 Pro. The same program written in JavaScript takes 3ms to run in Chrome.

I measured execution time by running `time python3 benchmark.py` three times and taking the best result. I used wall clock time ([more on the time command](https://stackoverflow.com/a/556411)), and Python 3.10.9.

```python
# benchmark.py

from interpreter import interpret

program = """
for (i = 0; i < 20; i = i + 1)
  # gets called 35400 times
  fun fib(x)
    if (x == 0 or x == 1)
        return x;
    fi
    return fib(x - 1) + fib(x - 2);
  nuf
  fib(i);
rof
"""

interpret(program, opts={"debug": False})
```

[cProfile](https://docs.python.org/3/library/profile.html#module-cProfile) is a built-in Python module that measures the performance of Python code. It profiles the performance of a script by measuring the time it takes for different parts of the code to execute, as well as the number of calls made to each function. This information can then be used to identify bottlenecks in the code. We'll be using it to find the most time-consuming part of the interpreter as it executes the benchmark program.

Let's run cProfile as a script to profile the benchmark program.

```bash
python3 -m cProfile -s tottime benchmark.py
```

We're sorting by `tottime` — the total time spent in the given function (excluding time made in calls to sub-functions). Here's the trimmed output:

```text
9933786 function calls (7853037 primitive calls) in 1.714 seconds

   Ordered by: internal time

   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
265573/103    0.209    0.000    1.587    0.015 interpreter.py:154(eval_call)
  1389926    0.207    0.000    0.258    0.000 lexer.py:253(__eq__)
212483/83    0.121    0.000    1.587    0.019 interpreter.py:263(eval_term)
106262/62    0.072    0.000    1.587    0.026 interpreter.py:355(eval_logic_or)
141662/62    0.063    0.000    1.587    0.026 interpreter.py:317(eval_equality)
   817477    0.063    0.000    0.063    0.000 tree.py:58(meta)
265573/103    0.062    0.000    1.587    0.015 interpreter.py:205(eval_unary)
265573/103    0.060    0.000    1.587    0.015 interpreter.py:231(eval_factor)
   159351    0.060    0.000    0.111    0.000 interpreter.py:132(eval_identifier)
```

Note: with profiling overhead, the benchmark script takes more than twice as long.

The list of `eval_*` calls are expected. `eval_call` handles *nodots* function calls and `eval_term` handles addition and subtraction. The benchmark program does both these things in abundance. But two lines here stand out: `lexer.py:253(__eq__)` and `tree.py:58(meta)`. These function calls are from library code (*nodots* uses the [Lark](https://github.com/lark-parser/lark) parsing toolkit).

*nodots* recurses on the parse tree that Lark creates. However, as we'll soon discover, these Tree/Token objects that Lark creates are generic and flexible (so that the library is useful and widely applicable) but aren't perfectly tuned for performance.

In Python, [\_\_eq\_\_](https://docs.python.org/3/reference/datamodel.html#object.__eq__) is a “rich comparison” method. It's called when two objects are compared with `==`. If we look at [lexer.py:253(\_\_eq\_\_)](https://github.com/lark-parser/lark/blob/f3d79040e2ff59e11661e7b43f593f1334951205/lark/lexer.py#L253), we can see the Lark code that's being called **over one million times** during our benchmark:

```python
# lexer.py:253(__eq__) f3d79040
# a method on the Token class
def __eq__(self, other):
        if isinstance(other, Token) and self.type != other.type:
            return False

        return str.__eq__(self, other)
```

In our interpreter, Tokens are compared to strings to pick the correct evaluation branch e.g. when handling an operator like `>=`. The above code seems like it's doing more work than is necessary. In theory, it can be reduced down to a single compare operation between two things that *already exist* in memory.

[tree.py:58(meta)](https://github.com/lark-parser/lark/blob/f3d79040e2ff59e11661e7b43f593f1334951205/lark/tree.py#L58) isn't as bad but perhaps accessing metadata would be overall quicker if the  metadata object was smaller in memory, like maybe a named tuple? That's just a guess though.

```python
    # tree.py(meta) f3d79040
    # a property on the Tree class
    @property
    def meta(self) -> Meta:
        if self._meta is None:
            self._meta = Meta()
        return self._meta
```

My gut says to write my own Tree/Token classes and to make them simple and straightforwards. Since I don't need to support everything a library needs to support, they should run quicker by doing less work.

## Building a New Tree

The benchmark program spends ~16% of its time in the two methods above. Since we're identified that more work is being performed than our use case requires, we can build our own versions of these classes. We'll build a new tree by consuming the parse tree ahead of any evaluation. We only need to iterate the old parse tree once in order to create the new parse tree so the run time we add will be very small compared to the performance improvements.

One hard-to-measure benefit of the new tree is that it will have less data in it, so the frequently accessed nodes have a higher chance of sticking around in the CPU cache.

The interpreter uses Lark's `Tree` and `Token` classes in `interpreter.py` so we first change their import names to make the existing type hints happy.

```diff
- from lark import Lark, Tree, Token
+ from lark import Lark, Tree as LarkTree, Token as LarkToken
```

Next, we create some small classes to represent the things we're replacing from the Lark library. `Tree`, `Token`, and `Meta`.

```python
Meta = typing.NamedTuple("Meta", [("line", int), ("column", int)])

class Tree:
    kind = "tree"

    def __init__(self, data: str, meta: Meta, children: List[Tree | Token]):
        self.data = data
        self.meta = meta
        self.children = children

class Token:
    kind = "token"
    data = "token"
    children: List[Any] = []

    def __init__(self, value: str, meta: Meta):
        self.value = value
        self.meta = meta

    # one expression rather than Lark's three expressions!
    def __eq__(self, other):
        return self.value == other
```

Now, we need to write a function that will recurse over Lark's parse tree and use these new classes to build a new tree that will use the faster methods.

```diff
+ def build_nodots_tree(children: List[LarkTree | LarkToken]) -> List[Tree | Token]:
+     return [
+         Tree(
+             data=str(child.data),
+             meta=Meta(child.meta.line, child.meta.column),
+             children=build_nodots_tree(child.children),
+         )
+         if isinstance(child, LarkTree)
+         else Token(value=child.value, meta=Meta(child.line, child.column))  # type: ignore
+         for child in children
+     ]


# ...

def interpret(source: str, opts={"debug": True}):
    root_context = Context(None, opts=opts)
    inject_standard_library(root_context)
    try:
-         root = parser.parse(source)
+         root = build_nodots_tree([parser.parse(source)])[0]
        result = eval_program(root, context=root_context)
        return result
    except LanguageError as e:
        return e
```

When we profile the benchmark program again, we no longer see Lark's slow functions near the top! Our handwritten `__eq__` call is ~700% faster!

```text
6518309 function calls (4437162 primitive calls) in 1.182 seconds

   Ordered by: internal time

   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
265573/103    0.153    0.000    1.052    0.010 interpreter.py:205(eval_call)
212483/83    0.099    0.000    1.053    0.013 interpreter.py:314(eval_term)
141662/62    0.060    0.000    1.053    0.017 interpreter.py:368(eval_equality)
265573/103    0.058    0.000    1.052    0.010 interpreter.py:256(eval_unary)
265573/103    0.058    0.000    1.052    0.010 interpreter.py:282(eval_factor)
106262/62    0.057    0.000    1.053    0.017 interpreter.py:406(eval_logic_or)
2018725/2017623    0.052    0.000    0.052    0.000 {built-in method builtins.len}
212462/62    0.049    0.000    1.053    0.017 interpreter.py:339(eval_comparison)
   159351    0.038    0.000    0.062    0.000 interpreter.py:183(eval_identifier)
```

The run time of the benchmark program has been reduced to 582ms, a speed-up of 28%!

## Micro Optimizations

I've ran out of time to make any more large improvements but here are some micro optimizations just for fun. They aren't worth the added code complexity so I won't commit them.

In Python, the `__slots__` attribute tells the interpreter to use a more memory-efficient storage strategy for an object's instance variables. Instead of each instance having a dictionary to store its attributes, instances created from a class with `__slots__` defined will use a fixed-size array.

This can sometimes lead to improved performance, especially for classes with many instances. The drawback is that you can't have additional attributes added dynamically.

If we add `__slots__` to `Tree` and `Token` we get an additional ~1% speed-up.

```diff
class Tree:
+    __slots__ = ['data', 'meta', 'children']


# ..

class Token:
+    __slots__ = ['value', 'meta']


# ..
```

Another thing we can do is cache the objects we're using. In *nodots* everything is compared by value so any two numbers, strings, or booleans are equal if their values are equal.

Small Integer caching is a technique used in Python to optimize memory usage by reusing commonly used small integers (-5 to 256). Instead of creating a new object for each small integer, Python reuses the same object. This helps to reduce the amount of memory used and improves performance.

If we steal this idea for *nodots* and pre-generate the integers 0 to 1024, and also `true` and `false`, we get an additional ~1% speed-up.

```python
# initialize these once at the start of the interpreter
initial_numbers = [NumberValue(i) for i in range(0, 1024)]
initial_boolvalue_true = BoolValue(True)
initial_boolvalue_false = BoolValue(False)

# everywhere we create a new BoolValue use the initial ones
# instead of:
return BoolValue(left.value and right.value)
# do:
return initial_boolvalue_true if left.value and right.value else initial_boolvalue_false

# for numbers, there's a bit more code involved
# return the intial value if we have it, or create one
num = float(first_child_num.value)
if num.is_integer() and num <= 1024:
    return initial_numbers[int(num)]
return NumberValue(num)
```

I kinda thought these general optimiziations would pay off more than they did as the benchmark program creates a ton of class instances. However, this goes to show that optimizing something that you haven't profiled to be slow doesn't pay off!

## Unexplored Ideas

One idea I half coded but gave up on due to bugs is to compress the parse tree. Some sub-trees can't be compressed ahead of time because they require evaluation, like an addition call. But some sections of the parse tree where every node only has a single child could, in theory, be compressed.

Some resources I haven't checked yet [suggest using precedence for building flatter parse tree structures](https://tree-sitter.github.io/tree-sitter/creating-parsers#structuring-rules-well). Additionally, [Lark provides a notion of parse rule priorities](https://lark-parser.readthedocs.io/en/latest/grammar.html#id1). I was told that deep (hard to alter) tree structures are a common problem for generic parsing frameworks.

```text
# the following uncompressed tree:

program
  declaration
    statement
      expression_stmt
        expression
          assignment
            identifier  a
            =
            assignment
              logic_or
                logic_and
                  equality
                    comparison
                      term
                        factor
                          unary
                            call
                              number    1
                        +
                        factor
                          unary
                            call
                              number    1
        ;

# could be compressed to:

program
  assignment
    identifier  a
    =
    assignment
      term
        factor
         number    1
        +
        factor
          number    1
```

This would require a refactor to have a generic `eval_node` function with branches for every type of node — rather than specific functions like `eval_assignment`. This would improve performance by removing unnecessary function calls, `len` calls, property accesses, and more things like this. Basically: less lines of code would need to run. The performance gains would scale with the complexity of the tree/how often the same sub-tree is iterated more than once.

I was going to write about how to explore traces with [Snakeviz](https://jiffyclub.github.io/snakeviz/) but sorting the cProfile result by the internal time column was revealing enough.

The TL;DR for using Snakeviz: run `pip3 install snakeviz`, export your cProfile to a profile file by adding `-o filename.prof`, and run `snakeviz filename.prof` to open a browser UI.

<small>Thanks to [Samuel Eisenhandler](https://samgeo.codes) for providing feedback on an early draft.</small>
