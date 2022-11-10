---
title: "Creating the Golfcart Programming Language"
date: "2021-07-16"
tags: ["go"]
description: "Writing an interpreter from scratch."
---

[Golfcart](https://github.com/healeycodes/golfcart) is a minimal programming language inspired by Ink, JavaScript, and Python – implemented in Go. It's a toy programming language that I built to use for Advent of Code 2021.

```javascript
// Here's the classic interview question FizzBuzz
for i = 1; i < 101; i = i + 1 {
    log(if i % 3 == 0 and i % 5 == 0 {
        "FizzBuzz"
    } else if i % 3 == 0 {
        "Fizz"
    } else if i % 5 == 0 {
        "Buzz"
    } else {
        str(i)
    })
}
```

Another motivation was to learn how to write an interpreter from scratch.

During this project, I read [Crafting Interpreters](https://craftinginterpreters.com/) and [implemented the Lox programming language](https://github.com/healeycodes/hoot-language) using Python, and [partially ported Ink](https://github.com/healeycodes/quill) using Rust. Another introduction to interpreters I enjoyed was [A Frontend Programmer's Guide to Languages](https://thatjdanisso.cool/programming-languages). The [Ink blog](https://dotink.co/posts/) is also great.

(These resources electrified me. For the past few months all I've been thinking about is programming languages.)

For Golfcart, I began with a desire to design a small programming language that didn't use semi-colons or automatic semicolon insertion. So, no statements, and everything should be an expression that evaluates to a value. For example:
- `if/else if/else` evaluates to the successful branch
- A variable declaration evaluates to the value
- Setting a dict value evaluates to the value
- A for loop evaluates to the number of times the condition expression succeeded

```javascript
assert(
    // This runs five times
    for i = 0; i < 5; i = i + 1 {}, 5
)
```

However, I didn't realise how restrictive this design goal was. A problem I ran into early was accessing an item from a literal.

```javascript
[1][0] // This evaluates to [0] because Golfcart thinks it's two lists

// Instead, you do:
a = [1]
a[0]
```

While it's too late to add semi-colon separated statements to Golfcart, I have a new found appreciation for `;`.

## In the Beginning

I started small, with numbers and math operators (think `1 + 1 * 2`). Whenever I implemented a new type or a piece of syntax, I added a specification program with an assertion. When I came across a bug, I sometimes wrote an error program to purposefully throw an error. This project's tests `go test ./...` ensure that the specification programs and example programs run without any errors (an `assert()` call throws an error and quits) and that the error programs all throw errors.

Perhaps I was too focused on correctness on a micro-level.

The main problem with Golfcart is that there are slight differences between how Golfcart programs run in my head vs. in the interpreter. This is because I jumped to implementing the language and didn't spend enough time designing. Linus Lee (creator of Ink) has some interesting notes on designing small interpreters in [Build your own programming language](https://thesephist.com/posts/pl/#impl).

> In this phase, I usually keep a text document where I experiment with syntax by writing small programs in the new as-yet-nonexistent language. I write notes and questions for myself in comments in the code, and try to implement small algorithms and data structures like recursive mathematical functions, sorting algorithms, and small web servers.

If I had more predefined programs to start with (to run as tests), I would have noticed the divergence of how programs are actually evaluated early enough to re-think the design of Golfcart. Most of this project's example programs were written after the fact within the confines of the language's limitations.

One thing I got right was getting a REPL running from commit number one. Being able to quickly evaluate snippets became crucial to keeping me in a flow-state on this project.

Ultimately, I've learned a lot and this won't be my last language!

## More Syntax and Semantics

Golfcart is a dynamic strongly typed language with support for bools, strings, numbers (float64), lists, dicts, and nil (null). There is full support for closures and functions can alter any variable in a higher scope.

```javascript
counter = () => {
    n = 0
    () => {
        n = n + 1
        n
    }
}

my_counter = counter()
my_counter() // 1

assert(my_counter(), 2)
```

A Golfcart program is a series of expressions. Line breaks are optional and there are no semi-colons. The final expression is sent to stdout.

```javascript
a = 1 b = 2 assert(a + b, 3) // A successful assert() evaluates to nil
```

There are seven types. A type-check can be performed with `type()`.

```javascript
// Bools
true or false
true and true

// Numbers
1
1.1 + 1.1 // 2.2

// Strings
"multi-line
string"
"1" + "2" // "12"

// Lists
[1, 2]
nums = [3, 4]
nums.append(5) // [3, 4, 5]
[0] + [1] // [0, 1]

// Dicts
{a: 1} // Accessed by `.a` or `["a"]` like JavaScript
{b: n => n + 1} // Values can be any type
keys({a: 1}) // ["a"]

// Functions
_ => nil // All user-defined functions are anonymous, assignable by variable
n => n + 1
sum = (x, y) => x + y

// Nil
nil
nil == nil // true
```

The Fibonacci sequence.

```javascript
// Naive
t = time()
fib = n => if n == 0 {
    0
} else if n == 1 {
    1
} else {
    fib(n - 1) + fib(n - 2)
}
fib(20)
log("fib: " + str(time() - t))

// With memoization 
t = time()
cache = {"0": 0, "1": 1}
fib_memo = n => if cache[n] != nil {
    cache[n]
} else {
    cache[n] = fib_memo(n - 1) + fib_memo(n - 2)
}
fib_memo(20)
log("fib_memo: " + str(time() - t))
```

For more detailed examples, see:

- [Example programs](https://github.com/healeycodes/golfcart/tree/main/example%20programs)
- [Specification programs](https://github.com/healeycodes/golfcart/tree/main/example%20programs/spec%20programs)
- [Programs that purposefully throw errors](https://github.com/healeycodes/golfcart/tree/main/example%20programs/error%20programs)

(All the above are used as part of Golfcart's test suite)

## Implementation

Golfcart is a tree-walk interpreter. Its single dependency is the [Participle](https://github.com/alecthomas/participle) parsing library, which consumes a parser grammer written using Go structs and a RegEx-like syntax to create an abstract syntax tree (AST) (see [parser.go](https://github.com/healeycodes/golfcart/blob/main/pkg/golfcart/parse.go)). This library let me move fast and refactor parser bugs without headaches. Participle has great documentation and [examples](https://github.com/alecthomas/participle/tree/master/_examples) (e.g. how to parse BASIC, MicroC, GraphQL) and it's in active development.

Participle provides line numbers and column positions for each token. They are added to Golfcart's language values during evaluation (so some Golfcart errors have line numbers). All errors have error text, and hopefully enough information to find the problem and fix it but Golfcart lacks a mature stack trace.

A program runs like this: a piece of source code is turned into tokens by Participle's lexer. The lexer uses token definitions — for example, Golfcart's identifier is defined as: ```{"Ident", `\w]+`, nil}```). These tokens are parsed into an AST using struct definitions and the AST is evaluated (see [eval.go](https://github.com/healeycodes/golfcart/blob/main/pkg/golfcart/eval.go)).

Here's Golfcart's list literal:

```go
type ListLiteral struct {
    Pos lexer.Position

    // This matches any number of expressions (or none)
    // If there's more than one expression, they must be separated by a comma
    // `@@` means: recursively capture using the fields own type
    Expressions *[]Expression `"[" ( @@ ( "," @@ )* )? "]"`
    // For simple types, tokens can be parsed directly into Go values
    // e.g. bool, float, string, etc.
}
```

How does a literal node become a value? Let's take the `ListLiteral` as an example. An `Eval` method is defined for most nodes, including this one. Given a stack frame, this list literal becomes a list value.

```go
func (listLiteral ListLiteral) Eval(frame *StackFrame) (Value, error) {
    values := make(map[int]*Value, 0)
    if listLiteral.Expressions != nil {
        for _, expression := range *listLiteral.Expressions {
            result, err := expression.Eval(frame)
            if err != nil {
                return nil, err
            }
            values[len(values)] = &result
        }
    }
    return ListValue{val: values}, nil
}
```

Let's talk more about stack frames in Golfcart. A stack frame is a map of variables in scope. It's a recursive structure, every stack frame has a parent apart from the global frame. All functions are anonymous and create closures. Any variable referenced in a higher scope can be altered.

Examples explain this better than words.

```javascript
a = 1
a_function = () => a = 2 // Closure created
a_function() // When called, `a` is changed
a // 2

if true {
    // `b` is not defined in a higher scope
    // So, `b` is declared only within this scope
    b = 3
}
b // Error: cannot find value for key 'b'

c = nil
if true {
    // This assignment recursively looks in higher scopes for `c`
    // it's found and that value is altered
    c = 4
}
c // 4
```

<br>

When I needed to make a design decision for Golfcart, I drew from internal feelings about how computer programs _should_ run. It feels good to own a slice of my computing experience.

Check out the source and grab the binaries at [https://github.com/healeycodes/golfcart](https://github.com/healeycodes/golfcart) ⛳

## Learning Resources

I used these:

- [Build your own programming language](https://thesephist.com/posts/pl)
- [Crafting Interpreters](https://craftinginterpreters.com/)
- [A Frontend Programmer's Guide to Languages](https://thatjdanisso.cool/programming-languages)
- [The Ink blog](https://dotink.co/posts/)

I've not tried but have heard great things about:

- [Writing An Interpreter In Go](https://interpreterbook.com/) (and the [sequel](https://compilerbook.com/))
- [Let's Build A Simple Interpreter](https://ruslanspivak.com/lsbasi-part1/)
- [The Super Tiny Compiler](https://github.com/jamiebuilds/the-super-tiny-compiler)
