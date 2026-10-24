---
title: "Decompiling Fast Food Tycoon 2: Drawing the World"
date: "2026-10-24"
tags: ["decompile"]
description: "How a 2001 business sim rendered its rich and detailed cities."
---

I spent the last few days decompiling my favorite computer game: Fast Food Tycoon 2. There's a very good chance that you have not heard of this oddball 2001 business simulator. But when I was a kid in 2004, I picked it out of a lineup of discounted games in a mall and it hasn't left my psyche ever since.

![Berlin with memory annotations](berlin-memory-1388.png)

To briefly describe the gameplay: you build a pizza empire in a living, isometric city, renting restaurants and warehouses, hiring staff, designing pizzas, and managing your supply chains. Customers then judge your food, service, and reputation. Rival companies compete with you through advertising, political influence, and organized crime.

For me, the game always felt ahead of its time, with a surprising amount of world fidelity.

To decompile it, I set up an agentic loop on my computer using GPT-6.1 Sol Medium. We used Ghidra to decompile `fastfood2.exe`'s 4,046 functions into about 9.5MB of C-like text (function addresses, field offsets, constants, and calls).

This raw code was loaded into SQLite and wrapped with a script to allow finding related functions without having to read through large amounts of text:

```python
decomp_index.py grep    "0xe8\) = "  # find field writes
decomp_index.py callers 0x4ed360     # find callers
decomp_index.py string  "fnt"        # find font references
```

In Windows, there's an API to read process memory, `ReadProcessMemory`, which allowed the agent to inspect the running game and compare memory values with what appears on screen. For example, finding the memory address for cash, the camera position, or the selected building. And then the decompiled code was queried for the functions that changed those values.

To control the game, the Windows message handler was patched so that commands could be sent to run on the game's own UI thread. The agent could click buttons, move the camera, and advance the simulation without changing the executable on disk. An early breakthrough came from using a crawler to click through the game's interface and discover the rest of the unknown controls.

At this point, I steered the agent with my curiosity, and we went digging.

## The Overworld

A city is a painting plus a few hundred sprites. Below, we see Berlin at 12:30.

<img src="painting_frame.png" alt="Berlin at 12:30" width="417" />

