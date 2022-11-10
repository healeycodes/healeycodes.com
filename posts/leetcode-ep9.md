---
title:  "Leetcode - Episode 9 - Trudging Through (3x E)"
date:   "2019-01-09"
tags: ["algorithms"]
path: "algorithms/leetcode/2019/01/09/leet-code.html"
description: "Solutions for: Majority Element, Detect Capital, and Not Boring Movies."
---

The three-a-day streak nearly ended today.

I came close to completing a couple of Medium problems but I didn't want to brute force the answers. I have a set of unwritten rules about what I'm allowed to look up in a book or google. All solutions need to be within the range of 'optimal' as well.

The goal is to get better at solving problems and algorithm analysis -- not to get the green text that reads *Accepted*. I ended up searching for some Easys to complete so I could get to bed on time.

### [169. Majority Element](https://leetcode.com/problems/majority-element/)

Problem: Given an array of size `n` find the majority element that appears more than `n/2` times.

I wrote about the algoritm that solves this problem for the first post on this blog. The *Boyer–Moore majority vote algorithm*.

Let's take a look at its linear runtime and constant space goodness.

```python
class Solution:
    def majorityElement(self, nums):
        """
        :type nums: List[int]
        :rtype: int
        """
        counter = 1
        current = nums[0]
        for i in nums[1:]:
            if i != current:
                counter -= 1
                if counter < 0:
                    current = i
                    counter = 1
            else:
                counter += 1
        return current
```

Its all about tracking who is in front of the pack and swapping when a challenger comes along.

Runtime complexity: `O(n)`.

Spacetime complexity: `O(1)`.

### [520. Detect Capital](https://leetcode.com/problems/detect-capital/)

Problem: Judge whether a word uses correct capitals.

The three types of correctness: `'IRE'`, `'topcoder'`, and `'Bing'`.

I wanted to test the runtime between using Python's built-ins and a custom solution for Leetcode's test cases.

So, the complex way:

```python
class Solution:
    def detectCapitalUse(self, word):
        """
        :type word: str
        :rtype: bool
        """
        def is_cap(c):
            return ord(c) < 97
        
        if is_cap(word[0]) and len(word) > 1 and is_cap(word[1]):
            for c in word:
                if not is_cap(c):
                    return False
        elif is_cap(word[0]):
            for c in word[1:]:
                if is_cap(c):
                    return False
        else:
            for c in word[1:]:
                if is_cap(c):
                    return False

        return True
```

This had a runtime of 76ms.

Instead, we could have just written:

```python
class Solution:
    def detectCapitalUse(self, word):
        """
        :type word: str
        :rtype: bool
        """
        return word.isupper() or word.islower() or word.istitle()
```

This *much* shorter version had a runtime of .. 76ms. The exact same result!

I'm fairly sure that as `n` tends to infinity, the more complex solution will surely win out.

Runtime complexity: `O(n)`.

Space complexity: `O(1)`.

### [620. Not Boring Movies](https://leetcode.com/problems/not-boring-movies/)

Problem: Given a SQL table `cinema` find movies with an odd numbered ID and a description that is not (literally) 'boring'.

Not much to comment on this one. I read through the discussion board and some people found that using `(not .. )` for their test expressions ran slower but I suppose that will be down to implementation details.

```SQL 
# Write your MySQL query statement below
SELECT * FROM cinema WHERE id % 2 != 0 AND description != 'boring' ORDER BY rating DESC;
```

<br>

Runtime complexity: `O(n)`.

Spacetime complexity: `O(n)`.
