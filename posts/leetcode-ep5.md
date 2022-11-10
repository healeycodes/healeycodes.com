---
title:  "Leetcode - Episode 5 - Fastest Solutions Yet (3x E)"
date:   "2019-01-05"
tags: ["algorithms"]
path: "algorithms/leetcode/2019/01/05/leet-code.html"
description: "Solutions for: Uncommon Words from Two Sentences, Search in a Binary Search Tree, and Fizz Buzz."
---

Title refers to my runtime rankings against other users *not* how long it took me to complete these. Ran into a couple of stubborn bugs, one of which was failing to read the question properly because I jumped ahead - doh.

### [884. Uncommon Words from Two Sentences](https://leetcode.com/problems/uncommon-words-from-two-sentences/)

Problem: Return the uncommon words from two sentences `A` and `B`

Note: a word is uncommon if it appears no more than once in either string.

This solution works regardless of the amount of sentences given. Thinking about finding uncommon words in just *two* sentences seems like a `O(n^2)` trap.

```python
from collections import Counter
class Solution(object):
    def uncommonFromSentences(self, A, B):
        """
        :type A: str
        :type B: str
        :rtype: List[str]
        """
        word_counter = Counter()
        for word in A.split(' ') + B.split(' '):
            word_counter[word] += 1

        uncommon_words = []
        for key, val in word_counter.items():
            if val == 1:
                uncommon_words.append(key)
        
        return uncommon_words
```

Add all words to a Counter Dictionary, return the words with a value of `1`.

Runtime complexity: `O(n)`.

Space complexity: `O(n)`.

### [700. Search in a Binary Search Tree](https://leetcode.com/problems/search-in-a-binary-search-tree/)

Problem: Search a Binary Tree.

My solution is a recursive search. 

```python
# Definition for a binary tree node.
# class TreeNode(object):
#     def __init__(self, x):
#         self.val = x
#         self.left = None
#         self.right = None

class Solution(object):
    def searchBST(self, root, val):
        """
        :type root: TreeNode
        :type val: int
        :rtype: TreeNode
        """
        if not root:
            return None
        if root.val == val:
            return root
        elif val < root.val:
            return self.searchBST(root.left, val)
        
        return self.searchBST(root.right, val)
```

<br>

Runtime complexity: `O(log n)`.

Spacetime complexity: `-`.

Nothing complicated to see here.

### [412. Fizz Buzz](https://leetcode.com/problems/fizz-buzz/)

Problem: Implement the [infamous](https://blog.codinghorror.com/why-cant-programmers-program/) FizzBuzz algorithm.

This was my first time 'solving' this in Python. I almost forgot about having to shift the iteration range (1-100 instead of 0-99).

```python
class Solution:
    def fizzBuzz(self, n):
        """
        :type n: int
        :rtype: List[str]
        """
        str_reps = []
        
        for i in range(1, n+1):
            if i % 3 == 0 and i % 5 == 0:
                str_reps.append('FizzBuzz')
            elif i % 3 == 0:
                str_reps.append('Fizz')
            elif i % 5 == 0:
                str_reps.append('Buzz')
            else:
                str_reps.append(str(i))
        
        return str_reps
```

Runtime complexity: `O(n)`.

Spacetime complexity: `-`.

<br>

Day 5 complete, 16 problems solved in 2019.
