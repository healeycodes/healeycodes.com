---
title:  "The Weird Rules I Set Myself That Got Me a Job"
date:   "2019-04-18"
tags: ["career"]
path: "discuss/career/beginners/productivity/2019/04/18/the-weird-rules-i-set-myself.html"
description: "Advice that I haven't seen elsewhere."
outdated: true
---

The following isn't good advice. It's just _advice_. And even that's a stretch.

I used to be really into those productivity hacks. No zero days, Pomodoro, writing up your goals for the day, starting a task for five minutes, etc. Eventually, they merged into a document of rules. I wanted to work as a coder. I had digested all of the advice I could take. Blogs and READMEs, complex graph charts that spider out describing your career in buzzwords you don't even know yet. Enough of the analysis paralysis, I said, and typed up some rules in a small London coffee shop. To these, I stuck.

The following sections describe some of these rules and the results (interviews, job offers) but do note that my success is probably unrelated to every word printed here.

## Write code in two languages every day

For me, this was JavaScript and Python. I was aiming for full stack and back end positions. If I was stuck on my projects, I would code up data structures from scratch in both languages. The repetition helped them stick. I wanted to be ready to write relatively clean code in either language without any preparation, should I be called to interview. Solving problems that are challenging to you is never a waste of time if your goal is to learn.

Sites like [LeetCode](https://leetcode.com/) and [HackerRank](https://www.hackerrank.com/) have questions that you can sort to get progressively harder. What's important is that you realize that the goal is not a correct answer — it's _understanding_. Pushing at the edge of your knowledge should spawn mini study sessions where you chase down different implementations of the solution so you understand the whys and hows. I found that personal blogs always had the best break-downs.

## Read yourself to sleep with a textbook

If you've seen my other writing, you'll know that I won't stop recommending _Grokking Algorithms_. I chose the Computer Science textbooks that I enjoyed, not necessarily ones that would help in my job search. These books didn't have to have code or math in them, e.g. _Code: The Hidden Language .._ or _The Mythical Man-Month_. A lot of the stuff I did during my job search was to get in the right headspace. This is embarrassing to say but I did the things that I pictured a good software engineer doing. Which I suppose is like wanting to be a good basketball player and spending your post-practice time standing in center court just staring at the hoop. It's good to just rest some times, ya know.

### Study interview question trivia every day

I wasn't trying to memorize, which would have felt cheap, I was trying to understand what these questions implied in order to direct my learning. They are asked for a reason. `setTimeout` trivia questions are really about asynchronous programming and the Event Loop. I had to know the answer and be able to speak about the subject it represented. These sessions were scary first as they further revealed everything I didn't know (and still don't!). 

Not often will you have to call `delete` but it's good to know what it does and _doesn't_ [do](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/delete) (I was asked about this in an interview). Searches like `most popular JavaScript interview questions` will find you the lists I'm talking about. These questions can get pretty esoteric so your mileage may vary.

## Three testable projects with instant interaction

Three felt like a good number. I worked backward — coming up with the blurb and the bullet points for the projects on the resume first. Building the projects came second. They each needed a test suite, e.g. `npm test`, `pytest`. In my mind, good engineers test everything. I suppose I still believe that. Getting tests written early on speeds up the later stages of development.

What do I mean by instant interaction? I guessed that someone reviewing my resume would spend about four seconds per each hyperlinked project — and that most wouldn't even click. I hosted all three projects on a Digital Ocean [Droplet](https://www.digitalocean.com/products/droplets/), local to my region. Digital Ocean have some great guides for getting started with Linux too. I didn't want to use free options, like Heroku's free tier that sleep when not in use and have to wake up when a visitor arrives — there go my four seconds.

Once they arrived on the page I wanted them to be able to interact with the core idea of the project instantly, e.g. no sign-up or authing required. I'll skim over my projects to give you a better idea.

**CodePen Teams Clone**

I was (and still am) very into pair programming and created a low latency solution for remote collaboration coding. I cloned the design of CodePen but piped the display data over WebSocket to the whole room. Teammates could see live edits in about 25ms. Rooms could be forked too. When arriving on the home page, the _Create Room_ button was front and center.

**Game Jam Highscores API**

This was a free solution I ran for a few years for game devs to instantly set up a highscores backend by just calling our RESTful API. Upon loading the home page, you were greeted by your API key, and there were links prefilled with this key to test out the features.

**Lightweight Google Analytics Clone**

I cloned Google Analytics in the most basic way possible, allowing people to roll their own analytics. The angle was privacy-friendly and people were only tracked for 24 hours. I linked to the demo page on my resume, with animated graphs that popped up with page views, unique visitors, avg. time on page, bounce rate.

Back to the rules.

## Read ten resumes a day

People post tech resumes all over the place but I found the most high quality were on [r/cscareerquestions](https://www.reddit.com/r/cscareerquestions/). After all the studying, whether you got an interview or not was almost totally weighted by your resume. Reading all these resumes helped me understand what my own was competing with. It gave me ideas for sections, page design, and even projects. I also helped out by pointing out grammatical errors wherever I saw them. I took my time with them — even printed them out sometimes and marked them with a pen. There's historical precedence for this kind of behavior, Hunter S. Thompson typed out the entirety of The Great Gatsby and A Farewell to Arms (on a typewriter no less!).

## Cover letter with genuine connection

Cover letters seem to be more beneficial over here in the UK. I count the little text boxes that companies offer with your application as a cover letter too. I fought hard to write something genuine as I really believe that sincerity wins over everything else. I liked to read the company's tech blog if they had one and if not I often checked out the source code of their website and tried to find interesting things to comment on. I even found a leaked API key once. In most of my interviews, topics from my cover letter were brought up.

## Pace and plan for phone interviews

Print out everything beforehand and lay it out on the bed. The job post, my personalized resume for that job, the companies bio page, the interviewer's LinkedIn (although, don't allude to this) — it helped me understand their background and seeing their face was relaxing. It helped remind me that people are almost unanimously friendly and want you to succeed. I've always paced around the room for phone interviews. I alternated between pacing and lying flat on my back.

## Travel to interview location the day before

I traveled down to the interview's location the day before so that part of my journey would be stress-free. I visualized myself interviewing, getting the job, and working there — like I was going on my new commute. Being familiar with the area made me more comfortable when I ended up in the room and that's what it's all about really. An hour or so snapshot of yourself. Nothing could prepare me for getting lost in the building though, which actually happened twice.

Following my application, I ended up with a phone interview rate of 10%, all of which invited me to interview in person. I approached test projects with the same obsessive gusto I've unfortunately shown in this article.
