---
title:  "JavaScript One-Liners That Make Me Excited"
date:   "2019-03-28"
tags: ["javascript", "fun"]
path: "javascript/webdev/node/codegolf/2019/03/28/javascript-one-liners.html"
description: "Dust off your ternary expressions, we're going in."
---

_Dust off your ternary expressions, we're going in._

One-liners are tricky to maintain (and sometimes even hard to understand) but that doesn't stop them from being cool as hell. There's a certain satisfaction that comes after writing a terse solution.

This is a collection of some of my recent favorites. They will all run in your dev console so pop it open and try them out. I hope you'll share some of your own favorites in the comments!


#### Calendar Hacking

Ali Spittel [tweeted](https://twitter.com/ASpittel/status/1110548407800815617) this out recently. It solves a problem I've faced multiple times. If you swap the minus for a plus, it gives you the next seven days.

```javascript
// Create an array of the past seven days, inclusive
[...Array(7).keys()].map(days => new Date(Date.now() - 86400000 * days));
```


#### Random ID generation

This is my go-to function for creating UUIDs when prototyping. I've even seen people using it in production in the past. It's not secure but ... there are worse random generation functions out there.

```javascript
// Generate a random alphanumerical string of length 11
Math.random().toString(36).substring(2);
```


#### Quines

A [quine](https://en.wikipedia.org/wiki/Quine_(computing)) is a program that outputs its own source code. Quines have always fascinated me. I've got pretty close to completing my own quines a couple of times in different languages but details are the name of the game.

I've picked some winners for you. Credit to [Mama Fun Roll](https://codegolf.stackexchange.com/a/60148/78322), [PleaseStand](https://codegolf.stackexchange.com/a/270/78322), and [Peter Olson](https://codegolf.stackexchange.com/a/3173/78322) respectively for these three.

```javascript
// $=_=>`$=${$};$()`;$()
$=_=>`$=${$};$()`;$()

// eval(I="'eval(I='+JSON.stringify(I)+')'")
eval(I="'eval(I='+JSON.stringify(I)+')'")

// For those who like their quines via alert
// (function a(){alert("("+a+")()")})()
(function a(){alert("("+a+")()")})()
```


#### Scrape query parameters

Talk about non-maintainable code. This converts the page's query parameters to an object in 78 bytes! Thanks to Alex Lohr for code golfing it.

`?foo=bar&baz=bing` becomes `{foo: bar, baz: bing}`

```javascript
// Set the current page's query parameters to `q`
q={};location.search.replace(/([^?&=]+)=([^&]+)/g,(_,k,v)=>q[k]=v);q;
```

I'd like to see a minifier work that hard. 


#### Working clock

With a sprinkle of HTML, you can create a working clock with source code you could read out in one breath. I wrote this after a challenge from a co-worker. It ticks every second, updating the page with the current time.

```html
<body onload="setInterval(()=>document.body.innerHTML=new Date().toGMTString().slice(17,25))"></body>
```


#### Shuffle an array

Until Pythonistas show up with their `import random`, `random.shuffle(array)` solution, we're going to enjoy what we have. This has the bonus of having an infinitesimal chance of being an infinite loop (implementation depending). [Don't use in production](https://www.robweir.com/blog/2010/02/microsoft-random-browser-ballot.html).

```javascript
// Return a shuffled copy of an Array-like
(arr) => arr.slice().sort(() => Math.random() - 0.5)
```


#### Generate random hex code

ES7's [padEnd](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd) is a blessing. Along with `padStart`, they've made number to string conversions that much easier. Writing hex values right into JavaScript code is always pretty neat too.

```javascript
// Generate a random hex code such as `#c618b2`
'#' + Math.floor(Math.random() * 0xffffff).toString(16).padEnd(6, '0');
```


#### Pass the interview in style

The [infamous](https://blog.codinghorror.com/why-cant-programmers-program/) interview question answer but codegolfed. I researched and I don't think it can get any shorter than this.

```javascript
for(i=0;++i<101;console.log(i%5?f||i:f+'Buzz'))f=i%3?'':'Fizz'
```


#### Remove duplicates

This only works with primitives but it's still nifty. [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) takes any iterable object, like an array `[1,2,3,3]`, and removes duplicates. The spread operator makes that set `[1,2,3]`.

```javascript
// Remove duplicates from the iterable `arr`
[...new Set(arr)]
```


#### A keyboard so real you can taste it

Okay, I don't really count this as a one-liner but it's too good not to include. A masterful codegolf solution by [edc65](https://codegolf.stackexchange.com/a/103226/78322). It's terse to a fault and codegolfed within an inch of its life but we should bask in its glory.

```javascript
// Return a ***3D*** ASCII keyboard as string
(_=>[..."`1234567890-=~~QWERTYUIOP[]\\~ASDFGHJKL;'~~ZXCVBNM,./~"].map(x=>(o+=`/${b='_'.repeat(w=x<y?2:' 667699'[x=["BS","TAB","CAPS","ENTER"][p++]||'SHIFT',p])}\\|`,m+=y+(x+'    ').slice(0,w)+y+y,n+=y+b+y+y,l+=' __'+b)[73]&&(k.push(l,m,n,o),l='',m=n=o=y),m=n=o=y='|',p=l=k=[])&&k.join`
`)()
```

It prints:
![Keyboard made out of ASCII text](ascii-keyboard.png)

Amazing.
