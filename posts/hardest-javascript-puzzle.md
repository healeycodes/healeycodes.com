---
title:  "Hardest JavaScript Puzzle I've Ever Solved"
date:   "2019-11-17"
tags: ["javascript", "fun"]
path: "javascript/challenge/webdev/2019/11/17/hardest-javascript-puzzle.html"
description: "Writing JavaScript with a one character width restriction."
---

I love code puzzles. Always have. My deskmate told me about a puzzle that no one in the office had been able to solve when they shared it around. I was intrigued because of the challenge but also because it was a JavaScript puzzle.

I'd understand if it were a Project Euler problem (they can be mathy) or perhaps if no one had found the optimal solution to a LeetCode 'Hard' (I've seen some problems that once upon a time were research papers).

__The puzzle took me two weeks to solve__. I became stuck almost instantly and then it hung around in the back of my mind until the solution came to me. First, let's take a look at the easier version of the problem which helped me unlock the harder version.

Don't scroll too fast unless you want spoilers.

### [Codewars: Multi Line Task++: Hello World](https://www.codewars.com/kata/5935558a32fb828aad001213)

- Write a function `f` that returns `Hello, world!`.
- Every line must have at most 2 characters, and the total number of lines must be less than 40.

Without the line restriction. The solution is:

```javascript
function f () { return 'Hello, world!'; }
// or
const f = _ => 'Hello, world!';
```

I started splitting up the code and shortened the variable declaration. We can throw away the `const` and allow the function to exist in the global scope. We can also use template strings to break up the string into multiple lines.

Errors incoming.

```javascript
f
=_
=> // Uncaught SyntaxError: Unexpected token '=>'
`H
el
l,
 w
or
ld
!` // This string has newline characters in it!
```

My next idea was to define the function inside an object and then retrieve the function out of the object.

```javascript
f=
{g
()
{
return 'Hello, world!'; // Too long!
}}
[`
g
`[
1]
]

// 'Beautified'
f = {
        g() {
            return 'Hello, world!';
        }
    }
    [`
g
` [
        1
    ]]
```

No errors, I was declaring a function but now I couldn't figure out how to return from the _inner_ function without using the `return` keyword. It felt like I was close but I wasn't. I was still stuck on defining the string without newline characters as well.

### Finding inspiration: [JSFuck](http://www.jsfuck.com/)

> JSFuck is an esoteric and educational programming style based on the atomic parts of JavaScript. It uses only six different characters to write and execute code.

Reading through this project's [source code](https://github.com/aemkei/jsfuck/blob/master/jsfuck.js) really opened my mind to some parts of JavaScript that never really come up unless you're doing something like writing a library or code golfing.

Once I figured out how to remove the newline characters from the `Hello, world!` message (escaping with a backslash `\`) everything else fell into place. I could now use square brackets `[]` on objects to run pretty much anything. However, one of the requirements was to keep the total line count under 40 (one of the reasons why using JSFuck encoding was out of the question).

My idea was to create a new function by calling [Function.prototype.bind](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Function/bind) on a [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) method. I used [String.prototype.trim](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trim) because it had the shortest name (and conveniently got rid of any trailing newlines too).

```javascript
f=
''
[
'\
t\
r\
i\
m'
][
'\ // Get a new function where `this` is "Hello, world!"
b\
i\
n\
d'
]` // Tagged template, see below
H\
e\
l\
l\
o\
,\
 \
w\
o\
r\
l\
d\
!`
```

I also used tagged templates to pass `Hello, world!` as an argument to bind.

> Tags allow you to parse template literals with a function. The first argument of a tag function contains an array of string values.

Let's take it up a level to the harder version that started this journey!

### Codewars: [Multi Line Task∞: Hello World](https://www.codewars.com/kata/59a421985eb5d4bb41000031)

- Write a function `f` that returns `Hello, world!`.
- Every line must have __at most 1 character__, and the total number of lines must be less than 145.

Without having first solved the two-characters-per-line version I don't think I would have come close to answering this version.

The solution I went for is the same, we use `bind` on `trim` and pass the message as an argument (without template tags this time). To access the String object we use `[]+[]` which evaluates to `""`.

Since we can no longer escape the newline character from within a template string we have to use a workaround. The property names (`trim`, `bind`) and the message (`Hello, world!`) have to be built with concatenated variables.

We use [destructuring assignment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment) on a template string and use empty slots in the first array to 'skip' assigning the newline character to anything. Like this:

```javascript
[,a,,b,,c] = 'xHxix!' // avoid the "x"s
a + b + c // Evaluates to: "Hi!"
```

I didn't optimize the solution any further once it passed the requirements. It's been left verbose to better explain what's going on (for example, we only need one "l" in the template string).

```javascript
[ // With destructuring assignment, start declaring variables
,
t
,
,
r
,
,
i
,
,
m
,
,
b
,
,
i
,
,
n
,
,
d
,
,
H
,
,
e
,
,
l
,
,
l
,
,
o
,
,
c // Comma
,
,
s
,
,
w
,
,
o
,
,
r
,
,
l
,
,
d
,
,
x // Exclamation mark
]
=
`
t
r
i
m
b
i
n
d
H
e
l
l
o
,
 
w
o
r
l
d
!
`
f // Start declaring our function
=
( // This evaluates to "" or, the String object
[
]
+
[
]
)
[ // `trim`
t
+
r
+
i
+
m
]
[ // `bind`
b
+
i
+
n
+
d
]
( // Can use parentheses or template tag syntax to call `bind`
H
+
e
+
l
+
l
+
o
+
c
+
s
+
w
+
o
+
r
+
l
+
d
+
x
)
```

<br>

I'm definitely taking a break from language-specific coding puzzles — give me logic over syntax! However, I'm glad I scratched this itch.