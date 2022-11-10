---
title:  "Leetcode - Episode 8 - Breaking Out Some Mediums (3x M, 1x E)"
date:   "2019-01-08"
tags: ["algorithms"]
path: "algorithms/leetcode/2019/01/08/leet-code.html"
description: "Solutions for: Encode and Decode TinyURL, Insert into a Binary Search Tree, Minimum Add to Make Parentheses Valid, and Goat Latin."
---

Three Mediums today. I looked at the Parentheses problem last night so it's been bouncing around my head all day.

My fiancée was actually at a Python meet-up while I was solving these. We're a real pair of Pythonistas.

### [535. Encode and Decode TinyURL](https://leetcode.com/problems/encode-and-decode-tinyurl/)

Problem: Create an URL shortening service.

This is more of a design problem than a programming problem but there are still some tricks involved. There are many popular ways to solve the URL-shortening problem.

I decided to give URLs an incrementing ID kinda like a primary key which then gets encoded in base64. However, a lower base with alphanumeric captials is probably better suited for browsers. An advantage to my solution is that the early URLs will be even shorter than the six characters that Leetcode suggests.

As soon as you move away from a one-server model, this solution will fail because it begins to get harder to keep track of the incrementing ID.

```python
import base64

class Codec:
    def __init__(self):
        self.urls = dict()
        self.url_count = 0
    
    def encode(self, longUrl):
        """Encodes a URL to a shortened URL.
        
        :type longUrl: str
        :rtype: str
        """
        self.url_count += 1
        url_base64 = base64.b64encode(bytes(self.url_count))
        self.urls[url_base64] = longUrl
        return url_base64

    def decode(self, shortUrl):
        """Decodes a shortened URL to its original URL.
        
        :type shortUrl: str
        :rtype: str
        """
        return self.urls[shortUrl]

# Your Codec object will be instantiated and called as such:
# codec = Codec()
# codec.decode(codec.encode(url))
```

I liked a solution in the discussions tab that proposed a random choice that keeps picking a random six character long alphanumeric-captial string until it finds one that isn't already stored. This scales better with multiple servers.

This will probably be the only problem in this series with a `O(1)` runtime! It's basically a big clever Dictionary.

Runtime complexity: `O(1)`.

Spacetime complexity: `O(n)`.

### [701. Insert into a Binary Search Tree](https://leetcode.com/problems/insert-into-a-binary-search-tree/)

Problem: Given the root node of a BST, insert a given value (that is guaranteed to not already appear in the BST).

I went with an iterative search for this one. The solution is pretty straightforward.

```python
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, x):
#         self.val = x
#         self.left = None
#         self.right = None

class Solution:
    def insertIntoBST(self, root, val):
        """
        :type root: TreeNode
        :type val: int
        :rtype: TreeNode
        """
        node = root
        while True:
            if node.val > val:
                if node.left is None:
                    node.left = TreeNode(val)
                    return root
                else:
                    node = node.left
            else:
                if node.right is None:
                    node.right = TreeNode(val)
                    return root
                else:
                    node = node.right
```

Runtime complexity: `O(lg n)`.

Space complexity: `O(1)` -- I think. I believe we are destorying references as we go so the stack size remains constant.

### [921. Minimum Add to Make Parentheses Valid](https://leetcode.com/problems/minimum-add-to-make-parentheses-valid/)

Problem: Given a string of parentheses, calculate the minimum number of additions to make it 'valid'.

A common solution to this problem is to used `O(n)` space and use a stack. However, that stack can be implemented with an integer instead.

```python
class Solution(object):
    def minAddToMakeValid(self, S):
        """
        :type S: str
        :rtype: int
        """
        parens = 0
        corrections = 0
        for i in S:
            if i == '(':
                parens += 1
            elif parens > 0:
                parens -= 1
            else:
                corrections += 1
        
        return corrections + parens
```

I like this solution because it's simple to read and follow.

<br>

Runtime complexity: `O(n)`.

Spacetime complexity: `O(1)`.


### [824. Goat Latin](https://leetcode.com/problems/goat-latin/)

Problem: Translate a sentence `S` into Goat Latin.

Rules:

- If there is a starting constant, move it to the end.
- Add `ma` to the end. Add an `a` for every word in the sentence so far.

I was surprised to find that it's quicker to use Python string operations as opposed to creating an array to fit the new word into. I think if you were able to create fixed size arrays in Python then it might be quicker to keep `extend` an array. However, whatever implementation of Python that Leetcode are using is probably doing this under the surface.

```python
class Solution(object):
    def toGoatLatin(self, S):
        """
        :type S: str
        :rtype: str
        """
        vowels = set('aeiouAEIOU')
        S = S.split(' ')
        
        for idx, val in enumerate(S):
            if S[idx][0] not in vowels:
                S[idx] = S[idx][1:] + S[idx][0]
            S[idx] = S[idx] + 'ma' + (idx + 1) * 'a'
        return ' '.join(S)
```

Python really shines here, keeping the logic compact.

<br>

Runtime complexity: `O(n)`.

Spacetime complexity: `O(n)`.

<br>

2.69% of Leetcode's problems solved!
