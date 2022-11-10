---
title:  "Need a Friend? Write a Reddit Bot with Python to Follow You Around (Tutorial)"
date:   "2019-03-25"
tags: ["python"]
path: "tutorial/python/beginners/webdev/2019/03/25/reddit-bot-tutorial.html"
description: "The basics of building a Reddit bot that listens for phrases and replies to them."
---

We're going to write a Reddit bot that listens for specific phrases and responds to comments that contain them. We'll learn how the Reddit API can be interacted with in Python, while making a bot buddy of our own.

#### Bottiquette

You've probably heard of the [three laws of robotics](https://en.wikipedia.org/wiki/Three_Laws_of_Robotics) but have you heard of Reddit's [bottiquette](https://www.reddit.com/wiki/bottiquette)? It's a list of rules that will help you create a polite bot that won't get in anyone's way. The most important rule is not to impersonate a human with your bot. While it's okay to cast up- and down-votes, the command to do so must come directly from a human.

#### Setup

You'll need [PRAW](https://praw.readthedocs.io/en/latest/index.html), the _The Python Reddit API Wrapper_. Install this package with: `pip install praw`. Its got extensive documentation, and there's also a [r/redditdev](https://www.reddit.com/r/redditdev/) subreddit should you need more inspiration or assistance.

Create a __script__ [Reddit app](https://www.reddit.com/prefs/apps/), and note down the client id and client secret.

![Reddit's Create Application page](rb-app.png)

Make sure you don't commit these to a repository! With Python, you can access environmental variables with `os.environ`, a mapping object. Below is a hello world PRAW app. Since our bot will be performing account actions, we'll also need the account's username and password. With passive bots, this isn't necessary. There are also [other ways to authenticate](https://praw.readthedocs.io/en/latest/getting_started/authentication.html).

```bash
# Setting environment variables on different platforms:
Linux/OS X  - export ENV_VAR='data'
Windows Cmd - ENV_VAR='data'
Powershell  - $env:ENV_VAR='data' 
```

```python
import os
import praw

# a reddit instance
reddit = praw.Reddit(client_id=os.environ['CLIENTID'],
                     client_secret=os.environ['CLIENTSECRET'],
                     user_agent='Reddit bot tutorial v0.1-1',
                     username=os.environ['CLIENTUSER'],
                     password=os.environ['CLIENTPASS'])

# with incorrect authentication information, this will error with:
#   prawcore.exceptions.OAuthException: invalid_grant error processing request
print(reddit.user.me())
```

Since our sensitive information is defined elsewhere, we can commit this without leaking any details. It's also easier to test and let's other developers work more easily with this code.

#### All the comments

This is a fun one to do. My challenge to you: try and read every comment as it's posted to Reddit. This really gives you an idea of the scale of data that's available.

```python
# with our reddit instance, get an endless stream of comments
for comment in reddit.subreddit('all').stream.comments():
    print(comment.body)
```

Here, `comments` is a generator function that yields new comments as they become available. As with most APIs, there are rate limits with the Reddit API. Lucky for us, PRAW manages these in the background for us and keeps us in check.

We want to filter comments for specific phrases. Along the same lines as our environment variables, we're also going to genericize this feature. [argparse](https://docs.python.org/3/library/argparse.html), part of Python's standard library, allows command line arguments to be easily configured.

```python
import argparse

# setup argparse
parser = argparse.ArgumentParser(description='Reply to certain Reddit comments')
parser.add_argument('--search', dest='search',
                    help='Search for these comma-delimited phrases. E.g., "one phrase, another phrase"')
args = parser.parse_args()

# split by commas, strip extra white space
search = [phrase.strip() for phrase in args.search.split(',')]

# python args.py --search "test phrase, two, three"
# prints: ['test phrase', 'one', 'two']
print(search)
```

#### Replying to comments

Reddit's [r/test](https://www.reddit.com/r/test/) is a good battleground to try this out. We'll use [Comment#reply](https://praw.readthedocs.io/en/latest/code_overview/models/comment.html#praw.models.Comment.reply). Since we'll be searching comment bodies for our phrases, we'll already have a reference to a comment object, and we can simply use its `reply` method. Otherwise, you can find create a comment object with an id.

```python
# with a comment reference
comment.reply('hello! signed, a bot.')

# find a comment by id
comment = reddit.comment(id='dxolpyc')
comment.reply('hi again!')
```

You may need two accounts to properly test this, as newly created Reddit accounts can't post two comments instantly, i.e., posting a target phrase and then a posting reply to that comment.

#### Where we are so far

Let's check how our bot is shaping up. You'll see I've used `argparse` to genericize the search phrases. We're making a configurable bot, rather than a hardcoded one that's harder to extend and work with in the future.

```python
import os
import praw
import argparse

# setup argparse
parser = argparse.ArgumentParser(description='Reply to certain Reddit comments')
parser.add_argument('--search', dest='search',
                    help='Search for these comma-delimited phrases. E.g., "one phrase, another phrase"')
parser.add_argument('--reply', dest='reply',
                    help='Reply to target comments with this phrase')
args = parser.parse_args()

# our search phrases, also works with a single word
search = [phrase.strip() for phrase in args.search.split(',')]
# our reply
reply = args.reply

# reddit instance
reddit = praw.Reddit(client_id=os.environ['CLIENTID'],
                     client_secret=os.environ['CLIENTSECRET'],
                     user_agent='Reddit bot tutorial v0.1-1',
                     username=os.environ['CLIENTUSER'],
                     password=os.environ['CLIENTPASS'])

# an endless stream of comments
for comment in reddit.subreddit('all').stream.comments():
    for phrase in search:
        if phrase in comment.body:
            comment.reply(reply)
            # for debugging
            print(f'Replied to {comment.id}!')
            break

```

#### Where to go from here

- Clone the [tutorial repository](https://github.com/healeycodes/Reddit-Bot-Tutorial) and get hacking!
- Get the poster's name and use it in your reply: `comment.author.name`
- Host your bot on a Raspberry Pi or in the cloud with [Heroku](https://devcenter.heroku.com/categories/python-support).
- Connect your bot to a backend service, like I did with my [EmojiStreamer](https://github.com/healeycodes/EmojiStreamer) project, which streams every single emoji posted to Reddit.

#### More

I recently joined [coding coach](https://mentors.codingcoach.io/). If you're developing a Reddit bot, or need dev assistance in general, I can help out!
