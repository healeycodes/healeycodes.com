---
title: "Designing a Programming Language for Advent of Code"
date: "2021-11-28"
tags: ["go"]
description: "What is the minimum amount of features I need to not hate my life during this festive season?"
---

In the second half of November, I designed and implemented a programming language for [Advent of Code](https://adventofcode.com/) (AoC). I'll be using it to solve AoC's daily puzzles and adding to the standard library as I go. Will this language make it easier for you to solve the puzzles? No, certainly not. Here be dragons, etc. But it will increase my level of fun as I tap into the joyous energy that comes with forced-creativity-through-restriction.

While building [Adventlang](https://github.com/healeycodes/adventlang), the question I asked myself early on was:

> What is the minimum amount of features I need to not hate my life during this festive season?

I need logic, math, and functions, and a few simple data structures like lists and dictionaries. In the runtime, I need to be able to read in a puzzle file and write to standard output.

Let's look at the solution to AoC 2019 day one, [part two](https://adventofcode.com/2019/day/1). This is one of Adventlang's integration tests (for more examples of language features, check out the [test files](https://github.com/healeycodes/adventlang/tree/main/tests)).

```js
let puzzle = [];
// `read_lines` streams a file line-by-line and passes
// each line to a callback so that arbitrary length 
// files can be read. It's synchronous.
read_lines("tests/advent_2019_1.txt", func(s) {
    puzzle.append(num(s));
});

let max = func (x, y) {
    if (x > y) {
        return x
    }
    return y
};

let part_two_fuel = 0;
for (let i = 0; i < len(puzzle); i = i + 1) {
    let mass = puzzle[i];
    let fuel = floor(mass / 3) - 2;
    part_two_fuel = part_two_fuel + fuel;
    while (fuel > 0) {
        fuel = max(0, floor(fuel / 3) - 2);
        part_two_fuel = part_two_fuel + fuel;
    }
}
log(part_two_fuel);
```

However, this is a day one puzzle. The real challenge will be the mid-to-late month puzzles. Perhaps I’ll need to add a basic RegEx parser to the standard library!

## Language Design

In many ways, Adventlang is the successor to [Golfcart](https://github.com/healeycodes/golfcart) (one of my previous language experiments). They are both tree-walk interpreters for strongly-typed but highly dynamic languages and their interpreters are written in Go.

Bob Nystrom reminds us how tree-walk interpreters work in [Crafting Interpreters](https://craftinginterpreters.com/a-map-of-the-territory.html#tree-walk-interpreters):

> Some programming languages begin executing code right after parsing it to an AST (with maybe a bit of static analysis applied). To run the program, the interpreter traverses the syntax tree one branch and leaf at a time, evaluating each node as it goes.

> This implementation style is common for student projects and little languages, but is not widely used for general-purpose languages since it tends to be slow.

An Adventlang program is a series of statements and expressions. An expression is a statement that results in a value and can sit on the right-side of an assignment. A statement “does something” and its result cannot be captured.

```js
// An if statement
if (true) {}

// An assignment expression declaring and setting a variable
// to an Immediately Invoked Function Expression (IIFE)
let result = (func(x) { return x + 1 })(4);

// Implemention of a Set using a closure over a dictionary
// `let my_set = set();` or `let items = set([1, 2])`
let set = func(list) {
    let store = {};
    if (type(list) == "list") {
        for (let i = 0; i < 3; i = i + 1) {
            let key = list[i];
            store[key] = true;
        }
    }
    return {
        "add": func(x) { store[x] = true; },
        "has": func(x) { return store[x] == true }
    }
};

// An example of a computed key
let key = "a";
let f = {key: 2};

// A runtime assert call, used in test programs
assert(f.a, 2);
```

After running an Adventlang program through a parser grammar, we get an abstract syntax tree (AST) which can be tree-walked by `pkg/adventlang/eval.go`.

The interpreter’s core building block is a `Value`. As a program is evaluated, literals are turned into language values that implement the following interface:

```go
// pkg/adventlang/eval.go

type Value interface {
	String() string
	Equals(Value) (bool, error)
}
```

A raw string becomes a `StringValue` (an array of bytes), a list becomes a `ListValue` (an int-to-&Value map) and so on. These are passed around and type asserted to handle the flow of logic.

```go
// pkg/adventlang/eval.go (trimmed)

// An example type assertion of a `Value`
if stringValue, okString := value.(StringValue); okString {
	// Strings are stored as byte arrays
	// `string(stringValue.val)` gives us something printable.
} else {
  // Here we know that `value` is not a string
  // so perhaps we want to create a stack trace
}
```

To introduce a module system, I refactored Adventlang’s “run” function to return a program’s context.

```go
// pkg/adventlang/run.go

func RunProgram(filename string, source string) (string, *Context, error) {
	program, err := GenerateAST(source)
	if err != nil {
		return "", nil, fmt.Errorf("\n%v:%v", filename, err.Error())
	}

	context := Context{}
	context.Init(filename)
	InjectRuntime(&context)

	result, err := program.Eval(&context.stackFrame)
	if err != nil {
		return "", nil, err
	}

	return result.String(), &context, nil
}
```

By calling this function from within a running program, we can treat the final context as exported state. In the runtime, `import()` returns a dictionary of the top level variables. An example export in Adventlang:

```js
// If this file is imported as a module
// this variable is avaliable
let name = "Alice";

// e.g.
// `let my_mod = import("module.adv");`
// `log(my_mod.name)`
```

Once of the trickier tasks was enabling the mutation of list and dictionary indexes. I reached for a pattern I've used before with "reference values". These are wrappers around a pointer to a `Value`.

```go
// pkg/adventlang/eval.go

// Sometimes we want to bubble up a reference to a list or dict item
// so that it can be mutated. Use `unref()` to get interal value
type ReferenceValue struct {
	val *Value
}
```

With interpreters, it's best to write a little bit of generic code instead of lots of specific code. Along with reference values, there's another special case I needed to handle — identifiers (aka variables). An identifier wraps a string key, that when looked up in the current scope, resolves to a `Value` (if it doesn't, an unknown variable has been found). `unref` and `unwrap` give me the flexibility to keep references and identifiers wrapped up until the last second so that all my tree-walk functions can have a signature of `(Value, error)`.

```go
// pkg/adventlang/eval.go

// Get a reference's internal value
func unref(value Value) Value {
	if refValue, okRef := value.(ReferenceValue); okRef {
		return *refValue.val
	}
	return value
}

// Turn an identifier into its resolution
func unwrap(value Value, frame *StackFrame) (Value, error) {
	if idValue, okId := value.(IdentifierValue); okId {
		return frame.Get(idValue.val)
	}
	value = unref(value)
	return value, nil
}
```

## Stack Tracing

For the first time, I implemented stack traces to help users (aka me) identify errors.

A quick note on stack frames. When a variable is declared, it's done so in the current stack frame. New stack frames are created for if statements, at function creation (to enable closures), and in for/while loops.

```go
// pkg/adventlang/eval.go

type StackFrame struct {
	// "tests/functions.adv"
	filename string 
	// "for loop"
	trace    string 
	entries  map[string]Value
	// `nil` means we're at the root scope
	parent   *StackFrame
}
```

When we declare a variable, we do it in the current, aka the lowest, stack frame. When re-assigning a variable (i.e. without using `let`) we walk all the way to the top stack frame until we find a matching string key or we throw an error. We do the same thing when reporting an error, we walk through all the traces (with some local position information thrown in). Here's an example of a failing test:

```text
$ go run cmd/adventlang.go tests/__run_tests.adv 
uh oh.. while running: tests/__run_tests.adv 
tests/functions.adv:22:5: for loop
tests/functions.adv:23:16: '+' can only be used between [string, string], [number, number], not: [true, 1]
```

In VS Code's terminal, the first part of each trace is Ctrl clickable and takes you right to the line + column.

## A Note on Syntax

I tried not to think too hard about syntax and expression structure. I went with sensible defaults (this means going with the average syntax of all the languages I've used lately). I didn't stop to add syntax sugar like `++` or `+=`. With previous languages, I've been short-sighted and made design decisions that looked nice and attractive at first but ended up trapping me in a corner later on.

With Adventlang, if a design decision seemed boring and regular then I considered it to be the right call. I need this language to carry me through 25 days of puzzle-solving. I'm not seeking a transcendental experience at the keyboard. I just want to complete 25 puzzles for once.

I'll be adding my daily solutions (and adding standard library functions as I go) all through December. Follow along by watching [the repository](https://github.com/healeycodes/adventlang) (contributions welcome).
