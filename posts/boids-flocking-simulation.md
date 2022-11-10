---
title: "Boids in WebAssembly Using Go"
date: "2020-07-26"
tags: ["go"]
description: "The famous flocking simulation built with the Ebiten game library."
---

Lately, I've been revisiting concepts and algorithms that I got stuck on when I was learning to code. One of them is the boids flocking simulation.

We'll look at how this program can be written in Go and delivered via WebAssembly. You can find all the source code for this article, as well as the [WASM demo](https://healeycodes.github.io/boids/), on [healeycodes/boids](https://github.com/healeycodes/boids).

![A flock of dark colored boids swimming around a white area](preview.gif)

A boid is a simulated bird-like object, a bird-oid. Each boid looks at their local flockmates and uses three rules to respond to their behavior — _separation_, _alignment_, and _cohesion_.

This artificial life program was first developed by Craig Reynolds. In [Flocks, Herds, and Schools: A Distributed Behavioral Model](http://www.red3d.com/cwr/papers/1987/boids.html) he describes it:

> The simulated flock is an elaboration of a particle system, with the simulated birds being the particles. The aggregate motion of the simulated flock is created by a distributed behavioral model much like that at work in a natural flock; the birds choose their own course.

## Ebiten "A dead simple 2D game library for Go"

[Ebiten](https://ebiten.org/) is well documented and has a lively community (`#ebiten` channel in [Gophers Slack](https://blog.gopheracademy.com/gophers-slack-community/)). I started learning it by extending the [example programs](https://ebiten.org/examples/) to get used to the API.

Let's look at the overall structure of our program.

When you build a game with Ebiten, you must implement the [ebiten.Game](https://pkg.go.dev/github.com/hajimehoshi/ebiten#Game) interface. We define a `Game` struct to store our flock of boids as well as the methods required by Ebiten to run our game. `Update` is called every tick to handle the game logic, `Draw` is called every frame to draw the screen, and `Layout` is used to define the game's screen size (which can be 'stretched' to fit the window).

```go
type Game struct {
    flock  Flock
    inited bool
}

// Create all of the boids, give them some random velocity
func (g *Game) init() {}

// Apply logic to our flock
func (g *Game) Update(screen *ebiten.Image) error {}

// Draw all of the boids
func (g *Game) Draw(screen *ebiten.Image) {}

// Define the game's logical screen size
func (g *Game) Layout(outsideWidth, outsideHeight int) (int, int) {}

// Set the window size, the title, and pass an instance of Game to
// ebiten.RunGame
func main() {}
```

### Game Loops

Almost every game that you've played uses a programming pattern called a [Game Loop](https://gameprogrammingpatterns.com/game-loop.html).

> A game loop runs continuously during gameplay. Each turn of the loop, it processes user input without blocking, updates the game state, and renders the game. It tracks the passage of time to control the rate of gameplay.

The frequency of a game loop is sometimes referred to as the tick rate of a game. A single iteration of the loop is a _tick_.

## Simulation Logic

In our program, a boid has the following properties:

- Position — the coordinates of the boid in the world
- Velocity — how fast and in what direction the boid is moving
- Acceleration — we change the velocity by this value during the next tick

```go
type Boid struct {
    imageWidth   int
    imageHeight  int
    position     Vector2D // Exposes `X`, `Y`, and some calculation methods
    velocity     Vector2D
    acceleration Vector2D
}
```

Every tick, we need to handle three things for every boid in our flock:

- Check edges — check if the boid has gone off the edge of the screen
- Apply rules — using the three rules, set every boid's acceleration
- Apply movement — apply acceleration to the boid's velocity

```go
type Flock struct {
    boids []*Boid
}

func (flock *Flock) Logic() {
    for _, boid := range flock.boids {
        boid.ApplyEdges()
        boid.ApplyRules(flock.boids)
        boid.ApplyMovement()
    }
}
```

To handle boids hitting the edge of the screen, we wrap them around by swapping their position to the opposite side. Their velocity means they keep flying in the same relative direction.

After we've figured out the boid's acceleration by applying the three rules, we need to update its position and velocity, and reset acceleration.

```go
func (boid *Boid) ApplyMovement() {
    boid.position.Add(boid.velocity)
    boid.velocity.Add(boid.acceleration)
    boid.velocity.Limit(maxSpeed)
    boid.acceleration.Multiply(0.0)
}
```

By adding acceleration to the boid's existing velocity, and then limiting it by a maximum speed, we get smooth movement that tends towards the desired direction and speed. Velocity can be thought of as momentum and acceleration as steering.

## The Three Rules

In the following code excerpts, you may notice that the logic is not very optimized. This is to make it easier to understand. On every tick, every boid considers the position of every other boid. We would say that the asymptotic complexity is `O(n^2)`.

Different rules use different 'inclusion' zones. Whether another boid is _local_ to another boid depends on which rule we are applying.

```go
maxForce             = 1.0
maxSpeed             = 4.0
alignPerception      = 75.0
cohesionPerception   = 100.0
separationPerception = 50.0
```

The last three values are really fun to play with and greatly affect the shape and contortions of a flock of boids. `maxForce` limits the steering of a boid and `maxSpeed` is the ultimate speed limit.

I've expanded some of Craig Reynolds' low-resolution diagrams to help explain the three rules that define a boid's behavior.

### Separation

> Steer to avoid crowding local flockmates.

The closer another boid is to us, the more motivated we are to move away from it. The white circle represents `separationPerception`. Boids outside of this area are not considered. This rule encourages boids to move into free space.

![A boid looking at its local area and deciding to move away from the average position of other boids](separation.png)

(In the canonical version of the Boid program, a boid doesn't consider other boids behind itself by applying a field of view restriction.)

```go
separationSteering := Vector2D{}
separationTotal := 0

for _, other := range restOfFlock {
    d := boid.position.Distance(other.position)

    // A boid shouldn't consider itself
    if boid != other {

        // It should only consider local boids
        if d < separationPerception {
            separationTotal++

            // We want to steer away from other boids
            // If a boid is very close, consider it more strongly
            diff := boid.position
            diff.Subtract(other.position)
            diff.Divide(d)
            separationSteering.Add(diff)
        }
    }
}

// If there are no local boids, we keep the same direction and speed
if separationTotal > 0 {
    separationSteering.Divide(float64(separationTotal))
    separationSteering.SetMagnitude(maxSpeed)
    separationSteering.Subtract(boid.velocity)
    separationSteering.SetMagnitude(maxForce * 1.2)
}

// `acceleration` will be the sum of all three rules
// we'll then take the average and apply it to `velocity`
boid.acceleration.Add(separationSteering)
```

### Alignment

> Steer towards the average heading of local flockmates.

We know the direction of a boid by looking at the velocity. We sum and take the average of other nearby boids within the `alignPerception` area. This rule encourages boids to travel together.

![A group of boids with lines indicating their heading, the boid in question is about to adjust to this](alignment.png)

```go
alignSteering := Vector2D{}
alignTotal := 0

for _, other := range restOfFlock {
    d := boid.position.Distance(other.position)
    if boid != other {
        if d < alignPerception {
            alignTotal++
            alignSteering.Add(other.velocity)
        }
    }
}

if alignTotal > 0 {
    alignSteering.Divide(float64(alignTotal))
    alignSteering.SetMagnitude(maxSpeed)
    alignSteering.Subtract(boid.velocity)
    alignSteering.Limit(maxForce)
}

boid.acceleration.Add(alignSteering)
```

### Cohesion

> Steer to move toward the average position of local flockmates

To be a _cohesive_ boid, one must head towards the center of the clump. This may seem at odds with _separation_ but these two rules work together to let boids arrange themselves equally within a space. Although, the reality of this _arranging_ can look quite chaotic!

![Our boid has a red arrow pointing to a green point in space. There are lines from the other boids that lead to this average center.](cohesion.png)

```go
cohesionSteering := Vector2D{}
cohesionTotal := 0

for _, other := range restOfFlock {
    d := boid.position.Distance(other.position)
    if boid != other {
        if d < cohesionPerception {
            cohesionTotal++
            cohesionSteering.Add(other.position)
        }
    }
}

if cohesionTotal > 0 {
    cohesionSteering.Divide(float64(cohesionTotal))
    cohesionSteering.Subtract(boid.position)
    cohesionSteering.SetMagnitude(maxSpeed)
    cohesionSteering.Subtract(boid.velocity)
    cohesionSteering.SetMagnitude(maxForce * 0.9)
}

boid.acceleration.Add(cohesionSteering)
```

Each rule should be considered equally, so after summing the rules together, we divide by three to find the average.

```go
boid.acceleration.Divide(3)
```

## Building And Deploying

It's time to get this simulation in front of users! Lucky for us, Ebiten supports many platforms. (The Nintendo Switch is even on the [roadmap](https://ebiten.org/blog/roadmap2020.html#Ebiten_2.1_-_March,_2021).)

The current release (v1.11.4), supports:

- Windows, macOS, Linux, FreeBSD
- Android, iOS
- Web browsers (Chrome, Firefox, Safari and Edge)
  - via WebAssembly or GopherJS

We will be compiling to [WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly). With WebAssembly as a compilation target, we can deliver our Go program to anyone running a modern browser. I'm currently hosting it on [GitHub Pages](https://healeycodes.github.io/boids/).

What are the benefits of WebAssembly? In brief:

- Fast, efficient, and portable
- Executes at 'near-native' speed
- Runs in a secure sandbox

To get our Boid program ready for users, we build the `.wasm` file.

```bash
GOOS=js GOARCH=wasm go build -o dist/boids.wasm github.com/healeycodes/boids
```

We set the build's target operating system to `js` as well as setting the architecture to `wasm`. If you're setting this up from scratch, you'll need a copy of `wasm_exec.js` from the Go source — you can copy it locally from your machine or get it from [golang/go](https://github.com/golang/go/blob/master/misc/wasm/wasm_exec.js).

To display the simulation in a browser, we use [WebAssembly.instantiate](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/instantiate). Here's what our index page looks like:

```html
<main>
    <p>Loading..</p>
</main>

<script src="dist/wasm_exec.js"></script>
<script>
  (function () {
    const go = new Go();
    // WebAssembly.instantiateStreaming is more efficient
    // but doesn't work on Safari
    fetch('dist/boids.wasm')
      .then(response => response.arrayBuffer())
      .then(bytes => WebAssembly.instantiate(bytes, go.importObject))
      .then(result => {
        document
          .querySelector('main')
          .remove();
        go.run(result.instance);
      });
  })();
</script>
```

The full source is available on [the repository](https://github.com/healeycodes/boids).

## Where to go from here?

We looked at how to create an Ebiten game, the emergent behavior of the Boid program, and delivering a Go program via WebAssembly. But there's still more to explore!

Expand this solution with:

- Field of vision support (boids shouldn't look behind 👀)
- QuadTree optimization
- Different `maxSpeed`/`maxForce` for each boid
- Graphical interface for live-editing of values

Or use a different language:

- JavaScript/p5.js with [Daniel Shiffman](https://www.youtube.com/watch?v=mhjuuHl6qHM&vl=en)
- C#/Unity with [Sebastian Lague](https://www.youtube.com/watch?v=bqtqltqcQhw) in 3D

I'd love to see what you come up with!

<hr>

<small>Reynolds, C. W. (1987) Flocks, Herds, and Schools: A Distributed Behavioral Model, in Computer Graphics, 21(4) (SIGGRAPH '87 Conference Proceedings) pages 25-34.</small>

<small>Nystrom, R. (2020) Game Programming Patterns/Sequencing Patterns</small>
