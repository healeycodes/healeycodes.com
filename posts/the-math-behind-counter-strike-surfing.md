---
title: "The Math Behind Counter-Strike Surfing"
date: "2026-11-27"
tags: ["javascript"]
description: "A deep dive into Source engine physics, surf maps, and how my surf bot works."
---

In the Counter-Strike series, surf maps (e.g. `surf_egypt`) are made of steep ramps that you slide along and then strafe from ramp to ramp.

Surfing is a little bit like riding a bike in that it's hard to explain to people who have no experience with it. However, I'll try my best to make my technical explanations palatable to both surfers and surf-nots. And at the end I'll show you how my surfing bot works.

<div className="surf" id="fig1" caption="This smooth run is the world record for surf_utopia (53.6 s, Oct 2025) by saze (rendered live btw)."></div>

The speed and the _feel_ of surfing were born from a handful of physics primitives that were released in Quake back in 1996 but we'll take that historical detour in a little bit. First we need to cover a little bit of math.

The _velocity_ vector is like an arrow: where it points is where you're going, and its length defines the speed. For every game tick (usually 66 or 100 per second), the game moves you along your velocity.

In Counter-Strike, we measure speed in units per second (u/s). A unit being the map editor's grid unit (roughly an inch at character scale). A player is 72 units tall, and walking with a knife is 250 u/s (roughly 6 m/s, like a fast jog).

<div className="surf" id="fig2"></div>

If you look closely, you'll see that velocity catches up to where the player is looking. It's not an instant force. There's a certain "weight" to the feeling of movement in Quake-descended games.

In Quake and Source engine movement, there's another vector called the _wish direction_ which represents the direction a player wishes to move in. The keys (WASD) pick the direction relative to where you're looking. So the wish here is: I'd like to go this way at 250 u/s. And then each tick, you're given some speed towards that wish.

In the graphic above, you can see the speed bulge over 250 u/s before coming back down.

<div className="surf" id="fig3"></div>

The Source engine's `Accelerate()` function doesn't cap your overall speed but it caps how much of your speed can point in the direction you're pressing.

This helps explain some of the bulge we saw earlier. Say you're heading 250 u/s north and wish to swing to the east. The game routine asks: how much of your speed already points east? The answer is zero, so there's lots of room. As you turn towards your wished direction, you're granted some eastern speed which brings your total speed slightly over 250 u/s.

This is the premise we'll be building on: existing velocity, combined with specific wish directions, allows a player to build speed beyond the intended game limits. On the ground, the bulge is tiny and brief because friction runs every tick and pulls it back to 250.

In the air, a similar function runs, called `AirAccelerate()`. The differences are:
- There's no friction in the air so you can keep whatever speed you already have.
- The wish speed is cut down to 30 u/s (from 250) so you can't just hold a key and build speed forever.

<div className="surf" id="fig5"></div>

So if you're falling straight down, and press a direction, you drift sideways at up to 30 u/s and no faster. If you're already flying along at 1000 u/s then you get to keep it.

You can imagine then, the intentions of this movement system. The game engines in Counter-Strike's lineage sought sensible gameplay. On the ground, you roughly move like a human does but in the air they decided to give you a little bit of control to help you get around and not feel frozen to a direction as soon as your feet leave the ground.

Unfortunately for their intentions, and fortunately for ours, the removal of friction in the air allows you to sweep your wish direction to either side to continue to build speed.

<div className="surf" id="fig4"></div>

It all comes down to turning. When you're flying forwards and press D, how fast are you already going right? About zero, which is under 30, so the game pushes you to the right. This movement is sideways to your motion, so your overall speed increases a little.

<div className="surf" id="fig6"></div>

In the air, when you turn your mouse with D held, so that "right" stays square to where you're flying (i.e. strafing), the speed builds up. Every tick "right" is a fresh direction with a new pool of 30 to draw speed from. Holding D without turning draws from the pool of 30 a little bit (so the speed only creeps up to about 252 u/s) but then you just drift along at a fixed speed.

When you then turn back towards the left with A held, your speed builds once more. This flowing left-right-left-repeat can be seen when surfers are trying to gain speed while travelling in a single direction. And then when they take corners and curve around in one direction, that adds speed too!

## Ramps

If building a significant amount of movement through the air is one of the ingredients of surfing, then the other one is: ramps.

In the Source engine, when a surface is steeper than 45.57° it isn't considered to be "ground" so it's treated a bit differently. The game checks this by looking at the surface's _normal_ which is the arrow sticking straight out of the surface. Its height (`n.z`) is 1 on a floor and 0 on a wall.

