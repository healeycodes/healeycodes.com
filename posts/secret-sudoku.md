---
title:  "I Ported Sudoku to Your URL Bar and It Plays like a Dream"
date:   "2019-02-21"
tags: ["javascript"]
path: "sudoku/front-end/javascript/2019/02/21/secret-sudoku.html"
description: "Goofy project in which you can play Sudoku entirely within your URL bar."
---

Sudoku powered by the dark arts of `window.location.hash`, which means zero page refreshes are required. Unfortunately this means that the browser history gets spammed.

![Secret Sudoku](secret-sudoku.gif)

Playable [right here](https://healeycodes.github.io/secret-sudoku/), Secret Sudoku unlocked a series of unique experiences for me. It's not every day that you find yourself brute forcing a 19th-century newspaper puzzle. Or, better yet, getting Travis CI to do it for you.

```javascript
test('app plays without error', () => {
    const game = main(this, sudoku);
    game.startGame();
    for (let i = 0; i < 20000; i++) {
        // 0-81, 0-9
        if (game.play(Math.floor(Math.random() * 82), Math.floor(Math.random() * 10)) === true) {
            /* This test will usually complete the game six times over,
               adjust the difficulty randomly on completion */
            game.startGame(Math.floor(Math.random() * 6));
        };
    }
});
```

It turns out that all you need are some emotes, a few eventListeners, and a dream. Many thanks to Rob McGuire-Dale and his wonderful Sudoku [generator/solver](https://github.com/robatron/sudoku.js). And to Mathew Rayfield for showing that you can [animate URLs](http://matthewrayfield.com/articles/animating-urls-with-javascript-and-emojis/).

```javascript
// Main render functions
this.squaresFilled = () => this.board.join('').match(/[^.]/g).length
this.completeness = () => `${this.squaresFilled()}/81`;
this.start = () => `Secret_Sudoku_~_${this.completeness()}_~_row:`;
this.render = (extra = '') => {
    window.location.hash = `${this.start()}${this.rowMap[this.row]}__${this.prettifyRow(this.currRow(), this.cursor)}${extra}`;
}
```

Secret Sudoku is the perfect project to work on to help me relax in the evenings. It makes programming feel far more fun than logic abstraction should. Taking pull-requests today and every day hereafter.

#### [Repository](https://github.com/healeycodes/secret-sudoku)
