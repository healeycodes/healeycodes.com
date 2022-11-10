---
title: "Privacy Focused Analytics From Scratch"
date: "2020-08-10"
tags: ["python"]
description: "Learning more about user data collection by writing my own analytics system."
---

I wanted to learn more about web analytics so I budgeted myself a few hours and built a toy analytics system.

The goal was to collect information about page views in a _privacy focused_ manner so that no GDPR notice is required. With that in mind, I made these decisions:

- Events on a website aren't attributed to a particular user (no reading or setting cookies)
- No personally-identifying information is stored on disk

The system should be able to be used on a third-party host (e.g. GitHub Pages) and the alterations to an existing codebase should be minimal i.e. including a HTML snippet. The web server that captures the tracking requests can be hosted on anything that runs Flask.

The following analytics should be available:

- What pages users visit
- Where users are referred from
- What browsers and screen sizes are used

## Tracking Pixels

A page view can be captured by sending a request to the analytics server. This happens when a browser loads an image. By including an 1x1 transparent image (a tracking pixel) we can initiate this request.

I implemented two methods, one that works with JavaScript enabled and one that works without.

- Dynamically add an `<img>` element with the data encoded in the search parameters of the URL
- (In the case of no JavaScript) Render an `<img>` element with the path and title in the search parameters of the URL

They are toggled by the `<script>`/`<noscript>` pattern.

We'll get some data from the search parameters and the rest from the request's headers. Here's the HTML snippet that includes both methods.

```html
<script>
  // The tracking pixel path can be hosted anywhere
  // but here it's located on the same host for the test page
  const website = document.location.protocol + "//" + document.location.host
  const url = new URL(website + "/pixel.gif")

  // '/'
  url.searchParams.append("path", location.pathname)

  // 'Analytics Test Page'
  url.searchParams.append("title", document.title)

  // 'https://www.google.com'
  url.searchParams.append("referrer", document.referrer)

  // '320,568'
  url.searchParams.append(
    "resolution",
    window.screen.width + "," + window.screen.height
  )

  const img = document.createElement("img")
  img.src = url
  // When the element exists in the DOM, the request is made
  document.body.appendChild(img)
</script>
<noscript>
  <!-- Without JavaScript, less information is available to be sent
  e.g. just the path and title, set via static template logic -->
  <img src="/pixel.gif?path=%2F&title=Analytics%20Test%20Page" />
</noscript>
```

When the user's browser has JavaScript disabled there is far less information available. For either solution, the user's country and their browser information can be captured on the analytics server.

## Serving The GIF

Let's start with a Flask application that serves a tracking pixel.

```python
# analytics.py

import base64
from flask import Flask, Response
app = Flask(__name__)


@app.route("/")
def index():
    # serve the HTML snippet for testing
    return render_template("index.html")


@app.route('/pixel.gif')
def pixel():
    # transparent 1x1 GIF, 43 bytes
    gif = base64.b64decode(
        'R0lGODlhAQABAIAAAP8AAP8AACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==')
    return Response(gif, mimetype="image/gif")
```

This can be run by exporting the `FLASK_APP` variable:

```bash
#!/usr/bin/env bash
export FLASK_APP=analytics.py
flask run
```

The first time I loaded the test page, I ran into a `net::ERR_BLOCKED_BY_CLIENT` error in the console. My tracking pixel was blocked by my own ad blocker. Perhaps it's allergic to 1x1 images.

After toggling my ad blocker, the Flask logs showed that the information we want is being sent, and also that we responded with a 200 status code.

```bash
"GET /pixel.gif?path=%2F&title=Analytics%20Test%20Page&referrer=&resolution=1920%2C1080 HTTP/1.1" 200 -
```

