---
title:  "Benchmarking WebSocket Servers with Python!"
date:   "2019-01-28"
tags: ["python"]
path: "websockets/python/projects/2019/01/28/websocket-benchmarker.html"
description: "Benchmarking websocket servers and frameworks with async Python."
---

WebSockets run a large part of the web today. But which servers and frameworks are the best? Well, that depends on how you define best. If you're after raw performance then the following post may be of interest to you. I will be going over some of my design notes for a small benchmark program I wrote in Python with [asyncio](https://docs.python.org/3/library/asyncio.html) and [websockets](https://github.com/aaugustin/websockets).

![WebSocket Benchmarker](wsbenchheader.png)

#### [WebSocket Benchmarker](https://github.com/healeycodes/websocket-benchmarker)

I wrote my Masters' thesis on benchmarking WebSockets servers and frameworks, and coded a benchmark program using Node.js and [ws](https://github.com/websockets/ws). The program, while effective in reaching my research goal, was not fit for publication. The goals with [WebSocket Benchmarker](https://github.com/healeycodes/websocket-benchmarker) were to learn more about asynchronous Python and to create something that other people could use. Usability here meaning some end-to-end tests, maintainability, and nicely commented code with Docstrings:

<br>

```python
async def client(state):
    '''A WebSocket client, which sends a message and expects an echo
    `roundtrip` number of times. This client will spawn a copy of itself afterwards,
    so that the requested concurrency-level is continuous.

    Parameters
    ----------
    state : Dictionary
        A Dictionary-like object with the key `clients` --
        the number of clients spawned thus far.

    Returns
    -------
    string
        A statement when the max number of clients have been spawned.'''
```

<br>

> Await expression - Suspend the execution of coroutine on an awaitable object.

This program allows someone to fake a number of concurrent clients that connect to an echo server (the WebSocket implementation being benchmarked) and send a series of messages. The roundtrip time for each message is measured, logged, and lightly analyzed at the benchmark's close.

Asynchronous design means that we don't need to manually poll things to see when they're finished. And rather than passing callbacks as often done in the past, asyncio lets us `await` things. It's concurrency but easy.

>`await`, similarly to `yield from`, suspends execution of `read_data` coroutine until `db.fetch` awaitable completes and returns the result data.

The 'clients' are coroutine functions that exist in the asyncio event loop. They await opening connections, await sending messages, await recieving messages, and await he closing handshake. After this they spawn a copy of themselves and await that too! This is how concurrency is achieved. There is always the same number of clients. Never more or less.

```python
# create an amount of client coroutine functions to satisfy args.concurrency
con_clients = [client] * concurrency

# pass them all a 'link' to the same state Dictionary
state = dict({'clients': 0})

# run them concurrently
main = asyncio.gather(*[i(state) for i in con_clients])
loop = asyncio.get_event_loop()
loop.run_until_complete(main)
```

Once you're inside an asynchonrous function, it really is as simple as it sounds:

`response = await websocket.recv()`.

Now control flow will go elsewhere and return when appropriate.

I hope to use this software to update my personal benchmark rankings of WebSocket servers and frameworks and write another blog post about the results (and the trade-offs that seeking raw performance often leads to)!

Contributions to the [repository](https://github.com/healeycodes/websocket-benchmarker) are most welcome ❤️.
