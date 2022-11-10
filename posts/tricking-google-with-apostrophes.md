---
title:  "A Tutorial on Tricking Google: Encoding Messages in Apostrophes"
date:   "2019-06-18"
tags: ["python"]
path: "discuss/python/beginners/tutorial/2019/06/18/tricking-google-with-apostrophes.html"
description: "Using character codes to hide in plain sight."
---

Genius [suspected](https://bgr.com/2019/06/17/genius-vs-google-lyrics-results-on-search-copied-from-lyrics-site/) their lyrics were being scraped by Google but they needed a way to prove it. So they watermarked some of their lyrics with a message in Morse code. It read __Red Handed__. It was encoded using different types of apostrophes. I suspect they used _U+0027 APOSTROPHE_ and _U+2019 RIGHT SINGLE QUOTATION MARK_ since those are the most commonly used but I can't be sure.

Let's write up a solution to this problem: encoding a message in apostrophes via Morse code. We'll assume that just those two apostrophes are available. I'm choosing Python because it's nice for string manipulation.

The important parts: our two markers, and the alphabet in Morse.

```python
APOSTROPHE = '\''
RIGHT_MARK = '’'

morse = [".-", "-...", "-.-.", "-..", ".", "..-.", "--.", "....",
         "..", ".---", "-.-", ".-..", "--", "-.", "---", ".--.",
         "--.-", ".-.", "...", "-", "..-", "...-", ".--", "-..-",
         "-.--", "--.."]
```

First, we need a way of converting text to Morse code. `'cat'` becomes `'-.-..--'` (which in a way looks like a sleeping cat!).

```python
# flatten a 2D list
flatten = lambda l: [item for sublist in l for item in sublist]

# :text: a message made up of [a-zA-Z]
def to_morse(message):
    m = [morse[ord(c)-97] for c in message.lower()]
    return flatten(m)
```

I've chosen _APOSTROPHE_ to represent the dot in Morse as it has a lower Unicode value. _RIGHT SINGLE QUOTATION MARK_ represents a dash. Once we have our message in Morse, we convert it to an apostrophe message using substitution. We then iterate over the source text until we hit an apostrophe and exchange it for the next character in our message. Take a look.

```python
# :message: a message to encode
# :source: a source text with apostrophes
def insert_morse(message, source):
    # a list of dots and dashes
    morse = to_morse(message)
    # a list of the two types of apostrophes
    secret = [APOSTROPHE if m == '.' else RIGHT_MARK for m in morse]
    inserted = []
    for c in source:
        if len(secret) > 0 and (c == APOSTROPHE or c == RIGHT_MARK):
            inserted.append(secret.pop(0))
        else:
            inserted.append(c)
    return ''.join(inserted)
```

If you're wondering how to decode a source text that has such a message encoded within it's actually far simpler.

```python
# :source: a source encoded via insert_morse
def retrieve_morse(source):
    morse = []
    for c in source:
        if c == APOSTROPHE:
            morse.append('.')
        elif c == RIGHT_MARK:
            morse.append('-')
    return ''.join(morse)
```

Let's look at an example of this in action.

```python
source_text = 'Hello \'\' World, \'\' no \'\' secrets \' here!'
secret = 'cat'

encoded_message = insert_morse(secret, source_text)
retrieved_message = retrieve_morse(encoded_message)

print(encoded_message) # Hello ’' World, ’' no '’ secrets ’ here!
print(retrieved_message) # -.-..--
```

Pretty neat. If you thought that was cool, wait until you find out how people have been using [zero-width spaces](https://en.wikipedia.org/wiki/Zero-width_space) to get up to more advanced fingerprinting trickery.

The exercise of decoding __and__ understanding a Morse message without spaces is left up to the reader! I'd love to hear your thoughts and resources on hiding data in plain sight on the web.

Grab the code from this article [on GitHub](https://github.com/healeycodes/hidden-in-apostrophes).
