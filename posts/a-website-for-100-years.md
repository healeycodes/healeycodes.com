---
title:  "What If I Want My Website to Last for 100 Years?"
date:   "2019-06-24"
tags: ["fun"]
path: "discuss/webdev/javascript/opensource/2019/06/24/a-website-for-100-years.html"
description: "Prepping for the internet to happen."
---

When all other resources fail me, technical blogs come to the rescue. They provide insight into my problem, clues about the design of a potential solution, and sometimes humor or even an emotional connection. I collect new tech blogs. I devour them.

I write to provide that same benefit, (I try) to help other engineers and to promote free and open software (FLOSS — [Free/Libre and Open Source Software](https://www.gnu.org/philosophy/floss-and-foss.en.html)). I go back and correct errors, add asides, links, and errata. I work on new content but improve the old stuff too.

Aside from the innumerable benefits, open-source software is vital for a long-lasting website. Closed software will always come to an end. The EOL date for Adobe Flash is 2020 — software that was used on [28.5% of all websites in 2011](https://opensource.com/alternatives/flash-media-player). Its demise has been met by cheers but people are grappling with the prospect of [lost content](https://github.com/open-source-flash/open-source-flash).

Let's say I plan to revamp my [personal website](https://healeycodes.com/) into a brief footprint on the sands of time. What can I do to extend the shelf-life of the second iteration of its production system? What web standards are sure to be kicking as the century turns over and [The Clock of the Long Now](https://en.wikipedia.org/wiki/Clock_of_the_Long_Now) ticks again.

## Static vs dynamic

To define, I'll say that a [Jekyll](https://jekyllrb.com/) website is static and a Node.js/Express program with database calls is an example of dynamic. A static site generator takes some files, usually text-based, and builds a website into a folder which can be dispersed by any web server. These generators are smart, they build interactive nav bars, minify all of your files, some even make API calls to get up-to-date information.

[Gatsby](https://www.gatsbyjs.org/) is a static site generator that takes advantage of modern browser features. It uses progressive/responsive image loading, offline access, and [provides](https://www.gatsbyjs.org/features/) a React-based design system with a bustling eco-system surrounding it. But if I have some content that I want to provide to the world for a century, Gatsby seems like overcomplicating the problem. It adds many dependencies and is working on [accessibility](https://www.gatsbyjs.org/blog/2019-04-18-gatsby-commitment-to-accessibility/) where other generators are accessible by default because they're flat sites.

At the very worst, a static site generator will generate HTML files which can simply be read by the human eye. They can be archived and left. Content management systems like Blogspot or SquareSpace generate a pile of JavaScript which pulls your files from a propriety location, likely without a published spec.

## Markdown

Markdown sounds like the tool for the job (but only if a spec is included). Since its [invention](https://daringfireball.net/projects/markdown/) Markdown has empowered READMEs, blogs, forums, and more. I use it to drive a number of things including this article. However, it exists under a kind of living tree doctrine. Services add their own features and interpretations (which is a good thing) but for our century-long plan, we'll need a document that explains how the markings should be interpreted to display the content in its originally planned manner.

> I think of the oak beams in the ceiling of College Hall at New College, Oxford. Last century, when the beams needed replacing, carpenters used oak trees that had been planted in 1386 when the dining hall was first built. The 14th-century builder had planted the trees in anticipation of the time, hundreds of years in the future, when the beams would need replacing. Did the carpenters plant new trees to replace the beams again a few hundred years from now?
<small> — WIRED SCENARIOS: THE MILLENNIUM CLOCK DANNY HILLIS</small>

## Maintenance

An ideal software stack might have one dependency, a run-time from a too-big-to-fail programming language. Perhaps a static site generator written in [pure Python](https://github.com/lepture/mistune). Maybe even that is overcomplicating it. Some blogs that I enjoy are created via [Makefile](https://github.com/mitsuhiko/lucumr)! The [Lindy effect](https://en.wikipedia.org/wiki/Lindy_effect) is a theory that means _the life expectancy of technology is proportional to its current age_. I would like to avoid revamping every five years ⁠— or sixteen times in this coming century. Maybe the ideal technology is in fact from a decade ago and is not present in my lexicon.

Dead links are a problem but a link crawler can be run on a cron job. I use a similar method and go back to correct links to resources that have moved — or I use an alternative resource. If a source disappears entirely, I'll write a footnote. I know some writers back up all of their sources to create a self-contained web — which is a noble, librarian-like goal.

Continuous improvement of the lightweight design _and_ the content will be necessary. Or we could just write as professors do, take Peter Norvig's article on [solving sudoku with Python](https://norvig.com/sudoku.html). It's written like an RFC spec and apart from the two graphs is replicable by a century-old typewriter.

## Content that mellows

Through repetitive practice, my writing has and will improve over time. I don't want to leave my old articles to rot. Posts about specific technologies can be locked (with minor trimming) but there are others which aim to be timeless. I wonder about a schedule where content is re-edited and parts re-written every X months. Performing a quick readthrough of many of my old articles leads to me dropping a resource here and an extra example there. Evergreen.

It's at this point that proper version control becomes important as changing an article can change the meaning, which can invalidate an offsite citation. Providing access to different versions of articles sounds non-trivial for a static site generator. It sounds like Wikipedia's [system](https://en.wikipedia.org/wiki/Help:Page_history)!

If you are interested in solving any of these problems with me you should [contact me](mailto:healeycodes@gmail.com)!

## Tech blog recommendations

- [Julia Evans](https://jvns.ca/)
- [Peter Norvig](https://norvig.com/)
- [Drew DeVault](https://drewdevault.com/)
- [Alice Goldfuss](https://blog.alicegoldfuss.com/)
- [Tristan Hume](http://thume.ca/archive.html)
