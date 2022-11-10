---
title:  "Leetcode - Episode 13 - Finding My Stride (3 x M)"
date:   "2019-01-13"
tags: ["algorithms"]
path: "algorithms/leetcode/2019/01/13/leet-code.html"
description: "Solutions for: Range Sum of BST, Max Increase to Keep City Skyline, and Custom Sort String."
---

Today has been a good day.

I drank one coffee more than I should have and completed my daily three problems in a comfortably short time with each solution also having a comfortably short runtime.

As I hoped, each successful problem has served as a building block for tackling harder problems. The mini-research I do after getting an optimal solution is vital. The Leetcode discussion board, and the wider internet, information that really clicks because the problem that the information helps to solve is still fresh in my head.

### [938. Range Sum of BST](https://leetcode.com/problems/range-sum-of-bst/)

Problem: Given a binary search tree, return the sum of all values between `L` and `R`.

I started out by writing a recursive algorithm that summed the entirety of a BST. I then added logic to check that I actually wanted to sum node's value.

The trick here is skipping the parts of the tree that cannot hold any relevant values. If the `node.left` has a value smaller than `L` then we are not interested in any deeper parts of that sub-tree.

```python
# Definition for a binary tree node.
# class TreeNode(object):
#     def __init__(self, x):
#         self.val = x
#         self.left = None
#         self.right = None

class Solution(object):
    def rangeSumBST(self, root, L, R):
        """
        :type root: TreeNode
        :type L: int
        :type R: int
        :rtype: int
        """
        def recursive_search(node, sum_vals=0):
            if node.val >= L and node.val <= R:
                sum_vals += node.val
            if node.left and node.val >= L:
                sum_vals += recursive_search(node.left, 0)
            if node.right and node.val <= R:
                sum_vals += recursive_search(node.right, 0)
            return sum_vals
        
        return recursive_search(root)
```

Runtime complexity: We may have to search the whole tree, so: `O(n)`.

Spacetime complexity: Nothing is created, so `O(1)`? Either that, or in the worst case we hold the entire tree in memory (on the stack).

### [807. Max Increase to Keep City Skyline](https://leetcode.com/problems/max-increase-to-keep-city-skyline/)

Problem: Given a 2D grid, find the total possible increase to values so that the max(row) and max(column) isn't increased.

Okay, that is a simplification of the problem statement but it's a little hard to understand with a quick scan.

I knew that two iterations would be required and that we needed to keep track of a value for each row and column.

```python
class Solution(object):
    def maxIncreaseKeepingSkyline(self, grid):
        """
        :type grid: List[List[int]]
        :rtype: int
        """
        max_increase = 0
        
        # to store the highest building for x/y view
        max_x = [0] * len(grid)
        max_y = [0] * len(grid[0])
        
        # find the highest buildings
        for x in range(0, len(grid)):
            for y in range(0, len(grid[x])):
                max_x[x] = max(grid[x][y], max_x[x])
                max_y[y] = max(grid[x][y], max_y[y])
        
        # sum the possible building increases
        for x in range(0, len(grid)):
            for y in range(0, len(grid[x])):
                max_increase += min(max_x[x], max_y[y]) - grid[x][y]
        
        return max_increase
```

One of the optimizations here is to use `min` and `max` instead of manually checking for higher/lower values.

Runtime complexity: `O(2n)` -> `O(n)`.

Space complexity: `O(2*sqrt(n)` -> `O(sqrt(n)` -- an interesting one.

### [791. Custom Sort String](https://leetcode.com/problems/custom-sort-string/)

Problem: Return a permutation of string `T` so that the letters are sorted in accordance with the order of string `S`.

Note: `S` has unique characters and will not necessarily contain every letter of the alphabet.

I'm a big fan of my solution to this problem. I'll take any opportunity to use a Set!

```python
from string import ascii_letters  
class Solution(object):
    def customSortString(self, S, T):
        """
        :type S: str
        :type T: str
        :rtype: str
        """
        letters = set(ascii_letters)
        vals = dict()
        idx = 0
        
        # determine the value of given letters
        for i in S:
            vals[i] = idx
            letters.remove(i)
            idx += 1
        
        # the value doesn't matter for the rest
        for i in letters:
            vals[i] = idx
            
        T = list(T)
        T.sort(key=lambda c: vals[c])
        return ''.join(T)
```

There is an optimization here where the unpointed letters are removed from the sorting sequence as their order doesn't matter.

Runtime complexity: We throw away the `nlgn` sorting time, so: `O(n)`.

Spacetime complexity: This would be `O(1)` due to `S` having unique characters but we can't sort an immutable string in-place!
