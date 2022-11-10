---
title:  "Solving Puzzles With High-Performance JavaScript"
date:   "2019-05-19"
tags: ["javascript"]
path: "javascript/node/discuss/tutorial/2019/05/19/high-performance-javascript.html"
description: "It's fast but is it worth it?"
---

Premature optimization is the root of all evil. It's also the root of this article.

I like programming puzzles. I also like to go _fast_. We're going to take some LeetCode problems and solve them a few times, first improving runtime complexity in broad strokes and then looking for minor optimizations. We're after these wonderful words:

> faster than 100.00% of JavaScript online submissions

The environment we're targetting is `nodejs 10.15.0` with `--harmony` ([source](https://support.leetcode.com/hc/en-us/articles/360011833974-What-are-the-environments-for-the-programming-languages-)). The online judge system uses relatively small inputs for test cases as far as I can tell.

### First problem

[771. Jewels and Stones](https://leetcode.com/problems/jewels-and-stones/) ~ _You're given strings `J` representing the types of stones that are jewels, and `S` representing the stones you have.  Each character in `S` is a type of stone you have.  You want to know how many of the stones you have are also jewels._

A naive solution here is to loop through our stones, looping through the jewels for every stone. We'll be using standard for loops in this article as they are generally the fastest way of iterating data in JavaScript.

```javascript
let numJewelsInStones = function(J, S) {
    let myJewels = 0;
    // Jewels
    for (let i = 0; i < J.length; i++) {
        // Stones
        for (let j = 0; j < S.length; j++) { // Nested!
            if (J[i] === S[j]) {
                myJewels++;
            }
        }
    }
    return myJewels;
};
```

The runtime is quadratic, `O(N^2)`. Their online judge won't actually accept this solution! We get a big fat **Time Limit Exceeded**. Lesson? Nested for-loops should be avoided where possible.

Let's grab a [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) to get rid of one of the loops. Reducing our runtime down to linear, `O(N)`. Looking up a Set in JavaScript is constant time, `O(1)`.

```javascript
let numJewelsInStones = function(J, S) {
    const jewels = new Set(J); // Set accepts an iterable object
    let myJewels = 0;
    for (let i = 0; i < S.length; i++) {
        if (jewels.has(S[i])) {
            myJewels++;
        }
    }
    return myJewels;
};
```

For this effort, we're rewarded with `faster than 97.84%`. I'm happy with this code. It's efficient and readable. If I needed drastically better performance, I might reach for a different technology than JavaScript. We have to walk the length of both strings at least once and there's no getting around that. We can't beat `O(N)` but we can make optimizations.

The stones and jewels are defined as letters. So `a-z` and `A-Z`. This means there are just 52 different buckets our values can fall into! We can use a boolean array instead of a Set. To convert an alphabetical letter into a number, we'll use its ASCII code point via [charCodeAt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charCodeAt). We'll set an index to `true` to represent a jewel.

However, there aren't boolean arrays in JavaScript. We could use a standard array and initialize it to length `52`. Or we could use [Int8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Int8Array) and allow the compiler to make additional optimizations. The typed array was ~6% faster when benchmarked with a range `0-52` of random characters entered as `J` and `S`.

Did you spot that our length is wrong? This is something I forgot as I was testing. There are seven characters between `z` and `A` on the ASCII code chart so the length required is actually 59.

![ASCII table](asciitable.png)

```javascript
let numJewelsInStones = function(J, S) {
    const jewels = new Int8Array(59);
    for (let i = 0; i < J.length; i++) {
        jewels[J.charCodeAt(i)-65] = 1;
    }
    let myJewels = 0;
    for (let i = 0; i < S.length; i++) {
        if (jewels[S.charCodeAt(i)-65] === 1) {
            myJewels++;
        }
    }
    return myJewels;
};
```

Et voila, our `100% fastest` [submission](https://leetcode.com/submissions/detail/229804303/). In my tests, this was actually twice as faster as the Set version. Other optimizations I skipped testing were caching lengths, using a while loop instead of a for loop, and placing the incrementor before the number (`++myJewels` vs `myJewels++`).

### Second problem

[345. Reverse Vowels of a String](https://leetcode.com/problems/reverse-vowels-of-a-string/) ~ _Write a function that takes a string as input and reverse only the vowels of a string._

A naive solution for this might be to loop through the array twice, replacing on the second loop. Let's try that out first.

```javascript
let reverseVowels = function(s) {
    const vowels = new Set(['a','e','i','o','u', 'A', 'E', 'I', 'O', 'U']);
    const reversed = [];
    let vowelsFound = [];
    // Find any vowels
    for (let i = 0; i < s.length; i++) {
        if (vowels.has(s[i])) {
            vowelsFound.push(s[i]);
        }   
    }
    // Build the final string
    for (let i = 0; i < s.length; i++) {
        if (vowels.has(s[i])) {
            reversed.push(vowelsFound.pop());
        } else {
            reversed.push(s[i]);
        }
    }
    return reversed.join('');
};
```

This nets us `faster than 97.00%`. The runtime is linear, `O(2N) -> O(N)`, and it reads well but I can't help but think we're looping the string one more time than we have to. Let's try a two-pointer approach. Walking in, step-by-step, from the front and back at the same time, swapping any vowels we see. If there's a middle vowel we just leave it.

```javascript
let reverseVowels = function(s) {
    const vowels = new Set(['a','e','i','o','u', 'A', 'E', 'I', 'O', 'U']);
    s = s.split('');
    let front = 0;
    let back = s.length - 1;
    while (front < back) {
        if (!vowels.has(s[front])) {
            front++;
            continue;
        }
        if (!vowels.has(s[back])) {
            back--;
            continue;
        }
        let temp = s[front];
        s[front] = s[back];
        s[back] = temp;
        front++;
        back--;
    }
    return s.join('');
};
```

We've reduced a full iteration! This gets us `faster than 98.89%` and it's at this point that we need to remember that LeetCode's benchmarks aren't conclusive nor are they consistent. It's not feasible for them to run a large number of iterations with a mixture of test cases. If you're practicing your puzzle solving, stop at `97%` and up. But that's not the point of this article, and, reader, I'm going to get that `100%` for you.

First I threw out the Set. The number of vowels is constant and we don't need all that hashing going on. I tried a switch statement but then found a chained if statement was faster. I discovered that in-lining this logic was faster than a function. I then reduced this down to an expression. What I'm trying to say is: the code coming up is gross. It's close-down-your-IDE-and-talk-a-walk gross. But .. [it's](https://leetcode.com/submissions/detail/229918811/) `faster than 100.00%`.

```javascript
let reverseVowels = function(s) {
    s = s.split('');
    let front = 0;
    let back = s.length - 1;
    while (front < back) {
        if (s[front] !== 'a' &&
            s[front] !== 'e' &&
            s[front] !== 'i' &&
            s[front] !== 'o' &&
            s[front] !== 'u' &&
            s[front] !== 'A' &&
            s[front] !== 'E' &&
            s[front] !== 'I' &&
            s[front] !== 'O' &&
            s[front] !== 'U') {
            front++;
            continue;
        }
        if (s[back] !== 'a' &&
            s[back] !== 'e' &&
            s[back] !== 'i' &&
            s[back] !== 'o' &&
            s[back] !== 'u' &&
            s[back] !== 'A' &&
            s[back] !== 'E' &&
            s[back] !== 'I' &&
            s[back] !== 'O' &&
            s[back] !== 'U') {
            back--;
            continue;
        }
        let temp = s[front];
        s[front++] = s[back];
        s[back--] = temp;
    }
    return s.join('');
};
```

(I'm sorry).

### Third problem

[509. Fibonacci Number](https://leetcode.com/problems/fibonacci-number/) ~ _Calculate the nth Fibonacci number_.

This is a common puzzle and it was the hardest to improve the runtime for because there are so few moving parts in the final solution. I'm sure some RNG was involved with LeetCode's grading too. Let's get the naive solution out of the way. The Fibonacci sequence is often used to teach recursion. However, the algorithm that is used has a runtime of `O(2^n)` (_very_ slow).

I actually crashed a browser tab by trying to calculate the 50th term with this function.

```javascript
let fib = function(N) {
    if (N < 2) {
        return N;
    }
    return fib(N - 1) + fib(N - 2);
}
```

We get `faster than 36.63%` for this answer. Ouch. In production, this is the kind of puzzle that can be solved by memoization (caching some of the work for later). This is the best solution because we only calculate up to the values that we need in linear time `O(N)` and then running the algorithm again for a term under that limit is constant time `O(1)`.

```javascript
const memo = [0, 1];
let fib = function(N) {
    if (memo[N] !== undefined) {
        return memo[N];
    }
    const result = fib(N - 1) + fib(N - 2);
    memo[N] = result;
    return result
};
```

`faster than 94.25%`. LeetCode doesn't store data between each run-through of our code so we'll have to try something different. We've interested in calculating *one* number of the sequence just *once*. I think we can throw away that array. Let's look at the iterative solution.

```javascript
let fib = function(N) {
    if (N < 2) {
        return N;
    }
    let a = 1;
    let b = 1;
    for (let i = 3; i <= N; ++i) {
        a = a + b;
        b = a - b;
    }
    return a;
};
```

If this looks a little different to other iterative versions you might have seen, it's because I avoided the third temporary variable that we have to use in JavaScript to swap values (there are other methods as well but they're too slow). I did some benchmarks and I found using arithmetic instead [was](https://leetcode.com/submissions/detail/229923152/)..  `faster than 100.00%`.
