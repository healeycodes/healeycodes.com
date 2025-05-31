---
title: "Solving Queuedle"
date: "2025-05-31"
tags: ["javascript"]
description: "Writing a game solver for Queuedle."
---

I've written a solver for my word-sliding puzzle game called [Queuedle](https://queuedle.com/). Usually when I write solvers, I first need to simulate the game, so it was fun to start with those parts already written!

In case you missed [my last post](https://healeycodes.com/how-i-made-queuedle) where I covered the development process of the game, I've included a screenshot below. You play by inserting letters from a queue into rows and columns, trying to make as many words as possible.

![A game of Queuedle being played.](overview.png)

## Search Space

When trying to solve Queuedle, we can't use brute force because, like chess, the search space is too large. However, as we explore the graph of game states we *can* use a heuristic to prioritize nodes that are more likely to lead to a node with a high score.

In Queuedle, there's a 5x5 grid of letters:

- 5 rows and 5 columns
    - For each row: 2 possible moves (left, right)
    - For each column: 2 possible moves (up, down)
- Total possible moves per state (before restrictions):
    - (5 rows × 2) + (5 columns × 2) = 10 + 10 = 20

At the start of the game, the branching factor is 20 (compared to chess, where the average branching factor is ~35). It drops when moves get restricted (rows and columns can't slide back).

The search space is in the quintillions. With a letter queue of 15 and a branching factor starting around 20, we're looking at roughly 20^15 ≈ 3×10^19 possible move sequences (including duplicate board states).

Queuedle is a lot easier to write a solver for compared to chess though. It's easier to know if one game state is better than another by getting the board's score (counting the letters of all the words).

This is a clear, objective measure of "goodness" for any state. Unlike chess, there isn't an opponent planning complex tactics. The per-move heuristic for chess needs to consider material, position, king safety, pawn structure, threats, etc.

Let's define our heuristic in a sentence: a Queuedle board with a higher score is more likely to lead us to another board with an even higher score.

The search will never end so we need a finishing criterion. We could use total game states seen, wall clock time, or a certain score. I'll use total game states seen and set it to 500k.

This algorithm is called [best-first search](https://en.wikipedia.org/wiki/Best-first_search):

> [Explore] a graph by expanding the most promising node chosen according to a specified rule.

As we explore, we need to keep track of:

- A priority queue of nodes
    - Sorted by our heuristic
- Best node so far
    - We report this after checking 500k nodes
- The board grids we've already visited
    - Avoid duplicate work and graph cycles

I've put together an example journey below.

```tsx
● START (score:0, queue:15)
│
├───[left  0] ············(s:6, q:14)
├───[right 0] ············(s:3, q:14)  
├──┬[down  1] ···········(s:22, q:14)
│  ├───[left  0] ········(s:15, q:13)
│  ├───[right 0] ········(s:25, q:13)
│  └──┬───[down  4] ·····(s:26, q:13)
│     ├───[right 0] ·····(s:29, q:12)
│     └───[left  4] ·····(s:32, q:12) ★ best
├───[up   4] ·············(s:3, q:14)
├───[down 4] ·············(s:7, q:14)
│..

Priority Queue: [(s:35,q:11), (s:31,q:12), (s:28,q:11), ...]
Visited       : {hash(grid of l0), hash(grid of r0), ... }
Best node     : (s:32, q:12) via [down[1] → down[4] → left[4]
```

Notice how we walk down a leaf seeking out a higher scoring board and then go back up. This is because, after hitting the best node so far, all the *next* possible moves for that board were lower scoring than the next items in the priority queue.

When I got my solver working, it took a few seconds of compute time to *double* my score for that day's Queuedle (my personal Deep Blue moment).

I went and replayed the moves that the solver printed out. Similar to when you copy a chess engine's moves, the decisions didn't make sense to me. They were robotic. Before the solver's final move, I was looking at a board with a score of `50` (which is `11` higher than my all time score), and I couldn't see the next move *at all*. Even with an hour, and a Scrabble dictionary, I might not have gotten it.

And then the solver's final move took the score from `50` to `70`!

![A game of Queuedle with a score of 70.](70.png)

 I'll show the core function of the solver here. It has been optimized for readability (not performance).

```tsx
// Best-first search for Queuedle
export function bestFirstSearch(
    initialState: GameState,
    maxNodes: number = 500_000
): { bestState: GameState; moveSequence: Move[] } {
    let nodesExpanded = 0;
    const initialNode: Node = {
        state: initialState,
        moves: [],
        score: evaluateState(initialState)
    };

    // Three key data structures for best-first search
    const queue = new PriorityQueue<Node>();  // Nodes sorted by score
    const visited = new Set<number>();        // Avoid cycles
    let bestNode = initialNode;               // Track best node found so far

    queue.enqueue(initialNode, initialNode.score);

    // Always explore the highest-scoring node next
    while (queue.length > 0 && nodesExpanded < maxNodes) {
        const node = queue.dequeue()!;
        nodesExpanded++;

        if (node.state.score > bestNode.state.score) {
            bestNode = node;
        }

        // Skip if we've already explored this state
        const hash = hashState(node.state);
        if (visited.has(hash)) {
            continue;
        }
        visited.add(hash);

        // Generate all possible next moves and add to queue
        for (const move of getValidMoves(node.state)) {
            const nextState = handleSlide(node.state, move.direction, move.index);
            const score = evaluateState(nextState);
            queue.enqueue({
                state: nextState,
                moves: [...node.moves, move], score
            }, score);
        }
    }

    return { bestState: bestNode.state, moveSequence: bestNode.moves };
}
```

## Adding Optimizations

Solvers can always be improved. Even state-of-the-art ones. Their code can be optimized, or ported to new CPU architectures, but most of all, they can be smart and do less work. Every year, the Elo of the best chess engines goes up a few points.

The first optimization I tried was to come up with a better heuristic. While the score of a board is a good signal, a better signal is `score + potential`. We should prefer to explore nodes which have a high score *and* more future moves available.

Luckily, this was a one-line change:

```tsx
// Generate all possible next moves and add to queue
for (const move of getValidMoves(node.state)) {
	const nextState = handleSlide(node.state, move.direction, move.index);

	                                      // Consider remaining moves!
	const score = evaluateState(nextState) + (15 - node.moves.length);
```

With this change, and maintaining the same finishing state of 500k game states, the solver was able to find a board with a score of `81` (up from `70`).

![A game of Queuedle with a score of 81.](81.png)

Next, I tried including the restrictions (rows and columns may only slide in one direction over the course of a game) as part of the heuristic. My thinking was that a board with *more* restrictions is *worse* because it has less potential. However, this did not increase the maximum score it was able to find. In fact, it decreased it.

More failed ideas involved giving higher evaluation scores to boards with better letters (meaning the ability to be part of many different words), as well as letter positioning (vowels in the center of the board, and consonants around the edges).

Later, I'm keen to port the code from JavaScript to a faster language. Possibly with speed optimizations too – like [bitboards](https://healeycodes.com/visualizing-chess-bitboards). With my heuristic optimization, I didn't expect the jump in score from `70` to `81`, and now I want to see how high it can go by searching more game states.
