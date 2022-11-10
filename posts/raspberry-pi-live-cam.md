---
title:  "Coding a Live Cam for the Raspberry Pi in Python (Tutorial)"
date:   "2019-03-18"
tags: ["python"]
path: "python/raspberrypi/beginners/webdev/2019/03/18/raspberry-pi-live-cam.html"
description: "A lo-fi solution for streaming images from your Raspberry Pi to the web."
---


Notice how I said _live cam_ and not _live stream_? It's because we'll be dealing with normal images. Go back about 15 years and this technology was exciting. Live weather cams and nature cams were deadly cool. Image-based live streams are also a little more robust when the connection between our Raspberry Pi and web server can be unreliable (e.g., WiFi).

![My Pi!](my-pi.jpg)


This method can hit around 5-10fps depending on the image resolution. There's a `benchcamera.py` script in the [repository](https://github.com/healeycodes/Raspberry-Pi-Live-Cam) that you can run on your Pi to test. Full installation instructions for this project can also be found in the repo.

Let's work back to front, starting with the web server. The Flask app we'll be coding can be hosted [anywhere](https://www.google.com/search?q=host+flask+app+free). Its job is to receive images from the Pi, store the latest image and serve this image to clients. Temporarily storing this image is the trickiest part of this project. We want our app to be scalable to, say, a few hundred clients. Flask apps are normally hosted via servers like uWSGI or Gunicorn and they handle the load in part by using threads.

A different thread of the app is created for each user. These instances can't share state at the application level. We solve this by storing the image data in a local SQLite database called `global.db`. Dealing with multiple readers and writers is easy for databases. They handle it by using _locks_. This ensures that our Flask app won't ask for an image that is halfway through being written to the database and then send corrupted data to the client.

#### Flask App

```python
# app.py

import os
import sqlite3
from flask import Flask, request, g
app = Flask(__name__)

DATABASE = 'global.db'


# helper method, allows database access within a controller
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
    return db


# create our database structure, which is akin to a dict with one key
def init_db():
    db = sqlite3.connect(DATABASE)
    cur = db.cursor()
    cur.execute('''CREATE TABLE IF NOT EXISTS store
                (id INTEGER PRIMARY KEY, image BLOB)''')
    cur.execute("INSERT OR IGNORE INTO store (id, image) VALUES (1, '')")
    db.commit()
    db.close()


# initialize db
init_db()


# close the database connection after every request ends
@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()
```

When we start our app, we need to make sure that there is a table, and a slot in that table to store images. At the same time, we don't want to overwrite existing images. So we create a table only if it doesn't exist already `CREATE TABLE IF NOT EXISTS` and then we create the one row that we will be using with similar logic `INSERT OR IGNORE`.

The upload controller (also known as a _handler_) exists on the root path and only accepts POST requests. It also checks for an environmental value called `PASSWORD`. (Query parameters are insecure over HTTP but [more secure](https://stackoverflow.com/questions/2629222/are-querystring-parameters-secure-in-https-http-ssl) over HTTPS).

```python
# recieve images and write to db as BLOB if the password is correct
@app.route('/', methods=['POST'])
def update_image():
    db = get_db()
    cur = db.cursor()
    if request.args.get('password') != os.environ['PASSWORD']:
        return '', 400
    else:
        image = [request.data]
        cur.execute(
            "UPDATE store SET image=? WHERE id=1", image)
        db.commit()
        return '', 200
```

We can now receive images! We will only store one image: the latest one. Serving that image to any client that makes a request is straightforward.

```python
# share images naively and let browsers interpret the BLOB as jpeg
@app.route('/live.jpeg')
def get_image():
    cur = get_db().cursor()
    image = cur.execute("SELECT image FROM store WHERE id=1").fetchone()[0]
    return image, 200
```

If we host a link to this image as `<img src="/live.jpeg" />` our clients will see a still picture. The longer they stay on the page, the more out-of-date this image starts to get. They could always refresh to force an update but that's wasteful. A simple solution is to use JavaScript to force a refresh of just the image using `setInterval`. We can use this logic to build a live cam widget. Our test route uses this so we can make sure our images are being received.

```python
# test route that mimics having a live cam
@app.route('/test')
def test_image():
    return '''<img src="/live.jpeg" /><script>setInterval(() =>
        document.querySelector(\'img\').src = \'/live.jpeg?\' + Date.now(), 150)</script>'''
```

We cache-bust to make sure that the browser doesn't think that it already has the image source in its cache. One way to cache-bust is to add a unique query string to the end of a request (that ultimately does nothing) like the current date in milliseconds: `?1552907804662`.

```bash
$ PASSWORD='123'
$ FLASK_APP=app.py flask run
 * Running on http://localhost:5000/
```

For installation and running questions related to Flask, see their [docs](http://flask.pocoo.org/).

#### Raspberry Pi Script

The script that runs on the Pi will capture images and send them via a POST request. We install our modules with `pip install requests picamera`. The script is run via `python camera.py` or `python3 camera.py`.

```python
# camera.py

import io
import time
import requests
import picamera

# change this line to your Flask app's address!
url = 'http://192.168.1.100:5000/?password=123'

framerate = 90
quality = 100
res = (1280, 720)
with picamera.PiCamera(framerate=framerate, resolution=res) as camera:
    time.sleep(2)  # camera warm-up time
    while True:
        try:
            image = io.BytesIO()
            camera.capture(image, 'jpeg', quality=quality, use_video_port=True)
            r = requests.post(url, data=image.getvalue())
            # place a `time.sleep` here if you want a slower live cam
        except:
            time.sleep(5)  # wait for WiFi/server to come back

```

You will probably want to run this as a [startup script](https://www.google.com/search?q=rc.local) for maximum uptime. If there's a network problem, the script will keep attempting to post an image until it gets through. If there's a problem with your Pi, our Flask app will keep serving the latest image it received. Robust!


#### Possible Improvements

Some thoughts to improve the project but make it a worse tutorial.

- Add a listener to SQLite and cache the latest image in memory.
- Upload images via WebSocket (save bandwidth and latency).
- Serve images to clients over WebSocket as they arrive (same as above).
- Use Flask for uploading images, serve images as a static file via HTTP server (scales infinitely).
- When receiving images, scale them to different resolutions (e.g., `/live800x600.jpeg`).

<br>

Reach out, or raise an issue on [GitHub](https://github.com/healeycodes/Raspberry-Pi-Live-Cam), if you're having problems 🛠️.
