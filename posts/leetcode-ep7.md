---
title:  "Leetcode - Episode 7 - Getting More Pythonic (3x E)"
date:   "2019-01-07"
tags: ["algorithms"]
path: "algorithms/leetcode/2019/01/07/leet-code.html"
description: "Solutions for: Two Sum, Valid Anagram, and Length of Last Word."
---

This blog is now live! A lot of these posts were just sitting on my computer but it's now hooked up to GitHub Pages via Jekyll. GitHub Pages was very pleasant to use and extend.

In solving news: I'm focusing on using more Python languages features at the moment.

### [1. Two Sum](https://leetcode.com/problems/two-sum/)

Problem: Given an array of integers and a target, return the indices of the two numbers that add up to the target.

I really like the solution to this problem because it's so simple when you think about it. When faced with the problem initially it can be hard to see any route to a `O(n)` runtime.

```python
class Solution(object):
    def twoSum(self, nums, target):
        """
        :type nums: List[int]
        :type target: int
        :rtype: List[int]
        """
        num_dict = dict()
        for idx, val in enumerate(nums):
            if target - val in num_dict:
                return [num_dict[target - val], idx]
            else:
                num_dict[val] = idx

```

We iterate through the array adding everything to a Dictionary (after checking that the other number we're looking for hasn't been added yet). Awkwardly, we store the value as the key and the indice as the value.

Runtime complexity: `O(n)`.

Spacetime complexity: `O(n)`.

### [242. Valid Anagram](https://leetcode.com/problems/valid-anagram/)

Problem: Given two strings `t` and `s`, dermine if `t` is an anagram of `s`.

While I was working through my solution here, I felt like I was doing too much work to solve the problem, which turned out to be true.

```python
from collections import Counter
class Solution(object):
    def isAnagram(self, s, t):
        """
        :type s: str
        :type t: str
        :rtype: bool
        """
        if len(s) != len(t):
            return False
        
        s_count = Counter()
        t_count = Counter()
        for i in s:
            s_count[i] += 1
        for i in t:
            t_count[i] += 1
        
        for key, val in s_count.items():
            if key not in t_count:
                return False
            if s_count[key] != t_count[key]:
                return False
            
        return True
```

Runtime complexity: Once through the string with `O(1)` Dictonary additions, once through the `s` Dictionary with `O(1)` Dictionary checks: `O(2n)` -> `O(n)`.

Space complexity: `O(n)`.

After researching, it seems that the fastest solution would be to use two arrays of size 26, incrementing and decrementing the values per each character. Then we check the arrays against each other.

Another ['solution'](https://stackoverflow.com/a/17004897):

> Fastest algorithm would be to map each of the 26 English characters to a unique prime number. Then calculate the product of the string. By the fundamental theorem of arithmetic, 2 strings are anagrams if and only if their products are the same.

### [58. Length of Last Word](https://leetcode.com/problems/length-of-last-word/)

Problem: Given a string, return the length of the last word.

I start from the end of the string and work backwards and take care to perform a low number of checks (about `word_len` or `s[i]`) per character. (It turns out that it wasn't a low enough number of checks!)

```python
class Solution(object):
    def lengthOfLastWord(self, s):
        """
        :type s: str
        :rtype: int
        """
        word_len = 0
        for i in range(len(s)-1, -1, -1):
            if s[i] != ' ':
                word_len += 1
            elif word_len != 0:
                break
        
        if word_len == 0:
            return 0
        
        return word_len
```

Tricky test cases with this one, like `' '` and `a`.

Some people used two loops, one starting from the end to find the last space character, and one to walk back through towards the end counting the non-space characters. This is more optimal because less checks are performed. For example: `'a b '`. When there is extra whitespace on the end, my algoritm performs roughly 1.5x as many operations.

<br>

Runtime complexity: `O(n)`

Spacetime complexity: `O(1)`.
