---
title:  "Leetcode - Episode 1 - Three Easys"
date:   "2019-01-01"
tags: ["algorithms"]
path: "algorithms/leetcode/2019/01/01/leet-code.html"
description: "Episode one of tacking Leetcode problems and discussing solutions. Jewels and Stones, Unique Email Addresses, and To Lower Case."
---

This series involves tackling Leetcode problems and discussing my solutions with an aim to improve at problem solving and algorithmic analysis. For most problems, I will be aiming for the most optimal solution. I've recently been reviewing some academic content on algorithms and data-structures.

### [771. Jewels and Stones](https://leetcode.com/problems/jewels-and-stones/)

Problem: Given a string `J` of unique characters, how many unique characters from this string are present in string `S`.

```python
class Solution:
    def numJewelsInStones(self, J, S):
        """
        :type J: str
        :type S: str
        :rtype: int
        """
        jewels = set()
        for i in J:
            jewels.add(i)

        stones = 0
        for i in S:
            if i in jewels:
                stones += 1

        return stones
```

My solution achieves a runtime complexity of `O(n + m)` - this is the minimum possible because both strings must be iterated through at least once -- and 'searching' a Set is `O(1)`. The space complexity is `O(n)` as one Set was required to store the characters we are looking for. 

After reading the discussion board, I saw that this code can be improved by using Python's [collections.Counter](https://docs.python.org/3.7/library/collections.html#collections.Counter)

> Counter objects - A counter tool is provided to support convenient and rapid tallies.

### [929. Unique Email Addresses](https://leetcode.com/problems/unique-email-addresses/)

Problem: Given a list `E` of emails, return the number of distinct emails.

You may want to check the full problem statement for the specific email rules.

```python
class Solution:
    def numUniqueEmails(self, emails):
        """
        :type emails: List[str]
        :rtype: int
        """
        distinct = set()
        for email in emails:
            # get the local name
            local = email.split('@')[0].split('+')[0].replace('.', '')

            # concat with the domain name
            domain = email.split('@')[1]
            distinct.add(local + domain)
        
        return len(distinct)
```

My solution is not optimized for speed but solves the problem with a reasonably clean style. After reviewing the discussion posts, I saw that a quick optimization would be to cache both sides of the `@` symbol at the same time by using `local, domain = email.split('@')`.

To be fully optimal, I presume that a careful manual loop would be required.

### [709. To Lower Case](https://leetcode.com/problems/to-lower-case/)

Problem: implement ToLowerCase() (presumably without standard library functions!)

```python
class Solution:
    def toLowerCase(self, str):
        """
        :type str: str
        :rtype: str
        """
        lowered = []
        for i in str:
            char_code = ord(i)
            # if A-Z
            if char_code < 91 and char_code > 64:
                lowered += chr(char_code + 32)
            else:
                lowered += i
        return ''.join(lowered)
```

My solution has a runtime complexity of `O(n)` with a space complexity of `O(n)`. Depending on the underlaying implementation, it may be quicker to use a Dictionary of uppercase to lowercase characters for the conversion.
