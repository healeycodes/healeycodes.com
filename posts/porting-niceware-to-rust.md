---
title: "Porting Niceware to Rust"
date: "2021-10-07"
tags: ["rust"]
description: "The sensation of incremental progress when programming with Rust."
ogimage: "./og-image.png"
---

I've been thinking about the sensation of incremental progress when programming with Rust. I come from dynamic programming land and I recently had a breakthrough with my productivity in Rust — instead of a technical challenge, I had to overcome an emotional barrier.

I used to find Rust all-round less fun than other languages. Progress felt slow and when I started battling the borrow checker it seemed like I was stuck in a loop. However, I've turned a corner and now see that I was framing my progress incorrectly. Most of these thoughts arrived while I was porting Niceware to Rust ([healeycodes/rust-niceware](https://github.com/healeycodes/rust-niceware)) after reading the following [twitter thread](https://twitter.com/steveklabnik/status/1445048008874332160).

> @steveklabnik

> this is 10000% an idle thought, but

> do we perceive languages with stricter compilers as being more difficult because when something doesn't compile, we blame the compiler, but in languages that are looser (or interpreted), when something doesn't work, we blame ourselves?

> @munificentbob

> I think that's part of it. But there's also something different about the sensation of incremental progress. If I can at least run my program and have it do something before it dies, I feel like I'm making some kind of progress. ... 

> When the compiler yells at you, it doesn't just feel like you keep dying on level 1 of the game, it feels like you can't even get past the damn main menu.

> Part of *that* is because I think a lot of people don't experience iterating on the static semantics of their program and fixing compile errors as "programming". It feels like some sort of separate, less rewarding chore.

## Niceware

[diracdeltas/niceware](https://github.com/diracdeltas/niceware) is a small, elegant library to generate or convert random bytes into passphrases in Node and the browser. It's a reversible mapping of bytes-to-words, using a word list sized exactly 2^16. Given an even number of `u8` bytes, you get half that amount of words. `[255, 255] -> ["zyzzyva"]` and vice versa.

It has three core functions.

- `bytesToPassphrase`
- `passphraseToBytes`
- `generatePassphrase`

Along with great test coverage, this makes it a good candidate for porting and continuing my Rust learning adventure.

After two hours of coding, reading docs, and StackOverflow perusing, I realized that I hadn't executed my library yet. I relied entirely on IDE plugins to point out my errors, display warnings, and offer Quick Fixes.

I had completed the project (aside from writing tests) without executing a single line of it. This would have been a bit of a cardinal sin in a dynamic language like JavaScript or Python — making assumptions that everything you've written is error free and continuing to build up and up on an uncertain foundation.

However, my Rust code ran perfectly. No problems. More importantly, I had managed to consciously reframe my idea of 'progress' as I went. I wasn't debugging or printf-ing values but, holding the hand of a verbose language server, I was wrestling logic into well-shaped code.

The Rust standard library (and its documentation) continue to impress me i.e. the [binary_search](https://doc.rust-lang.org/std/vec/struct.Vec.html#method.binary_search) methods, one version seen below, are flexible and practical.

```rust
pub fn passphrase_to_bytes(words: Vec<&str>) -> Result<Vec<u8>, error::UnknownWordError> {
    let mut bytes: Vec<u8> = vec![0; words.len() * 2];

    for (index, word) in words.iter().enumerate() {
        match words::ALL_WORDS.binary_search(&&*word.to_lowercase()) {
            Ok(word_index) => {
                bytes[2 * index] = (word_index / 256) as u8;
                bytes[2 * index + 1] = (word_index % 256) as u8;
            }
            Err(_) => {
                return Err(error::UnknownWordError::new(&format!(
                    "unknown word: {}",
                    word
                )))
            }
        }
    }
    Ok(bytes)
}
```

I find myself looking back on a lot of my half-finished Rust projects that I never managed to get running and thinking: maybe I was closer than I thought before getting frustrated with the compiler and giving up.

> @rljacobson

> It matters when the error is caught. A syntax error my IDE catches is obviously my fault. A logic error at runtime is obviously my fault. A complicated type error that is hard to see even when I'm looking? That's less compelling.

## Cargo

This was also my first time publishing something to crates.io. The DX/UX of Cargo is comparable to npm's. For simple use-cases, it gets out of your way, and there are just a handful of few steps to give your code to the world.

- `cargo init` to create the initial local files
- I edited `Cargo.toml` to add description/version/dependencies
- `cargo test`
- `cargo login` (it was my first time authenticating)
- `cargo publish --dry-run` (there were no problems)
- `cargo publish`!

Also see [Publishing on crates.io](https://www.notion.so/Porting-niceware-to-Rust-61d4c51d907a4b3bb8e845063dc7e3e1#e514d9aaa0c7432398fb472e92be4c41).

I'm not sure who is downloading [my crate](https://crates.io/crates/rust-niceware) but I'd appreciate any thoughts/issues on [healeycodes/rust-niceware](https://github.com/healeycodes/rust-niceware) to help me improve at Rust :)