0.7 is the cosine of 45.57° so "`n.z` above 0.7" is what the game checks instead of "flatter than about 45°". The important part here is that if the surface is too steep to stand on, then there's no friction, no jumping, and the same air rules we just covered apply while you slide.

<div className="surf" id="fig7"></div>

So when you're surfing on a ramp, you're technically in the air the whole time. Physics-wise, you are perpetually falling. Gravity pulls you down at 800 u/s every single second. The ramp removes the part of that pull that goes into it and the rest of this downwards velocity then points along the ramp, down and forwards: ramps turn falling into speed. So in a way, surfing is gravity + strafing.

When you land or touch a surface, some of your velocity is removed by `ClipVelocity()` (the part of your velocity that "goes into" the ramp). But the rest of your velocity remains. A glancing hit keeps almost everything.

This explains why surfers aim to land as smoothly as possible onto a ramp, and why they aim to curve their direction to be pointing in the same direction as the ramps they land on. This need to match the ramp's direction applies both horizontally _and_ vertically.

<div className="surf" id="fig8"></div>

The steepness of a ramp, as long as its `n.z` is below 0.7, is up to the taste of the map maker. Their window (without sinking) is roughly 46° to 68° (more on that below).

Steeper ramps are less forgiving to mistakes:
- For the same vertical height, there's less usable horizontal space.
- There's more gravitational acceleration to drag you down the face of the ramp.
- It's harder to launch as your exit trajectory becomes far more sensitive to your inputs.

The steepest of ramps are difficult to stay on even for a few seconds (as seen in the harder sections of `surf_kitsune2`).

To stay on a ramp (the chief challenge for beginners), you press towards the ramp (e.g. if the ramp is to your left, press A). This is an "air push" into the face and like other air pushes it's also capped at 30. On a very steep ramp, gravity drags you down faster than this air push can hold you on, causing you to sink!

The server tick rate comes into play too. More ticks per second means more pushes per second, which is why the steepest ramp you can hold moves from ~68° at 66 tick to ~75° at 100 tick.

<div className="surf" id="fig9"></div>

When leaving a ramp, you have the option to trade some forwards speed into vertical (up) speed, e.g. to bridge the gap between two ramps, by steering up the face of the ramp.

<div className="surf" id="fig10"></div>

## Maps!

I played a lot of surf maps back in 2005/2006 and so what I consider as a "good map" is biased towards the styles that were popular back then.

To pay an ode to my favorites, I've rendered them here for you, with a "0.7 rule" toggle so you can see (via gradient) which surfable ramps are steeper and where the map author has chosen to place them, along with a "teleports" button to view how the flow of the level is connected up.

<div className="surf" id="fig11"></div>

Then there's a slightly later cohort of maps that I love that were designed around challenge stages. Stages that you can fail over and over without restarting at the very beginning. Each getting harder as you go.

Generally, these maps are very punishing for beginners, who should not expect to get further than one or two stages. These two maps, `surf_fruits` and `surf_vegetables` were collaborations between different mappers and so each stage has a unique feel.

<div className="surf" id="fig12"></div>

One common design feature of surf maps is the curved ramp. While early maps mostly featured separated straight ramps, these curved ramps actually reduce a little bit of speed by default. Just as joining a ramp deletes some velocity, so does a curved ramp, as each new piece is at a different angle, and so a little bit of your velocity will point into it.

<div className="surf" id="fig13"></div>

Some surf maps start at the geographical top of an imagined world, asking the player to generate their own speed via gravity and ramps. But other maps, especially staged maps, make use of booster boxes (shaded orange below), which use `trigger_push` to add a velocity push for every tick you're inside it. In the one below, you go in at 260 u/s and come out at 1,599.

<div className="surf" id="fig14"></div>

I have a final point to make on maps, and I think it's quite a cute point, and it will most likely be surprising if this is the first time you're hearing about it.

In Source, there is a maximum velocity setting called `sv_maxvelocity` and it's commonly left at the default of 3500 u/s. However, this limit is applied **per-axis**!

This means that a ramp's angle goes some way to defining the maximum speed that you can generate by solely riding on that ramp. If a ramp points directly along the x-axis, you will reach 3500 u/s and stop there, because all your speed is "x speed". However, if a ramp is turned 45° away, and you're heading diagonally, then your speed is split between x and y! Each can reach 3500 before the clamp takes effect. Together, this means the maximum horizontal velocity (for a 3500 cap) is actually √(3500² + 3500²) ≈ 4950 u/s.

Falling (the z-axis) allows additional velocity so the corner of the speed cube here is actually √3 × the cap (≈ 6,062 u/s).

<div className="surf" id="fig15"></div>

