---
title:  "Leetcode - Episode 14 - Short, Easy Solutions (3 x E)"
date:   "2019-01-14"
tags: ["algorithms"]
path: "algorithms/leetcode/2019/01/14/leet-code.html"
description: "Solutions for: Monotonic Array, Max Consecutive Ones, and Contains Duplicate."
---

I'm not too excited about any of my solutions today. They're all fairly optimal but I suppose I would class them as 'entry-level' array problems. They didn't require any three-dimensional thinking.

I hope to put aside some time soon to study a new topic (e.g., permutation) that will unlock more difficult challenges and research areas within algorithms. That's the good thing about the streak, if I wait too long then I'll be forced to study more just to keep it up!

### [896. Monotonic Array](https://leetcode.com/problems/monotonic-array/submissions/)

Problem: Is this array monotonic? I.e., only decreasing or only increasing.

If it's static then it's also monotonic.

I over-wrote the solution to this problem. It's optimal but there's too much code.

```python
class Solution(object):
    def isMonotonic(self, A):
        """
        :type A: List[int]
        :rtype: bool
        """
        def all_increase(arr):
            for i in range(1, len(arr)):
                if arr[i] < arr[i-1]:
                    return False
            return True
                
        def all_decrease(arr):
            for i in range(1, len(arr)):
                if arr[i] > arr[i-1]:
                    return False
            return True
        
        if A[0] > A[len(A)-1]:
            return all_decrease(A)
        else:
            return all_increase(A)
```

The reason there's so much code is because I didn't want to use a flag. Flags don't (usually) read like Clean Code to me. I suppose there's a line with algorithm problems like these, and certainly coding competitions, where standards must come second.

Runtime complexity: `O(n)`.

Spacetime complexity: `O(1)`.

### [485. Max Consecutive Ones](https://leetcode.com/problems/max-consecutive-ones/submissions/)

Problem: Given a binary array, find the max number of `1`s in a row.

This is a fairly standard algorithm you first see when learning how to programming. You keep track of the streak and when it ends check it against the current max streak. Rinse and repeat.

```python
class Solution(object):
    def findMaxConsecutiveOnes(self, nums):
        """
        :type nums: List[int]
        :rtype: int
        """
        max_ones = 0
        streak = 0
        for idx, val in enumerate(nums):
            if val != 1:
                max_ones = max(streak, max_ones)
                streak = 0
            else:
                streak += 1
        
        return max(streak, max_ones)
```

In some languages I believe it will be quicker to use if/else statements instead of a `max` call -- [Java discussion](https://stackoverflow.com/questions/2103606/is-math-maxa-b-or-abab-faster-in-java).

Runtime complexity: `O(n)`.

Space complexity: `O(1)`.

### [217. Contains Duplicate](https://leetcode.com/problems/contains-duplicate/)

Problem: Given an array of integers, are there any duplicates?

There are three ways to go about solving this problem.

- Runtime: `O(n^2)`, Space: `O(1)` -- for each *num* check the whole array for duplicates.
- Runtime: `O(nlgn)`, Space: `depends` -- sort the array, compare neighbors.
- Runtime: `O(n)`, Space: `O(n)` -- apply a Set or Dictionary in some way.

I use the last option, in a short and dramatic Pythonic manner.

```python
class Solution(object):
    def containsDuplicate(self, nums):
        """
        :type nums: List[int]
        :rtype: bool
        """
        return len(set(nums)) < len(nums)
```

This performs well millisecond-wise in their rankings. It's also closer to production code than the other three options.

Runtime complexity: `O(n)`.

Spacetime complexity: `O(n)`.