By using the search parameters object, URL encoding (also known as percent-encoding) was used automatically. For example, `%2F` decodes to `/`. You can read more about the reasoning behind this type of encoding in the [URI Generic Syntax](https://tools.ietf.org/html/std66#page-12) RFC.

> A percent-encoded octet is encoded as a character triplet, consisting of the percent character "%" followed by the two hexadecimal digits representing that octet's numeric value. For example, "%20" is the percent-encoding for the binary octet "00100000" (ABNF: %x20), which in US-ASCII corresponds to the space character (SP).

## Anonymizing User Data

Depending on how your application is deployed you may have a reverse-proxy server before the request reaches Flask. So `request.remote_addr` might describe a local address. The reverse-proxy server will usually add the user's IP address to the `X-Forwarded-For` header. We can check for that with a fallback to `request.remote_addr`.

```python
ip = request.headers.get('X-Forwarded-For', request.remote_addr)
user_agent = request.user_agent.string
```

The `User-Agent` header describes the device. For Chrome it looks something like this: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36`. Some mobiles also add the firmware version. We don't want to keep this, or an IP address, on file because both pieces can be identifiable information which would require a GDPR notice.

Rather than keeping the exact `User-Agent` we can strip away the information that's most important to us — browser and major version.

```python
# 'chrome 84'
user_agent = request.user_agent.browser + ' ' + \
    request.user_agent.version.split('.')[0]
```

Converting an IP address to a country is a little harder. A simple solution is to use a free geolocation API but shipping IP addresses to a third-party service isn't exactly privacy focused. I found [GeoIP2-python](https://github.com/maxmind/GeoIP2-python), a package that can be combined with a free [GeoLite2 country database](https://dev.maxmind.com/geoip/geoip2/geolite2/). With this method, the geolocation happens without any user data leaving our server.

After downloading the database, the package can be used to get a country from an IP:

```python
import geoip2.database
# this is expensive, so use this for multiple requests
reader = geoip2.database.Reader('./GeoLite2-Country.mmdb')
country = ''
try:
    response = reader.country('127.0.0.1')
    country = response.country.name
except geoip2.errors.AddressNotFoundError:
    pass
```

We could also check for [Accept-Language](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language) via `request.accept_languages`.

The rest of the page view information comes from the search parameters and we use default values to handle the case where JavaScript isn't enabled and less information is sent.

```python
timestamp = int(time.time())
path = request.args.get('path', '')
title = request.args.get('title', '')
referrer = request.args.get('referrer', '')
width = request.args.get('resolution', ['']).pop(0)
height = request.args.get('resolution', ['']).pop()
```

## Storing Page Views

I used `sqlite3` from the standard library to save and load this data. Normally, I'd use SQLAlchemy but for this experiment I only need two functions (save/load) and I don't think I'll be extending it.

I need to be able to:

- Store the tracking information for a page view
- Retrieve tracking information for a slice of time

For tiny prototypes like this, a pattern I sometimes use is checking if the table exists whenever the module is imported. This aggressive check makes it easier to share this code without thinking about the database setup. The database file either exists or will be created.

```python
# db.py

import sys
import sqlite3
DB = 'analytics.db'

conn = sqlite3.connect(DB)
c = conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS data (
    id INTEGER PRIMARY KEY,
    timestamp INTEGER,
    path TEXT,
    title TEXT,
    referrer TEXT,
    country TEXT,
    device TEXT,
    width INTEGER,
    height INTEGER
    )''')
conn.commit()
conn.close()


def save(timestamp=0, path='', title='', referrer='', country='', device='', width=0, height=0):
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    statement = '''INSERT INTO data (
        timestamp,
        path,
        title,
        referrer,
        country,
        device,
        width,
        height
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'''
    c.execute(statement, [timestamp, path, title,
                          referrer, country, device, width, height])
    conn.commit()
    conn.close()


def load(start=0, end=sys.maxsize):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute(
        '''SELECT * FROM data WHERE timestamp >= ? and timestamp < ?''', [start, end])
    result = [dict(row) for row in c.fetchall()]
    conn.close()
    return result
```

Here's the final tracking pixel view that saves all the data we have access to using the `save` function from above.

```python
@app.route('/pixel.gif')
def pixel():
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    country = ''
    try:
        response = reader.country(ip)
        country = response.country.name
    except geoip2.errors.AddressNotFoundError:
        pass
    device = request.user_agent.browser + ' ' + \
        request.user_agent.version.split('.')[0]

    timestamp = int(time.time())
    path = request.args.get('path', '')
    title = request.args.get('title', '')
    referrer = request.args.get('referrer', '')
    width = int(request.args.get('resolution', '').split(',').pop(0))
    height = int(request.args.get('resolution', '').split(',').pop())

    db.save(timestamp=timestamp,
            path=path,
            title=title,
            referrer=referrer,
            country=country,
            device=device,
            width=width,
            height=height)

    gif = base64.b64decode(  # transparent 1x1 GIF, 43 bytes
        'R0lGODlhAQABAIAAAP8AAP8AACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==')
    return Response(gif, mimetype="image/gif")
```

## Displaying User Analytics

It's common to want to view analytics for a given time period like the previous week. So the view that displays user analytics should accept two parameters that define the start time and end time of the slice.

A minimal page should look something like this:

```text
Sun Aug 2 10:32:01 2020 - Sun Aug 9 10:32:01 2020

Paths
('/', 2)

Referrers
('', 2)

Countries
('', 2)

Devices
('safari 13', 2)

Resolutions
('414x736', 2)
```

When no parameters are passed, I chose to load all data from the beginning of time.

The analytics view that accomplishes all of that looks like this. `Counter` from `collections` saves a few lines of code when aggregating page views.

```python
@app.route("/analytics")
def analytics():
    start = int(request.args.get('start', 0))
    end = int(request.args.get('end', time.time()))
    data = db.load(start=start, end=end)
    paths = Counter()
    referrers = Counter()
    countries = Counter()
    devices = Counter()
    resolutions = Counter()
    for page_view in data:
        countries[page_view['country']] += 1
        paths[page_view['path']] += 1
        referrers[page_view['referrer']] += 1
        devices[page_view['device']] += 1
        resolutions['{}x{}'.format(
            page_view['width'], page_view['height'])] += 1
    start_formatted = datetime.fromtimestamp(start).strftime("%c")
    end_formatted = datetime.fromtimestamp(end).strftime("%c")
    return render_template('analytics.html',
                           start=start_formatted,
                           end=end_formatted,
                           paths=paths.most_common(),
                           referrers=referrers.most_common(),
                           countries=countries.most_common(),
                           devices=devices.most_common(),
                           resolutions=resolutions.most_common())
```

The template `analytics.html` renders a page with the `start` and `end` as the title and the properties in table rows.

For the full source code and installation instructions see the [repository on GitHub](https://github.com/healeycodes/privacy-focused-analytics).

## Improvements

Without user sessions, it's impossible to calculate bounce rate and other information about user behavior. To enable user sessions, it needs to be possible to connect together a series of page views. To keep this process GDPR-friendly, one could use a similar method to [GoatCounter](https://github.com/zgoat/goatcounter) (a big influence on this project).

GoatCounter creates a server-side hash by combining the website's ID, a `User-Agent`, an IP address, and a rotating salt. Since the hashing is a one-way operation, this "[identifies] the client without storing any personal information directly."

In GoatCounter's [GDPR notes](https://www.goatcounter.com/gdpr), there are a few aspects of this method worth highlighting.

> It’s prohibitively expensive to retrieve the IP address from the hash.

> It’s true that certain “additional information” from other parties could reveal more – such as correlating the User-Agent and location – but would be hard, and the retrieved data would be limited [...] To determine whether a personal is identifiable “account should be taken of all the means reasonably likely to be used”, and this doesn’t strike me as reasonably likely.

The strongest argument in favor of this approach is:

> If a user (i.e. a customer on your site) would contact me for their rights to have insight in their data and/or have it removed, then I would have no way to reliably do so, even if they would provide me with most of their computer’s information. It might be possible if they provide their browsing history, but if you have full access to all their browsing data then what do you need GoatCounter’s data for?

However, there are privacy implications when using hashed IP addresses, user agents, and similar pieces of data. Read more in [Introduction to the hash function as a personal data pseudonymisation technique](https://edps.europa.eu/data-protection/our-work/publications/papers/introduction-hash-function-personal-data_en) on the European Data Protection Supervisor.

### Granular Interactions

With or without session support, it might also be useful to track click events. These events could be configured manually, or automatically e.g. by attaching an event listener to every button which spawns new tracking pixels.

If further tracking is required, analytics systems tend to have an API that allows for custom events to be defined and captured.

## Further Reading

There are three open source web analytics systems that I drew inspiration from for this article. The best way to learn more about privacy focused analytics is to read their documentation, arguments for their design choices, and their codebases!

- [GoatCounter](https://github.com/zgoat/goatcounter) - [live demo](https://stats.arp242.net/)
- [simple-web-analytics.com](https://github.com/ihucos/simple-web-analytics.com) - [live demo](https://simple-web-analytics.com/app#demo)
- [Fathom Lite](https://github.com/usefathom/fathom) - [live demo](https://app.usefathom.com/share/lsqyv/pjrvs#/?from=2020-08-02%2000%3A00%3A00&site=184&to=2020-08-09%2023%3A59%3A59)
