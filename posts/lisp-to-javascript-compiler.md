---
title: "Lisp to JavaScript Compiler"
date: "2024-05-26"
tags: ["rust"]
description: "Transpiling Lisp to JavaScript using Rust."
---

I wrote a compiler that takes Lisp code and turns it into JavaScript. The compiler is a [~280 line Rust program](https://github.com/healeycodes/lisp-to-js) that I wrote over a few nights. When I started this project, I thought I understood how basic Lisp worked  (I didn't) but I do now.

The first step of this project involved choosing a Lisp to implement. There are many Lisps. I'm a big fan of Mary Rose Cook's [Little Lisp](https://maryrosecook.com/blog/post/little-lisp-interpreter) blog post so I decided to  implement Little Lisp, plus or minus a few forms.

In Lisp terminology, a "form" is a fundamental concept referring to any syntactic construct that can be evaluated to produce a result.

My Lisp has these forms.

```lisp
; atoms
1 ; f64 numbers
a ; symbols

; arithmetic expressions
(+ 1 2) ; 3
(- 1 2) ; -1

; control flow expressions
(< 1 2) ; true
(> 1 2) ; false
(if (< 1 2) (+ 10 10) (+ 10 5)) ; 20

; lambda expressions
(lambda (x) (+ x x)) ; function that doubles

; variable definition
(let ((a 1)) (print a)) ; prints 1
(let ((double (lambda (x) (+ x x))) (double 2))) ; 4
```

These are enough forms to write small programs that can do meaningful calculations. Like finding the Nth Fibonacci number, as we'll see later.

## Parsing

To transform a Lisp program into a JavaScript program, you need to convert it to an intermediate representation. I used an Abstract Syntax Tree (AST) for this purpose.

During the compile step, I walk over this tree and output each node as JavaScript.

The AST that's created for `(let ((double (lambda (x) (+ x x))) (double 2)))` looks something like this (I drew this manually but would love to have my compiler output this!):

```text
(let
  ├── Bindings
  │   └── (double
  │       ├── Variable: double
  │       └── Expression
  │           └── (lambda
  │               ├── Parameters
  │               │   └── (x)
  │               └── Body
  │                   └── (+ 
  │                       ├── Expression: x
  │                       └── Expression: x
  │                   )
  │           )
  │       )
  └── Body
      └── (double 2)
          ├── Function: double
          └── Expression: 2
)
```

I used the [pom](https://github.com/J-F-Liu/pom) library to define parser combinators that consume Lisp syntax.

I'll quote a section from the [pom docs](https://github.com/J-F-Liu/pom/blob/master/doc/article.md) that helped all this click for me: 

> A *parser* is a function which takes a *string* (a series of *symbols*) as input, and returns matching result as *output*.
> 
> 
> A *combinator* is a higher-order function (a "functional") which takes zero or more functions (each of the same type) as input and returns a new function of the same type as output.
> 
> A *parser combinator* is a higher-order function which takes parsers as input and returns a new parser as output.

I previously used this library to write the parser for [a boolean expression engine](https://healeycodes.com/porting-boolrule-to-rust) and had a pretty good time with it. Like most of my Rust experience, I spent more time fixing  compile errors — rather than running, testing, and debugging. When it comes to parsers, I find fixing compile errors to be a tighter, and more productive loop, than running-and-fixing code from a more dynamic language.

In my Lisp, I define a number as:

1. Starts with `1-9`
2. Maybe followed by any amount of `0-9` characters
3. Or just a single `0`

These rules are encoded in a parser combinator function.

```rust
fn number<'a>() -> Parser<'a, u8, f64> {
    let number = one_of(b"123456789") - one_of(b"0123456789").repeat(0..)
        | sym(b'0');
    number
        .collect()
        .convert(str::from_utf8)
        .convert(f64::from_str)
}
```

This number parser is combined with other parsers to find the atoms in my Lisp programs.

```rust
fn atom<'a>() -> Parser<'a, u8, Atom> {
    // Starts with optional space characters
    space() *
        
        // A number, mapped into my Atom enum
        (number().map(|n| Atom::Number(n))
        
        // Or a symbol
        | symbol().map(|s| Atom::Symbol(s)))
        
    // Followed by optional space characters
    - space()
}
```

The resulting parser turns source code into the structs and enums that make up the AST. These structures are recursive. A function definition can define another function inside it's body (and so on).

Rust only lets you define recursive data structures if you use constructs like Vecs or Boxes which have runtime checks for their memory usage.

```rust
enum Expression {
    Atom(Atom),
    List(Vec<Expression>), // <--
    LetExpression(LetExpression),
    LambdaExpression(LambdaExpression),
    IfExpression(Box<IfExpression>), // <--
    ArithmeticExpression(Box<ArithmeticExpression>), // <--
}

struct LambdaExpression {
    parameters: Vec<String>,
    expressions: Vec<Expression>, // <--
}
```

For me, the hardest thing about writing a Lisp parser was probably off-by-one errors with the amount of parenthesis each form uses. I also didn't have a perfect understanding of how Lisp forms combined to produce programs. Largely due to the fact that, before I started this project, I hadn't written a Lisp program before.

## Generating JavaScript

After the parser runs, we either have a valid AST or we've thrown an error that describes how the input failed to parse.

Being that Lisp programs are made up of expressions and JavaScript has great support for expressions, I didn't have too hard of a time generating code. In terms of effort, it was 20% learning the basics of Lisp, 70% writing a parser to build the AST and data structures, and then 10% code generation.

Given the simple forms I chose for my Lisp, they end up mapping fairly one-to-one with JavaScript expressions.

```jsx
// (+ 1 2)
1 + 2

// (print (+ 1 2))
console.log(1 + 2)

// (let ((double (lambda (x) (+ x x))) (double 2)))
let double = x => x + x
double(2)
```

My compiler starts by defining `print`, and then iterating over the expressions that the parser found. 

```rust
fn compile(program: Vec<Expression>) -> String {
    
    // Other built-ins can be manually added here
    let mut output = "/* lisp-to-js */
let print = console.log;

"
    .to_string();

    program.into_iter().for_each(|expression| {
    
		    // I found it easier to write to a parent variable
		    // which didn't feel very Rust-like but it worked for me!
        output.push_str(&compile_expression(expression));
    });

    output
}
```

The function that handles expressions, `compile_expression`, is pretty much just a long match expression. When there are sub-expressions (very common) it recursively calls itself, continuously building an output string of JavaScript.

The code generation logic was a lot of fun to write. I felt much more at home with JavaScript (compared to Lisp) and it was very much a dessert compared to battling types over in parse-land.

I'll show a few of my favorite snippets here.

Like supporting less-than expressions:

```rust
// input: (< 1 2 3)
// output: 1 < 2 && 2 < 3

Op::LessThan => ret.push_str(
    &compiled_expressions
        .windows(2) // How cool is this std lib function!?
        .into_iter()
        .map(|expressions| expressions.join(" < "))
        .collect::<Vec<String>>()
        .join(" && "),
),
```

And here's what I mean about a one-to-one mapping of structures:

```rust
// input: (if (ex1) (ex2) (ex3))
// output: ex1 ? ex2 : ex3

Expression::IfExpression(if_expression) => ret.push_str(&format!(
    "{} ? {} : {}\n",
    compile_expression(if_expression.check),
    compile_expression(if_expression.r#true),
    compile_expression(if_expression.r#false)
)),
```

The same thing goes for lambda expressions in Lisp. JavaScript has those too (anonymous functions)!

```rust
// input: (lambda (a) a)
// output: a => a

Expression::LambdaExpression(lambda_expression) => {
    let params = lambda_expression.parameters.join(",");
    let mut body = "".to_string();

    for expression in lambda_expression.expressions {
        body.push_str(&format!("{}\n", &compile_expression(expression)));
    }

    ret.push_str(&format!(" (({}) => {})\n", params, body));
}
```

Usually, the first program I write with a new interpreter or compiler is a Fibonacci function. It's a good test for a range of functionality (variable binding, boolean logic, comparison, recursion, and sometimes performance too).

Here's my compiler's output for a Fibonacci function with all the odd spacing and hanging commas that my compiler produces.

```jsx
/*
(let ((fib (lambda (n)
    (if (< n 2)
        n
        (+ (fib (- n 1)) (fib (- n 2)))))))
(print (fib 10)))
*/

let print = console.log;

let fib =  ((n) =>  n  < 2 ?  n  : ( fib (( n -1), )+ fib (( n -2), ))

)
; print ( fib (10, ), )
```

You might think at this point: hm, this kinda thing seems hard to debug at runtime … what happens if you write a Lisp program with valid syntax but that will cause an error?

Well, the errors end up being quite useful! This is probably due to the fact there's only so much that can go wrong with such a limited amount of forms.

```lisp
(hm 1 2) ; ReferenceError: hm is not defined
(+ two 2) ; ReferenceError: two is not defined

(let ((a a)) ())
; let a =  a ;
;          ^
; 
; ReferenceError: Cannot access 'a' before initialization
```

## Bonus: Compiling to Native

I've been following the development of [Porffor](https://github.com/CanadaHonk/porffor) — an ahead-of-time optimizing JavaScript engine. While it's limited in the kind of JavaScript that it supports at the moment, the subset of JavaScript that *my* compiler produces is also limited.

Porffor can take my compiler's output (JavaScript) and compile it into a C program!

```bash
$ npm i -g porffor@latest

# generate a C file from my compiler's output
$ porf c fib10.js out.c

# compile it for native
$ gcc out.c -o out

$ ./out
55 # it works!
```
