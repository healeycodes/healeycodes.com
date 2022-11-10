---
title:  "Refactoring JavaScript for Performance and Readability (with Examples!)"
date:   "2019-06-11"
tags: ["javascript"]
path: "javascript/beginners/webdev/tutorial/2019/06/11/refactoring-for-performance-and-readability.html"
description: "A few tips that have really helped me."
---

Recently, I wrote an article about [how to write very fast JavaScript](/javascript/node/discuss/tutorial/2019/05/19/high-performance-javascript.html). Some of the examples took it to the extreme and became very quick at the cost of being totally unmaintainable. There's a middle ground between speed and comprehension and that's where _good code_ lives.

We're going to refactor some pieces of code based off real examples that I've come across. Sometimes I'll need to perform this kind of refactoring on my own code before submitting a PR. Other times I'll do a small refactor of existing code at the start of a [story](https://en.wikipedia.org/wiki/User_story) or bug to make my changes easier to implement.

## Scenario 1

We're an URL-shortening website, like TinyURL. We accept a long URL and return a short URL that forwards visitors to the long URL. We have two functions.

```javascript
// Unrefactored code

const URLstore = [];

function makeShort(URL) {
  const rndName = Math.random().toString(36).substring(2);
  URLstore.push({[rndName]: URL});
  return rndName;
}

function getLong(shortURL) {
  for (let i = 0; i < URLstore.length; i++) {
    if (URLstore[i].hasOwnProperty(shortURL) !== false) {
      return URLstore[i][shortURL];
    }
  }
}
```

Problem: what happens if `getLong` is called with a short URL that isn't in the store? Nothing is explicitly returned so `undefined` will be returned. Since we're not sure how we're going to handle that, let's be explicit and throw an error so that problems can be spotted during development.

Performance-wise, be careful if you're iterating through a flat array very often, especially if it's a core piece of your program. The refactor here is to change the data-structure of `URLstore`.

Currently, each URL object is stored in an array. We'll visualize this as a row of buckets. When we want to convert short to long, on average we need to check half of those buckets before we find the correct short URL. What if we have thousands of buckets, and we perform this hundreds of times a second?

The answer is to use some form of [hash function](https://en.wikipedia.org/wiki/Hash_function), which Maps and Sets [use under the surface](https://v8.dev/blog/hash-code). _A hash function is used to map a given key to a location in the hash table_. Below, this happens when we place our short URL into the store in `makeShort` and when we get it back out in `getLong`. Depending on how you're [measuring run time](https://en.wikipedia.org/wiki/Big_O_notation), the result is that _on average_ we only need to check one bucket — no matter how many total buckets there are!

```javascript
// Refactored code

const URLstore = new Map(); // Change this to a Map

function makeShort(URL) {
  const rndName = Math.random().toString(36).substring(2);
  // Place the short URL into the Map as the key with the long URL as the value
  URLstore.set(rndName, URL);
  return rndName;
}

function getLong(shortURL) {
  // Leave the function early to avoid an unnecessary else statement
  if (URLstore.has(shortURL) === false) {
    throw 'Not in URLstore!';
  }
  return URLstore.get(shortURL); // Get the long URL out of the Map
}
```

For those examples, we assumed that the random function wouldn't clash. 'Cloning TinyURL' is a common system design question and a very interesting one at that. What if the random function _does_ clash? It's easy to tack on addendums about scaling and redundancy.

## Scenario 2

We're a social media website where user URLs are generated randomly. Instead of random gibberish, we're going to use the `friendly-words` package that the Glitch team works on. They use this to generate the random names for your recently created projects!

```javascript
// Unrefactored code

const friendlyWords = require('friendly-words');

function randomPredicate() {
  const choice = Math.floor(Math.random() * friendlyWords.predicates.length);
  return friendlyWords.predicates[choice];
}

function randomObject() {
  const choice = Math.floor(Math.random() * friendlyWords.objects.length);
  return friendlyWords.objects[choice];
}

async function createUser(email) {
  const user = { email: email };
  user.url = randomPredicate() + randomObject() + randomObject();
  await db.insert(user, 'Users')
  sendWelcomeEmail(user);
}
```

It's often said that a function should do one thing. Here, `createUser` does one thing .. kinda. It creates a user. However, if we're thinking ahead to the future, there's a good chance (if our business is successful) that this function is going to grow very large indeed. So let's start early by breaking it up.

You may have also noticed that there is some duplicated logic in our random functions. The `friendly-worlds` package also offers lists for 'teams' and 'collections'. We can't go around writing functions for every option. Let's write **one** function that accepts a list of friendly things.

```javascript
// Refactored code

const friendlyWords = require('friendly-words');

const generateURL = user => {
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  user.url = `${pick(friendlyWords.predicates)}-${pick(friendlyWords.objects)}` +
    `-${pick(friendlyWords.objects)}`; // This line would've been too long for linters!
};

async function createUser(email) {
  const user = { email: email };
  // The URL-creation algorithm isn't important to this function so let's abstract it away
  generateURL(user);
  await db.insert(user, 'Users')
  sendWelcomeEmail(user);
}
```

We separated some logic and reduced the number of lines of code. We inlined a function called `pick` that accepts an array of length 1 and up and returns a random choice, then we used a [template literal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) to build an URL.

## Strategies

Here are some straightforward to implement methods that can lead to easier to read code. There are no absolutes when it comes to clean code — there's always an edge case!

Return early from functions:

```javascript
function showProfile(user) {
  if (user.authenticated === true) {
    // ..
  }
}

// Refactor into ->

function showProfile(user) {
  // People often inline such checks
  if (user.authenticated === false) { return; }
  // Stay at the function indentation level, plus less brackets
}
```

Cache variables so functions can be read like sentences:

```javascript
function searchGroups(name) {
  for (let i = 0; i < continents.length; i++) {
    for (let j = 0; j < continents[i].length; j++) {
      for (let k = 0; k < continents[i][j].tags.length; k++) {
        if (continents[i][j].tags[k] === name) {
          return continents[i][j].id;
        }
      }
    }
  }
}

// Refactor into ->

function searchGroups(name) {
  for (let i = 0; i < continents.length; i++) {
    const group = continents[i]; // This code becomes self-documenting
    for (let j = 0; j < group.length; j++) {
      const tags = group[j].tags;
      for (let k = 0; k < tags.length; k++) {
        if (tags[k] === name) {
          return group[j].id; // The core of this nasty loop is clearer to read
        }
      }
    }
  }
}
```

Check for Web APIs before implementing your own functionality:

```javascript
function cacheBust(url) {
  return url.includes('?') === true ?
    `${url}&time=${Date.now()}` :
    `${url}?time=${Date.now()}`
}

// Refactor into ->

function cacheBust(url) {
  // This throws an error on invalid URL which stops undefined behaviour
  const urlObj = new URL(url);
  urlObj.searchParams.append('time', Date.now); // Easier to skim read
  return url.toString();
}
```

It's important to get your code right the first time because in many businesses there isn't much value in refactoring. Or at least, it's hard to convince stakeholders that eventually uncared for codebases will grind productivity to a halt.
