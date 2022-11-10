---
title:  "Answered: What the Heck is Code Golf?"
date:   "2019-03-30"
tags: ["fun"]
path: "codegolf/python/javascript/opensource/2019/03/30/what-the-heck-is-code-golf.html"
description: "I love code golf and you should too!"
---

Usually, code golf means one of two things:

- The act of shortening a section of code.
- A wonderfully obscure community on the internet who compete to write _very_ short code. To some, they are seen as a group that 'takes the joke too far' but to me they are **artisans**.

Code golf challenges are not always about writing the shortest code though. Some competitions score on [creativeness](https://codegolf.stackexchange.com/questions/21835/most-creative-way-to-display-42). Some questions are even just asking _is this possible?_ — and the results are beautiful. Later on, we'll see a RegEx that only matches itself.

The most common measure for a code golf competition is the amount of bytes the answer requires, generally this can be understood as the number of UTF-8 characters. `print('Hello, World!')` would be a 22 byte answer. Like golf, the lowest score wins.

For 'Print every ASCII character your program doesn't have', [Umbrella](https://codegolf.stackexchange.com/a/15497/78322) is the current leader for JavaScript with 84 bytes — which is relatively long.

```javascript
// Alerts 'bcdfghijkmnpquvxyz6840'
"!#$%&*+,-13:<=>?@[\]^_`{|}~AERTOWS";alert('BCDFGHIJKMNPQUVXYZ'.toLowerCase()+95*72)
```

Let's see an extreme example, the [GolfScript](https://codegolf.stackexchange.com/a/12376/78322) entry. Language reference [here](http://www.golfscript.com/golfscript/quickref.html).

```golfscript
# Outputs the remaining ASCII characters
{`),32>^.}.~
```

GolfScript is _quite_ hard to follow. Most of the time, we write code for humans — not machines. In code golf one writes to score points. The standard programming languages, while often used, can be restrictive. For example, I have never seen a C# or Java answer come top in a shortest-answer-wins challenge.

#### Esoteric languages

An esoteric language:

- experiments with [weird ideas](https://esolangs.org/wiki/Hexagony).
- might be hard to [program in](https://esolangs.org/wiki/Unreadable).
- might even be designed as a [joke](https://esolangs.org/wiki/Brainfuck).
- is likely [not practical](https://esolangs.org/wiki/JSFuck).

Much like mainstream programming languages have evolved over time, so have code golfing languages. These languages are designed with different goals. Some want to be able to write the [smallest programs](https://esolangs.org/wiki/Pyth). Some are written [just because](http://esolangs.org/wiki/Shakespeare).

[Hexagony](https://github.com/m-ender/hexagony) is a two-dimensional programming language. Let's take a look at a program that prints 'Hello, World!'. You can run this online at [tio.run](https://tio.run/##y0itSEzPz6v8/19BQcFDwVohVcGaS0EhB8hKAWItLiBRBMT5QBzOBRKGsLUUTLgUjIHQWsFBQU/BDqjHWsEIyLdRiAGyFUzAavT//wcA) a.k.a. Try It Online — an open source playground of **636** languages.

```hexgony
   H ; e ;
  l ; d ; *
 ; r ; o ; W
l ; ; o ; * 4
 3 3 ; @ . >
  ; 2 3 < \
   4 ; * /
```

Intrigued? One of my favorite pieces of code golf writing is the language creator's [description](https://codegolf.stackexchange.com/a/57706/78322) of his primality testing program. Reading about these solutions, and experimenting with my own, exercises my problem-solving muscle. It helps me to learn the edges of my languages.

#### Community

Similar to the open source community, code golf is often a collaborative effort. Languages are developed in the open, and questions will find helpful answers. Competition 'entries' will also receive polite assistance. I remember my first attempt at code golf, I received welcome messages and suggestions for shaving off bytes.

The [Programming Puzzles & Code Golf](https://codegolf.stackexchange.com/) section of StackExchange is the most active code golf community on the internet and this is where you can find many of these languages in use. [Esolangs](https://esolangs.org/wiki/Main_Page) is a community wiki where the most esoteric languages are covered in-depth. The #codegolf tag on Twitter is slow but welcoming.

#### RegEx that only matches itself

As promised, [this](https://codegolf.stackexchange.com/questions/28821/regex-that-only-matches-itself) post is a fun one. The poster begins by stating that _this may well be impossible_ before elaborating on the challenge. Fortunately, [jimmy23013](https://codegolf.stackexchange.com/users/25180/jimmy23013) shows us that not only is this challenge possible but is solvable quite tersely indeed.

```bash
# RegEx that only matches itself
# in (PCRE) Perl Compatible Regular Expressions
<^<()(?R){2}>\z|\1\Q^<()(?R){2}>\z|\1\Q>

# A more widely compatible version:
/^\/()(?R){2}\/\z|\1\Q^\/()(?R){2}\/\z|\1\Q/
```

#### Is this number prime?

Let's start with a Python [answer](https://codegolf.stackexchange.com/a/57650/78322) (59 bytes). It's as naive as prime-checking gets but is creatively short. It demonstrates a typical code golf answer: _solve the problem the long way round then apply syntax tricks_. (Comments my own).

```python
# take a number via stdin
n=int(input())
# build an array of this number's factors from 1 to n
# if there is only one factor (the number one) then it is prime!
print([i for i in range(1,n)if n%i==0]==[1])
```

The leading JavaScript answer is a little harder to pick apart.

```javascript
// Alert true or false given an input number
alert(!/^(?!(..+)\1+$)../.test(prompt()))
```

The [poster](https://codegolf.stackexchange.com/a/57692/78322) tells us that it uses a 'cool unary regex to determine primality'. Further research found [this](https://iluxonchik.github.io/regular-expression-check-if-number-is-prime/) ~5000 word article which explains said RegEx expression. As you've probably started to realize, code golf is like programming in that it's a rabbit hole that doesn't end. But it does get more rewarding the further you dive in.

#### Elsewhere on the web

[JS1k](https://js1k.com/) is a JavaScript demo competitive for 'fancy pancy JavaScript demos' that come in under 1024 bytes. They are very visually impressive.

There's also the [The International Obfuscated C Code Contest](https://www.ioccc.org/) which began in 1984. It's closer to treasure hunting than golf though! Here's a maze generator entry from 1995, by Carlos Duarte ([source](https://www.ioccc.org/years.html#1995_cdua)):

![1995/cdua](c-maze.png)

Honorary shoutouts to two of my favorite esolangs [05AB1E](https://github.com/Adriandmen/05AB1E) and [Jelly](https://github.com/DennisMitchell/jellylanguage). They both place well in challenges and are usually accompanied by well-written explanations which are a great entry point for learning them.
