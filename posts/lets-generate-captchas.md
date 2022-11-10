---
title:  "Let's Build a CAPTCHA Generator with Node.js"
date:   "2019-11-11"
tags: ["javascript"]
path: "javascript/webdev/node/tutorial/2019/11/11/lets-generate-captchas.html"
description: "Using Canvas, Express, and a GitHub Action."
---

CAPTCHAs are [not accessible](https://www.w3.org/TR/turingtest/) and in some cases not even effective but there's a lot to be learned by generating our own!

Find the source code for this article at [healeycodes/captcha-api](https://github.com/healeycodes/captcha-api)

## A solution for spam

Let's imagine a client who demands a solution for bot spam. They ask for an image and a string of the image's text. You call to mind every inscrutable jumbled mess of letters and numbers you've frustratingly failed to solve. You agree to the task nonetheless.

![Am I a human? Yes. Can I type phi off the top of my head? No. Picture of hard CAPTCHA](hard-captcha.png)

This client has a whole fleet of websites. Different sized CAPTCHAs are required in different places. They will provide a width and a height. This describes the specification of our API.

JavaScript is great for generating images because we can lean on the [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API). I've always found it to be handy to use with a lot of Stackoverflow content for when I'm stuck.

We don't want to generate our CAPTCHAs in browser-land because the bots that we're trying to keep out can inspect the source code, find the values in memory, and try all kinds of other tricky tactics.

## A Node.js service

Let's move it to the back-end to a service that can be called as desired. Someone has already solved the issue of accessing a Web API where there is not one, with [node-canvas](https://www.npmjs.com/package/canvas) or `npm i canvas`.

> [canvas] is an implementation of the Web Canvas API and implements that API as closely as possible.

We'll need to generate some random text each time. So let's write two functions to help us. For our API, we'll break logic down into functions that do one thing (and one thing well) so that the end result is easy to reason about and maintain.

```javascript
/* captcha.js */

// We'll need this later
const { createCanvas } = require("canvas");

// https://gist.github.com/wesbos/1bb53baf84f6f58080548867290ac2b5
const alternateCapitals = str =>
  [...str].map((char, i) => char[`to${i % 2 ? "Upper" : "Lower"}Case`]()).join("");

// Get a random string of alphanumeric characters
const randomText = () =>
  alternateCapitals(
    Math.random()
      .toString(36)
      .substring(2, 8)
  );
```

There's no way to automatically scale text in a canvas (just like in the browser *weeps*) so we'll need some helper functions for that too. Depending on the length of your CAPTCHA and how you want the text to be positioned inside the image, you may need to test run it. Here are some variables I prepared earlier.

```javascript
const FONTBASE = 200;
const FONTSIZE = 35;

// Get a font size relative to base size and canvas width
const relativeFont = width => {
  const ratio = FONTSIZE / FONTBASE;
  const size = width * ratio;
  return `${size}px serif`;
};
```

This scales the text so as long as the proportions of the canvas remain the same, we can expect a similar-looking image.

For this article, we're just going to rotate the text but there are tons of ways to distort the text to hide it from bots and I'd love to see what you come up with (try searching for "perspective transform canvas javascript").

When rotating a canvas, the value we pass is in [radians](https://en.wikipedia.org/wiki/Radian) so we need to multiply our random degrees by `Math.PI / 180`.

```javascript
// Get a float between min and max
const arbitraryRandom = (min, max) => Math.random() * (max - min) + min;

// Get a rotation between -degrees and degrees converted to radians
const randomRotation = (degrees = 15) => (arbitraryRandom(-degrees, degrees) * Math.PI) / 180;
```

No more helper functions, I promise. We're going to get to the real meat of it now. The logic is broken up into two functions. `configureText` takes a canvas object and adds and centers our random text. `generate` takes a width and height value (remember the specification we were given?) and returns a [Data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs) of a PNG image — our CAPTCHA. 

> Data URLs, URLs prefixed with the `data:` scheme, allow content creators to embed small files inline in documents.

```javascript
// Configure captcha text
const configureText = (ctx, width, height) => {
  ctx.font = relativeFont(width);
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  const text = randomText();
  ctx.fillText(text, width / 2, height / 2);
  return text;
};

// Get a PNG dataURL of a captcha image
const generate = (width, height) => {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.rotate(randomRotation());
  const text = configureText(ctx, width, height);
  return {
    image: canvas.toDataURL(),
    text: text
  };
};
```

We can consider all of the functions apart from `generate` to be private functions that shouldn't be used elsewhere, so let's just export this function.

```javascript
module.exports = generate;
```

## An API served by Express

So far we have one file, `captcha.js` which contains our image generation logic. To make this functionality available to be called by someone else we will serve it via an HTTP API. Express has the most community support for this kind of task.

The routes we'll host are:

- `/test/:width?/:height?/`
    - Used to get an image tag for manual testing.
- `/captcha/:width?/:height?/`
    - Used to get a CAPTCHA object for proper usage.

The question marks in the route here are the Express syntax for optional URL parameters. This means the client can provide none, the first one, or both. We'll validate that integers are passed as values (required by canvas) and if not we'll use sensible defaults.

The Express app in full:

```javascript
/* app.js */

const captcha = require("./captcha");
const express = require("express");
const app = express();

// Human checkable test path, returns image for browser
app.get("/test/:width?/:height?/", (req, res) => {
  const width = parseInt(req.params.width) || 200;
  const height = parseInt(req.params.height) || 100;
  const { image } = captcha(width, height);
  res.send(`<img class="generated-captcha" src="${image}">`);
});

// Captcha generation, returns PNG data URL and validation text
app.get("/captcha/:width?/:height?/", (req, res) => {
  const width = parseInt(req.params.width) || 200;
  const height = parseInt(req.params.height) || 100;
  const { image, text } = captcha(width, height);
  res.send({ image, text });
});

module.exports = app;
```

This Express app is exported so that we can test it. Our API is functional at this point. All we have to do is serve it which the following file takes care of.

```javascript
/* server.js */

const app = require("./app");
const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`captcha-api listening on ${port}!`));
```

Navigating to `http://localhost:3000/test` rewards us with our basic CAPTCHA. Browsers will add a `body` and `html` tag if otherwise omitted.

![Our CAPTCHA](our-captcha.jpg)

## A valid Data URL

It's time to write some tests but first, put away your [unwieldy regular expressions](https://stackoverflow.com/a/1732454/10044202). There's a [library](https://www.npmjs.com/package/valid-data-url) that has already solved this problem. `valid-data-url` does exactly what it says on the tin.

I like to use Jest as my test runner. For no reason other than it's always worked for me and when it hasn't I've been able to find the answer. My setup is setting the `scripts` key in `package.json` like so:

```javascript
  "scripts": {
    "test": "jest"
  }
```

This is so I can type `npm test` (which is what many CI systems default to as well). Jest then finds and runs all of our tests.

Our app's test file imports the Express application object and uses `supertest` to mock HTTP requests against it. We use async/await syntax to reduce on callbacks.

```javascript
/* app.test.js */

const request = require("supertest");
const assert = require("assert");
const validDataURL = require("valid-data-url");
const app = require("../app");

describe("captcha", () => {
  describe("testing captcha default", () => {
    it("should respond with a valid data URL", async () => {
      const image = await request(app)
        .get("/captcha")
        .expect(200)
        .then(res => res.body.image);
      assert(validDataURL(image));
    });
  });

  describe("testing captcha default with custom params", () => {
    it("should respond with a valid data URL", async () => {
      const image = await request(app)
        .get("/captcha/300/150")
        .expect(200)
        .then(res => res.body.image);
      assert(validDataURL(image));
    });
  });
});
```

Given the size of this application (small) I'm content with leaving it at two integration tests.

## Constant integration with a GitHub Action

Since we used the standard npm test command (`npm test`) to configure our repository, we can set up a GitHub Action with a few clicks. This way, our application will be built and tested every time code is pushed.

![Build and test your JavaScript repository. Node.js Build and test a Node.js project with npm. "Set up this workflow". npm ci\nnpm run build --if-present\nnpm test](github-workflow.png)

Now we've got a sweet badge to show off!
