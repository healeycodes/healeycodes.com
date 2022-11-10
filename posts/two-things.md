---
title:  "Two Things About My First In-house Software Job That I Didn't See Coming"
date:   "2019-03-12"
tags: ["career"]
path: "career/codereview/javascript/2019/03/12/two-things.html"
description: "On enjoying being part of a team."
---

#### Code review is the best part of the job

I went from being afraid of being judged to embracing team-spirit. Today, I find myself completing a ticket and looking forward to placing it in review. I really enjoy the feedback I receive from my peers and the conversations that start as a result. It's a great chance to learn more about the project's architecture and patterns. In a past life, I was a Creative Writing student so I understand that editing something *always* makes it better.

I like giving as much as getting. I was encouraged from day one to join in the review process. I understand how to optimize JavaScript quite well so the first comments I made were offering advice for the performance critical parts of the code base that came through review — all of which were well received.

Software engineering as a field has so much breadth that even people starting out in the industry have something to offer a team. Whether they read a tech blog, built a project in the stack, or went deep in the documentation.

#### Coding is one of the least important parts of the job

Don't get me wrong, if I start slinging bad code into review, I'm going to run into issues. However, I've found that the most important skill at my job is communication. I need to understand what my project manager is telling me so that I can translate it into code. I need to then listen to my manager's feedback about my approach. If I can't explain my design to my teammates then it will take them longer to understand my (hopefully self-documenting) code.

I was part of a group of three designing a new module when I realised how my communication has grown. Much like the ideal piece of code, the best way to communicate is with simple, almost boring language — all backed by the correct abstraction. Figuring out the exact requirements, and the right tools and modules avaliable to you is 85% of the battle in completing a ticket.

```javascript
/* Boring vs. Fancy.
 *
 * Task: Given a one or two digit Number, zero-pad values below ten
 */

// Fancy - uses String-tricks
('0' + foo).slice(-2);

// Plain old logic - significantly faster!
(foo < 10) ? ('0' + foo) : foo;

// ES7 gives us a native pad operator but it's not optimized for this situation either
foo + ''.padStart(1, 0);
```

I tackled a high-priority bug — something that crippled our product — I dug for a whole work day in order to find the one character, a single byte, that needed to be removed in order to fix the whole thing. That was a good day. Other weeks, I blast out boilerplate like they're paying me one penny a word.

<br>

The worst part about my job? The winter weather commute!
