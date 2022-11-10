---
title:  "Your First Open-Source Pull Request: a Walkthrough"
date:   "2019-06-16"
tags: ["career"]
path: "beginners/opensource/github/tutorial/2019/06/16/your-first-open-source-contribution.html"
description: "Making a small change to the Jekyll project."
---

_"You should contribute to open-source." ⁠— The Internet._

Maybe you've seen this advice. Either from those who believe in free software — or as a suggestion to aid job seeking. Many people (some of my mentees included) report that GitHub is scary. The projects on there are mammoth-sized compared to any team project they've worked on. The people working on these projects are, like, _serious people_.

This is true and this is not true. There really isn't anything to worry about. Let's talk about what's involved. I'll be using my _tiny_ [contribution](https://github.com/jekyll/minima/pull/379) I made to Jekyll yesterday as an example. There are [lots](https://www.firsttimersonly.com/) of resources for finding first-timer issues but there are a few steps that these guides miss out on.

## Find a problem

It's going to be easier to find (or remember) a bug in the software that you use every day compared to getting up to speed with a project you haven't heard of before. Let's take Jekyll's minima theme for example. Way back, I wanted my website to look different but I didn't have the time to write a theme from scratch — so I've been [hacking away](https://healeycodes.com/) at this theme for a while now.

This is how I found the bug. I went into developer tools (F12) and set the view-size to be _iPhone 5/SE_, which is relatively small by modern standards, to test a page of my website. Some developers won't be considering devices of this size (but they should). I saw that the responsive footer wasn't appearing correctly. Instead of two stacked columns, there were two columns and one was empty.

![Minima broken columns](minbroke.png)

At first, I presumed that some of my hacking must have caused this. So I went over to the [jekyll/minima](https://jekyll.github.io/minima/) repository to double check the live demo page. I found the same problem (note: this problem is now fixed on master). The problem was an erroneous class — `.one-half` which was not behaving responsively. (I discovered this through some Dev Tools tinkering).

It needed a [media query](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Using_media_queries). Media queries are how our websites change styling depending on the device's settings, e.g. resolution. __You don't need to understand the whole tech stack behind the project you're fixing__. For example, I haven't used Sass that much but I knew about its CSS variable system. I looked around for a breakpoint variable that was already being used and which complimented the footer columns at all sizes. I settled on `$on-large` — resulting in a fix to the problem.

![Minima fixed columns](minfixed.png)

## Fork the branch

Check the contributing guidelines. This is more important than any advice I can give you. For jekyll/minima, the [guidelines](https://github.com/jekyll/minima#contributing) were pretty simple: "Bug reports and pull requests are welcome," as well as a link to the code of conduct. It should also tell you which branch to send your changes to.

jekyll/minima is developed on `master` but usually there will be a staging branch for you to fork. Head to the GitHub repository in your browser and click the _Fork_ button, then clone the branch to your computer. The community recommends learning the command line tools for git interaction but the [GitHub Desktop](https://desktop.github.com) client works fine too. If there's a test suite, run the tests before changing anything to ensure that your environment is stable.

## Create a pull request

Make your changes and [write a good commit message](https://github.com/erlang/otp/wiki/writing-good-commit-messages). Mine was "Fix footer stacking issue for smaller view sizes". Push the changes to your fork. There are ways to create a pull request via command line but I visit my fork's repository and hit the _Pull request_ button at the top right of the file list.

I've always thought that writing a pull request is just as important as the code. If your team members can't understand the proposed change at a high level then they won't be able to critique it successfully. Meaning that your pull request could be denied (or accepted when it shouldn't be). For bugs, I describe the bug, include an image if appropriate, then explain what changes are required to fix it. If there are important, tech-y implementation details then I place them at the very end.

Perhaps a final look over the contributing guidelines (check `CONTRIBUTING.md` if you can't find it) and then it's time to submit. Check how often pull requests are being read, commented on, and merged. Make sure you understand how long it may take for a response so your expectations are met. (For my [small fix](https://github.com/jekyll/minima/pull/379) it was less than a day).

## Handling criticism

You may want to tick _Allow edits from maintainers_ to make small stylistic changes easier to happen. A GitHub user thanked me for my change and saw that there were further fixes in the area I was working in. I had a look but couldn't come up with a clean solution to the extra fixes. For the extra fixes, a small architectural rejig was required and I didn't have time to further study the code base. Basically, it's okay to say no — we're all volunteering our time here.

Separate yourself from your pull request. Your code does not represent _you_. For example, you may not be familiar with design patterns used elsewhere in the project. The worst thing that will happen is someone advising you to try again. You'll be shocked at how helpful and welcoming people are in the open-source community.

We want you to succeed! If you're experiencing pull request anxiety, throw up a one-line change on one of my [toy projects](https://github.com/healeycodes). I'll greet ya with a smile 😊.
