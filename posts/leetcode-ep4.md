---
title:  "Leetcode - Episode 4 - gnivloS melborP (3x E)"
date:   "2019-01-04"
tags: ["algorithms"]
path: "algorithms/leetcode/2019/01/04/leet-code.html"
description: "Solutions for: Reverse Words in a String III, Sort Array By Parity II, and Reverse String."
---

Two out of three problems involve reversing today hence the title.

It's also warmer than yesterday and my cold has passed .. onto to my fiancée (sorry).

### [557. Reverse Words in a String III](https://leetcode.com/problems/reverse-words-in-a-string-iii/)

Problem: Reverse the words of a string `N` while preserving the word order.

`'Apple two' => 'owt elppA'`

This solution came to me pretty quickly. I was able to use some ideas from previous problems that were fresh in my head.

```python
class Solution:
    def reverseWords(self, s):
        """
        :type s: str
        :rtype: str
        """
        return ' '.join(reversed(s[::-1].split(' ')))
```

Runtime complexity: `O(3n)` -> `O(n)`.

Space complexity: I'm not sure. Depending on the implementation, I *believe* that it will mimic the runtime complexity.

### [922. Sort Array By Parity II](https://leetcode.com/problems/sort-array-by-parity-ii/)

Problem: Sort array `N` so that the even indices have even numbers and the odd indices have odd numbers.

This is the next version of the first problem I solved yesterday.

```python
class Solution:
    def sortArrayByParityII(self, A):
        """
        :type A: List[int]
        :rtype: List[int]
        """
        even = 0
        odd = 1
        ans = [0] * len(A)
        
        for i in A:
            if i % 2 == 0:
                ans[even] = i
                even += 2
            else:
                ans[odd] = i
                odd += 2
                
        return ans
```

<br>

Although it didn't feel too bad writing this one out, I knew it was sub-optimal and could be done without that extra list.

Runtime complexity is `O(n)` as its just one pass through.

Space complexity is `O(2n)` which becomes `O(n)`.

I looked up some solutions where it was solved in-place without additional data structures so that in future problems I'll have a better idea of where to head. They involved managing two pointers for even and odd and being lazy about swapping. In my solution, a perfectly sorted list (to the problem spec) would be resorted regardless.

### [344. Reverse String](https://leetcode.com/problems/reverse-string/)

Problem: Reverse a string `N`

I'll be kicking myself later on that I chose to solve these easy ones now -- assuming I can stick to my three per day target.

```python
class Solution:
    def reverseString(self, s):
        """
        :type s: str
        :rtype: str
        """
        return s[::-1]
```

Linear complexity all around. Thank you Python for your terseness.

<br>

See you tomorrow.