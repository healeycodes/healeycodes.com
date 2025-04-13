---
title: "Visualizing Chess Bitboards"
date: "2025-04-13"
tags: ["javascript"]
description: "Brief introduction to chess bitboards and move generation with animations."
---

When simulating board games on a computer, one of the challenges is keeping track of the game pieces. Bitboards are an efficient way to store game state in (usually) 64-bit integers. There are 64 positions on a chess board so we can use each bit as an on/off switch.

Let's say I want to describe a board where `f5` is occupied. For that, we can use the number `67108864`. In decimal notation, it doesn't look that much like a chessboard. In hex, we can see that there's a little more structure: `0x0000000004000000`.

For me, it starts to make more sense when representated as a binary number with 64 digits.

```text
0 0 0 0 0 0 0 0  I've added a line break
0 0 0 0 0 0 0 0  after every eight numbers
0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0
0 0 0 0 0 1 0 0  looks kinda like a chessboard, right?
0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0
```

We can't pack an _entire_ game's state into a number (e.g. piece color, piece type, castling rights) so we use groups of numbers.

We can use _bitwise_ operations on these numbers to manipulate individual bits using operators like `AND`, `OR`, `XOR`, `NOT`, and bit shifts. These operations are are among the fastest operations a CPU can perform. Bitboards are also cache-friendly since they pack data into fewer memory locations.

In order to move a piece at `f5` forwards we can shift the bitboard left by 8 bits.

```js
pieceOnF5 = 0x0000000004000000;
// Move one rank forward (from f5 to f6)
pieceOnF5 << 8n; // 0x0000000400000000n
```

Why 8? Well, if you picture all of a chessboard's squares lined up in one long row, moving upwards would require you to move 8 places to the left.

# Masks

A mask is a bitboard used to isolate, modify, or test specific squares using bitwise operations.

An example of a mask might be the `A` file: `0x0101010101010101`. To check if there are any pieces on the `A` file, we can use bitwise `AND`.

```js
if (pieces & 0x0101010101010101) {
  // At least one piece on the A file
}
```

Even though I know a little bit about bitboards, I still find them confusing and unintuitive. I'm also prone to mistakes while working with them.

I've found that visual examples (and interactive debugging tools) can be very helpful. Let's take a look at how we can generate the initial white pawn attacks.

Two numbers will probably stick out in the below example; `7` and `9`. If you picture that long row of chessboard squares I mentioned before, think about how many squares you'd have to move to be diagonally forwards or backwards from your starting position.

<div className="bitboards" id="whitePawnAttacks"></div>

Without bitboards, a program has to perform many more (magnitudes more!) instructions. The equivalent code, without bitwise operations, would look something like this:

```js
attacks = [];
for (i = 0; i < 64; i++) {
  piece = board.getPiece(i);
  if (piece === "P") { // White pawn

    // Check left attack (forward-left)
    if (!board.isOnFileA(i)) {
        attacks.push(i + 7);
    }
    
    // Check right attack (forward-right)
    if (!board.isOnFileH(i)) {
        attacks.push(i + 9);
    }
  }
}
```

And I haven't included the board class, or the data structures being operated on behind-the-scenes.

I've got one more example where we generate a knight's attacks. We start with the position of a knight on the board (encoded in a bitboard) and calculate all the psuedo-legal knight attacks. Remember: the result is _also_ a bitboard.

Inside a chess engine, we would then use more bitwise operations to see if those positions were occupied so we could evaluated the strength of each potential move.

The "not file" masks here are used to prevent invalid wraparounds. From `g5`, these masks stop the knight from moving to `l6` and `l4` (which aren't real squares).

<div className="bitboards" id="knightAttack"></div>

In practice, chess engines often pre-compute and store attack masks in lookup tables for even better performance, rather than calculating them on the fly like this – as well as other sophisticated techniques like [zobrist hashing](https://www.chessprogramming.org/Zobrist_Hashing) and [magic bitboard](https://www.chessprogramming.org/Magic_Bitboards).

I hope this helps show how bitboards can be the building blocks of any kind of chess computation.

For further reading, I've found the [Chess Programming Wiki](https://www.chessprogramming.org/Bitboards) and the source code for `python-chess` (e.g. [calculating attack masks](https://github.com/niklasf/python-chess/blob/ffa04827e325de5b4d39a67eee3528474b814285/chess/__init__.py#L875)) to both be very useful.

I also have an older post which serves as a gentle introduction to chess engines: [Building My Own Chess Engine](/building-my-own-chess-engine).
