---
title:  "Leetcode - Episode 17 - Moving, Shaking, and Folding (3 x E)"
date:   "2019-01-21"
tags: ["algorithms"]
path: "algorithms/leetcode/2019/01/21/leet-code.html"
description: "Solutions for: Move Zeroes, Merge Two Sorted Lists, and Merge Two Binary Trees."
---

I'm a big fan of all three problems and solutions today. I must say that these Easys are getting harder than their counterparts though. But I do often sort by acceptance rate high->low.

There's also a 'perfect' solution included for the *Move Zeroes* problem!

### [283. Move Zeroes](https://leetcode.com/problems/move-zeroes/)

Problem: Move all the zeroes to the end of the array, in-place.

The problem statement also wants a minimum of total operations.

In production, this would be a perfect use-case of Python's timsort `.sort()` -- although, this sometimes creates additional space which excludes the algorithm for this problem. It also uses more operations than we need to!

The trick is realizing that the zero characters are essentially empty space. I'll show you what I mean.

```python
class Solution(object):
    def moveZeroes(self, nums):
        """
        :type nums: List[int]
        :rtype: void Do not return anything, modify nums in-place instead.
        """
        place_nums = 0
        for i in range(len(nums)):
            if nums[i] != 0:
                if i > place_nums:
                    nums[place_nums] = nums[i]
                place_nums += 1
        
        for i in range(place_nums, len(nums)):
            nums[i] = 0

        # return is excluded as per problem statement
```

We place all the numbers at the start of the array and then overwrite the part of the array that should now be zeros.

`Runtime: 32 ms, faster than 100.00% of Python online submissions for Move Zeroes.`

Runtime complexity: `O(n)`.

Space complexity: `O(n)`.

### [21. Merge Two Sorted Lists](https://leetcode.com/problems/merge-two-sorted-lists/)

Problem: Merge two sorted linked list, return as a linked list

I chose to solve this recursively as it really cuts down on the if/else blocks. The code is a little easier to read as well.

```python
# Definition for singly-linked list.
# class ListNode(object):
#     def __init__(self, x):
#         self.val = x
#         self.next = None

class Solution(object):
    def mergeTwoLists(self, l1, l2):
        """
        :type l1: ListNode
        :type l2: ListNode
        :rtype: ListNode
        """
        if not l1 and not l2:
            return None
        elif not l1:
            return l2
        elif not l2:
            return l1
        
        node = ListNode(0)
        if l1.val < l2.val:
            node.val = l1.val
            node.next = self.mergeTwoLists(l1.next, l2)
        else:
            node.val = l2.val
            node.next = self.mergeTwoLists(l1, l2.next)
            
        return node
```

However, cute as this solution is, there will be stack issues with long lists.

Runtime complexity: `O(n)`.

Spacetime complexity: `O(n)`.

### [617. Merge Two Binary Trees](https://leetcode.com/problems/merge-two-binary-trees/)

Problem: Merge two binary trees, that is to say, fold them onto one and other, summing overlapping nodes.

This uses a similar recursive strategy to the linked list problem earlier.

```python
# Definition for a binary tree node.
# class TreeNode(object):
#     def __init__(self, x):
#         self.val = x
#         self.left = None
#         self.right = None

class Solution(object):
    def mergeTrees(self, t1, t2):
        """
        :type t1: TreeNode
        :type t2: TreeNode
        :rtype: TreeNode
        """
        if not t1:
            return t2
        if not t2:
            return t1
        
        result = TreeNode(t1.val + t2.val)
        result.left = self.mergeTrees(t1.left, t2.left)
        result.right = self.mergeTrees(t1.right, t2.right)
        return result
```

Runtime complexity: `O(n)`.

Spacetime complexity: `O(n)`.
