---
title:  "Kicking Butt and Taking Names With WebSockets (Tutorial)"
date:   "2019-03-13"
tags: ["javascript"]
path: "node/websockets/javascript/2019/03/13/websockets-javascript-kicking.html"
description: "A little on the history of WebSockets and a brief overview on how to use them in JavaScript."
---

A little over six months ago, I completed my thesis on WebSocket server performance. I've had a chance to use them in (global) production, and lemme tell you, this technology kicks ass!

#### The Past

The model of the internet is request -> response. You send a request for a page by typing an address in your URL bar -> a web server then responds with data. The information you sent, and the information you received, has what's called a *header*, the rest (what you see on the page) is called the body.

![Request/response description](reqres.png)

These headers contain critical information about the data transfer. However, as we'll see later on, these headers and this request/response cycle can be problematic when we want to do things in real-time.

#### The Present

We've been discussing the HTTP protocol. *WebSockets* refer to the [WebSocket protocol](https://tools.ietf.org/html/rfc6455). Like `http://` and `https://`, we have `ws://` and `wss://` for WebSockets. (The *S* stands for secure). WebSockets are bidirectional. This means that messages can be sent both ways. There doesn't need to be a request and a message doesn't need to be a response. Once a connection has been made, you can sling data whichever way you wish. (Under the hood, here we're talking about [data frames](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#Exchanging_Data_Frames)).

It all starts with the handshake. When you type in your developer console,

```javascript
    new WebSocket('ws://example.com:3000');
```

a special HTTP/S request is sent. It's special because, [among other quirks](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#The_WebSocket_Handshake), the header contains `Upgrade: WebSocket` and `Connection: Upgrade`. The server, should it accept your hand in bidirectional matrimony, sends back a response with a similar header with the same two header key/values. At this point, the security you'll be using is negotiated. Both sides are saying Okay, let's do this.

On the client, opening a WebSocket connection looks like this.

```javascript
const socket = new WebSocket('ws://example.com:3000');

// Print incoming messages to the page
socket.onmessage = (msg) => document.body.innerText += msg;

socket.onclose = (event) => alert('uh oh');
```

On the server, we need to listen for these connections. We'll use the unofficial standard WebSockets library for Node.js called [websockets/ws](https://github.com/websockets/ws) or *ws* for short.

```javascript
// Include the library
const WebSocket = require('ws');

// Listen 👂
const wss = new WebSocket.Server({ port: 8080 });

// Every time we get a new connection
wss.on('connection', (ws) => {
  
  // Add a listener to it, log any messages
  ws.on('message', (msg) => {
    console.log('received: %s', msg);
  });

  // After the handshake, say Hi!
  ws.send('howdy');
});
```

Why is this technology useful? Seems like a pretty complicated way to send a message. Let's imagine that a financial website wants to show a stock ticker that updates every two seconds. Before WebSockets, you had to use *polling*. This meant requesting new information every X seconds, even if the information hadn't changed since the last update. Without performing frequent checks, it was impossible to stay in sync.

Clientside, it looked like this.

```javascript
const poller = (time) => {

// Make a request for some JSON (Instead of Fetch, we used to use `XML HttpRequest`!)
fetch('http://example.com/stocks.json')

  // A response will come
  .then((response) => {

    // Parse the data, continue down the chain
    return response.json();
  })
  .then((stockData) => {

    // Pass the fresh data to another function
    updateStocks(stockData);

    // Now, start it all over again - begin polling
    poller(time);
  });
}
```

This is called short-polling. There is an alternative called long-polling where the request is held paused at the server until new data is available or the request is about to timeout, in which case a blank response is sent and the cycle restarts. With long-polling, the data is sent back with low-latency and less bandwidth is used — it's a little more complex to setup though.

With polling, every request and response costs processing, memory, and bandwidth — think of the thick header sections for every cycle! With WebSockets, you perform a handshake and wait for new information — this uses exponentially less processing, memory, and bandwidth for both sides! The underlying [TCP](https://en.wikipedia.org/wiki/Transmission_Control_Protocol) pipe that carries the data back and forth doesn't sit perfectly idle though, for a good reason. The WebSocket protocol allows pings and pongs. These are heartbeats, or, keep-alive messages. Tiny data frames that shoot through the dark pipes under the seabed between computers to say *hello! I'm still here*.

The server pings and the client responds (by the spec, as soon as possible) with a pong. Websockets/ws has this built in. You can call `ws.ping()` at any point after the connection has been made. The endpoint pongs back which triggers the `pong` event. Your browser's `WebSocket class` does this automatically.

#### The Future

Next time you see Twitter has new posts for you, consider the hardworking sockets — and their little heartbeats — which brought you this information, and say thank you to [RFC 6455](https://tools.ietf.org/html/rfc6455) ❤️

[@healeycodes](https://twitter.com/healeycodes) for more personification of technology 🖲️
