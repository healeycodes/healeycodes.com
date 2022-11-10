---
title:  "My Experience with Pair Programming"
date:   "2019-08-13"
tags: ["career"]
path: "beginners/career/productivity/discuss/2019/08/13/my-experience-with-pair-programming.html"
description: "Pairing for fun and profit."
---

I learnt about pair programming at university when we were studying Agile methodologies. At the time it seemed very full-on — almost scary. I pictured myself stumbling over my keyboard as my co-worker facepalmed behind me. In reality, pair programming sessions have helped me to evolve as a developer and I actually find it more relaxing to tackle something as a team of two.

![Some fast-paced pair programming](fast-pair-programming.gif)

> Do you mind if I drive?

_Driving_ means being in control of the mouse/keyboard. _Navigating_ is watching, and depending on the pair's style, might be dictating what is to be written or there to raise questions, problems, and muse on design. Find a more detailed break down of the roles [here](https://gist.github.com/healeycodes/5acc53131957f6a96a281c89890c7706) (first written by Jordan Poulton).

I saw a study which claimed that during a conversation we give the other person around three times longer to respond to us than we give ourselves when it is our turn to respond. I think that the same holds true while pair programming because I've felt under pressure at times. I can remember plenty of instances of myself making endless typos (that I missed until they were pointed out) and forgetting basic structures of code, worrying that the navigator was getting bored while waiting for me to finish my code-thought. However, I can't remember any of my co-workers ever doing anything of the sort. Everyone has uniformly been brilliant.

It may seem odd to the uninitiated that two developers working on one ticket can be more efficient than if they were working on two tickets separately. One of the reasons is the level of focus and that can be maintained by the driver. Someone watching you code will catch silly errors that your linter might not. This saves building and testing time. Instead of googling easy questions (and context switching) you can throw them behind you and stay in your IDE. Being able to discuss ideas helps with creative problem-solving. I find that my mind wanders less because my partner is always there to point me back to our design. Rabbit holes can be nipped in the bud — e.g. one of us saying "Let's not optimize this part yet".

For me, it's a comfy atmosphere, it's fun. I've seen it referred to as an "automatic bi-directional rubber ducky".

When debugging, the best course of action is to break the problem down to its smallest parts — removing assumptions and finding out which parts you know for sure 100% work. However, it's hard to get rid of your own assumptions and later on you'll find out that something you held to be true was, in fact, the path to the solution. While pair programming, it's easier to approach the problem with more logic as there is a second pair of eyes that must be convinced of every assumption being held.

Pairing is good for when:

- You're stuck!
- You're new and want mentoring
- The team needs shared knowledge
- There is one time-sensitive feature

### Some tickets don't require it

I've read about peoples' experiences at companies where _every line of code_ is pair programmed. I'm curious about the benefit of such a requirement. I imagine that the [bus factor](https://en.wikipedia.org/wiki/Bus_factor) of a team would be incredibly low. But I'm thinking about the stories and bugs where I'm working in parts of the codebase that I know well. Where most of the work is setting up boilerplate code and some tests.

My favourite setup that I've experienced so far is a team where pair programming was left up to the developers. If we felt that a ticket required pair programming to be efficient then all we had to do was let our manager know that was the plan.

### As a mentor

Over the past year, I've been teaching my wife how to code. The largest jumps in her knowledge are when we've tackled a feature or a project as a pair-team. It gives me a chance to observe how she goes about tackling a problem and lets me guide her down the right path (or at least close to it). While I'm driving, the most helpful things she's reported watching are the steps that aren't coding but are more knowledge-based e.g. setting up a dev environment, proper version control, different test suites and CI/CD integrations.

### N.b.

This reads a little like propaganda from the Pair Programming Institute (tm). Some people don't mix well with pair programming and may find it distressing and inefficient. And there's nothing wrong with that at all!