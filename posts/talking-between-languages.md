---
title:  "Talking to Python from JavaScript (and Back Again!)"
date:   "2019-04-11"
tags: ["python", "javascript"]
popular: true
path: "javascript/python/beginners/webdev/2019/04/11/talking-between-languages.html"
description: "Let's learn how to pass data back and forth between languages."
---

Something a lot of beginners struggle with is the concept of passing data between different programming languages. It's far more simple to understand that a value exists in a variable which can be passed around from function to function. However, to go beyond the program's edges we must serialize our data in some way. We'll look at two ways that these two languages can communicate. AJAX requests via the new Fetch API, and piping between local processes.

Serializing data means taking a value, object, or data structure, and translating it into a format that can be stored or transmitted. Most importantly, it needs to be put back together at the other end. Let's take look at JavaScript Object Notation (JSON). JSON is a human-readable format and is straightforward for machines to read and write. The [specification](https://www.json.org/) is small enough to read during one cup of coffee. Both JavaScript and Python have standard library methods to parse and write JSON.

## JSON Crash Course

JSON is built on two data structures. **Objects** — key/value pairs like a JavaScript `Object`, and a Python `Object` or `Dictionary`. **Arrays** — a series of data like a JavaScript `Array`, and a Python `List`.

```javascript
/* JavaScript
   Try this out in your developer console! */

const person = {"name":"Andrew", "loves":"Open Source"};
const asJSON = JSON.stringify(person);

// `person` is of type 'object'
console.log(`person is of type ${typeof person}`);

// `asJSON` is of type 'string'
console.log(`asJSON is of type ${typeof asJSON}`);

// We can convert it back to an object by parsing it
// `asObject` is of type 'object'
const asObject = JSON.parse(asJSON);
console.log(`asObject is of type ${typeof asObject}`);
```

Let's do the same in Python by using the standard library module `json`.

```python
# python

animal = {'type':'cat', 'age':12}
as_json = json.dumps(animal)

print(type(animal))  # prints '<class 'dict'>'
print(type(as_json))  # prints '<class 'str'>'

# now back again
as_object = json.loads(as_json)
print(type(as_object))  # prints '<class 'dict'>'
```

**Recap:** in JavaScript, you serialize to JSON with `JSON.stringify()` and parse with `JSON.parse()`. This works in the browser as well as Node.js. In Python, first import the `json` module then serialize with `json.dumps()` and parse with `json.loads()`.

## Talking via AJAX

In the past, this would be done with [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) but the relatively new [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) is far more pleasant to use. First, we'll code up a small Python web server, and then we'll look at passing JSON back and forth with the browser.

