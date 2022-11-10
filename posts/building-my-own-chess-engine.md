---
title: "Building My Own Chess Engine"
date: "2020-12-20"
tags: ["python"]
description: "Exploring the computational complexity of chess. Code snippets in Python so you can do the same."
---

I have been learning chess (again) and how to program a chess engine (for the first time) over the last month. After skimming some introductory texts, I was convinced that building a simple chess engine — one that would put up a fair fight against a casual player — would take no more than a few days.

I was wrong.

But I made it there in the end and created a toy chess engine ([healeycodes/andoma](https://github.com/healeycodes/andoma)) that I am proud of. It can play a game of chess and solve simple chess puzzles like mate-in-two or mate-in-three. It has a slim UCI interface which means it can be hooked up to lichess.org via [lichess-bot](https://github.com/ShailChoksi/lichess-bot) — a bridge between the lichess API and chess bots.

The first speed bump in its development was grasping the computational complexity of chess — how fast, and wide, the search tree grows. When a chess game starts, white can open in twenty different ways and black can respond in twenty different ways also. After the first full turn, there are 400 variations possible. After the third full turn, there are [over 119 million](https://en.wikipedia.org/wiki/Shannon_number#Shannon's_calculation).

Claude Shannon calculated that there are around `10^120` possible games of chess in his seminal paper _Programming a Computer for Playing Chess_ in 1950. In _Rage Against the Machines_, Nate Silver [quotes](https://fivethirtyeight.com/features/rage-against-the-machines/) Diego Rasskin-Gutman, who said:

> There are more possible chess games than the number of atoms in the universe.

Given unlimited resources, it actually doesn't take many lines of code to calculate every legal variation of chess. Here, the Python package [python-chess](https://python-chess.readthedocs.io/en/latest/) is used for board representation and legal move generation.

```python
from chess import Board, Move, STARTING_FEN

# an adjacency list
positions = {}

# depth-first search from a FEN string
def generate_tree(fen):
    board = Board(fen)
    legal_moves = list(board.legal_moves)
    if fen in positions:
        positions[fen] += legal_moves
    else:
        positions[fen] = legal_moves

    for move in legal_moves:
        board.push(move)
        next_fen = board.fen()
        board.pop()
        
        generate_tree(next_fen)

try:
    generate_tree(STARTING_FEN)
except RecursionError: 
    print(len(positions) + sum(len(p) for p in positions))
```

This program throws a `RecursionError` and prints `59691` — the number of different positions the search tree contained when it crashed. All we need to fix this, is another universe to run the program in.

Given that there are computational limits to abide by, as well as the time control rules of chess, improvements over a naive brute force search must be made.

## Evaluation

In order to search for good positions, it is necessary to understand what makes a good position _good_. The most simplistic way of describing a position's strength is to compare the total value material of each side.

Tomasz Michniewski, author of the [Simplified Evaluation Function](https://www.chessprogramming.org/Simplified_Evaluation_Function), defined some values that are "designed specifically to compensate for the lack of any other chess knowledge". This is perfect for me — a beginner chess player.

This snippet sums the material on the initial board using Michniewski's piece values.

```python
import chess

piece_values = {
    chess.PAWN: 100,
    chess.ROOK: 500,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.QUEEN: 900,
    chess.KING: 20000
}

board = chess.Board(chess.STARTING_FEN)
white_material = 0
black_material = 0

for square in chess.SQUARES:
    piece = board.piece_at(square)
    if not piece:
        continue
    if piece.color == chess.WHITE:
        white_material += piece_values[piece.piece_type]
    else:
        black_material += piece_values[piece.piece_type]
```

Michniewski also provides [piece-square tables](https://www.chessprogramming.org/Piece-Square_Tables), which alter the value of a piece depending on which square it sits on. For example, it's better for pawns to progress up the board and it's better for knights to be near the center of the board.

The bonus of a square may be positive, neutral, or negative. The piece-square tables are presented from White's POV and must be mirrored for Black.

```text
# a knight's bonuses depending on square
-50,-40,-30,-30,-30,-30,-40,-50,
-40,-20,  0,  0,  0,  0,-20,-40,
-30,  0, 10, 15, 15, 10,  0,-30,
-30,  5, 15, 20, 20, 15,  5,-30,
-30,  0, 15, 20, 20, 15,  0,-30,
-30,  5, 10, 15, 15, 10,  5,-30,
-40,-20,  0,  5,  5,  0,-20,-40,
-50,-40,-30,-30,-30,-30,-40,-50,
```

For the king, Michniewski provides two tables — one for the middle game and one for the end game. He defines the end game as being either if:

> Both sides have no queens or

> Every side which has a queen has additionally no other pieces or one minorpiece maximum.

<br>

The evaluation of a chess board is one of the things that's kept me interested in chess engines. Evaluation rules are easy to add and take away. I refactored the code from Go to Python to be able to prototype different rules faster.

After piece-square tables, one might look at pawn structure, mobility, center control, connectivity, trapped pieces, king safety, space, tempo, and other patterns (this list is taken from the Chess Programming Wiki's [Evaluation](https://www.chessprogramming.org/Evaluation) page).

## Searching With Minimax

[Minimax](https://en.wikipedia.org/wiki/Minimax) is a search algorithm that finds the next optimal move by minimizing the potential loss in a worst case scenario. Chess is a game of perfect information — by looking at the board it's possible to know exactly what an opponent is capable of. However, this search for moves is limited by the evaluation function and the depth that computing resources are able to reach.

The search space is a tree of legal moves which grows exponentially at every level (the average branching factor is around 35). By the time the tree is explored, the path to many future boards is known as well as which path restricts the opponent's possible gains the most.

The leaf nodes of the tree return the evaluation of their current state. Non-leaf nodes inherit their value from a descendant node. Eventually, the recursive function reduces down to a value for the given board.

This function can be used to pick the next best move by calling it on every legal move available in the current turn. A great visual resource for this algorithm is Sebastian Lague's [Algorithms Explained – minimax and alpha-beta pruning](https://www.youtube.com/watch?v=l-hh51ncgDI).

```python
def minimax(board, depth, maximizing_player):
    if depth == 0 or board.is_game_over():
        return evaluate(board)
    if maximizing_player:
        value = -float('inf')
        for move in board.legal_moves:
            board.push(move)
            value = max(value, minimax(board, depth - 1, False))
            board.pop()
	    return value
    else:
        value = float('inf')
        for move in board.legal_moves:
            board.push(move)
            value = min(value, minimax(board, depth - 1, True))
            board.pop()
        return value
```

## Alpha-beta pruning

My chess engine uses [alpha-beta pruning](https://en.wikipedia.org/wiki/Alpha%E2%80%93beta_pruning) as an improvement over the naive minimax algorithm — which does not fare well against the exponential nature of chess. Branches of the search tree can be eliminated when it is clear that another branch shows more promise. This significantly reduces the number of moves required to be generated.

![Branches of a minimax search tree being stopped early](alpha-beta-pruning.png)

By reducing the depth of branches that will not bear fruit we can search deeper down the better parts of the tree.

The speed of alpha-beta pruning can be increased by applying [move ordering](https://www.chessprogramming.org/Move_Ordering). This is where the more promising branches of the search tree are searched first — which means less time is spent in the worst branches as they will be cut off early.

Move ordering cannot be 100% accurate but it's a powerful optimization.

In [my engine](https://github.com/healeycodes/andoma), a cheap (but not perfect) `move_value` function is used to sort the initial legal move nodes from best to worst. The logic of this function is capture in its docstring:

```python
'''
How good is a move?
A promotion is great.
A weaker piece taking a stronger piece is good.
A stronger piece taking a weaker piece is bad.
Also consider the position change via piece-square table.
'''
```

## Communication and the UCI Protocol

The [Universal Chess Interface](https://github.com/healeycodes/andoma/blob/main/uci-interface.md) (UCI) is a open protocol to hook up chess engines to user interfaces. The communication is done through standard input and standard output and messages end with `\n`. The move format is long algebraic notation — like `e2e4`, or `e1g1` for white short castling, and an example of a promotion to queen is `a7a8q`.

There are many configuration commands in the specification and it initially seemed overwhelming. After debugging, I found that not many were required to get a chess engine to the _Hello World_ stage.

In order to hook my chess engine up to lichess via [lichess-bot](https://github.com/ShailChoksi/lichess-bot), I implemented the following. These commands are send to the engine from lichess-bot:

- `uci` — the engine reports its name, authors, and `uciok`
- `isready` — the engine reports that it's ready: `readyok`
- `position startpos moves e2e4` — the engine sets it's internal state to match the list of moves
- `go` — the engine should now calculate and respond with the next best move, like `bestmove g8f6`

## A Promise

I have found a great joy interacting with the chess community over the last month. Lichess is a fantastic resource and endlessly fun to play on. The UI is slick and light — and the post-match analysis is revealing and simple to use. It's [open source](https://github.com/ornicar/lila) and relies on donations and sponsorships.

I took breaks from writing this article to play chess against Dad on a real board. We're missing a white rook and use a pencil sharpener as a replacement piece. He has been telling me stories about playing chess decades ago — before IBM's [Deep Blue](https://en.wikipedia.org/wiki/Deep_Blue_(chess_computer)) emerged and beat Garry Kasparov, the reigning world champion, on its second attempt in 1997.

If you are within my social circle, you will have experienced me evangelizing chess and chess engines over the last month — now that I have published this, I promise to chill out a little bit.

## Other Resources

To build [healeycodes/andoma](https://github.com/healeycodes/andoma), I used the following resources (and recommend all of them).

- [Chess Programming Wiki](https://www.chessprogramming.org/Main_Page) — an incredible wealth of knowledge exists here. I spent hours reading through intermediate and advanced concepts just for fun
- [Algorithms Explained – minimax and alpha-beta pruning](https://www.youtube.com/watch?v=l-hh51ncgDI) — Sebastian Lague's breakdowns of algorithms are very approachable and this one is no different
- [A step-by-step guide to building a simple chess AI](https://www.freecodecamp.org/news/simple-chess-ai-step-by-step-1d55a9266977/) — this JavaScript-based tutorial introduces concepts with explicit code snippets. The source code of the final solution is quite readable too
- [thomasahle/sunfish](https://github.com/thomasahle/sunfish) — a simple, feature complete engine to learn from 
- [zserge/carnatus](https://github.com/zserge/carnatus) — a clone of sunfish in Go

<br>

<small>Thanks to [Jez9999](https://commons.wikimedia.org/wiki/File:AB_pruning.svg) for the _Alpha-Beta pruning example_ image.</small>
