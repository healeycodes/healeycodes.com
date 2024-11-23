---
title: "Generating Mazes"
date: "2024-08-08"
tags: ["javascript"]
description: "Visualizations and techniques for different maze generation algorithms."
---

I've been reading about mazes and how to generate them. The type of mazes I'll be talking about are 2D grids of connected cells. They're _perfect mazes_ (i.e. there is exactly one unique path between any two cells aka a uniform spanning tree).

I'll refer to the connections between cells as _edges_. An edge can be created between a cell and any of its neighbors (up, right, left, down). When two cells don't share an edge, there is a wall between them. While generating a maze, if a cell isn't reachable, I'll render it dark.

<div className="mazes" id="introMaze"></div>

A maze begins as a grid of unconnected cells. All dark. When we start connecting the cells, we create the maze.

The above visual was created with the following code.

```ts
const maze = new Maze(2, 2);
const A = maze.getCell(0, 0)
const B = maze.getCell(1, 0)
const C = maze.getCell(1, 1)
const D = maze.getCell(0, 1)
```

With our new maze, we can start carving edges between the four cells.

```ts
A.carveEdge(B)
B.carveEdge(C)
C.carveEdge(D)
```

Finally, we can pick the two points furthest from each other for the start and end positions. In this case, we pick `A` and `D`. Later, I'll explain how to find the two furthest points in any maze.

```ts
maze.start = A
maze.end = D
```

## Aldous Broder

To automate our maze creation process, we can reach for one of the many [maze generation algorithms](https://en.wikipedia.org/wiki/Maze_generation_algorithm). To start, I've chosen Aldous Broder because it's the easiest to code. It uses a random walk-based method to visit every cell, and it's likely the most frustrating to watch.

Though inefficient (it revisits cells already part of the maze during generation), it creates an unbiased maze. This means that every possible maze of a given size is equally likely to be generated.

<div className="mazes" id="aldousBroder"></div>

You may be able to reverse engineer the algorithm by simply watching the maze generation. To define it very simply: walk around and connect unconnected cells.

```ts
const visited = new Set<Cell>();

// Choose a random starting cell
let current = randomMember(maze.cells.flat());
visited.add(current);

// While there are unvisited cells
while (visited.size < maze.width * maze.height) {

    // From the current cell, choose a random neighbour
    const next = shuffle(current.neighbors)[0];

    // If the neighbour has not been visited yet
    if (!visited.has(next)) {
        
        // Add an edge and mark as visited
        current.carveEdge(next);
        visited.add(next);
    }

    // Move to this neighbour whether or not it was visited
    current = next;
}
```

## Random Depth-First Search

If we don't like the inefficiency of Aldous Broder, we can use Random Depth-First Search (DFS) to visit each cell once. By stepping from a cell to a random unvisited neighbor, we can traverse the tree.

<div className="mazes" id="randomDFS"></div>

You may recall that I described Aldous Broder as unbiased. Unfortunately, Random DFS tends to create long corridors due to the path's tendency to stick to one direction. Perhaps that's acceptable for your use case.

I've chosen the recursive version of this algorithm because I personally find it easier to follow.

```ts
const visited = new Set<Cell>();

// Visit a cell and carve a path to the next cell
async function visit(last: Cell, next: Cell) {

    // If the cell has already been visited, skip
    if (visited.has(next)) {
        return;
    }
    // Otherwise, mark the cell as visited
    visited.add(next);

    // Carve a path between the last cell and the next cell
    last.carveEdge(next);

    // Get the neighboring cells of the next cell that haven't been carved yet
    const neighbors = shuffle(next.uncarvedEdges());

    // Recursively visit each neighbor
    for (const neighbor of neighbors) {
        await visit(next, neighbor);
    }
}


// Start the maze generation by visiting a random neighbor of a random cell
const rndCell = randomMember(maze.cells.flat());
await visit(rndCell, shuffle(rndCell.neighbors)[0]);
```

## Wilson's Algorithm

If Aldous Broder is inefficient, and Random DFS has a long-corridor bias, then we can choose something in between. Wilson's Algorithm is unbiased like Aldous Broder, but it doesn't revisit connected cells.

Wilson's Algorithm performs a [loop erased random walk](https://en.wikipedia.org/wiki/Loop-erased_random_walk). The core loop is this: it starts at an unvisted random cell and randomly walks until it reaches the maze. If, during the walk, a loop is created, then that section of the loop is erased. The initial walk has to reach a random cell.

It tends to start slowly and ramp up.

<div className="mazes" id="wilsonsAlgorithm"></div>

A little more code is required for this one.

```ts
const unvisited = new Set<Cell>(maze.cells.flat());
const visited = new Set<Cell>();

// Choose one cell arbitrarily, add it to the maze, and mark it as visited
const startCell = randomMember(maze.cells.flat())
visited.add(startCell);
unvisited.delete(startCell);

// Continue until all cells have been visited
while (unvisited.size > 0) {
    let path = [];
    let current = randomMember(unvisited);

    // Perform a random walk until reaching a cell already in the maze
    while (!visited.has(current)) {
        path.push(current);
        let next = randomMember(current.uncarvedEdges());

        // If a loop is formed, erase that section of the path
        const loopIndex = path.indexOf(next);
        if (loopIndex !== -1) {
            path = path.slice(0, loopIndex + 1);
        } else {
            path.push(next);
        }

        current = next;
    }

    // Add the path to the maze by carving edges and marking cells as visited
    for (let i = 0; i < path.length - 1; i++) {
        const cell = path[i];
        const nextCell = path[i + 1];
        cell.carveEdge(nextCell);
        visited.add(cell);
        unvisited.delete(cell);
    }
}
```

I've read in a few places that Wilson's Algorithm is faster than Aldous Broder at generating mazes; I've found this to be true in my brief tests. However, I haven't found this to be proven with any rigor. I also [read](https://news.ycombinator.com/item?id=2124503) that starting with Aldous Broder and then switching to Wilson's Algorithm (reasoning: Aldous Broder is slow at the end, Wilson's Algorithm is slow at the start) is faster than either. However, I haven't seen proof that this combination still results in a uniform spanning tree (where all possible mazes have equal probability).

## Finding The Two Furthest Points

You may have noticed in these visualizations that the start and end positions (`S` and `E`) are added once the maze is complete. Usually, start and end positions are placed by the author of a handcrafted maze. They have meaning. For the mazes I’ve been generating, I simply pick the two furthest points.

The strategy for finding the two furthest points involves running two breadth-first searches while tracking the distance from the root cell in each search.

1. Choose a random starting cell `A`
2. BFS with `A` as root
  - Mark the furthest point from `A` as `B`
3. BFS with `B` as root
  - Mark the furthest point from `B` as `C`
4. The two furthest points are `B` and `C`

The start and end positions are then chosen randomly from these two points.

<div className="mazes" id="treeDiameter"></div>

I suspect there is a way to figure out the start and end positions while also generating a maze. Perhaps not for all of the algorithms we covered. It _feels_ possible.

As for resources, I found most of my jumping off points on the Wikipedia page [Maze generation algorithm](https://en.wikipedia.org/wiki/Maze_generation_algorithm). Searching for maze algorithms usually turns up academic resources (with mixed levels of accessibility).

The code for all the visuals and algorithms can be found in the source of this website, specifically in the [mazes directory](https://github.com/healeycodes/healeycodes.com/tree/main/components/visuals/mazes). The mazes are rendered with `<canvas>` elements.