[Flask](http://flask.pocoo.org/) is a 'microframework'. It's not only extremely fun to use, it's also great to prototype with. We'll use its [jsonify](http://flask.pocoo.org/docs/1.0/api/#flask.json.jsonify) module which writes/parses JSON as well as setting the correct response headers (an application/json mime type). It requires two [OS-specific commands](http://flask.pocoo.org/docs/1.0/quickstart/) to install and run a debug server. For myself on OS X, they were `pip install flask` and `FLASK_APP=app.py flask run`.

Code along or fork [this repository](https://github.com/healeycodes/talking-between-python-and-js) to grab the code for all the examples.

```python
# app.py
from flask import Flask, jsonify, request, render_template
app = Flask(__name__)

@app.route('/hello', methods=['GET', 'POST'])
def hello():

    # POST request
    if request.method == 'POST':
        print('Incoming..')
        print(request.get_json())  # parse as JSON
        return 'OK', 200

    # GET request
    else:
        message = {'greeting':'Hello from Flask!'}
        return jsonify(message)  # serialize and use JSON headers

@app.route('/test')
def test_page():
    # look inside `templates` and serve `index.html`
    return render_template('index.html')
```

With our server running and serving us a page we can run JavaScript on, let's talk in JSON! We'll send a GET request with the Fetch API and receive a greeting from Flask. Before writing a single line of client-side code, I always use [Postman](https://www.getpostman.com/) to test my web servers — it's free and one of the industry standard tools for API testing and development.

I'm running the following snippets in `<script>` tags inside `templates/index.html`. There's nothing else inside `index.html` so the rendered page is blank. Everything happens in the console.

```javascript
// GET is the default method, so we don't need to set it
fetch('/hello')
    .then(function (response) {
        return response.text();
    }).then(function (text) {
        console.log('GET response text:');
        console.log(text); // Print the greeting as text
    });

// Send the same request
fetch('/hello')
    .then(function (response) {
        return response.json(); // But parse it as JSON this time
    })
    .then(function (json) {
        console.log('GET response as JSON:');
        console.log(json); // Here’s our JSON object
    })
```

Awesome! We've got Python talking to client-side JavaScript using JSON for data serialization. Let's flip it and send JSON to Python from the browser. We'll use the Fetch API again but it will be a POST request instead of GET.

**Beginner tip:** Remember the difference between POST and GET. When you POST mail, you head to the post office with your letter filled with information. When you GET mail, you head to the post office again but this time you're picking up something that’s been left for you.

```javascript
// POST
fetch('/hello', {

    // Declare what type of data we're sending
    headers: {
      'Content-Type': 'application/json'
    },

    // Specify the method
    method: 'POST',

    // A JSON payload
    body: JSON.stringify({
        "greeting": "Hello from the browser!"
    })
}).then(function (response) { // At this point, Flask has printed our JSON
    return response.text();
}).then(function (text) {

    console.log('POST response: ');

    // Should be 'OK' if everything was successful
    console.log(text);
});
```

With these two core building blocks, we've conquered JSON communication via HTTP. However, do note that you should be adding `catch` to the end of these Promises.  I've only trimmed them for clarity. It's better to handle errors gracefully so we can tell the user that they are disconnected or that there's an error on our end. Docs for catch [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch).

If you're talking to a Node.js web server with Python, you will probably reach for the [requests](http://docs.python-requests.org/en/master/) module, which has syntax almost identical to the Fetch API.

## Talking via processes

We're going to spawn processes (both ways) so we can see what communication between Node.js and Python looks like. We'll listen to the [stdout](https://en.wikipedia.org/wiki/Standard_streams#Standard_output_(stdout)) stream of the child process in both instances. Let's imagine that we have a program that reports data at irregular intervals. A temperature sensor. We want to listen to that program and store the values it reports.

Here's our fake sensor program in Python. It prints data to stdout. We'll catch it in Node.js.

```python
# sensor.py

import random, time
while True:
    time.sleep(random.random() * 5)  # wait 0 to 5 seconds
    temperature = (random.random() * 20) - 5  # -5 to 15
    print(temperature, flush=True, end='')
```

When piping information in this way, it's important to flush the stream so it reaches stdout when you expect it to ([why do we fflush() in C?](https://www.quora.com/Why-do-we-use-the-functions-fflush-stdin-and-fflush-stdout-in-c)) . More information on Python flushing [here](https://stackoverflow.com/a/35467658). We also make sure that the end of the printed statement contains no extra information (even though `parseFloat()` would clean it!) by default it would be the newline character `\n`.

So, we're Node.js and we want the current temperature as it's reported. Let's spawn `sensor.py` as a process and listen for the stdout event. _Piping_ the data between the two running languages.

```javascript
// temperature-listener.js

const { spawn } = require('child_process');
const temperatures = []; // Store readings

const sensor = spawn('python', ['sensor.py']);
sensor.stdout.on('data', function(data) {
    
    // Coerce Buffer object to Float
    temperatures.push(parseFloat(data));

    // Log to debug
    console.log(temperatures);
});
```

## Flip it and reverse it

Now, let's flip those roles. A Node.js sensor and a Python listener! This time we'll try a different method, using a newline character (`\n`) to delimit the different readings instead of waiting for an event. We'll add the data to a buffer until we hit a newline char. Once we do, we've collected a full reading and we can store it.

First, the equivalent sensor in Node.js.

```javascript
// sensor.js

function reportReading() {
    const temperature = (Math.random() * 20) - 5; // Range of -5 to 15
    process.stdout.write(temperature + '\n'); // Write with newline char
    setTimeout(reportReading, Math.random() * 5000); // Wait 0 to 5 seconds
}
reportReading();
```

Now in Python, a temperature listener program that will spawn the above code as a process.

```python
# temperature-listener.py

import sys
from subprocess import Popen, PIPE

temperatures = []  # store temperatures
sensor = Popen(['node', 'sensor.js'], stdout=PIPE)
buffer = b''
while True:

    # read sensor data one char at a time
    out = sensor.stdout.read(1)

    # after a full reading..
    if out == b'\n':
        temperatures.append(float(buffer))
        print(temperatures)
        buffer = b''
    else:
        buffer += out  # append to buffer
```

You can run `node temperature-listener.js` or `python temperature-listener.py` and the result will be the same. The array of temperatures will grow as new data arrives, and our debug log line will result in the following output.

```js
[ 3.8075910850643098 ]
[ 3.8075910850643098, -1.5015912681923482 ]
[ 3.8075910850643098, -1.5015912681923482, 11.97817663641078 ]
```

We've seen two different ways of communicating between Python and JavaScript but if either of these aren't for you — don't fret! There are many ways to pass data between these two languages. Not limited to: [named pipes](https://en.wikipedia.org/wiki/Named_pipe), TCP sockets, WebSockets, and file polling.
