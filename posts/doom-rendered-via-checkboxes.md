---
title: "DOOM Rendered via Checkboxes"
date: "2021-10-14"
tags: ["javascript"]
description: "WebAssembly meets 16000 HTML checkboxes."
---

![DOOM rendered in 320x200](doom-checkboxes.png)

You can [play now](https://healeycodes.github.io/doom-checkboxes/) (desktop Chrome/Edge only), view the [source code](https://github.com/healeycodes/doom-checkboxes), or read on for the how.

Earlier this week, I read a post on Bryan Braun's blog called [I keep making things out of checkboxes](https://www.bryanbraun.com/2021/09/21/i-keep-making-things-out-of-checkboxes/) where he describes building [Checkboxland](https://www.bryanbraun.com/checkboxland/) at the Recurse Center.

> A JavaScript library that lets you display text and animations on a checkbox grid.

It's a delightful piece of software. The API and documentation is better than some of the libraries I'm actually paid to work with. It renders text, shapes, images, and video. There's also a low-level API. It's feature complete. Bryan has used it to build some awesome interactive animations too.

A commenter wrote on [on Hacker News](https://news.ycombinator.com/item?id=28826839):

> I don't think you can really say you've exhausted this until you can run DOOM rendered with checkboxes.

After checking with Bryan that he wasn't implementing this himself, I took the [nerd snipe](https://xkcd.com/356/) bullet for him and set about combining Cornelius Diekmann's work in [DOOM via WebAssembly](https://github.com/diekmann/wasm-fizzbuzz) with Checkboxland.

Cornelius painstakingly describes the process of porting DOOM to WebAssembly from scratch in the [README](https://github.com/diekmann/wasm-fizzbuzz/tree/main/doom). I took this DOOM WebAssembly setup, including the JavaScript integration code, and wrote my own glue code to connect it to Checkboxland.

In my project, DOOM runs via WebAssembly in a hidden `<canvas>`. I use [HTMLCanvasElement.captureStream()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream) to turn this into a MediaStream. A `<video>` element displays this MediaStream and is then consumed by [renderVideo](https://www.bryanbraun.com/checkboxland/#rendervideo) from Checkboxland. I experimented with a few different [threshold](https://www.bryanbraun.com/checkboxland/#renderVideo-arguments) values to get DOOM to render as clear as possible. A possible improvement here is to use some kind of [dither](https://en.wikipedia.org/wiki/Dither) filter.

Optionally, the `<video>` element can be hidden as well. However, test users were unable to exit the main menu without the aid of the original hi-res DOOM.

Our screen is a 160 by 100 grid of native checkboxes. Higher resolutions work but FPS drops off dramatically. The image at the top of this post is from an earlier version with a resolution of 320x200.

```js
const cbl = new Checkboxland({
  dimensions: "160x100",
  selector: "#checkboxes",
});
```

The cursed CSS property [zoom](https://developer.mozilla.org/en-US/docs/Web/CSS/zoom) is used to shrink the checkboxes down. `transform: scale(x)` resulted in worse performance and worse visuals. Unfortunately, this means that Firefox users need to manually zoom out.

> Non-standard: This feature is non-standard and is not on a standards track. Do not use it on production sites facing the Web: it will not work for every user.

Key events are forwarded to the hidden `<canvas>` to avoid focus issues.

```js
const forwardKey = (e, type) => {
  const ev = new KeyboardEvent(type, {
    key: e.key,
    keyCode: e.keyCode,
  });
  canvas.dispatchEvent(ev);
};

document.body.addEventListener("keydown", function (e) {
  forwardKey(e, "keydown");
});

document.body.addEventListener("keyup", function (e) {
  forwardKey(e, "keyup");
});
```

While the `.wasm` is downloaded and processed, the grid displays a message via [print](https://www.bryanbraun.com/checkboxland/#print).

![DOOM WebAssembly loading..](loading.png)

Afterwards, the user is instructed to click anywhere (a user action is required so that the `<video>` can be programmatically played) and the game begins!

While I still have you, did you know that Bill Gates once [digitally superimposed himself](https://youtu.be/KN0K58EfJSg?t=44) into DOOM to promote Windows 95?

![Bill Gates in DOOM](billdoom.png)
