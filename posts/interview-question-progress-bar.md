---
title:  "Interview Question: Implement a Progress Bar"
date:   "2019-05-27"
tags: ["javascript"]
path: "javascript/css/challenge/beginners/2019/05/27/interview-question-progress-bar.html"
description: "Different ways to do one thing well."
outdated: true
---

I saw this question doing the rounds on social media. [Apparently](https://www.reddit.com/r/javascript/comments/3rb88w/ten_questions_ive_been_asked_most_more_than_once/cwmn60t/), [top companies](https://www.glassdoor.com/Interview/-1-Implement-a-loading-bar-that-animates-from-0-to-100-in-3-seconds-2-Start-loading-bar-animation-upon-a-button-cli-QTN_1393903.htm) are using it to screen front end engineers. My fiancée will be applying to jobs soon and I asked her to give it a go. She almost completed the final stage (with a little research) but a tricky recursion bug tripped her up. I wrote this article to help her out. Hopefully, you'll find this useful should you face similar themed questions!

There are a few variations but this question is normally asked in stages which get progressively harder.

#### 1. Implement a loading bar that animates from 0 to 100% in 3 seconds

This can be done purely with CSS. If something can be done purely with CSS I tend to go for that option. My rationale is that it's easier to refactor something that is pure CSS than trying to extend a quick JavaScript hack. CSS is very declarative, it's more straightforward to read and understand what's going on under the hood.

For a CSS only progress bar, I'm going to use two divs — a container and the progress bar — and `keyframes`. The important line here is `animation: 1s linear fill;`. There's a lot to talk about. What `transition-timing-function` are we going to use — `ease`, `linear`, a `cubic-bezier`?

At the very least, this quick answer shows that you know what `keyframes` and you can use it on a basic level.

```html
<div class="container">
  <div class="progress-bar"></div>
</div>
```

```css
.container {
  width: 300px;
  height: 50px;
  background-color: #D3D3D3;
}

.progress-bar {
  width: 100%;
  height: 50px;
  background-color: #90EE90;
  animation: 3s linear fill;
}

@keyframes fill {
    0% {
        width: 0%;
    }
    100% {
        width: 100%;
    }
}
```

__[CodePen](https://codepen.io/healeycodes/pen/pmKQzM)__

#### 2. Start loading bar animation upon a button click

Now we're moving into JavaScript land. I've always thought that `transition` was neat as heck so I'm going to use that with JavaScript to add a class to the `progress-bar` element. It enables you to "define the transition between two states of an element" [(MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/transition).

I'm making sure to cache the reference to the loading bar. I work on Smart TVs a lot and caching is one of the many tricks we use to keep everything snappy. HTML elements have [Element#classList](https://developer.mozilla.org/en-US/docs/Web/API/Element/classList) which is a fantastic API for interacting with classes. It's very safe to use. You can add multiple classes and it will only add one instance, you can also remove classes that don't exist without any errors.

[classList#toggle](https://developer.mozilla.org/en-US/docs/Web/API/Element/classList#Methods) is particularly useful. "When only one argument is present: Toggle the class value; i.e., if the class exists then remove it and return false, if not, then add it and return true" [(MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Element/classList#Methods).

```html
<div class="container">
  <div class="progress-bar"></div>
</div>
<button onclick="loadBar()">Load</button>
```

```css
.container {
  width: 300px;
  height: 50px;
  background-color: #D3D3D3;
}

.progress-bar {
  width: 0%;
  height: 50px;
  background-color: #90EE90;
  transition: width 3s linear;
}

.load {
  width: 100%;
}
```

```javascript
const bar = document.querySelector('.progress-bar');

function loadBar () {
  bar.classList.add('load');
}
```

__[CodePen](https://codepen.io/healeycodes/pen/MdXzqb)__

#### 3. Queue multiple loading bars if the button is clicked more than once. Loading bar N starts animating with loading bar N-1 is done animating.

Here it gets more interesting. There is a way to iterate on our previous solution by removing and adding classes but that feels hacky. I think the intention is for you to use more JavaScript here. Technical interview questions don't really have a finish point. There's always restrictions, extensions, and what-ifs that can be thrown around. I'd love to see what you come up with before reading any further 👀.

There are a couple of traps here. You've got to make sure the time taken is exactly three seconds rather than a tick more or a tick less. And what is a good length for a tick? I suppose it depends on how wide your bar is. Going up by a percent each time seems like a sweet spot. Note: it's also better to manage your own state rather than relying on the DOM. 

Caching is really important here. You don't want to traverse the DOM for an element 33 times a second. Two functions are probably required for clean code. I went for a recursive timeout with a global flag to track whether the progress bar is running. We want to add one to the queue either way but we don't want two going at once or our bar will load twice as quick!

```html
<div class="container">
  <div class="progress-bar"></div>
</div>
<div>Queued bars: <span class="queued">0</span></div>
<button onclick="loadBar()">Load</button> 
```

```css
.container {
  width: 300px;
  height: 50px;
  background-color: #D3D3D3;
}

.progress-bar {
  width: 0%;
  height: 50px;
  background-color: #90EE90;
}
```

```javascript
const bar = document.querySelector('.progress-bar');
const queued = document.querySelector('.queued');

let loader = false;
let width = 0;
let count = 0;

function loadBar() {
  queued.innerText = ++count;
  if (loader === false) {
    bar.style.width = 0;
    tick();
  }
}

function tick() {
  loader = true;
  if (++width > 100) {
    queued.innerText = --count;
    width = 0;
    if (count < 1) {
      loader = false;
      return;
    }
  }
  bar.style.width = `${width}%`;
  setTimeout(tick, 30);
}
```

__[CodePen](https://codepen.io/healeycodes/pen/ZNRVBa)__

#### 4. Do the same thing but without timers!

Okay, they don't really ask this in the interview but someone mentioned `requestAnimationFrame` in the comments on DEV and I thought it would be fun to build an example using it while emulating the previous answer.

The logic is a lot shorter if you don't have to queue bar loads. I ended up deciding to use two coupled functions. Recently, I saw someone say that any instance of `else` is your code is a chance for a refactor. I've been thinking it over, and while no rule holds true, it has been influencing how I shape functions lately. Check it out.

```html
<div class="container">
  <div class="progress-bar"></div>
</div>
<div>Queued bars: <span class="queued">0</span></div>
<button onclick="loadBar(1)">Load</button> 
```

```css
.container {
  width: 300px;
  height: 50px;
  background-color: #D3D3D3;
}

.progress-bar {
  width: 0%;
  height: 50px;
  background-color: #90EE90;
}
```

```javascript
const bar = document.querySelector('.progress-bar');
const queued = document.querySelector('.queued');

let loading = false;
let count = 0;

function tick (timestamp, dist, duration) {
  const runtime = timestamp - starttime;
  let progress = runtime / duration;
  progress = Math.min(progress, 1);
  bar.style.width = `${dist * progress}%`;
  if (runtime > duration) {
    loading = false;
    count--;
    loadBar(0);
    return;
  }
  requestAnimationFrame (function(timestamp) {
      tick(timestamp, dist, duration)
  });
}

function loadBar (increment) {
  count += increment;
  queued.innerText = count;
  if (loading === true || count < 1) { return; }
  bar.style.width = 0;
  loading = true;
  requestAnimationFrame (function(timestamp) {
    starttime = timestamp;
    tick(timestamp, 100, 3000);
  });
}
```

__[CodePen](https://codepen.io/healeycodes/pen/EzpJNo)__

### End notes

Top marks if you have been shouting `<progress>` at me for the whole article. Yup, this [element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress) has been there since HTML5. You manage it by setting two attributes `max` and `value`. CSS Tricks have an [article](https://css-tricks.com/html5-progress-element/) on how to style and animate it. They also cover the different states, determinate and indeterminate — the latter meaning "progress unknown". These states are great because they give us a native way to communicate with the user.

This interview question is less about the perfect answer and more about how you communicate your thoughts as you go and the clarifications you ask about. Should there also be a numerical representation of percentage? Is this running on a low-powered device? If so, don't go up in one percent increments. Perhaps five or ten is better.

I think a good extension might be to ask an interviewee to build an interface that receives a WebSocket message describing the progress state and communicates that to the user.

What do you think of this interview question? Does it meet at the crossroads of problem-solving and browser knowledge for you?
