---
title: "Making a Text Editor with a Game Engine"
date: "2023-01-25"
tags: ["go"]
description: "Writing my own quirky version of nano using the 2D game engine Ebitengine."
---

The command line text editor [nano](https://en.wikipedia.org/wiki/GNU_nano) doesn't quite work how I want it to. So I spent two days hacking together my [own text editor](https://github.com/healeycodes/noter), based on nano, so that I can change it over time and it can grow with me.

I am writing these words in that text editor.

It's written in Go and uses a 2D game engine called [Ebitengine](https://github.com/hajimehoshi/ebiten) for rendering/input. I was initially going to write a terminal text editor but whenever I sat down and imported a terminal library I felt like I was getting too much for free (e.g. the rendering of lines of styled text, input handling, and layout tools) and also like I was giving up fine grained control.

![A screenshot of noter – which looks like nano – an Emily Dickinson poem is being edited.](noter.png)

This article is broken up into the different problems I needed to solve along the way. The sections are roughly in the same order that I tackled them.

## Fonts

I like pixel fonts. I wanted to use [Monocraft](https://github.com/IdreesInc/Monocraft) (a monospaced programming font inspired by the Minecraft typeface) but ran into trouble getting the TFF file to render without being blurry — even though Ebitengine has a [font example](https://ebitengine.org/en/examples/font.html) that looks crisp enough.

Instead, I used the PNG images from [ark-pixel-font](https://github.com/TakWolf/ark-pixel-font) (monospace size 12). Each character is a transparent PNG that's turned into an Ebitengine image object.

Preparing these images turned out to require quite a bit of glue code.

1. A Bash script clones [ark-pixel-font](https://github.com/TakWolf/ark-pixel-font) and extracts the monospaced images
2. A Python script reads these images (the filenames are the Unicode code points) and then builds two files; a binary file that's made up of every PNG file appended together, and a JSON file that describes the offsets and sizes of these images in the binary file e.g. `{"U+00DC": [69553, 85]}`.

I generated these two files so they could be embedded in the Go program.

During `init`, the JSON file is parsed and looped, and the PNG files are read from the binary file and loaded as Ebitengine images. In Go, files are embedded with `//go:embed <path>`.

```go
var (
  //go:embed fonts/dist/fonts.store
  fontStoreRaw []byte // Binary file, PNG files appended together
  //go:embed fonts/dist/fonts.json
  fontMapRaw []byte // JSON file, {unicode hex: [offset, size]}
// ...
```

If there's a way to embed nested directories without using any libraries, let me know.

Also, after publishing, tinne26 [had some great advice](https://github.com/healeycodes/noter/issues/1#issue-1557784446) on rendering crisp pixel fonts without resorting to using images.

## Storing Text in Memory

The text editor stores the entire document in memory (mostly because I can't remember the last time I edited a file that was more than 1% of my available RAM).

A text document needs to be stored in a way that makes each edit operation efficient. But, given that the documents I'll be editing are quite small, and my computer is quite fast, the bar for "efficient operations" is pretty low.

Let's starting with the most inefficient and naive strategies. Storing a document in a simple string would result in input lag because any edit operation would require the *entire string* to be recreated. Moving up and down lines, and cutting lines, would be tricky too — the text editor would need to scan for a new line characters and the code would be messy.

Using a dynamic list isn't that much better than a string. Overwriting characters would be efficient and inserting/appending would be quicker than a string. But removing a line would still harder than it should be — and text editors need a lot of line logic. I think that, like the string case, a single dynamic list would cause input lag.

I ended up going with a doubly linked list of rune arrays.

I felt this was a good mix between something that's quick to code and something that's performant. Deleting a line takes constant time, it can be taken out of the list by rewiring its previous element and next element to point to each other and then be garbage collected. Inserting or appending to a line is an inefficient operation but, in practice, lines are a fixed size and the cost is negligible.

```go
// A loaded document is a linked list of connected Lines
type Line struct {
	prev   *Line
	next   *Line
	values []rune
}
```

Go's rune type is an alias for the int32 data type which is used to represent a Unicode code point. It's a more accurate representation of individual characters in a string as opposed to using a byte or an int to represent a character which leads to issues when working with multibyte characters. Additionally, the rune type allows for easier manipulation of Unicode strings, such as iterating over the characters in a string or comparing characters for equality.

If I were concerned about the efficiency of operations within a line, I could use a [gap buffer](https://en.wikipedia.org/wiki/Gap_buffer) — a type of buffer that stores the text as a continuous array of characters, with a "gap" in the middle that can be moved around as the user makes edits.

Or I could use a [rope](https://en.wikipedia.org/wiki/Rope_\(data_structure\)) — a data structure that stores text as a balanced tree of strings, where each leaf node is a string and each internal node represents the concatenation of its children. This allows for efficient insertion and deletion of text.

If I found myself editing very large files, I could refactor to use a [piece table](https://en.wikipedia.org/wiki/Piece_table) — a data structure that stores the text as a collection of "pieces" which can be either a string of characters or a reference to another piece. This allows for efficient editing of large files by only modifying the necessary pieces.

Real text editors use a mixture of these data structures, and others, to store text and handle things like search and replace operations.

## Rendering

The text editor pops up its own dedicated window with what's essentially a raw canvas. An Ebitengine game implements the [ebiten.Game](https://pkg.go.dev/github.com/hajimehoshi/ebiten/v2#Game) interface, which has a draw function that's called as frequently as the device's refresh rate.

Each draw call, the text editor:

- Clears the screen by filling it with white
- Renders the top bar, bottom bar, and their borders ([ebitenutil.DrawLine](https://pkg.go.dev/github.com/hajimehoshi/ebiten/v2/ebitenutil#DrawLine))
- Renders the cursor, which is a gray rectangle in the background ([ebitenutil.DrawRect](https://pkg.go.dev/github.com/hajimehoshi/ebiten/v2/ebitenutil#DrawRect))
- Renders all viewable lines

A long document can be thought of as separate viewable chunks. Each chunk is as long as the number of lines that fit between the top and bottom bar which depends on the font size and resolution (both customizable). When you use command+up/down, you can navigate between these chunks (like page up/down).

Lines are not wrapped but they can be scrolled by navigating the cursor left and right.

The cursor inserts to its left (like nano).

![An arrow points to the left of a cursor's gray rectangle.](noter-cursor.png)

This means that, in the above screenshot, the cursor is sitting on top of a new line character (rendered as an empty space). An invariant that the text editor maintains throughout all loading/editing/saving operations is that each line has a `\n` at the very end. Empty lines are not empty (like how empty strings are `""`) they have this new line character, and when the cursor appears on an empty line, any input will be inserted to the left of the new line character.

## Input

An editor object has a reference to the entire document because it can access the first line. The cursor object keeps track of the current line/column position.

```go
type Cursor struct {
  line *Line // the current line
  x    int
}

type Editor struct {
  start    *Line // line 1
  cursor   *Cursor
  modified bool
}
```

When a user enters a character, like the letter A, it triggers a block of logic inside Ebitengine's update function that runs 60 times per second. Modifier keys, like shift, are also checked.

```go
// Keys which are valid input
for i := 0; i < int(ebiten.KeyMax); i++ {
  key := ebiten.Key(i)
  if inpututil.IsKeyJustPressed(key) {
    shift := ebiten.IsKeyPressed(ebiten.KeyShift)
    keyRune, printable := KeyToRune(key, shift)

    // Skip unprintable keys (like Enter/Esc)
    if !printable {
      continue
    }

    // ...

    e.HandleRune(keyRune)
  }
}
```

Inside `HandleRune`, insertable characters, like the letter A, cause the current line to be modified, and the cursor to be advanced.

```go
modifiedLine := make([]rune, 0)
modifiedLine = append(modifiedLine, e.cursor.line.values[:e.cursor.x]...)
modifiedLine = append(modifiedLine, r)
modifiedLine = append(modifiedLine, e.cursor.line.values[e.cursor.x:]...)
e.cursor.line.values = modifiedLine
e.cursor.x++
```

A new line operation occurs when the user presses Enter. It inserts a new line character at the cursor's location and creates a new line with the values to the right of the cursor. Whenever lines are created or removed, the above and before lines need to have their `prev` and `next` references updated. The logic for this runs when `HandleRune` receives `\n`.

Deleting via Backspace is the opposite of an insert; two slices are made from the current line's values (minus one character) and then joined. If the cursor is at the start of a line, the previous line's new line character is removed and the lines are joined — followed by cleaning up/fixing line references.

There are a few edge cases like when the cursor is on the first or final lines because `prev` and `next` can be `nil`. A quirk of the text editor is that the smallest possible document that can be loaded or saved is a single new line character.

## Copy/Paste

Copying was easier to implement than pasting. The current line's values are turned from runes into bytes and then passed to this kinda funny looking function which spawns *an entire process* every time. I imagine the "proper" way to implement this is to use a per platform system call.

But I only had two days, and only needed to support macOS.

```go
// Inside Update(), we listen for command+c,
// and get the bytes via `[]byte(string(e.cursor.line.values))`

func macOScopy(copyBytes []byte) error {
  // pbcopy takes stdin and places it in the clipboard buffer
  cmd := exec.Command("pbcopy")
  in, err := cmd.StdinPipe()
  if err != nil {
    return err
  }
  if err := cmd.Start(); err != nil {
    return err
  }
  if _, err := in.Write(copyBytes); err != nil {
    return err
  }
  if err := in.Close(); err != nil {
    return err
  }
  if err := cmd.Wait(); err != nil {
    return err
  }
  return nil
}
```

Pasting text was quick to implement but it's very inefficient because each rune from the paste buffer is treated as an insert operation. It's like someone is sitting there typing each new character by hand. The benefit of this method is that the existing input-handling code can be directly reused.

```go
// Paste
if inpututil.IsKeyJustPressed(ebiten.KeyV) && ebiten.IsKeyPressed(ebiten.KeyMetaLeft) {
  pasteBytes, err := macOSpaste()
  if err != nil {
    log.Fatalln(err)
  }
  for _, r := range string(pasteBytes) {
    e.HandleRune(r) // <-- expensive!
  }
  return nil
}
```

Similar to how bytes are place into the clipboard buffer, a new process is required each time for pasting.

```go
func macOSpaste() ([]byte, error) {
  // pbpaste writes to stdout from the clipboard buffer
  cmd := exec.Command("pbpaste")
  pasteBytes, err := cmd.Output()
  if err != nil {
    return nil, err
  }
  return pasteBytes, nil
}
```

After publishing, sedyh [recommended the golang-design/clipboard library](https://github.com/healeycodes/noter/issues/1#issuecomment-1404741507) for crossplatform copy/paste, which also avoids creating unnecessary processes on macOS.

## Navigation

This is a keyboard-only text editor so navigation is a priority. However, the bar that nano sets for navigation is low. As of launch, there are two ways to navigate around; arrow keys and command+arrow keys. The latter works like page up/down.

I'd like to soon implement option+arrow keys to skip over words, and after that, perhaps full text search with the ability to tab between words. The bottom bar can be replaced by the current search term à la vim and the other powerhouse text editors.

It wouldn't be too difficult to allow the mouse to be used. All the font images are all the same size, and we know the size of the top and bottom bar, and the little bit of padding, we can turn a mouse click into a new cursor location. We already know the current lines that are being rendered and Ebitengine, *being that it's a game engine*, has fantastic support for things like: clicking the screen in a specific place. The solution would turning an [x, y] click position into a position on a grid defined by existing variables.

Text highlighting might arrive at some point. It's required to support more complex copy operations (currently all you can cut or copy is the current line). I suppose that the cursor object could keep track of a "highlight count", a negative or positive integer that describes which runes are highlighted in relation to the cursors position. Visually, this could be relayed using a light blue background, similar to how the cursor is drawn.

You can follow the progress of this quirky, and imperfect, piece of personal software (which, for now, is called *noter*) in [its repository](https://github.com/healeycodes/noter).

<small>Thanks to [Zach Goldstein](https://zachgoldstein.engineering/) for providing feedback on an early draft.</small>
