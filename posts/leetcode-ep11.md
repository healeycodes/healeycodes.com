---
title:  "Leetcode - Episode 11 - Faster than 99.17% (1 x M, 2 x E)"
date:   "2019-01-11"
tags: ["algorithms"]
path: "algorithms/leetcode/2019/01/11/leet-code.html"
description: "Solutions for: Reverse Vowels of a String, Isomorphic Strings, and Reverse Words in a String."
---

Watch out string problems: I'm coming for you.

I really feel like I'm graduating from String School and feel fairly comfortable with a few different techniques for solving string-based puzzles. I get my fastest run times in this area as well.

Not too much else to report. I've also been reading up on permutation algorithms and reviewing the trade-offs between BFS and DFS.

### [345. Reverse Vowels of a String](https://leetcode.com/problems/reverse-vowels-of-a-string/)

Problem: Reverse the vowels of a given string.

I instantly knew that I wanted to go for a two pointer solution for this. I'm not sure if there's a more efficient way, in fact.

```python
class Solution(object):
    def reverseVowels(self, s):
        """
        :type s: str
        :rtype: str
        """
        s = list(s)
        vowels = set('aeiouAEIOU')
        
        start = 0
        end = len(s)-1
        while not start >= end:
            if s[start] not in vowels:
                start += 1
                continue
            if s[end] not in vowels:
                end -= 1
                continue
            s[start], s[end] = s[end], s[start]
            start += 1
            end -= 1
        return ''.join(s)
```

I saw on the discussion board that some people were getting faster runtimes by using a case statement instead of a set for vowel look-up. I'm not sure whether that's gaming the Leetcode online judge or whether it's actually faster than using the hash function via Set look-up. Will probably depend on different languages and their implementations.

Runtime complexity: `O(n)`.

Spacetime complexity: `O(1)`.

### [205. Isomorphic Strings](https://leetcode.com/problems/isomorphic-strings/)

Problem: Given two strings, check if they are isomorphic.

I.e., do they have the same pattern of letters. E.g., `zoo` matches `bee`. (`011` -> `011`).

I wanted to compare some integer lists representing string patterns.

```python
class Solution(object):
    def isIsomorphic(self, s, t):
        """
        :type s: str
        :type t: str
        :rtype: bool
        """
        count = 0
        letters = dict()
        
        s_list = []
        for i in s:
            if i not in letters:
                count += 1
                letters[i] = count
            s_list.append(letters[i])
            
        count = 0
        letters = dict()
        
        t_list = []
        for i in t:
            if i not in letters:
                count += 1
                letters[i] = count
            t_list.append(letters[i])
            
        return s_list == t_list
```

While linear in runtime, this solution felt a little clumsy to me. However, the only improvement that I found on the forums was to use arrays instead of look-up tables since the test cases were all ASCII letters.

Runtime complexity: `O(n)`.

Space complexity: `O(n)`.

### [151. Reverse Words in a String](https://leetcode.com/problems/reverse-words-in-a-string/)

Problem: Reverse the words in a string, remove leading and trailing spaces, have no more than one space between words.

I was surprised to see that this is classed as Medium difficulty but I suppose with the space-character edge cases, if I were not using Python (which, also, is fantastic at string manipulation), it would be a little harder.

```python
class Solution(object):
    def reverseWords(self, s):
        """
        :type s: str
        :rtype: str
        """
        return ' '.join(s.split()[::-1])
```

A pretty neat one-liner. `s.split()` takes care of all space-character edge cases for us!

My (undeservedly) fastest runtime percentile yet: *99.17th*. The fastest solution available returns early for an empty string which is a small optimization.

Runtime complexity: `O(n)`.

Spacetime complexity: `O(n)`.
