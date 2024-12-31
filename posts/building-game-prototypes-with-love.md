---
title: "Building Game Prototypes with LÖVE"
date: "2024-12-31"
tags: ["lua"]
description: "Chess, card games, and Lua."
---

One of my goals for 2025 is to build a complete game. *Complete* as in, you can buy it on Steam or the App Store for $2.99 or so. I've made little games before but completing and shipping a game would probably be my largest side project yet (aside from this blog).

Over the winter break, I spent some time building game prototypes with [LÖVE](https://love2d.org/) — a framework for making 2D games in Lua. My goal was to research which game making tools fit my skillset, and to find where my strengths lie so that I can be efficient with my time in 2025.

I had written around 200LOC of Lua before working on these prototypes but I didn't have any issues picking up the rest of the syntax that I needed.

I found LÖVE's API to be simple and powerful. One of the benefits of using a *framework* over a game engine is that I can show you a complete example with 10LOC (as opposed to a game engine, where I would need to define scene objects, attach scripts, and so on).

This snippet allows a player to move a square across the screen.

```lua
x = 100

-- update the state of the game every frame
---@param dt number time since the last update in seconds
function love.update(dt)
    if love.keyboard.isDown('space') then
        x = x + 200 * dt
    end
end

-- draw on the screen every frame
function love.draw()
    love.graphics.setColor(1, 1, 1)
    love.graphics.rectangle('fill', x, 100, 50, 50)
end
```

While my prototypes were more fleshed out than this, this snippet captures the essence of LÖVE.

## Chess UI

I return to chess every winter. Playing, trying to improve, and also taking on chess-related projects (around this time four years ago, I built [a chess engine](https://healeycodes.com/building-my-own-chess-engine)).

The UIs of the major chess players ([chess.com](http://chess.com), [lichess.org](http://lichess.org)) are incredibly well thought-out. A chess UI may seem like a simple problem but when I started stepping through the state transitions, I came to realize how beautifully it all fits together. The post-game analysis UI on lichess.org is particularly good.

I wanted to build a riff on chess puzzles but first I needed to get a baseline chess UI working. This was my first LÖVE program, and it took me around two hours.

![Basic chess board UI. Moving a bishop between valid squares.](chess-ui.mp4)

To capture mouse input, I used a mixture of LÖVE's callback functions (`love.mousereleased` for the end of a drag, `love.mousepressed` to move a piece with two clicks).

I used `love.mouse.getPosition()` in order to render pieces while they were being dragged.

```lua
local pieceImage = love.graphics.newImage("assets/chess_" .. piece.name .. ".png")

-- ..

-- draw dragged piece at cursor position
if piece.dragging then
    local mouseX, mouseY = love.mouse.getPosition()

    -- center the piece on cursor
    local floatingX = mouseX - (pieceImage:getWidth() * scale) / 2
    local floatingY = mouseY - (pieceImage:getHeight() * scale) / 2

    -- draw the floating piece with correct color
    if piece.color == "white" then
        love.graphics.setColor(1, 1, 1)
    else
        love.graphics.setColor(0.2, 0.2, 0.2)
    end
    love.graphics.draw(pieceImage, floatingX, floatingY, 0, scale, scale)
end
```

I've built UIs with many libraries over the years. The most comparable experience to using LÖVE is perhaps the browser's [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API). I find LÖVE to be the best solution for prototyping free-form UIs with code. I say *free-form* because if I needed something with inputs and buttons then I don't think LÖVE would be a good choice.

One of the reasons that makes LÖVE such a powerful solution is that LLMs have an easy time generating and analyzing the code required to build prototypes with LÖVE. The API is well-known (or can be communicated with very brief docstrings) and the rest of the code required is generic UI math.

This is opposed to Godot Engine's GDScript which LLMs seemed to struggle with out-of-the-box. I imagine this could be improved with things like: fine-tuning, RAG (Retrieval-Augmented Generation), or few-shot prompting — but I didn't explore this further.

I hadn't used LLMs in visual projects before and I was surprised at how closely`claude-3.5-sonnet` and `gpt-4o` were able to get to my prompts (via [Cursor](https://www.cursor.com/)).

Even though LÖVE programs open very fast, I still missed the hot reloading you get when working on browser UIs. On a larger project, I would probably invest some time into building a debug view and/or hot reloading of UI config.

I struggled a little bit with my separation of UI logic vs. application logic. I didn't feel like I ended up with a particularly clean separation but it was productive to work with. You can see how I consumed my “piece API” in the excerpt below.

```lua
-- called when a mouse button is pressed
---@param x number x coordinate of the mouse
---@param y number y coordinate of the mouse
function love.mousepressed(x, y, button)
    local result = xyToGame(x, y)

    -- check if we've clicked on a valid square
    if result.square then
        for _, piece in ipairs(pieces) do

            -- if we have a piece clicked and it's a valid square, move it
            if piece.clicked and piece:validSquare(result.square) then
                piece:move(result.square)
                return
            end
        end
    end

    -- check if we've clicked on a piece
    if result.piece then
        result.piece:click(x, y)
        result.piece:drag()
        return
    end

    -- otherwise, unclick all pieces
    for _, piece in ipairs(pieces) do
        piece:unclick()
    end
end
```

## Card Game UI

Another UI that I've been thinking about recently is [Hearthstone](https://en.wikipedia.org/wiki/Hearthstone) which I played for around a year after its release. It was my first experience with a competitive card game and I had a ton of fun with it.

Card games seem to exist in a sweet spot when it comes to implementation complexity. The bulk of the work seems to be planning and game design. As opposed to, say, 3D games where a significant amount of time is required to create the art and game world. My personal feeling is that I could build an already-planned card game MVP in about a month.

This prototype took me three hours.

![Card game UI. Hovering cards, dragging them, and playing them on the board.](card-ui.mp4)

Compared to the chess UI, this card game prototype required a little over double the LOC. I also faced some of my first challenges when it came to rendering the smooth card interaction animations.

I would usually avoid adding animations to a prototype but they are the core of a good-feeling card game so I brought them forwards into the prototype stage.

Similar to the chess UI, LLMs were able to help with some of the simple scaffolding work like getting boxes and text drawn in the right place, and collecting some scattered state into two groups of configuration (game config, and game state).

When it comes to the simple stuff, like the health and mana bars, LÖVE really shines.

```lua
local function drawResourceBar(x, y, currentValue, maxValue, color)

    -- background
    love.graphics.setColor(0.2, 0.2, 0.2, 0.8)
    love.graphics.rectangle("fill", x, y, Config.resources.barWidth, Config.resources.barHeight)
    
    -- fill
    local fillWidth = (currentValue / maxValue) * Config.resources.barWidth
    love.graphics.setColor(color[1], color[2], color[3], 0.8)
    love.graphics.rectangle("fill", x, y, fillWidth, Config.resources.barHeight)
    
    -- border
    love.graphics.setColor(0.3, 0.3, 0.3, 1)
    love.graphics.setLineWidth(Config.resources.border)
    love.graphics.rectangle("line", x, y, Config.resources.barWidth, Config.resources.barHeight)
    
    -- value text
    love.graphics.setColor(1, 1, 1)
    local font = love.graphics.newFont(12)
    love.graphics.setFont(font)
    local text = string.format("%d/%d", currentValue, maxValue)
    local textWidth = font:getWidth(text)
    local textHeight = font:getHeight()
    love.graphics.print(text, 
        x + Config.resources.barWidth/2 - textWidth/2, 
        y + Config.resources.barHeight/2 - textHeight/2
    )
end

local function drawResourceBars(resources, isOpponent)
    local margin = 20
    local y = isOpponent and margin or 
              love.graphics.getHeight() - margin - Config.resources.barHeight * 2 - Config.resources.spacing
    
    drawResourceBar(margin, y, resources.health, Config.resources.maxHealth, {0.8, 0.2, 0.2})
    drawResourceBar(margin, y + Config.resources.barHeight + Config.resources.spacing, 
                   resources.mana, resources.maxMana, {0.2, 0.2, 0.8})
end
```

![Close-up of card animations.](card-ui-animations.mp4)

The animations of the cards (rising/growing during hover, falling back to the hand when dropped) weren't too difficult to build once I had defined my requirements.

```lua
-- update the state of the game every frame
---@param dt number time since the last update in seconds
function love.update(dt)

		-- ..
    
    -- update card animations
    for i = 1, #State.cards do
        local card = State.cards[i]
        if i == State.hoveredCard and not State.draggedCard then
            updateCardAnimation(card, Config.cards.hoverRise, Config.cards.hoverScale, dt)
        else
            updateCardAnimation(card, 0, 1, dt)
        end
        updateCardDrag(card, dt)
    end
end

-- lerp card towards a target rise and target scale
local function updateCardAnimation(card, targetRise, targetScale, dt)
    local speed = 10
    card.currentRise = card.currentRise + (targetRise - card.currentRise) * dt * speed
    card.currentScale = card.currentScale + (targetScale - card.currentScale) * dt * speed
end

-- lerp dragged cards
local function updateCardDrag(card, dt)
    if not State.draggedCard then
        local speed = 10
        card.dragOffset.x = card.dragOffset.x + (0 - card.dragOffset.x) * dt * speed
        card.dragOffset.y = card.dragOffset.y + (0 - card.dragOffset.y) * dt * speed
    end
end
```

The above code animates my cards by smoothly transitioning their rise/scale properties between target values. A classic example of linear interpolation (lerping) where the current values are gradually moved toward target values based on elapsed time and a speed multiplier.

## Where I Go From Here

After building out these prototypes (as well as some other small ones not covered here), I have a pretty good grasp on the kind of projects that would be productive for me to build with LÖVE.

I also spent some time playing with the Godot Engine but haven't written up my notes yet. The TL;DR is something like: if I need game engine features (very busy world, complex entity interactions, physics beyond the basics) I would reach for Godot.

My loose project plan for 2025 looks something like this:

- Design a game with notebook/pen
- Create the game out of paper and play the prototype with my wife
- Build out a basic MVP (without any art)
- Playtest with friends
- Iterate/more playtesting
- Create the art
- ???
- Ship

I don't expect my prototype code to be overly useful but [it's open source](https://github.com/healeycodes/love-game-protoypes) nonetheless!