## Strafe Detour

Broadly, I require the FPS games that I play to be descended in some way from Quake. That's how strong the effect of the movement and feel these engines have had on my gaming experience.

Strafe jumping itself is technically a bug, as we can read in John Carmack's `.plan`, in June 1999, while he was making Quake 3:

> Whee! Lots of hate mail from strafe-jupers [sic]!
>
> Some reasonable messages have convinced me that a single immediate jump after landing may be important to gameplay. I'll experiment with it.
>
> Strafe jumping is an exploitable bug. [...] When I tried fixing the code so that it just didn't work, I thought it changed the normal running movement in an unfortunate way.

Its presence can be seen in this 2025 world record run of Quake's `e1m1`. Kisimov's movement here is probably quite different to how you once played it.

<div className="surf" id="fig16"></div>

Strafe jumping as a skill has been practiced and honed over the years. And even though these older games have not been updated, people are able to move in fantastic ways.

Take this tick-by-tick breakdown of a single jump from the world record run. The artisan nudges of the mouse cause speed to build and build. Quake 1's movement here is very similar to the Source engine, with the same 30-unit air wish speed cap.

<div className="surf" id="fig18"></div>

As player ability has increased over the last 28 years, the time taken on this map has decreased dramatically. With `e1m1`'s world record dropping by almost 11 seconds.

<div className="surf" id="fig17"></div>

In the earlier runs, the player speed tops out around 416-508 u/s but later in 2001 it doubles to just over 1000! Pure speedrun hillclimbing.

## My Surfing Bot

I have been working on a few experiments in the Source engine relating to autonomous map exploration, where 120 "puppets" across a few servers are controlled by a process which directs them towards goals using a beam search. These puppets are teleported to a position with some saved state, and then given faked inputs to mimic human ability.

The original goal of this research was to find map exploits on competitive maps across the Counter-Strike series but I haven't been able to find anything novel yet. So instead I pointed my puppets towards one of my favorite surf maps `surf_leet_xl_beta7z` and taught them a little bit about surf.

The final run I was able to achieve is roughly 1.3 sec slower than the world record. The movement, here in third-person, seems human-like.

<div className="surf" id="fig20" caption="My bot's 19.47 sec run on surf_leet_xl_beta7z."></div>

Under the hood, the servers run at 10× the real timescale, or about 120,000 puppet-ticks a second across the fleet.

The puppets are ghosts and don't collide with each other. Each one is given a unique input, different headings to strafe towards, plus sometimes a one-tick tap of the back key to brake. The puppets are ranked by a score (higher is better) which is approx.:

```goal-surf
goal = -distance_to_go
       + 2 * horizontal_speed
       + speed_along_route
       + 0.2 * (z + (speed * speed) /1600)
```

The map is converted into a grid and only the best copy in each cell is kept to avoid the puppets all crowding the same line.

<div className="surf" id="fig22"></div>

The loop is: keep the best few, and then try everything from each puppet, and then keep the best few again. I've cut a section of `surf_leet_xl_beta7z` here so you can see how the puppets discover a fast path. Or by the numbers for this section: 6,317 tries, 451 died, and then 37 made it through the door.

<div className="surf" id="fig24"></div>

The TAS (tool-assisted speedrun) community already does this kinda thing by hand. To make up for the loss in human skill, I had to throw a significant amount of CPU at the problem. I suspect that the optimal solution here likely involves a human in the loop!

## Behind the Scenes

I like people to come to my posts and come away with a certain feel that I've gone the distance. On most of my projects, I write up 10% or so of the discoveries (the bits that I find most interesting).

The advent of agents has unblocked my ability to generate and refine very specific diagrams and animations to help me communicate ideas to you. This is an area of software design that I'm actively experimenting with and I haven't found the perfect loop yet.

I often ask for hundreds of different diagrams and animations and then rabidly give dictated feedback on each (culling them as I go) until a few choice ones are left behind, crystallizing my ideas as best as I can.

One thing I don't like is when articles make the fans on my desktop PC start up. These websites feel cheap and wasteful. So I hope that this page has not caused your fans to start up (I have tried to optimize rendering). Let me know if they have.

I chose to live render all the maps and gameplay in this article because I like the feel of it, and the resolution of it. Another benefit is that it loads fast (without megabytes of mp4s!) considering the amount of content.

Every map here has come from the real level file, parsed from Source BSPs and Quake PAKs. The render at the very top is actually from Momentum Mod which I converted back into a Source BSP for my pipeline. Textures are sourced, shrunk to 64px and packed into a WebP strip, along with repacked lightmaps.

The result, to me, is wonderfully lofi.
