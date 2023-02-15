---
title: "My Time At The Recurse Center"
date: "2023-02-14"
tags: ["fun"]
description: "Thoughts and reflections on my six week batch."
---

I recently completed a six week batch at [The Recurse Center](https://www.recurse.com/about) (RC). It's common for alumni to write a [return statement](https://www.google.com/search?q=recurse+center+return+statement) to summarise their experience — and this is mine!

I had a magical time and learned at a tremendous pace.

When I had to describe RC to my parents, I called it *an artist's retreat for programmers*. It's for anyone that wants to get dramatically better at programming; free to attend, self-directed, and project based. The [self-directives](https://www.recurse.com/self-directives) are a pretty concise summary of the type of work one does at RC. At the end of a batch, the folks at RC will help you find a job at a good company (that is, if you want one).

I first learned about RC by seeing it mentioned on people's technical blogs e.g. [How I spent my time at the Recurse Center](https://jvns.ca/blog/2017/09/17/how-i-spent-my-time-at-the-recurse-center/) and [The Recurse Center and the joy of learning](https://martin.kleppmann.com/2015/10/11/recurse-center-joy-of-learning.html). Back then, attending a batch seemed like an impossible dream. When I started programming, I didn't know any other programmers so being part of a friendly and like-minded community was the ultimate goal. But I couldn't jet off to New York for six weeks so the idea sat on the back burner. That is, until RC announced they were moving [online-only for few months](https://www.recurse.com/blog/152-RC-is-online-only-until-at-least-May) at the start of COVID-19 (and then stayed online-only) and I started planning.

The [application process](https://www.recurse.com/apply) involved filling out a short form and answering questions about my experience and what I wanted to achieve at RC, including a tiny code sample. Shortly after applying, I had an interview with an alumnus and we spoke more about what I wanted to work on, and about a tricky bug I had solved recently. The questions weren't overly technical and seemed transparently aimed at discovering how well I fit the [admissions criteria](https://www.recurse.com/what-we-look-for). My final interview was a short pair programming session (with another alumnus) on one of the [pairing tasks](https://www.recurse.com/pairing-tasks). The session had a casual and friendly vibe and we learned a few things from each other.

## Projects

I knew that I wanted to write a lot at RC. In my application interviews, I was asked how I would be able to tell if my batch was a success and I said I hoped to leave behind many technical artifacts, like repositories and blog posts.

At RC, I wrote five blog posts:

- [Sandboxing JavaScript Code](https://healeycodes.com/sandboxing-javascript-code)
- [Implementing Highlighting, Search, and Undo](https://healeycodes.com/implementing-highlighting-search-and-undo)
- [Making a Text Editor with a Game Engine](https://healeycodes.com/making-a-text-editor-with-a-game-engine)
- [Profiling and Optimizing an Interpreter](https://healeycodes.com/profiling-and-optimizing-an-interpreter)
- [Adding For Loops to an Interpreter](https://healeycodes.com/adding-for-loops-to-an-interpreter)

A common theme of people's post-RC reflections was that they wished they had spent more time pair programming with people because that's when they felt they had grown the most. So I aimed to pair program with someone every other day. I came pretty close to hitting that goal. I found people to work with by posting on [Zulip](https://www.recurse.com/blog/112-how-rc-uses-zulip) (it's very similar to Slack), signing up for daily 1-on-1 [coffee chats](https://www.recurse.com/manual#sub-sec-during-rc), and by reaching out to people directly.

I worked on a range of projects, including:

- A [text editor](https://github.com/healeycodes/noter)
- A programming language called [nodots](https://github.com/healeycodes/nodots-lang)
- A [sandbox project](https://github.com/healeycodes/deno-script-sandbox) for executing untrusted JavaScript/TypeScript code
- An example of how to [make web requests from a V8 Isolate](https://github.com/healeycodes/deno-isolate-web-request)
- A [Brainfuck compiler](https://git.sr.ht/~sgeisenh/bfcomp/tree) (with Sam)
- Design tweaks, a [/notes](https://healeycodes.com/notes) page, and and end-to-end tests for this website
- An [AI for 2048](https://github.com/sgeisenh/2048ai) (with Sam)
- A website to share baby photos with my family
- [A tiny Python application](https://github.com/healeycodes/cursor-travel-tracker) that shows how far your cursor has travelled

I started RC with a large stack of technical books that I wanted to get though. I didn't make too much progress through the stack. But I did end up reading a ton of technical content (mostly blog posts/papers) related to the projects I worked on.

I read (at least some of):

- [Observability Engineering](https://www.oreilly.com/library/view/observability-engineering/9781492076438/)
- [Chess Programming Wiki](https://www.chessprogramming.org/Main_Page)
- [Crafting Interpreters](https://craftinginterpreters.com/)
- [Language Implementation Patterns](https://pragprog.com/titles/tpdsl/language-implementation-patterns/)
- [A Guide to Deno Core](https://denolib.gitbook.io/guide/)

You're encouraged to work in the open at RC. There are many ways to [learn generously](https://twitter.com/recursecenter/status/1489700666062876683). For me, it meant posting updates to the `#checkins` stream in Zulip, replying to people's threads and questions, and attending one of the two daily checkin meetings.

![A screenshot of RC's Zulip instance. The message in the screenshot is one of my daily written checkins.](zulip.png)

The most impactful part of RC for me were the pairing sessions. By the time I was halfway through my batch, there were a handful of people who I felt comfortable reaching out to for help when I was stuck. After each session, I'd come away with a clearer path forwards, unblocked and productive. I tried (and hopefully succeeded) to be there in the same way for them.

One of the great things about RC is the joy of learning for its own sake. It seemed to be more common for people to be building things for fun, to solve a curiosity, or to do hard things just because they were hard. I found this incredibly refreshing compared to the majority of online technical communities that trend towards career-focused goals and discussions.

Ironically, not focusing on projects that would help my career led me down paths that will probably end up helping me! I pushed myself to dig further into things like systems engineering, optimization, and the tricky corners of subjects I had previously avoided for one reason or another.

## Advice for Would-Be Recursers

I would say that RC is for anyone who loves to program and wants to improve while contributing to a friendly and supportive community. The hard part is having the privilege to spend six-to-twelve weeks not working. I made it work by attending towards the end of a long paternity leave. If you're considering it, you should definitely apply. I'd love to answer any questions you have.

A couple of things that helped me out during my batch was the planning I did before I attended. I made a list of topics that I wanted to work on. During the day one introductions, having this list helped me find people who I shared similar interests with. I also had a separate list of specific projects I wanted to build, ordered from small to large. When I was stuck or listless, I popped something off the stack and kept up my momentum.

Writing about what I learned was the best way to double down on my learning. Trying to explain a topic is a great way to understand that topic. It also helped me double-check my work and thinking, and led me down new paths. I started writing blog posts before I had completed the project because having them both in tandem created this flywheel effect where the narrative of the blog post pushed the project to completion.

I didn't overcommit to meetings and groups. On some days there are as many as six optional meetings; different clubs, events, and chats. I was conscious about budgeting my time and kept a little RC journal to keep myself on track for my learning and friend-making goals.

Putting myself out there paid off every time. I didn't regret a single question I asked or answered, or a meeting that I offered an opinion in, or project I made public and wrote about. Sharing is as important as doing.
