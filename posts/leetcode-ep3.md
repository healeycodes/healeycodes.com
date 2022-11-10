---
title:  "Leetcode - Episode 3 - The Streak Continues (3x E)"
date:   "2019-01-03"
tags: ["algorithms"]
path: "algorithms/leetcode/2019/01/03/leet-code.html"
description: "Solutions for: Sort Array By Parity, Robot Return to Origin, and Self Dividing Numbers."
---

Continuing the Leetcode streak with more Python solving. I have a New Year's Resolution related to Leetcode but I feel that to speak it is to jynx it.

Before solving/typing these up (I do it at the same time) I completed [595](https://leetcode.com/problems/big-countries/). It required a short SQL query checking two conditions. The speed-up catch was using a UNION.

### [905. Sort Array By Parity](https://leetcode.com/problems/sort-array-by-parity/)

Problem: Given a list `N` return an array split by even/odd from the numbers in `N`.

I'm using more high performance collections from Python today. Get ready for a speedy double ended queue.

```python
from collections import deque

class Solution:
    def sortArrayByParity(self, A):
        """
        :type A: List[int]
        :rtype: List[int]
        """
        even_odd = deque()

        for num in A:
            if num % 2 == 0:
                even_odd.appendleft(num)
            else:
                even_odd.append(num)

        return list(even_odd)
```

> Deques are a generalization of stacks and queues (the name is pronounced “deck” and is short for “double-ended queue”). Deques support thread-safe, memory efficient appends and pops from either side of the deque with approximately the same O(1) performance in either direction.

<br>

The runtime complexity for this solution is `O(n)` due to the above statement and the fact that we have iterated through `N` just once. The space complexity is `O(n)`.

I wonder if there's a faster version where the deque isn't converted to a list..

### [657. Robot Return to Origin](https://leetcode.com/problems/robot-return-to-origin/)

Problem: Will this robot return home? Moving on a 2D plane via the commands: `U R D L`.

Or, up, right, down, or left. This solution came to me instantly.

```python
class Solution:
    def judgeCircle(self, moves):
        """
        :type moves: str
        :rtype: bool
        """
        x = 0
        y = 0
        
        for i in moves:
            if i == 'U':
                y += 1
            if i == 'R':
                x += 1
            if i == 'D':
                y -= 1
            if i == 'L':
                x -= 1
                
        return x == 0 and y == 0
```

Runtime complexity: `O(n)`

Space complexity: `O(1)`

<br>

I did like this person's (4x slower) Python one-liner though:

`return moves.count('L') - moves.count('R') == moves.count('D') - moves.count('U') == 0`

### [728. Self Dividing Numbers](https://leetcode.com/problems/self-dividing-numbers/)

Problem: Given a range of numbers `N` -> `M` return a list of self-divding numbers within that range.

Note: the range is inclusive, and a self-dividing num doesn't have a 0.

The example they give is `128 % 1 == 0`, `128 % 2 == 0`, `128 % 8 == 0` hence 128 is self-dividing.

I used an enclosed function to break this one up a bit.

```python
class Solution:
    def selfDividingNumbers(self, left, right):
        """
        :type left: int
        :type right: int
        :rtype: List[int]
        """
        self_dividing = list()
        
        for i in range (left, right+1):

            def can_divide(num):
                digits = num

                while digits:
                    digit = digits % 10

                    if digit == 0 or num % digit != 0:
                        return False
                    
                    digits //= 10
                return True

            if can_divide(i):
                self_dividing.append(i)
        
        return self_dividing
```

> Runtime: 68 ms, faster than 75.67% of Python3 online submissions for Self Dividing Numbers.

The trick here is getting the digits of the number without resorting to slow tricks like casting it to a string and slicing it.

Runtime complexity: Iterating through the range means `O(m - n)` -- all other operations are `O(1)`.

Space complexity: The range is the max list size we hold so `O(m - n)` as well.