Underneath this fully rendered scene, the map file `ber.tga` has streets and plots (and Brandenburg Gate's shadow) but no buildings or people or cars.

<img src="painting_crop.png" alt="Berlin's background painting" width="417" />

To draw the overworld, FFT2's renderer draws the scene into a buffer in memory.

First, it works out which screen areas need repainting, like where a person moved, or if the camera position has changed. It restores the background in those areas, and then draws the scene over it. Each pixel holds a 16-bit colour value and a separate lighting byte.

```fft2
dirty_areas = find_areas_that_changed()
draw_background(dirty_areas)

for draw_pass in scene_draw_passes:
    for cell in diagonal_map_order:
        draw_parts_for_this_pass(draw_pass, cell, dirty_areas)
```

The renderer does several passes to control which objects cover other objects. It visits map cells diagonally (or, I suppose, isometrically). To keep hidden people visible (their outline can be seen through walls), the renderer marks their shape with a temporary pixel value before drawing objects on top of them. Later passes draw a yellow outline around hidden body parts and a white outline around hidden thought icons, and then finally fill the visible parts.

Here's a complete redraw.

<img src="berlin-one-draw-at-a-time.mp4" alt="Berlin drawn one step at a time" width="508" />

Finally, the renderer combines each pixel's color with its lighting value and writes to the final 16-bit display buffer. This conversion applies a repeating dither pattern to draw intermediate shades.

```fft2
mark_shape_with_temporary_value()
draw_covering_objects()
outline_covered_parts(outline_colour)
fill_parts_where_temporary_value_remains()
```

I generated another cool graphic to show the efficiency of the renderer. Pixels that changed in the last 0.6sec are highlighted (cars, walkers, swaying tree tops, blinking signs). Most of the picture is not changed because the dirty-region system limits what needs repainting.

<img src="motion.png" alt="Pixels changed over 0.6 seconds" width="417" />

## Lighting

Daylight follows a table of 25 hourly brightness values: 70 at night, rising sharply around dawn to 251 during the day, and then falling at dusk.

Lamps respond to this light level. Their glow thresholds vary slightly with their object IDs, so they switch on in small groups. Their light pools stay at least 160 so that patches of pavement are bright throughout the night.

```fft2
light = interpolate_hourly_table(clock, brightness_setting)

for lamp in lamps:
    show_glow = light <= 160 + (lamp.id & 7)
    draw_lamp(lamp, glow=show_glow)
    draw_light_pool(lamp, light=max(light, 160))
```

The `id & 7` gives eight possible threshold offsets (0-7). With FFT2's default brightness, standard lamps switch on around 18:25–18:30 and off around 05:35–05:40. Other object families use lower thresholds so their glows appear later as the city gets darker.

It all ends up supporting a really satisfying day-night-cycle feel.

Each pizzeria stage has its own light mask, stored in e.g. `h_pizz_a1.m.spr`. Each visible pixel in this mask holds a brightness value. The renderer compares that value with the light already at the same position and keeps whichever is higher. So while the rest of the building darkens, the windows and sign stay bright!

<img src="pizzeria-assembly.mp4" alt="Pizzeria layers and lighting" width="487" />

A separate file, `h_pizz_a1.l.spr`, provides the window colours used at night. The renderer draws those colours, then applies the light mask (as mentioned earlier, colour and light remain separate until the final step when the pixels are drawn on screen).

<img src="berlin-light-cycle.mp4" alt="Berlin's daylight cycle and light curve" width="448" />

These light curve values may be altered by the brightness setting so it works out like:

```fft2
light = base + (251 − base) * brightness
```

## The Cast

Anything that moves is stored in an `.ani` file which is a sprite sheet and named animation sequences. Most of the internal text I came across was written in German (language of the developers).

Here's the frame-by-frame breakdown of an office worker eating in a restaurant.

<img src="playback.mp4" alt="An eating animation, frame by frame" width="508" />

As FFT2 is a pixel-based isometric game from 2001, every animation is pre-drawn.

<img src="walk-compass.mp4" alt="Eight walking directions and their movement steps" width="508" />

The "walker update" logic compares the next node's position with the current one, and picks the direction animation from the two signs: `(−,+)` is 1, `(0,+)` is 2, `(+,+)` is 3, etc.

The named animation sequence also stores how far the sprite moves per frame. For example, the waitress's `gehen4` moves `(+1.25, 0)` every frame, and `gehen3` moves `(+0.884, +0.442)`, and so on. The tick adds this vector on every frame advancement so that feet and ground move in sync.

Maps have predefined pavement nodes (for walkers) and street nodes (for vehicles).

<img src="walk-berlin.mp4" alt="An errand boy following a path through Berlin" width="508" />

The errand boy is the fastest walker at 27px per second, compared with the tourist (16.2px/sec) and the celebrity (13.8px/sec).

## Inside a Branch

The restaurant view uses the same render process as the overworld, drawing flat images into a buffer, storing color and light separately but indoor light stays at 248 regardless of the hour (while daylight outside reaches 251).

<img src="inside-a-branch.mp4" alt="A pizzeria with customers and staff, drawn one sprite at a time." width="508">

This view uses separate, larger artwork for the characters, and uses a special draw order to place people sitting on furniture. When the chair back faces the camera, the renderer draws the main chair image, then the character, and then the back of the chair (or the "front" of the chair from the camera's POV).

![Chair, seated customer, then chair foreground](seated-order.png)

There's a special sprite for the pizza on the table. I will forgive the animators for making everyone have the same eating pattern.

![Nine frames of the table pizza](table-pizzas.png)

## Hidden Details

I came across many quirks in my research and I'll list a few favorites.

People keep their daily habits. When citizens are created, they receive a schedule. These schedules don't reset each day, so an office worker assigned to a particular cinema for the afternoon keeps returning there. Likely contributing to the "real feel" of the city.

These schedules contain stereotypes:
- Goths stay home until 09:00.
- Students have a 40% pub allocation for midnight–03:00.
- Big shots have a 70% opera allocation for 18:00–21:00.

The game calls itself "Pizza3". As seen in a city config file `Init-File für Pizza3-Stadt`.

And finally, I was able to solve a childhood mystery: how the heck is this game measuring and scoring my pizza-making ability? Let's review now that I've unlocked this knowledge.

<img src="pizza-scoring.mp4" alt="A pizza being assembled, followed by its topping coverage, symmetry, ingredient pairings and customer ratings." width="508" />

The game divides the pizza into 24 regions to score how evenly spread the toppings are, looks for matching pieces on opposite sides, and checks which ingredients go together (and different customer groups get different ratings).

There's even a plagiarism check (!) based on ingredient weights. So rearranging a competitor's pizza (a strategy I've definitely tried before) doesn't fool it. A copied recipe is marked "not original" and misses out on +30 taste points for yuppies, goths and tourists, and +5 for big shots.

All this detail, and very little in-game guidance for it. As I recall, since I lost it during a house move, FFT2 shipped with a ~100 page manual. This was back when it was fine for games to be inherently challenging!

A cool note: the images and videos that I generated for this post used some of FFT2's decompiled fonts. Also, some content still has "PC2" visible because I actually call this game Pizza Connection 2 because that's the European name!
