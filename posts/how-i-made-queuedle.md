---
title: "How I Made Queuedle"
date: "2025-05-28"
tags: ["javascript"]
description: "A daily word sliding puzzle game inspired by Wordle and Scrabble"
---

[Queuedle](https://queuedle.com) is a daily word sliding puzzle game inspired by Wordle and Scrabble. It combines the positional gameplay of Scrabble with the daily puzzle and discovery elements of Wordle. Everyone plays the same board and it can be played quickly or slowly.

Players pull from a letter queue and push onto the board, and words are automatically highlighted. Your score is the number of letters used in words. Letters can count twice so `MOON` is actually two words: `MOO` and `MOON`.

Playtesters who are into NYT puzzles tend to plan several moves ahead. Since you can see enough of the queue, you can strategize. A big vocabulary helps, as does knowing the Scrabble dictionary (but two-letter words don’t count).

![A game of Queuedle being played.](overview.mp4)

## Daily Puzzles

Famously, Wordle had the next day's puzzle embedded in the source code. You could look it up if you wanted to spoil yourself. However, for Queuedle, there's a bit more setup required. I need to generate a board and a letter queue.

I didn't attempt to do this manually as it's far too much work. I don't think there's much of a payoff for the user if I design interesting starting states because there are too many starting moves – and each move jumbles the board.

In order to generate a board and a letter queue with the same *vibe* as Scrabble, I use the Scrabble letter distribution when I randomly pick letters (Qs are rare, Es are everywhere).

```tsx
// Scrabble tile frequencies
const SCRABBLE_TILES = [
  { letter: 'a', count: 9 },
  // ..
  { letter: 'e', count: 12 },
  // ..
  { letter: 'z', count: 1 }
];
```

To have everyone around the world play the same board at the same time, I use a seeded pseudorandom number generator. Given a starting state, the same endless list of numbers is generated.

Everyone who plays Queuedle does so with a shared seed: the current date.

```tsx
// Get the current local day as a seed
export const getCurrentDaySeed = (): number => {
  const now = new Date();
  const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return localDate.getTime();
};
```

Each date becomes a unique seed. The [Lehmer random number generator](https://en.wikipedia.org/wiki/Lehmer_random_number_generator) algorithm which consumes this is ~1 line of code. Giving us a new Queuedle game every single day.

```tsx
  // Generate a random number between 0 and 1
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  // Generate a random integer between min (inclusive) and max (inclusive)
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
```

The first time I set up the game generation logic, I ran into a problem. The starting board would contain words! In retrospective, it's unsurprising that a random 5x5 board of letters would contain at least one three letter word from the 178691 words in the Scrabble tournament word list.

I decided to throw the user's CPU at this problem. I simply generate boards, deterministically, until the starting board contains zero words.

```tsx
// Generate a valid game state with no words on the board
export const generateValidGameState = (baseSeed: number) => {
  let attempt = 0;
  while (true) {
  
    // Deterministically alter the seed
    const seed = baseSeed + attempt;
    const { grid, queue } = generateGameState(seed);
    const highlights = findWords(grid);
    if (highlights.length === 0) {
      return { grid, queue, attempt };
    }
    attempt++;
  }
};
```

This sometimes requires ~50 board generation cycles. With my unoptimised JavaScript code, this only takes a handle of milliseconds.

## Game UI

I like the understated design of Wordle and didn't spend too long on Queuedle's interface. The tiles and arrows have a slight shadow and respond to actions with brief animations.

![Zoomed in view of shadows and tile animations.](shadows.mp4)

I used [Motion](https://motion.dev) (my first time doing so) and my use case seems to live within the happy path of this library. I only needed to pass a few lines of configuration.

```tsx
export default function Tile({ letter, isNew }: TileProps) {
  if (isNew) {
    return (
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className={`
          m-1 p-1.5
          w-11 h-11 flex items-center justify-center
          rounded-lg
          text-2xl font-bold
          transition-colors duration-200
          bg-[#f5e6c5]
          shadow-sm
        `}
      >
        {letter.toUpperCase()}
      </motion.div>
    );
  }
```

I added a fade-in delay to the outline to better communicate the effect of the user's move. I suppose this is subjective, but without the delay it felt like the outline was being drawn almost in advance of the move.

![Zoomed in view of the word list animation.](words.mp4)

The animation of the found words serves no function. I just like it.

One design problem I haven't solved yet is how to better communicate when a letter is used by multiple worlds. In the case of `MOO` and `MOON`, it's quite obvious that the `MOO` part is used twice as it's wrapped in two outlines. However, if words have multiple used-twice letters, it gets busy and confusing.

I tried to solve this problem by cycling through a small pallete of rainbow colors for the different word outlines to better distinguish one word outline from another. However, players kept asking me what the different colors mean, hah.

One idea I had, was to highlight word outlines when a letter is tapped. But I don't want to give up the simple controls of: just tap the arrows. For example, on desktop, if I show that letters are clickable, people will try and move them, etc.

My goal was for [Queuedle](https://queuedle.com) to be roughly as hard to pick for the first time as Wordle. I think I got there. I thought about adding a tutorial animation ... but I always skip them.
