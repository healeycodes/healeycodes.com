---
title:  "My First Golang Program"
date:   "2019-10-02"
tags: ["go"]
path: "beginners/go/showdev/opensource/2019/10/02/my-first-golang-program.html"
description: "Conway's Game of Life in Ebiten."
---

I’m new to Go. Over the last week, I completed [A Tour of Go](https://tour.golang.org/welcome/1) and tonight I wrote my first program, an interactive [Conway's Game of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life). I used [Ebiten](https://github.com/hajimehoshi/ebiten) which describes itself as *a dead simple 2D game library in Go*. Given its current stage of development, the [documentation](https://ebiten.org/) and [examples](https://github.com/hajimehoshi/ebiten/tree/master/examples) are amazing. It's also cross-platform 🎮.

![Conway's Game of Life GIF](conwaysgameoflife.gif)

Most of my professional experience is with dynamic languages like JavaScript and Python. When I start learning a language I like to run through the official tutorial and then get stuck-in building a game. It brings me back to my roots. I got into programming to make solo games but found out that I love writing high-performance things for the web (front or back!).

It's very rewarding to make things on your screen move, dance, and die. This is one of the reasons that learning web development is so much fun. Except nothing dies on the web (0.03% of the web still use Internet Explorer 5/6/7!).

### My Reasons for Learning Go

I love the single binary deployment of Go. It's totally opposite to Node/Python and it's a lot easier for me to share small things with my friends. People on my team at work are really excited by Go. It's fun to talk to them about the language and I know if I continue to learn they will be interested in hearing about my experience. With other people picking it up, there's a chance that we'll develop some Go microservices in the future too.

I could easily say that I'm learning Go because I like building high-performance applications for the web (which certainly excites me) but one of the main reasons is that it's new and exciting. There's an online buzz for the language similar to the Rust community. I enjoy learning and seeking that spark when something clicks. It's also well-documented and supported (e.g. StackOverflow threads), and there seem to be regular conferences and meetups near me.

### Conway's Game of Life

Conway's Game of Life is a _cellular automaton_ but that doesn't mean a lot to most people. Imagine a grid of cells that exist in two states: alive or dead. The 'animation' that you see is actually successive generations being rendered to the screen. There are four rules that help decide the next generation's state. Wikipedia describes them thusly.

1. Any live cell with fewer than two live neighbours dies, as if by underpopulation.
2. Any live cell with two or three live neighbours lives on to the next generation.
3. Any live cell with more than three live neighbours dies, as if by overpopulation.
4. Any dead cell with exactly three live neighbours becomes a live cell, as if by reproduction.

There needs to be an initial state. As we saw from the rules, an empty board will not produce cells

The `rand` package in Go _produces a deterministic sequence of values each time a program is run_. I don't want my board's default state to be the same on every load so I seed it with an ever-changing variable: time.

The following function takes a pointer to my `Game` struct which has a property called board. We edit the board that is stored in memory so we don't need to return anything.

```go
// Given an empty board, give it a random state
func giveState(g *Game) {
	rand.Seed(time.Now().UnixNano()) // <-- Different every time
	for x := 0; x < RES; x++ {
		for y := 0; y < RES; y++ {
			if rand.Intn(15) == 1 {
				g.board[x][y] = 1
			}
		}
	}
}
```

Every cell has a 1-in-15 chance of being alive during the first generation. Ebiten's update function runs at 60fps per second and I create a new generation for every tick. I print out the current generation number in the top left.

![Generation number](gennumber.png)

Conway's Game of Life seems to be a rite of passage for Computer Science students. At least, that's what I've learned from the web. It didn't come up in any of my classes so it's been fun to play around with it and read about the amazing things people have created with it. For example, a [replica of a digital clock](https://codegolf.stackexchange.com/a/111932) that has even time-steps.

### Interaction

![Interaction GIF](interaction.gif)

If you click the board, the nearby cells have their states flipped. You can drag around the screen to make the cells cascade. Animated patterns have a simple pleasure about them. Ebiten has a function for clicking and I call it on every update tick. Here we use multiple inline assignments to set the value of `x` and `y`. The type of these variables is inferred at compile time.

```go
if ebiten.IsMouseButtonPressed(ebiten.MouseButtonLeft) {
	x, y := ebiten.CursorPosition()
	interaction(x, y, g)
}
```

As low-level as Golang is, it seems to keep out of your way by default.

### Go Modules

I understand that Go's module system is a fairly recent addition. I created a mod file by running `go mod init github.com/my/repo` and then whenever I built or ran my code the dependencies were automatically updated. Changing development setup was as easy as cloning the repository and running `go install`.

I've also found VS Code's Go plugin to be incredibly useful, with it performing more helpful actions than I'm probably aware of! This has helped me focus on learning the language. For anyone looking for a way into Go, I recommend [A Tour of Go](https://tour.golang.org/welcome/1). For resources beyond that, who knows — I'm testing a few myself and welcome recommendations!

Check out the [code](https://github.com/healeycodes/conways-game-of-life) on my GitHub.
