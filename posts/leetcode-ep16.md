---
title:  "Leetcode - Episode 16 - Pretty Efficient (3 x E)"
date:   "2019-01-16"
tags: ["algorithms"]
path: "algorithms/leetcode/2019/01/16/leet-code.html"
description: "Solutions for: Flipping an Image, Leaf-Similar Trees, and Maximum Depth of N-ary Tree."
---

More algorithms today. Pretty efficient ones at that. All above 90% ranked on the first submission. I'm beginning to find a lot of patterns that can be applied to the different problems. Most of the Easy binary tree questions are guilty of this.

I'm really happy that I finally solved *Flipping an Image* -- I had been in the thicket of a messy solution for a couple days but I was able to Pythonize it (read: refactor it)! I got hung up on solving it optimally before peaking at any resources.

### [832. Flipping an Image](https://leetcode.com/problems/flipping-an-image/)

Problem: Flip a binary matrix and then invert it.

The trick is doing both steps at once. In other words, you don't want two for loops.

```python
class Solution(object):
    def flipAndInvertImage(self, A):
        """
        :type A: List[List[int]]
        :rtype: List[List[int]]
        """
        for x in range(len(A)):
            A[x] = A[x][::-1]
            for y in range(len(A[x])):
                A[x][y] ^= 1
        
        return A
```

Outrageously straightforwards when it's reduced down to four lines.

Runtime complexity: `O(n)`.

Spacetime complexity: `O(n)`.

### [872. Leaf-Similar Trees](https://leetcode.com/problems/leaf-similar-trees/)

Problem: Do these two trees have similar leaves -- read left-to-right.

We're going to the edge of these trees and comparing the concatenated values found therein, or, there-out-there.

```python
# Definition for a binary tree node.
# class TreeNode(object):
#     def __init__(self, x):
#         self.val = x
#         self.left = None
#         self.right = None

class Solution(object):
    def leafSimilar(self, root1, root2):
        """
        :type root1: TreeNode
        :type root2: TreeNode
        :rtype: bool
        """
        self.root1_store = []
        self.root2_store = []
        def bfs_recurse(node, store):
            if not node.left and not node.right:
                store.append(node.val)
            else:
                if node.left:
                    bfs_recurse(node.left, store)
                if node.right:
                    bfs_recurse(node.right, store)
        if root1:
            bfs_recurse(root1, self.root1_store)
        if root2:
            bfs_recurse(root2, self.root2_store)
        return self.root1_store == self.root2_store
```

First try, pre-optimization: `Runtime: 32 ms, faster than 99.02% of Python online submissions.`.

Runtime complexity: `O(n)`.

Spacetime complexity: `O(n)`.

### [559. Maximum Depth of N-ary Tree](https://leetcode.com/problems/maximum-depth-of-n-ary-tree/)

Problem: What is the deepest level of this n-ary tree?

For this, we'll need a full tree traversal and some way of keeping track of the maximum depth so far. Lately, I've been reaching for instance variables in situations like this.

```python
"""
# Definition for a Node.
class Node(object):
    def __init__(self, val, children):
        self.val = val
        self.children = children
"""
class Solution(object):
    def maxDepth(self, root):
        """
        :type root: Node
        :rtype: int
        """
        self.depth = 0
        def dfs_recurse(node, depth):
            depth += 1
            for c in node.children:
                dfs_recurse(c, depth)
            self.depth = max(depth, self.depth)
        if root:
            dfs_recurse(root, 0)
        return self.depth
```

I'm going to check out some other solutions that don't use pseudo-globals.

Runtime complexity: `O(n)`.

Space complexity: `O(n)`.
