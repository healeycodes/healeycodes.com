---
title: "Compressing CS2 Demos"
date: "2024-03-05"
tags: ["go"]
description: "Shrinking demo data by a factor of 13x."
---

Counter-Strike 2 demo files (.dem) are game recordings of CS2 matches. They contain demo information and network messages encoded using Google's Protocol Buffers (protobuf). There is some sparse information on this [eight-year-old repository](https://github.com/ValveSoftware/csgo-demoinfo/tree/master/demoinfogo) but, broadly, it's an undocumented format. Demos can be combined with a CS2 game client to playback a match with the same detail it was originally played with.

There are demo [parsing](https://github.com/markus-wa/demoinfocs-golang) [libraries](https://github.com/pnxenopoulos/awpy) that let you read demos outside of CS2 and operate on structured data that's more useful for analysis, and easier to create graphics with, than the raw network messages. I used one of these libraries when I worked on a [prototype demo player](https://healeycodes.com/rendering-counter-strike-demos-in-the-browser) that runs in the browser. For that project, to shrink the demo data I sent to the browser, I threw away most of the data. A 2D overhead view doesn't need granular position data so I used e.g. one in every hundred frames.

However, there are use cases when you want to preserve granular demo data. For example, when you're performing data analysis on how people aim with their mouse in-game. This kind of analysis is useful for professional e-sports organizations to measure their team's performance, and to scout unsigned players.

When you are iterating on data analysis, it's better to have a quick testing cycle. Parsing a 300MB demo file to build a series of events takes ~20sec on a desktop PC. It's also likely you'll be parsing *many* demos at once.

An obvious optimization is saving the generated events to a file so you don't need to reparse demos every time.

For this example, let's say I'm doing some analysis on player positions and their equipment. There is a lot of information I can throw away, like shooting events and player view direction. I'll use [demoinfocs-golang](https://github.com/markus-wa/demoinfocs-golang) to parse a demo and store events in my own data types.

This is all the information I need for my analysis:

```go
type Player struct {
    ID        int
    Name      string
    Position  r3.Vector
    Equipment []string
}

type Frame struct {
    Players []Player
}

type Game struct {
    Frames []Frame
}
```

To fill up these structs, I loop over every frame and store the data I need.

```go
moreFrames, err := p.ParseNextFrame()
for ; moreFrames && err == nil; moreFrames, err = p.ParseNextFrame() {
    frame := Frame{Players: []Player{}}

    for _, player := range p.GameState().Participants().Playing() {
        equipment := []string{}
        for _, equip := range player.Weapons() {
            equipment = append(equipment, equip.String())
        }

        frame.Players = append(frame.Players, Player{
        ID:        int(player.SteamID64),
        Name:      player.Name,
        Position:  player.Position(),
        Equipment: equipment,
        })
    }
    game.Frames = append(game.Frames, frame)
}
```

Then I write it to a JSON file that I can use in my analysis program:

```go
jsonData, err := json.Marshal(game)
if err != nil {
    log.Panicf("Failed to marshal JSON: %s\n", err)
}

f, err = os.Create("./naive.json")
if err != nil {
    log.Panicf("Failed to write JSON: %s\n", err)
}
```

By picking out just the data that I need, I should be rewarded with a much smaller file than the original demo file, right? Wrong. The JSON file is ~355MB, ~15% larger than the input demo.

There are two reasons for this:

1. The data types lead to a lot of duplicate data (e.g. player names and ids)
2. JSON is a verbose textual representation that doesn't use efficient encoding

## Removing Duplicate Data

It's always always a good idea to look directly at the data. Let's do that. Here's a slice from the middle of the frames we're writing to disk. I've selected two frames, 16ms apart, and removed all the players apart from one.

```json
[
    {
        "Players": [
            {
                "Id": 76561198073395520,
                "Name": "Chill",
                "Position": {
                    "X": -1293.3974609375,
                    "Y": -1328.162841796875,
                    "Z": 11488.03125
                },
                "Equipment": [
                    "Knife",
                    "Flashbang",
                    "Desert Eagle",
                    "Smoke Grenade",
                    "AK-47"
                ]
            }
            // <rest of players>
        ]
    },
    {
        "Players": [
            {
                "Id": 76561198073395520,
                "Name": "Chill",
                "Position": {
                    "X": -1293.3974609375,
                    "Y": -1328.162841796875,
                    "Z": 11488.03125
                },
                "Equipment": [
                    "Flashbang",
                    "Desert Eagle",
                    "Smoke Grenade",
                    "AK-47",
                    "Knife"
                ]
            }
            // <rest of players>
        ]
    }
]
```

Can you see where we've duplicated data? The most obvious is the id and name as they don't change during the match.

You might have also noticed that although the order of equipment changes, the set of equipment does not. You only get full marks if you noticed that I've selected two frames where a player's position *also* doesn't change. Sure, players are moving most of the time but not *all of the time*.

Here are some optimizations we can make here.

- Move static data (like id and name) to an object at the top level. Use a new short id to identify players
- Only report player positions when they change
- Rather than listing the players every frame, just track when they spawn and die
- Only report equipment when it changes. Also store the equipment names in an object at the top level and use another new short id as a key

This an example of [delta encoding](https://en.wikipedia.org/wiki/Delta_encoding) (or [data differencing](https://en.wikipedia.org/wiki/Data_differencing)).

The new data types look like this:

```go
type Player = struct {
    Id      uint64 `json:"id"`
    IdShort uint32 `json:"idShort"`
    Name    string `json:"name"`
}

type PlayerMeta map[uint64]Player
type EquipmentMeta map[string]int32

type Frame struct {
    PlayerSpawn     []uint32             `json:"playerSpawn,omitempty"`
    PlayerDeath     []uint32             `json:"playerDeath,omitempty"`
    PositionChange  map[uint32]r3.Vector `json:"positionChange,omitempty"`
    EquipmentChange map[uint32][]int32   `json:"equipmentChange,omitempty"`
}

type Game struct {
    PlayerMeta    `json:"playerMeta"`
    EquipmentMeta `json:"equipmentMeta"`
    Frames        []Frame `json:"frames"`
}
```

By omitting empty structures, there are occasions in the game when frames take up just three bytes when encoded as JSON: `{},`. In these cases, for the events we're interested in, nothing changed when compared to the previous frame.

The most interesting one here is the `EquipmentChange` events. Rather than listing the entire inventory, just the *difference* is stored as a change event. When an equipment `id` is listed, it means that item has been added to the player's inventory on this frame. When there's a negative `-id`, that item was removed on this frame.

To convert equipment strings to integers ids, a new id is generated when the equipment string first appears.

When we loop through frames to create change events, we're comparing the last frame to the current frame. In the case of equipment, let's use an example where a player buys a HE Grenade:

- Create an id for the string by adding an entry to `EquipmentMeta` (the id is `1`)
- Check if the player had the item on the last frame (they didn't)
- Append to the frame's `EquipmentChange` map by appending `1` to the player's change events

If they drop it on the next frame:

- Check if the player is missing any items from the last frame (they're missing `1`)
- Append the negative of that id (`-1`) to the player's change events for the current frame

Or, in code:

```go
// Compare current frame to last frame
for id, info := range curFrame {

    // Player didn't exist on the last frame
    if lastInfo, ok := lastFrame[id]; !ok {

    // So we can just add all the items as "add events"
    frame.EquipmentChange[id] = info.Equipment
    } else {

        // Handle new equipment (positive ids)
        for _, idEquip := range info.Equipment {
            if !contains[int32](lastInfo.Equipment, idEquip) {
                if frame.EquipmentChange[id] == nil {
                    frame.EquipmentChange[id] = []int32{}
                }
                frame.EquipmentChange[id] = append(frame.EquipmentChange[id], idEquip)
            }
        }

        // Handle missing equipment (negative ids)
        for _, idEquip := range lastInfo.Equipment {
            if contains[int32](lastInfo.Equipment, idEquip) && !contains[int32](info.Equipment, idEquip) {
                if frame.EquipmentChange[id] == nil {
                    frame.EquipmentChange[id] = []int32{}
                }
                frame.EquipmentChange[id] = append(frame.EquipmentChange[id], idEquip)
            }
        }
    }
}
```

The same logic is used for player spawn and player death events; positive and negative player ids. For new positions, the absolute position is added as an event (it's like saying: the player is now at X, Y, Z).

After removing duplicated data, we've made some improvements to the file size. The new JSON file is ~58MB, or ~84% smaller.

## Adding Efficient Encoding

We can get a free compression win by serializing the data as a protobuf message.

I wrote a quick schema that copies the existing structs.

```protobuf
syntax = "proto3";

// ... omitted fields

message Frame {
  repeated uint32 player_spawn = 1;
  repeated uint32 player_death = 2;
  map<uint32, Vector> position_change = 3;
  map<uint32, EquipmentList> equipment_change = 4;
}

message Game {
  PlayerMeta player_meta = 1;
  EquipmentMeta equipment_meta = 2;
  repeated Frame frames = 3;
}
```

This takes us further, from ~58MB to ~27MB.

The resulting binary encoded file is faster to parse than the JSON, and magnitudes faster to read than the original demo.

There are other tricks to achieve further compression like this blog series on [float compression](https://aras-p.info/blog/2023/01/29/Float-Compression-0-Intro/). I could also use my domain knowledge of the data to create a custom encoding. For example, there will only 10 players, and there is a low upper bound on the different types of equipment. The range of valid positions on a map is quite small for X and Y, and even smaller for Z, when compared to the available space of `float64`.

I could also encode position data using [bit arrays](https://en.wikipedia.org/wiki/Bit_array). I'll explain how this would work with equipment changes as it's easier to explain than float compression.

Instead of storing a map with a `uint8` as a key, and a list of `int8` for the change events. I can compress the data into a bit array where each value is: a player id (4 bits) and an add or remove event (5 bits) for 9 bits total. A frame's equipment change field can just be a list of those (repeating the player id is actually okay because it's rare that multiple piece of equipment are acquired on the same frame).

It's fun to theorize but a protobuf schema is as far as I need to go for now. View the source code for this toy compression program [on GitHub](https://github.com/healeycodes/compressing-cs2-demos).
