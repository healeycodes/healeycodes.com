---
title: "Learning the Ink Programming Language"
date: "2020-09-15"
tags: ["fun"]
description: "Picking up Ink and giving back to the community."
---

I first heard about the [Ink](https://dotink.co/) programming language when I came across [Polyx](https://github.com/thesephist/polyx). Polyx is a productivity suite written in Ink that includes homegrown replacements for Dropbox and Trello as well as a personal relationship manager and a read-it-later service. [Linus Lee](https://thesephist.com/) is the sole author of Ink and Polyx. I read through the source code of Polyx because I was interested in owning my own personal infrastructure — and this was the start of my journey with Ink!

> A functional language that takes after modern JavaScript and Go

Ink exists in the area between a hobby project and a fully grown programming language. It has [documentation](https://dotink.co/docs/), open source [projects](https://dotink.co/docs/projects/), and it's actively developed with regular releases. It is easy to extend, and the source code is clear and understandable. It's got warts, sure, but you could write an application with it that gets you a customer and earns you a dollar.

I sent an email to Linus to chat about the language and he pointed me to some of his newer Ink projects that contained the most idiomatic code to learn from (which were [September](https://github.com/thesephist/september) and [inkfmt](https://github.com/thesephist/inkfmt)). He also fast tracked a planned VS Code [syntax highlighting extension](https://github.com/thesephist/ink-vscode) when he found out what editor I was using!

I spent a few weeks learning the language and created [Ink by Example](https://inkbyexample.com/) — a hands-on introduction to Ink using annotated example programs. Why was my first major project a learning resource? Well, writing about a topic helps me understand it but trying to teach a topic leads me to the hard questions that build mastery.

With technical topics, you meet the same problems that arise when trying to absorb a book. In [Why books don’t work](https://andymatuschak.org/books/), Andy Matuschak writes:

> Have you ever had a book like this—one you’d read—come up in conversation, only to discover that you’d absorbed what amounts to a few sentences? I’ll be honest: it happens to me regularly. Often things go well at first. I’ll feel I can sketch the basic claims, paint the surface; but when someone asks a basic probing question, the edifice instantly collapses

Until I explain a topic in a permanent medium (one that exists outside my own head) I don't know what I don't know. I fix this by building a structure from the basic principles all the way to the tricky nodes at the end of the graph. This can be via notes, an article, or a project.

## Building, Learning

The best way to learn a language is to build something. Ideally, something that solves a personal problem (this motivation will drive you through the quagmires to victory). The structure of Ink by Example is ~~modelled after~~ stolen from Go by Example.

I enjoy language resources that zoom in on a tiny slice of the syntax and give you clean examples. Usually, this starts with printing to console.

```ink
std := load('../vendor/std')
log := std.log

log('hello world')
```

If someone is fluent in another programming language they will want to know how to do _X_ in _Y_. They seek to translate the building blocks that they're familiar with; data structures, functions, and system interfaces.

The home page of Ink by Example presumes that you know what question you're asking. It's designed for an intermediate programmer.

![Hello World, Values, IO, Loops, Control Flow, Lists, Maps, Functions, Files, HTTP, Random, Sorting, Execing Processes](list.png)

When building and learning at the same time I like a resource that _shows how something works_. The 'how' — not the 'why'. A section of code annotated with enough information to get you started. A section of code that you can copy, change two lines, and ship!

![The Random example page that explains how rand() and urand() work](example.png)

The build tool chain for the project is powered by Ink and the [repository](https://github.com/healeycodes/inkbyexample) builds and deploys to Netlify on commits to the main branch. 

I set it up to be fairly hackable. There are two HTML templates (bases for index and example) that are imported as strings and formatted with Ink's `std.format`. The order that the examples are shown is controlled by `examples.ink`. The program files are structured like a table with documentation and code in parallel cells.

The program files are turned into executable code and evaluated when the test or build commands are ran. This was useful during development because it gave me full certainty that these code examples actually worked. (Unit tests would have been better!)

The templates are compiled and written to `/public` as HTML files, along with a few static files like CSS and an `og:image`.

For syntax highlighting, I read through another Ink project called [September](https://github.com/thesephist/september) and saw that it provided a print command that sent Ink source code to the terminal with syntax highlighting via ANSI escape codes. I imported the files required for highlighting and altered the escape code functions to instead wrap the lines in `<span>` elements with different class names.

```ink
` before: if comment, apply ansi.Gray function `
(Tok.Comment) -> Gray

` after: if comment, wrap in span to target via class in HTML `
(Tok.Comment) -> s => '<span class="c">' + s + '</span>'
```

The annotated examples programs are designed to print out a lot of data. This is rendered under the source code as if the file has been 'ran' in a terminal to create a natural feel for an intermediate programmer and to show the shape of the data we're dealing with.

![The section of output under the annotated program as if it has been ran via terminal](output.png)

Since everything builds to a folder called `/public`, the Netlify configuration is just two lines long. The build time is 17 seconds long.

```toml
[build]
  publish = "public/"
  command = "make build-linux"
```

## Why Learn Ink At All?

Sometimes I am too career-driven in the languages and technologies that I pick up. So I wanted to make sure that I was still learning to explore and be creative — unencumbered by StackOverflow surveys that detail what technologies make you most employable. And what is more esoteric than a language that only two people actively code with (to my knowledge: myself and Linus).

I find Ink enjoyable to write code with. It's terse, functional, and for small solutions it's extremely clear to read. Programs are easy to share and deploy; a binary and a script. After reading some of Linus's passionate [technical articles](https://dotink.co/posts/) about Ink I felt an unexplainable yearning to try it out. So I did.

The future of Ink sounds exciting. I caught up with Linus a few days ago and he hinted at an experimental implementation written in Rust. He suggested some language problems that might be fixed too. He also pointed me towards resources on interpreters and compilers which I've been devouring. Who knows — maybe I'll be writing about my own programming language one day soon.