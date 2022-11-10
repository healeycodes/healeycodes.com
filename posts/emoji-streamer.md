---
title:  "Real-Time Streaming of Every Emoji Posted as a Comment to Reddit.com"
date:   "2019-03-04"
tags: ["javascript"]
path: "emoji/python/javascript/2019/03/04/emoji-streamer.html"
description: "Building a website which live streams every emoji posted to Reddit.com."
---

Let's say we want to find every emoji as it's posted to Reddit. First, we'll define what an emoji is. The Unicode Consortium keeps their [data lists](http://unicode.org/Public/emoji/12.0/) avaliable. We'll bring them in via a JSON file. The file has descriptions and other things we don't need so we'll clean the data a bit and store it in an efficient `Set`. If we're checking whether a character is or isn't an emoji over 5k times a second we'll need the `O(1)` look-up time!

```python
import json

with open('emojis/emoji.json', encoding='utf8') as emoji_db:
    cleaned = filter(lambda e: 'emoji' in e, json.load(emoji_db))
    emojis = set(map(lambda e: e['emoji'], cleaned))
```

[![Emoji Streamer](emoji-streamer-preview.gif)](https://github.com/healeycodes/EmojiStreamer)

To check every Reddit comment as it comes into existance we'll use [PRAW](https://praw.readthedocs.io/en/latest/) (The Python Reddit API Wrapper). It's the defacto standard for interacting with the Reddit API. It's well documented and straightforward to use.

```python
import praw

client_id = os.environ['CLIENTID']
client_secret = os.environ['CLIENTSECRET']
reddit = praw.Reddit(client_id=client_id,
                     client_secret=client_secret,
                     user_agent='emoji-tracker v0.1')
while True:
    try:
        for comment in reddit.subreddit('all').stream.comments():
            for char in comment.body:
                if char in emojis:
                    print(char, flush=True)
    except Exception as e:
        print(e, file=sys.stderr)
```

Here we set up PRAW with our Reddit app's ID and secret. Once we have a Reddit instance, we can start scanning. PRAW will get all the comments while managing the API limits for us. At around 300k characters per minute, it's quite a lot of data for a human to comprehend but it's peanuts for a PC as long as it's setup properly.

Let's pipe any emojis we find out to `stdout` making sure to flush every `print` so we don't leave any hanging. Emojis sometimes come in slowly, and one at a time -- we want to make sure that our UI is updating as soon as possible to hold the user's attention for a little longer (for those users who enjoy watching a string of emojis grow and grow).

By the way, which of you is posting 40 crabs at a time and why!?

🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀🦀

We'll catch these emojis in Node.js. express/express-ws was chosen so that we can simply host our static files while also making an emoji stream avaliable over a WebSocket. The `emoji-piper.py` file will be called as a child process. Let's attach some event listeners to catch the emojis as they are sent to `stdout`.

```javascript 
/* Whenever new emojis are ready, clear up CLOSING/CLOSED connections
    while sending emojis to the remaining clients */
const emojiStreamer = process;
emojiStreamer.stdout.on('data', (emoji) => {
    emoji = `${emoji}`;
    Array.from(clients, client => {
        if (client.readyState > 1) {
            clients.delete(client);
            return
        }
        client.send(emoji);
    });
});
```

We convert the data into a `String`, clean up closed or closing connections, and disperse the hot-off-the-press emojis. If the emojis were posted more often, say ten times more often, then it would make sense to place them into groups before passing them around (in Node.js or Python, wherever the closest bottleneck is).

Over in Front End Land, we let the user know when they're connected and let loose the fresh emojis. The reason we `split('\n')` here is to fix some unsyncing issues with the `stdout` pipeline -- a flaw in our design but necessary for rapid prototyping.

```javascript 
ws.onopen = () => {
    status.innerHTML = 'Connected ✔️';
}

ws.onmessage = (emojis) => {
    // Multiple emoji may arrive delimited by a new-line char
    emojiList = emojis.data.split('\n');
    emojiList.splice(emojiList.length - 1);
    emojiList.forEach(emoji => {
        render(emoji);
    });
}
```

Did you know that there is no consensus on what the plural of emoji is? Let me know at [@healeycodes](https://twitter.com/healeycodes) if you've been wincing at my usage of *emojis!*

This project is open sourced at [Emoji Streamer](https://github.com/healeycodes/EmojiStreamer) with Travis CI counting emojis and making sure our tests pass 👍
