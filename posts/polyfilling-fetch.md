---
title: "Polyfilling the Fetch API for Old Browsers and Node.js"
date: "2020-06-25"
tags: ["javascript"]
description: "A quick look at polyfilling, along with with solutions for both environments."
---

First some definitions.

> A **polyfill** will try to emulate certain APIs, so can use them as if they were already implemented.

> A **transpiler** on the other hand will transform your code and replace the respective code section by other code, which can already be executed.

(Thanks [Sirko](https://stackoverflow.com/a/31206361) for those!)

## Examples of polyfilling and transpiling

By polyfilling the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) we make it usable in browsers where it isn't available by default. Another example would be making it available in its original functionality in Node.js.

By transpiling [Spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax) (an ES6 feature) into ES5 compatible JavaScript, we end up with source code that is easier for us to write — and deployable code that works in older browsers!

Here's our ES6 code example.

```javascript
function speak() {
  console.log(...args);
}

speak(1, 2, 3);
```

Here is that same code transpiled into ES5 compatible code.

```javascript
"use strict";

function speak() {
  var _console;

  (_console = console).log.apply(_console, args);
}

speak(1, 2, 3);
```

(Technically, this is the [loose](https://babeljs.io/docs/en/babel-plugin-transform-spread#loose) transpilation because otherwise the above snippet would be eleven times longer.)

## Using `fetch` in old browsers

We love the Fetch API because it means we can avoid using [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest). Instead of providing a callback, we can use lovely [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).

Here's a `fetch` call that prints out the status code of a request.

```javascript
fetch('https://httpstat.us')
    .then(res => console.log(res.status))
```

If we tried running that in Internet Explorer 11 (or Edge 13, or Chrome 39, and so on) we would get an error.

`window.fetch` would likely evaluate to undefined. We might get an error that looks like `Uncaught TypeError: window.fetch is not a function`.

It's easy to check one-off functionality for a feature on _Can I use_ — here's `fetch` [https://caniuse.com/#search=fetch](https://caniuse.com/#search=fetch). It isn't viable to check every feature that your code might use, so that's why we use things like [@babel/preset-env](https://babeljs.io/docs/en/babel-preset-env).

> `@babel/preset-env` is a smart preset that allows you to use the latest JavaScript without needing to micromanage which syntax transforms (and optionally, browser polyfills) are needed by your target environment(s). This both makes your life easier and JavaScript bundles smaller!

An even cooler feature of Babel is that it allows us to specify which platforms we want to support.

Why not just support _all_ platforms? Because then the JavaScript bundle we send to our users would get larger and larger every year and website performance would grind to a halt.

Babel's [Browserslist Integration](https://babeljs.io/docs/en/babel-preset-env#browserslist-integration) lets us forget about version numbers and instead use handy shortcuts. Let's say we wanted to support 99.75% of browsers and no dead browsers. We can add `"browserslist": "> 0.25%, not dead"` to our `package.json` file.

However, you might be reading this because you found out that `@babel/preset-env` doesn't include a `fetch` polyfill. This is an open issue on GitHub ([#9160](https://github.com/babel/babel/issues/9160)). It looks like it's going to stay this way.

> Babel only adds polyfill for ECMAScript methods (defined at https://tc39.github.io/ecma262/). Since fetch is defined by a web specification (https://fetch.spec.whatwg.org/), you need to add the polyfill yourself.

That's okay because we can use [github/fetch](https://github.com/github/fetch#usage) to polyfill it for us.

Either by replacing all instances of `fetch`.

```javascript
import 'whatwg-fetch'

window.fetch(...)
```

Or on a case-by-case basis.

```javascript
import { fetch as fetchPolyfill } from 'whatwg-fetch'

window.fetch(...)   // use native browser version
fetchPolyfill(...)  // use polyfill implementation
```

## Using `fetch` in Node.js

The Fetch API is common and people are fluent with it. It's productive if they can use it in all the JavaScript they write. Many people think it's available in Node.js by default. It's not but _there's a package for that_ (™).

[node-fetch/node-fetch](https://github.com/node-fetch/node-fetch) let's us use the API we're fluent with to make HTTP calls on the back-end. Underneath, it uses native Node.js functionality.

```javascript
// CommonJS
const fetch = require('node-fetch');

// ES Module
import fetch from 'node-fetch';
```

If you're looking for an isomorphic solution (this means using the same code in the browser and in Node.js) then you'll want Jason Miller's [isomorphic-unfetch](https://www.npmjs.com/package/isomorphic-unfetch) (but not for React Native, see [#125](https://github.com/matthew-andrews/isomorphic-fetch/issues/125)) or Leonardo Quixada's [cross-fetch](https://github.com/lquixada/cross-fetch).

These solutions will figure out which environment you're in and choose the correct polyfill.
