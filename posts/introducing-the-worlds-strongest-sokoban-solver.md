---
title: "Introducing the World's Strongest Sokoban Solver"
date: "2026-11-16"
tags: ["go"]
description: "Using agents to do state-of-the-art solver research."
---

[Soksolv](https://github.com/healeycodes/soksolv) solves more levels than any published Sokoban solver on both standard benchmark suites, including 24 world-first automated level solves. It's also faster on the levels that other solvers solve (~3.2x in total time).

<div className="sokoban" id="solvedByTime"></div>

As is common for this era, I did not handwrite a single line of code. I used one long Opus 5.5 session in Claude Code, along with ~430 subagents (a mixture of Sonnet 5.5, Opus 5.5, and Fable 5.2) for an API-equivalent cost ~$3,500 (I used the $100 plan, and a reset).

I ran the 14-day long Claude session from my MacBook and did ~50% of the work on-the-go by dictating to my iPhone via `/remote-control`. On the compute side, I needed 15,000 vCPU-hours (AMD EPYC) to do research and verification runs, as well as the (very) long benchmark runs. 

## Sokoban Quick Tour

First published in Japan in 1982, Sokoban is a puzzle game where you push boxes onto goals. It was proven PSPACE-complete in 1997, and small boards hide massive search spaces. Human-solvable levels commonly need hundreds to thousands of moves.

Below is the solution for _Microban #1_.

<div className="sokoban" id="sokoban101"></div>

## Levels are Adversarial

Sokoban levels can be explored as a cyclic graph of moves. With a branching factor of ~16 (but up to ~176 on huge boards!), any kind of brute forcing becomes unviable after a handful of moves.

As a player, and especially as a solver author, Sokoban levels feel adversarial by design. Any obvious heuristic is immediately punished by the game rules or the level author.

When I wrote my first Sokoban solver (~4 years ago), I tried to encode how I _thought_ I was playing the game. Without thinking too hard, we can describe this as "get the boxes to the goals". Okay, so, how do we calculate that in a program? Maybe the sum of box-to-goal distances?

Using this as a guide, we can explore the graph of possible moves and see what happens.

<div className="sokoban" id="greedyTrap"></div>

Ah, by prioritizing boxes on goals we walk right into a trap. The game becomes deadlocked and unsolvable, and our solver with a single rule runs until the end-of-time with no solution.

We'll need to come up with a bag of strategies to perform better than even novice players.

## Laying Out the Project

I've been using frontier agents at work for a while now and I enjoy (and get a lot of profit from) what I call "creative goal setting". Where you define the goal, parts of the path, risks that you consider acceptable, and some preferences on the method.

What I've experienced, is that agents are really great hill-climbers, and a solver program is the purest hill there is. There are two things to measure: the number of levels solved, and some kind of aggregate time of those solutions.

At the beginning of this project, I started a Claude Code session and defined a hill climbing plan. One immutable incumbent version of the solver (the first version was just a brute force search), one hypothesis per experiment, a frozen verifier (so agents don't cheat), and separate promotion suites.

As I continued to make progress, I expanded the pool of levels that I measured my solver against until I was taking on the two common benchmarks used in the Sokoban solver community; the Large Test Suite and the Open Test Suite, which contain increasingly complex Sokoban levels. There are some duplicate levels between the suites with a unique count of 9,756 total levels, with an average of 16 boxes, and ~830 moves (~160 pushes) to solve each.

I knew that I didn't want to build on top of an existing solver for two reasons. The first was that I did this project because I love this kinda stuff, and it's a less interesting journey to make small patches to an existing program. It's much more fun to be part of something from scratch and to live the narrative of it.

The second reason, that I didn't realize until the ending stages of the project, was that if you build on top of existing solution, you become extremely tied to certain design decisions without the knowledge of those decisions, and it becomes impossible to make improvements beyond one order of magnitude.

So I set some initial ground rules for the agents. No machine learning (much harder for me to audit), no reading the code of rival solvers (or we risk copying inefficient designs), and no hardcoding to solve levels (that's cheating).

At the beginning of the project, I was concerned about agents cheating. I'm sure we all remember early LLM generations that would just comment out tests to achieve their given goals!

But I found no signs of agents cheating at all. My best guess for this is that I steered agent motivation towards experimentation and learning rather than it being a pure numbers game.

Two more ground rules that I set were: the solver must be written in Go (I find it fun to read), and a 15 GB memory cap so it fits on an 8-core/16 GB machine. I also wanted to use the same cores as Festival (the leading rival solver) for matters of fairness.

During the iteration cycle, each solution was replayed move by move on the original level using the frozen verifier.

<div className="sokoban" id="verifier"></div>

The verifier lives in its own package and agents weren't allowed to edit it. I also had a similar check when promoting new pruning rules. I had 2,632 known solutions that were replayed through it and if the prune cut a single known solution then it was failed (this ended up catching two unsound pruning rules before they landed).

## How Solvers Think

So earlier I spoke about solving levels as being like exploring a graph, right? And you probably counted each node as being a worker step or a box move. But walking is free! Only pushes change the puzzle. So we search over pushes and treat "where can the worker reach" as a flood fill.

One "position": the box squares and which _region_ the worker is in (not the exact square).

<div className="sokoban" id="pushesNotSteps"></div>

There are many optimizations like this to shrink the search tree of moves. For example, boxes can only be pushed, so when a box is stuck in a tunnel, there are a number of forced pushes that can be collapsed into one macro move, which makes the tree shallower.

<div className="sokoban" id="macroTunnel"></div>

My solver had humble beginnings. I started with a best-first search. Expand the most promising positions, and kill positions that create dead squares.

<div className="sokoban" id="searchTree"></div>

Another obvious optimization is to deduplicate positions. Two positions are the same if the boxes are on the same squares and the worker can walk to the same boxes.

<div className="sokoban" id="dedup"></div>

The worker can stand anywhere it can walk to and it's still the same position. So I store the worker as the first square of the area it can reach (top-left wins), and all of those collapse into one entry. The right side of the diagram roughly shows this can be stored efficiently in memory.

## Deadlocks

One lesson that I learned early on is that most of the search area is dead! But outside of the obvious cases, it's either difficult to see at first that it is dead, or it comes with a cost (node searches) to figure out that it is in fact dead.

There are the simple deadlock cases:

<div className="sokoban" id="deadlocks"></div>

There are simple deadlock squares. For example, here on _Holland #68_, 19 of the 69 floor squares can never hold a box:

<div className="sokoban" id="deadSquares"></div>

A more advanced technique that relates to deadlocks is called PI-corral pruning (Push-In corral) where a _corral_ is a region the worker cannot reach because there are boxes in the way.

The insight here is that these corrals must eventually be dealt with and so the solver can prioritize pushes into them which may prune other moves that postpone this work.

In other words, there's no point spending time solving one half of the level if there's a small number of forced moves that may make the original position dead!

<div className="sokoban" id="piCorral"></div>

The three boxes on the right fence off an area the worker can't reach. Every push of those boxes goes into that area, so nothing else on the board can help until one of them moves, which leaves 3 pushes worth trying instead of 7.

Many levels have a concept of "goal rooms" where every box ends up clustered in the same area. Solvers need to carefully consider the packing order of goals in order to reduce the search area. The number of fill orders is roughly `n!` for `n` goals (10 goals ≈ 3.6 million orders), and for some levels, most of those will lead to deadlocks.

<div className="sokoban" id="goalRoom"></div>

If the first box stops on the nearest goal then it parks right in the doorway, blocking the other two from getting past it.

## Searching From Both Ends

A really cool insight into Sokoban solvers is that you can search backwards from the solved position by _pulling_ boxes. Just to be ultra clear here, as you may be skim reading, in the game Sokoban, you cannot ever pull a box. However, by simulating pulls, you are effectively rewinding time of a potential solution. A forward and backward search that meet in the middle need significantly less positions than either alone.

<div className="sokoban" id="pushPull"></div>

Going forwards, a box pushed into a corner is stuck there for good so many squares are dead ends. Going backwards you pull boxes and you can always pull a box back out of a corner. So on this board, the backwards search has no dead squares at all.

Consider again the branching factor of ~16 that I mentioned. Each additional deepening increases the search area. So if you can start at both ends at once, then each search tree is cut to half of the depth (`b^d` nodes become about `2*b^(d/2)`). As we can see here on _Microban #5_.

<div className="sokoban" id="meetInTheMiddle"></div>

## Feature Space Search (FESS)

Feature Space Search (FESS) was used by the first solver to solve the 90 XSokoban levels (a benchmark once out of reach for computers). [The paper](https://doi.org/10.1109/CoG47356.2020.9231929) is incredibly interesting and clear and approachable (it's also not math-heavy!). I really recommend reading it directly but I will also summarize the key concepts here.

I should also note that the primary author of the FESS paper, Yaron Shoham, is also the author of the very-strong Sokoban solver Festival, of which my solver is greatly indebted to the methods of.

I think the best way to explain FESS is to compare it against best-first search. So, instead of prioritizing a single node-score (calculated from some useful metrics) and using that to guide the search, FESS instead:
- Picks a few features that describe progress (i.e. boxes packed, how connected the free space is, how many rooms the worker can reach, etc.)
- Projects each position into a cell of that small feature space
- Cycles through cells and expands from the least-explored ones, so that search spreads across different kinds of progress
- Takes advice from _advisors_ that suggest moves that improve one feature

To better explain these "features", let's take a look at _Holland #68_ after 38 of 261 pushes.

<div className="sokoban" id="fessFeatures"></div>

And then, a concrete example to show the efficiency gains is to look at how the search area is expanded on _Microban #35_ with best-first compared against FESS.

Here's the same level searched two different ways. Each cell in the grid is one combination of features: boxes on goals across, and worker areas up. The number in the cell is how many positions the search has expanded there so far. Best-first always picks the position with the lowest estimate (on this level that means it camps in one cell and spends 405 of its 1259 expansions there). FESS takes turns instead and alternates with the best cell so far and it's done in 823 expansions instead.

<div className="sokoban" id="fessCells"></div>

Although, to be fair, on most of the small Microban levels like this one, best-first is usually quicker. FESS does best when the estimate is wrong for thousands of positions in a row.

I steered my planning agent to implement directly from the FESS paper on day one as it remains the cutting edge classical search strategy for Sokoban.

## Novelty Search

On day two of the project, I kicked off a research agent to explore ideas from other domains and to pitch me on some experiment ideas.

This idea of _novelty_ came out of that exploration, which was applied to different areas of my solver to help widen the search area, to hopefully steer different kinds of search into fruitful areas. Novelty comes from classical planning: width-based search / "novelty" by Nir Lipovetzky and Hector Geffner (IW, 2012; best-first width search, 2017).

So to avoid getting stuck in low-value areas of the search tree, novelty can be used to reward positions (or, more abstract states) that have not been seen before.

For example, when choosing between similarly ranked moves, placing a box onto a square that no box has been on so far can aid when trying to make a forward search meet a backward search, because we are widening the so-called "middle".

<div className="sokoban" id="novelty"></div>

A position counts as novel if a box lands on a square that no box has touched so far in this search. Novel positions can jump the queue. In this example, it takes 33 expansions with the rule and 73 without.

## Lanes

A heavy steer that I gave my planning agent throughout this project was to make good use of concurrency and I really pushed for communicating, organizing, and re-using work. One of the reasons I pushed in this direction, is that concurrent programming is inherently difficult for humans (but less-so for frontier models) and all the other leading solvers are human written.

Additionally, all serious rival solvers are written in languages where it is hard to write fast _and_ correct concurrent programs like C and C++. So I believed that my steering here would give me an uneven edge over the rivals.

Thus, my solver makes great use of a lane architecture. Many different searches run in parallel on all 8 cores and help each other. Festival also uses this concept.

A lane is one search configuration on its own core with its own memory share. They publish positions into shared tables (to meet each other), share deadlocks, and depending on their progress, they lend each other memory.

For example, on _Holland #68_, no single lane is able to solve it within 10 sec but together the lanes finish it in 3.8 sec!

<div className="sokoban" id="laneSchematic"></div>

This lane architecture is a key strategy to fight against the difficulty of the adversial-seeming levels of Sokoban.

Very often, no single lane is able to make progress but as lanes prioritize different areas of the search tree, with each making unique decisions, they end up collaborating over and over again.

<div className="sokoban" id="lanesTogether"></div>

Through testing, I found that it's important to keep a balance of forward lanes and backwards lanes. A concept that frequently occurred in my research was to make connections between different kinds of work.

<div className="sokoban" id="meetTable"></div>

A positions hash decides where it goes in the table. The tables are a fixed size so a new entry can land of top of an old one, which is fine in practice. The worst that happens is we miss a meeting that we could have had (but the new meeting is fine too!). For example, on _Grigr2002 #17_, the lanes posted 8 possible meets, 1 checked out, and the level was solved in 0.65 seconds.

As I mentioned before, one kind of "speed limit" on travelling through the search space is having to do work in order to discover deadlocks.

Along with valid positions, that are aiming to meet in the middle and connect a solution together, deadlock positions are also shared in order skip duplicated work.

<div className="sokoban" id="sharedDeadlocks"></div>

Later, when another lane runs into the same three boxes configuration, with the worker on the same normalized square, it can look up the pattern (without searching further ahead!) and skip it because it now knows it's dead.

## Factoring

During the beginning stages of this project, I wanted to see how my planner agent and its research subagents would make progress without copying ideas directly from existing solvers. This got us pretty far, and we were able to solve ~93% of the benchmark levels at that point.

But eventually we hit diminishing returns and it was time to draw on every possible signal; reading through existing codebases, and altering them to leave behind "search traces" for analysis by frontier models. Tearing down my initial ground rules that banned such actions.

One research agent spent some time analyzing which levels that Sokolution was able to solve (levels that no other solver was able to solve). The odd thing was that it solved these seemingly complex-for-other-solver levels very quickly, in a handful of seconds. The theory the research agent came up with was that (due to the level layout) Sokolution was _factoring_ the levels, by which we mean that it is splitting the levels into different parts that can effectively be solved independently.

By separating the task into multiple search trees, it reduces the depth of each tree and helps avoid the deadly branching factor. Now, this strategy is less strong (or doesn't apply) to many other levels (mostly _Life_, _Premysl Zika_, and _Secundus gradus ad Olympo_ groups). But on the levels that it can solve, it performs well as part of a portfolio of other strategies that the solver employs.

<div className="sokoban" id="factoring"></div>

There are different ways that levels can be separated like this. One common method is that you can count dead box areas as walls (since boxes may never cross such a boundary) and slice up it into multiple search trees.

<div className="sokoban" id="factorPartial"></div>

## Relays

As you may be picking up by now, most strategies are interested in shrinking the search area, smaller and smaller, until we're able to walk right up to the solution.

Which brings us to _relays_. This strategy comes into play when a lane gets stuck close to the goal. For example, if a good number of boxes have been placed on goals already, the whole portfolio of strategies can be restarted on the best board state that has been seen. With the finished boxes becoming walls!

<div className="sokoban" id="relay"></div>

This was one of the later experiments, when we were really grinding to break through some of the "gap" levels (levels that other solvers solved but at that point we did not). Its discovery was rewarded by 7 level solves.

## The Experiment Machine

The software factory (if you will) ran like this. There was one planning agent (Opus 5.5) that ran on a heartbeat check of 15min which checked on in-flight experiments and the health/connectivity of VMs. This planning agent was tasked with driving us forward. It listened to my setup instructions (a rough design of how I wanted to hillclimb, ground rules, general direction) and then picked experiments, analyzed results, and promoted winners.

There were then two types of subagents:
- Builder subagents (Sonnet 5.5 or Opus 5.5, depending on the task) which implemented one experiment idea on its own git branch.
- Analyst subagents (Opus 5.5 or Fable 5.2) that diagnosed issues, reviewed and planned, but never wrote solver code (this was my personal steer to avoid inflating token usage).

Another design I asked to be implemented was a level ledger as the single-source of truth when it came to our capabilities per level. For example, we needed to track which levels had been solved, which levels regressed, which were fast and slow. Certain families of levels received tags and helped inform the research direction based on the potential impact of wins.

When I was able to be more active, I would ask the planning agent to pitch me on ideas so I could inspect and steer the direction we were building towards but overnight I would give it permission to drive and make larger decisions.

One of the areas that I added a lot of value was when it came to risk. All the agents seemed extremely uncomfortable with taking on any amount of risk (even when I specifically asked them to take it on). The agents were petrified about regressions or their analysis being incorrect. I suppose they felt like this because they had all the tools they needed to be 100% correct. The only problem was that this would have cost an immense amount of wallclock time.

> Planner: You're right about my tendency to over-verify.

A full 600 sec run of the two level suites takes ~85 hours per 8-core/16 GB slice of a VM! I had to set in place many mechanisms to restrict the agents wallclock spend like forcing all commands to have certain timeouts, spawning many research agents to search for ways to get signals from testing runs without spending the entire time (e.g. scoring progress before actually hitting the goal, and measuring how closely we followed known solution paths).

Without heavy steering when it came to wallclock time, my gut-feel is that this project could have lasted 10x as long as it did (which would have extended it to just under half a year).

<div className="sokoban" id="agentMap"></div>

Another problem was that agents are all too happy to seek 1% improvements over and over. They crave anything to make progress towards overall goals. The problem is that this domain demanded far more aggressive thinking and experimentation (again, something agents can be weaker at).

Many of my steers were to kill off different kinds of research that were thinking too small, that were just iterating on ideas that didn't feel strong enough to take us the whole way.

Early on in the project, I set strict gates on what an experimented needed to prove in order to earn a promotion. They needed to result in "10% gains" meaning level performance, or progress towards solving trimmed level suites. With a minimum of +3 new levels solved for each and almost no regressions.

Towards the middle of the project, with much of the low hanging fruit gone, I steered the planning agent to spend time thinking about cheap gates that could be ran before a full implementation and a partial benchmarking run. This was extremely profitable and helped increase progress-per-wallclock during the middle section of the project.

Another thing that I heavily steered was asking for more experiments to be put in flight even if they had slightly overlapping areas of interest. The planner preferred to wait for results but, again, this cost too much wallclock time. The tokens were far cheaper than the compute, so better to spend and waste tokens, than spend and waste wallclock time and compute.

<div className="sokoban" id="promotionFlow"></div>

You can see the cheap gates arrive on Nov 5 and then from then onwards, most failed ideas died at the gate (orange) before they ever made it to a fuller test phase (red).

These gates involved:
- Deterministic screens by node count instead of time
- Packing two jobs onto one machine, which the planner hated because the data was "unpure"
- Grouping levels by family and assuming they behave alike
- Ultimately, accepting regressions because progress favored fixing them rather than spending so much to avoid them

In the final quarter of the project, a lot of this had to be teared down. The mid-hanging fruit was gone, regressions were common, and the bets were far more difficult to find. Also, the gains that we were looking for were far smaller too. I'd guess that the time-per-experiment increased by a factor of ~5, due to the additional testing and verification that was required.

## Boxes That Start on Goals

To go back to heuristics for a sec, there was one day during the project where we got stuck on a large group of levels that started with boxes already on goals. You'd think that "boxes on goals" would be the gold standard of Sokoban heuristics to follow but it turns out to be a lot more complicated than that.

11% of the benchmark levels start with 75% or more of their boxes already on goals! And boy did this mess with our heuristics. Every progress signal (boxes on goals, goal distance, packing order) all said that we were very near the finish, except a "jumbling" of the level was required.

Some naive experiments quickly failed like "unpack first" or lowering the rewards for boxes on goals.

Finally, a Fable 5.2 analyst was able to break through and pitch a "dive" lane, a greedy search backwards from the solved position that _maximized_ distance from goals with a return phase at the end. The result was that 12 of a cluster of 16 stuck levels became solved.

So, we were never able to make "boxes on goals" stop being a strong signal. Instead, a lane was added that deliberately ignored that advice.

<div className="sokoban" id="boxesOnGoals"></div>

Three of the four boxes here start on goals and it looks nearly done, right? But two of them have to come off before anything else can actually go in. So the count drops 3 → 1 before climbing back to 4.

## Benchmarking

While the experiments did run their own multi-hour benchmark runs on subsets of level suites, it wasn't until the very end of the project that I asked the planner to take on a full 600 sec benchmark run, which as I said earlier, takes ~85 hours per VM-slice!

All this work to just sit and wait and watch the progress and the planner agents projections. My solver ended up losing the first full benchmark by a few levels.

In order to save hundreds of $, I decided to only benchmark against the strongest rival, Festival, and for the others, I trusted their public benchmark numbers. But I knew that I wanted to verify my solver against Festival on like-for-like hardware and configuration.

Being a few levels short, or even a few levels over, was clearly not good enough. It was within the noise threshold, so back to the design board we went.

After further experiments and promotions, it was time to run the final benchmark. 8 dedicated cores and a 15 GB cgroup each, along with each solution being verified. My solver pulled ahead, beyond the noise threshold, to just enough to be able to claim victory: +10 on LTS and +18 on OTS ([full results](https://github.com/healeycodes/soksolv/blob/main/benchmark/README.md)).

<div className="sokoban" id="closingTheGap"></div>

## Results

I've gone with a somewhat spiky claim in this article, stating that my solver is the strongest in the world, and I believe I have a pretty good claim to it.

<div className="sokoban" id="leadByLimit"></div>

Note: charts and numbers in this post use Festival measured on our hardware at every limit (+10 LTS / +18 OTS at 10 min). Where charts reference rivals, they use their published numbers (from other benchmarks) because I could not afford the compute to be thorough. Full benchmark results, with per-level times, are [in the repo](https://github.com/healeycodes/soksolv/blob/main/benchmark/README.md).

Median time per solved board is 0.05 sec (ours) vs. 1.00 sec (Festival). On the 9,223 levels that both solver solve, there's a 4.40 sec vs 14.16 sec mean, and ours is faster on 8,809 (96%).

<div className="sokoban" id="speedScatter"></div>

Additionally, my solver achieves 24 world-first automated solves (especially in the Premysl Zika and Sven Egevad family).

Against the community (unverified numbers aside from Festival), we also rank very well (see diagram at top of post).

## Could You Just Prompt This?

I would be interested to know if you could one-shot this project with a prompt. I suspect so. Something like "Fable, here's unlimited compute, build the best Sokoban solver".

However, I think it comes down to efficiency. Without a human driver, I strongly believe the wallclock time (and therefore the compute costs) would be in the 100x range. Validating each of the 792 experiments the proper way would take ~67,000 VM-slice hours, or ~$20,000 at market prices. Or, ~230 days of wall-clock in the VM configuration that I ran.

During this project, I felt a little closer to a technical manager than an IC; following, steering, and guiding. It's kinda like managing a team of strong engineers. Sure, they can go off path and waste some time, but a light steer will fix it.

Writing a solver is extremely agent-friendly. The results are easily verified and there's no human experience to tune for.

This project ultimately felt like a strategy game, something from the Tycoon family. I'm a big computer gamer, and I think this is where I drew some of the motivation from. The methods, the experiments, the results, it all had a physical feeling to me. It felt like a fight.

I think in this agentic age of software, you have to want the goal as much as the agent. Yes, anyone can build software. But you need to care about it, you need to love it. The human focus and effort remains.

In the end it took 388 messages to the planner over 14 days.

## Standing on Shoulders

This project would not have been possible if Yaron Shoham (Festival, FESS) had not published incredible work, as well as open sourcing a strong solver with multiple releases.

I took deep inspiration from any open source solver that I could find, as well as watching closed-source solver behavior as much as possible. I initially thought I would need to reverse engineer the closed-source ones to cross the finish line but it did not come to pass.

The animations in this article were generated using Fable 5.2 and use the Lager skin by Borgar Þorsteinsson (CC BY 3.0).

## What's Next

While I'm interested in reaching a 100% completion of the benchmark, I will need more compute-efficient strategies to do so.

As I mentioned, I steered away from some of the known machine learning research that has been applied to Sokoban boards because I wanted a classic solver that was easy to audit. But perhaps there's some interesting strategies and combinations of classic+learning solvers that can be written.

I'm looking for more projects that are shaped like this one, where I can learn more about puzzle solving, and compete with the work of others.

Get the source code for my solver here: https://github.com/healeycodes/soksolv
