---
title:  "The Flow of Knowledge in a Team (or Why I Dig Tickets)"
date:   "2020-05-31"
tags: ["career"]
description: "Engineering tickets often end up meaning a lot. For the product but also emotionally for the individual."
---

Engineering tickets often end up meaning a lot. For the product but also emotionally for the individual. It's the engineer's job to be involved in the whole process from before the ticket even exists. Engineers refine the ticket, estimate the ticket, and shuffle it through columns on a sprint board until customers receive a feature.

The way products are built varies at every company. A team I sit metres away from at work do things so differently that there would be a learning curve if I joined them. But the concepts remain the same.

The fun part about writing this will be hearing about all the different ways y'all make software.

## Feature or fix?

A ticket can be a feature that needs to be completed, a bug that requires solving, or a chore that needs doing (e.g. code clean-up, documentation creation). A _spike_ is a type of ticket that means the situation is unclear. Perhaps it's because there are unknowns about the technical implementation. Perhaps what's required is checking where a tricky bug is originating from. A spike can sometimes mean: go and figure out what tickets need to be created to solve this problem and then create those tickets (the hydra of tickets).

In the [Agile](https://en.wikipedia.org/wiki/Agile_software_development) methodology, tickets shouldn't be time boxed but spikes are one of the exceptions. Without a time-limit, when does the engineering stop if unknowns are involved? It's far better to write down your findings and get your team's input. Sometimes spikes are easier than they seem and the development work can be completed within the time-limit and everyone is happy.

## Where do tickets come from?

Here are some ways that tickets can come into existence from nothing.

- A customer complains about a bug and a support engineer documents it
- A project manager or team lead plans a piece of the project
- Some technical debt is created while working on another ticket
- A developer realizes that their current ticket requires additional parts
- Another department (e.g. data scientists) require some work to be done

## Where do tickets live?

Most tickets exist in a sad place called the backlog. It's sad because there are always tickets in there that you want to complete. Things that genuinely improve the product (or your ease of working on the product).

Backlogs usually increase in size until they become unmanageable. At which point they can be filtered and trimmed by certain criteria. _Won't do_ is a common reason to close a ticket — as in: we realized that there is an issue here but we don't have any plans to actually fix the problem. I've seen date cut-off limits where after a year of a ticket existing if it hasn't been completed then it's put out of its misery and archived. A well trimmed backlog is the sign of a well managed engineering team.

Tickets are always archived, never deleted. If there once was a bug that then becomes a bigger bug in the future, you'll wish there was a trail to follow when it falls on your lap.

Tickets are brought out of the backlog into a refinement section. These tickets are then discussed in a backlog refining meeting. Questions are raised and answered before the ticket can continue on its journey. Sometimes the questions can't be answered and a comment is added. A comment might tag someone with a TODO like _@alice to gather more requirements from (other team who requested the feature)_. This ticket will be looked at again in the next meeting.

In a backlog refinement meeting, you might ask:

- Is this possible?
- Is this within our area of responsibility (is this another team's job)?
- Roughly, what steps are involved in solving this?
- How long will this take? 

A good rule for completing projects is: don't do something if you don't actually need to do it. This sounds silly until you realise how often it is broken.

## Estimation

[Planning poker](https://en.wikipedia.org/wiki/Planning_poker) is a ritual that helps get the average estimation for a ticket from a group of engineers. It works best when everyone reveals their estimations at the same time as this removes biases. Planning poker cards are often used because everyone can flip them over at the same time.

The unit of time is 'points' which can seem abstract at first. It's common to hear things like _oh that's just a one-pointer_ or _hm, 13 points is a little high, can we break that up into smaller tickets?_.

Planning poker cards have a modified Fibonacci sequence on them. 1, 2, 3, 5, 8, 13, 20, 40, and 100. Why? The International Scrum Institute has a [good summary](https://www.scrum-institute.org/Effort_Estimations_Planning_Poker.php):

> The reason for using the Fibonacci sequence is to reflect the uncertainty in estimating larger items. A high estimate usually means that the story is not well understood in detail or should be broken down into multiple smaller stories. Smaller stories can be estimated in greater detail.

When tickets are pointed they can be placed into _sprints_ in a sprint planning meeting ([What is a Sprint in Scrum?](https://www.scrum.org/resources/what-is-a-sprint-in-scrum)). A sprint is a time frame where a goal is worked towards by completing tickets. Traditionally, a working product is demoed to stakeholders at the end of a sprint so that it can be worked on iteratively taking feedback into account.

One sprint follows another. At the end of a sprint there are reviews and retrospectives to ensure that the ways of working are productive and pleasant for everyone involved.

## Interacting with tickets

When I pick up a ticket, I move it to a column called _In Progress_. This automatically assigns me to the ticket and puts my avatar in the corner of the card. This stops people doing duplicate work and helps product managers and quality assurance engineers see who is working on what.

Sprint boards usually have a column for tickets that are in review. GitHub notifications can get lost in a sea of other emails so being able to see what work I can review for my teammates really helps me.

The act of dragging these small cards in the sprint board's UI feels significant. Moving the ticket through the columns, left-to-right, indicates and broadcasts the ticket's progress. The final column, which means the work is done (meaning deployed to production or handed off to another team) is a happy place.

Good tickets are written so they can be scanned efficiently. They use [Markdown](https://en.wikipedia.org/wiki/Markdown) to achieve this by marking sections and highlights. Bullet pointed lists are used in abundance. Good tickets also probably have:

- A user story — the requirements from the POV of a user
- Technical requirements if relevant
- Links to other relevant tickets or previous work
- For front-end tickets, links to designs
- Tags! Tags give the team visibility into blockers and future problems

I like to keep tickets updated so that stakeholders don't need to chase me for an update. I do this by leaving comments about my progress.

I've normally been lucky at companies I've worked at in that code reviews are integrated to the issue tracking system. So 'attaching' a pull-request to a ticket is effortless and is achieved with a single click or comment.

## Document the world

I like documentation. I like the flair that people add. Emojis, GIFs (practical or memes), and embedded videos. I spend a lot of time thinking about the best way to communicate ideas and problems — and I'm very happy that software engineering has allowed me to work on writing for humans. Lean writing that conveys a point. The least words required.

Some days I will be adding comments to technical designs, or explaining a pull-request that grew in size and requires a lot of context to understand. Other days I'll be breaking down a technology for the wider team by assuming the reader has minimal coding knowledge.

If you go the extra mile to throw up an internal documentation page after solving a problem, I appreciate you. I see you editing the onboarding documentation, keeping it tight, the instructions clear and friendly, and I thank you.
