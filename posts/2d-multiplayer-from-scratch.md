---
title: "2D Multiplayer From Scratch"
date: "2024-06-30"
tags: ["go"]
description: "Exploring patterns and systems for creating realtime browser games."
---

I recently built a game prototype for a 2D arena shooter. Here are my notes on some of the patterns I used and the design of the server and client systems.

![dm-multiplayer gameplay – two players chasing and shooting each other.](gameplay.mp4)

The gameplay: players move their characters around a level, shooting bullets at other players. You gain points for hitting other players and lose points for getting hit. You can play it on desktop [here](https://dm-multiplayer.fly.dev/), and view the source code [on GitHub](https://github.com/healeycodes/dm-multiplayer).

The core problems are managing game objects, client/server synchronization, and drawing the game objects in the browser.

As game development projects go, the tools I used are quite high up the stack: a garbage-collected language and a web browser to run the client (but no game engine or other libraries).

The implementation time was roughly 4-5hrs over a few days. Not perfect code, but I think the separate parts fit together quite well.

## Managing Game Objects

Everything in my game (characters, bullets, and walls) is a game object. These game objects all implement an [`Entity` interface](https://github.com/healeycodes/dm-multiplayer/blob/feb1d99eda03313a35100be22078a1c6af37a416/main.go#L200) which allows them to be represented in the game state and eventually rendered for the player.

Using this interface, all game objects can be treated generically during the game loop during which the objects change position, collide, or stop existing.

A game has a level, and a level has entities.

```go
type Level struct {
    width    int
    height   int
    entities EntityList
}
```

When a player connects to the game, a new character object is added to the list of entities.

Since the game is like a never ending deathmatch, players appear in the middle of the action. Choosing where to place them in the level takes a bit of thinking.

We don't want to place them inside another character (they would both be stuck), in a wall (they'd be stuck), or on top of a bullet (seems a bit unfair).

The character object is randomly placed, and a collision check is performed. If it's inside another object, another random position is checked, and then we repeat. To avoid blocking the game loop, these retries have a short timeout before a backoff wait.

```go
func (el *EntityList) SpawnEntity(level *Level, entity Entity) {
    el.mu.Lock()
    defer el.mu.Unlock()

    startTime := time.Now()
    for {
    
        // Generate random position within level bounds
        x := rand.Float64() * float64(level.width-entity.Width())
        y := rand.Float64() * float64(level.height-entity.Height())

        entity.SetPosition(x, y)

        // Check for intersection with existing entities
        intersects := false
        for _, other := range el.entities {
            if entity.Id() != other.Id() {
                top, right, bottom, left := other.BoundingBox()
                entTop, entRight, entBottom, entLeft := entity.BoundingBox()
                if entLeft < right && entRight > left && entTop < bottom && entBottom > top {
                    intersects = true
                    break
                }
            }
        }

        if !intersects {
            // Place the entity if no intersection
            el.entities = append(el.entities, entity)
            return
        }

        // Check if 5ms has passed
        if time.Since(startTime) > 5*time.Millisecond {

            // Unlock and wait for 100ms before trying again
            el.mu.Unlock()
            time.Sleep(100 * time.Millisecond)
            el.mu.Lock()
            startTime = time.Now()
        }
    }
}
```

This kind of collision checking (for every object, check for a collision with every other object) is a naive approach. It has quadratic time complexity, but it's the simplest to implement. Performance is not a concern here, as the number of game objects is bounded (<100) and each collision check has a cost on the order of nanoseconds.

Now that the character object is part of the game, it can be affected by the game loop.

The Game Programming Patterns book has [an entire chapter](https://gameprogrammingpatterns.com/game-loop.html) on game loops. It starts by succinctly describing the intent of this pattern:

> Decouple the progression of game time from user input and processor speed.

My game loop iterates over every entity, applies velocity to position, and performs a collision check. This check can trigger the `HandleCollision(*Level, Entity) CollisionResult` function of the `Entity` interface.

Let's take a look at the mighty game loop in action then.

```go
func (level *Level) loop() {
    level.entities.Iterate(func(entity Entity) {
    
        // Apply velocity to position
        newX := entity.X() + entity.VelocityX()
        newY := entity.Y() + entity.VelocityY()

        // Collision checks
        blocked := false
        level.entities.Iterate(func(other Entity) {
            if entity.Id() != other.Id() {
                top, right, bottom, left := other.BoundingBox()
                if newX < right && newX+float64(entity.Width()) > left &&
                    newY < bottom && newY+float64(entity.Height()) > top {
                    blocked = blocked || entity.HandleCollision(level, other).Blocked
                }
            }
        })

        if !blocked {
            entity.SetPosition(newX, newY)
        }

        // Apply friction
        entity.SetVelocity(entity.VelocityX()*entity.Friction(), entity.VelocityY()*entity.Friction())
    })
    
    // When bullets collide,
    // they set themselves to inactive
    // and they're cleared up here
    level.entities.RemoveInactive()
}
```

We can also take a look at the character object's collision handler. Here we're making sure that characters and walls can't overlap.

```go
func (c *Character) HandleCollision(level *Level, entity Entity) CollisionResult {
    if entity.Type() == CharacterType || entity.Type() == WallType {
        return CollisionResult{
            Blocked: true,
        }
    }

    return CollisionResult{
        Blocked: false,
    }
}
```

When players join or leave the game, it doesn't cause the game loop to move forward — it drives itself. Even things like player input and bullet spawning happen outside the game loop. Even things like player input and bullet spawning happens outside the game loop. For the prototype, I found that this separation made the flow of game time easier to reason about.

## Client/Server Synchronization

Players join the game by visiting a web page that connects them to the server via WebSocket. This HTML page is served by the game server as an embedded file. The main function is practically:

```go
func main() {
    level := &Level{
        width:  800,
        height: 800,
        entities: EntityList{
            mu:       sync.RWMutex{},
            entities: []Entity{},
        },
    }

    game := &Game{id: "test", level: level}
    go gameLoop(game)

    http.Handle("/", http.FileServer(http.FS(indexHTML)))
    http.HandleFunc("/ws", handleConnections)
    http.ListenAndServe(":8080", nil)
}
```

When a WebSocket connects, the handler on the server reads the control message containing the game id and player name, and then a character object is created.

Right after this, two long-lived goroutines run. One sends the serialized game objects to the client 60 times per second. The other listens for messages from the client (direction and shoot events).

When a direction event arrives, the character object's velocity is altered. When a shoot event arrives, a bullet object is created inside the character with a fixed direction (pointing towards where the player clicked). These changes cause effects during the next tick of the game loop.

My prototype doesn't handle reconnection so the character lives as long as the WebSocket is active. When there's a read or write error on the socket, the long-lived goroutines spawned by the player's connection are killed, and the character object is removed from the entity list.

The client is a 150 line `index.html` file (vanilla JavaScript, no build step, etc). It connects to the game server, receives updates 60 times a second, and draws game objects using the [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API).

An update is a JSON-encoded list of game objects, kinda like a whole-world snapshot. It arrives as a socket event.

```jsx
socket.onopen = () => {
  const name = getLocationName()
  
  // When this arrives on the server
  // a character game object is created and spawned
  socket.send(JSON.stringify({ game: 'test', name }))
}

socket.onmessage = (event) => {
  gameLevel = JSON.parse(event.data)
    
  // Without a smooth connection, there will be jitter
  // similar to a FPS game, good internet is required.
  // This prototype has no client smoothing or prediction
  draw()
}
```

As I reflect on my prototype code now, I've decided that the following code that handles shoot events is *wonderful*. The player clicked somewhere on the canvas? They're taking a shot. Let the server know. Easy.

```jsx
window.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const shoot = { x, y }
  socket.send(JSON.stringify({ type: 'shoot', shoot }));
})
```

The keyboard input handling – I'm a bit less happy with.

Players control their character with arrow keys or W/A/S/D. When they press a key down, an update is sent to the server with the current direction (which may be e.g. *left* or *left+up*). To continue moving, players can hold down that key, in which case, direction events are send every half-frame (~8ms) to the server.

When a player lets go of a key, events may stop being sent to the server (if there was a single key being pressed e.g. *left*), or the event might continue firing with a new direction (*left+up* just becomes *up*).

This direction event is converted to an (x, y) value, and the server multiplies it by a constant speed to set the character's velocity.

Here's all the keyboard listening code:

```jsx
const keyState = {};
let intervalId = null;

window.addEventListener('keydown', (event) => {

  // Avoid input delay by sending this ASAP
  sendDirection(); 

  keyState[event.key] = true;
  if (!intervalId) {

      // Handle player holding down the key
      intervalId = setInterval(sendDirection, 8);
  }
});

window.addEventListener('keyup', (event) => {
  keyState[event.key] = false;

  // If no keys are pressed stop sending updates
  if (!Object.values(keyState).includes(true)) {
      clearInterval(intervalId);
      intervalId = null;

      // Send one last update to stop movement
      sendDirection(); 
  }
});

function sendDirection() {
  const direction = { x: 0, y: 0 };
  if (keyState['w'] || keyState['ArrowUp']) direction.y -= 1;
  if (keyState['a'] || keyState['ArrowLeft']) direction.x -= 1;
  if (keyState['s'] || keyState['ArrowDown']) direction.y += 1;
  if (keyState['d'] || keyState['ArrowRight']) direction.x += 1;
  socket.send(JSON.stringify({ type: 'direction', direction }));
}
```

This kinda "polling update" is how game engines like the Source Engine handle movement updates. It's great for real-time responsiveness but can lead to extra data being sent.

For my prototype, I think the code is more complex than necessary. The same responsiveness could probably be achieved by just sending the key up/down event and tracking it on the server without a polling event.

## Drawing Game Objects

The art style of the prototype is... the lack of an art style. the lack of an art style. The art is just black and red rectangles. Bordered for the player's character and bullets, solid for other players and their bullets. When a character is hit, they briefly turn red to register the hit.

The draw function is triggered whenever a new update arrives at the client (60 times per second).

```jsx
function draw() {

  // Clear screen
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  gameLevel.entities.forEach(entity => {
      if (entity.you) {
      
        // Check for recent hit
        ctx.strokeStyle = entity.lastHit + 250 > gameLevel.timeMs ? 'red' : 'black';
        ctx.lineWidth = 1;
        const borderWidth = 1;
        
        // Draw player's character
        ctx.strokeRect(
          entity.x + borderWidth / 2,
          entity.y + borderWidth / 2,
          entity.width - borderWidth,
          entity.height - borderWidth
        );
      } else {
      
        // Check for recent hit
        ctx.fillStyle = entity.lastHit + 250 > gameLevel.timeMs ? 'red' : 'black';
        
        // Draw other character
        ctx.fillRect(entity.x, entity.y, entity.width, entity.height);
      }
  });
}
```

Tying the visuals to the server updates requires users to have good internet to avoid jitter. This is similar to FPS games, except FPS games usually display player movements and actions before they are registered on the server. For my prototype, I don't have any [client-side prediction](https://en.wikipedia.org/wiki/Client-side_prediction) to hide the negative effects of high latency.

For the game to feel responsive, you must be in the same region as the server — if you are, it feels very responsive.

## Reflections

I've been trying to get better at iterating on quick game prototypes that I can playtest with my friends (mostly because it's a lot of fun). I learned a few things with this project that I'm definitely going to apply in the future.

I found the two types of client→server WebSocket message easy to work with. A control message to connect the player, and then follow up events with a `type` field. Having a separate goroutines running for each player (one to send updates, one to receive and process events) allowed me to manage less state. Some of my initial ideas that I discarded involved tracking all the connections in a structure and then looping over them.

Having the server handle as much state as possible made it quicker to get to a stage where I could start iterating. In the beginning, I didn't have a client, I just logged the game state as an ASCII grid to debug the game objects.

One thing I found tricky is that the list of entities is read and mutated from different goroutines. I had some crashes early on relating to concurrent access. I fixed the crashes by adding a read/write lock to the EntityList struct. The `Iterate` method has a read lock, and the `Spawn` and `Remove` methods have write locks.

Oh and people really liked having their name set to city + flag. Initially, I was going to use random names or let players pick their names but allowing people to jump right in and start shooting was way more fun and my friends could identify each other by their cities.

As for where I'm taking this project next, I'm not sure. My friends enjoyed spam shooting at each other and dodging bullets. I think the netcode is better than the average browser game which helps.

I'll either start implementing features (new guns, configurable characters, and weapons!) or research game algorithms like improved collision detection and write about that.
