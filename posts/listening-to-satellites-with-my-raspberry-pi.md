---
title: "Listening to Satellites with my Raspberry Pi"
date: "2021-05-30"
tags: ["python"]
description: "Building a live dashboard with the help of a few hardware modules."
---

- [Architecture](#architecture)
- [GPS module](#gps-module)
- [Printer module](#printer-module)
- [AM2302 module](#am2302-module)
- [Home module](#home-module)
- [Developer experience and testing](#developer-experience-and-testing)

<br>

I became interested in high precision GPS time after listening to a podcast about network clock synchronization on [Signals & Threads](https://signalsandthreads.com/clock-synchronization/). My original goal was to setup a local NTP time server that I could sync all my devices to. However, I got sidetracked along the way – and this is the story of my Raspberry Pi home dashboard.

For Christmas, I received a GPS receiver for my Raspberry Pi. It ended up in the box with the rest of my sensors, add-ons, and screens I've bought for my Pi. It was a sad box. I decided enough was enough and that I wanted to hook them all up at once. So I built a dashboard with a module system so I can add and remove sensors and functionality as time goes on. The code is [open source](https://github.com/healeycodes/pi) and has a Windows 98 theme powered by [98.css](https://github.com/jdan/98.css/). It currently has:

- A list of the visible GPS satellites (GT-U7 receiver)
- The live temperature and humidity of my living room (AM2302 sensor)
- A printer that prints out messages sent from mutuals (POS58 receipt printer)

![The home page of the dashboard displaying all three live modules.](dashboard-preview.png)

## Architecture

The dashboard is part of a mono repository that also contains the client code which runs on the Pi. The Pi spawns a thread for each module which polls the relevant sensor and sends the result to the server. The printer module is a special case in that it also fetches messages from the server and sends a confirmation as they are printed. The other modules just fling data up.

There are two config files (client and server) that allow modules to be toggled on and off so that you don't need my exact hardware setup. This also means that more than one Pi can be part of the same system. 

The client entry point `poller.py` is called when the Pi starts up (via a line in `/etc/rc.local`) and runs in the background. It takes two arguments – the server address and the password that each request sends.

![Architecture diagram of the three Raspberry Pi modules communicating with a Flask application on Heroku connected to a PostgreSQL database also on Heroku.](pi-architecture.png)

The server is hosted on a Heroku dyno and automatically deploys on commit. It's a Flask application backed by a PostgreSQL database (provisioned by Heroku). During local development, and when running the server tests, SQLite is used for developer convenience. While working on this project, I learned about [PEP 249](https://www.python.org/dev/peps/pep-0249/) (the Python Database API Specification) which is the reason my database code is portable between the two libraries I use – `sqlite` and `psycopg2`.

I'll break down for you what each module does.

## GPS module

In 2020, the U.S. government spent $1.71 billion maintaining the core Global Positioning System (GPS) program. The space segment consists of a nominal constellation of 24 satellites. These satellites transmit a one-way signal which a GPS device receives. A signal from four satellites is usually required to solve the geometric equations that provide your 3D position, speed, and the current time.

The government commits to broadcasting the GPS signal in space with:

- A global average user range error (URE) of ≤7.8 m (25.6 ft.), with 95% probability.
- A global average user range rate error (URRE) of ≤0.006 m/sec over any 3-second interval, with 95% probability.
- Distributed UTC time as maintained by the U.S. Naval Observatory (USNO) via the GPS signal in space with a time transfer accuracy relative to UTC(USNO) of ≤40 nanoseconds (billionths of a second), 95% of the time.

Here is my receiver which cost single-digit dollars.

![Holding my GT-U7.](gt-u7.jpeg)

There was a particular joy when I saw the database had been filled with a record of each of the 31 live GPS satellites (I had to wait for one earth rotation to catch 'em all). About 8-10 are visible at any one point. The satellites identify themselves by transmitting a pseudo-random noise (PRN) sequence along with the rest of their information. I use this to look up a mapping which transforms this two digit code into a name – like _USA-293_ aka _Magellan_, or _USA-132_ (which has been in service for 23 years). Until I looked into the data my GPS receiver was giving me I lived in a world where GPS was an abstraction – a blue circle on my phone showing my position on a map. Now I know the launch stories and how these satellites have been maintained.

To get a mapping of PRN -> satellite name I scraped the Wikipedia [List of GPS satellites](https://en.wikipedia.org/wiki/List_of_GPS_satellites). I later learned that a more accurate way to get a mapping is to check the USCG NAVCEN's [Constellation Status](https://www.navcen.uscg.gov/?Do=constellationStatus) page which is updated daily. From there, you can map a PRN to a unique space vehicle number (SVN). This mapping is necessary because PRNs change as satellites are retired and new ones are launched. It's also possible for a satellite to use different PRNs over its lifetime, like [the case of SVN 049](https://en.wikipedia.org/wiki/List_of_GPS_satellites#PRN_to_SVN_history) using PRNs 01, 24, 27, and 30.

My GT-U7 receiver uses the [NMEA 0183](https://gpsd.gitlab.io/gpsd/NMEA.html#_nmea_encoding_conventions) protocol (sometimes called NMEA sentences). By the way, that previous link goes to a 14k word article(!) so I was glad that I could abstract all of this away by using [gpsd](https://gpsd.gitlab.io/gpsd/), a GPS service daemon. The closest I came to interacting with NMEA sentences was to `cat` my device to check that it was alive.

`gpsd` has client libraries in C, C++, and Python. The [documentation](https://gpsd.gitlab.io/gpsd/client-howto.html) is top tier as well. [gpsmon](https://gpsd.gitlab.io/gpsd/gpsmon.html), a real-time GPS packet monitor and control utility, also impressed me with its slick graphical CLI.

While researching all this, I went down a bit of a rabbit hole reading about the way GPS service interruptions are announced. NAVCEN post a list of areas and times where GPS TT&E (testing, training activities, and exercises) are planned to occur. Both ahead of time, and during the GPS interference, [it's possible to alert NAVCEN](https://www.navcen.uscg.gov/?pageName=gpsServiceInterruptions) (or the FAA) to petition for the interference to be cancelled if there is a safety-of-life/safety-of-flight issue.

> Due to the fact that these training and testing activities can involve a number of aircraft, ships and/or other military equipment and up to hundreds of personnel, cancellation or postponement of a coordinated test should only occur under compelling circumstances. In general, only safety-of-life/safety-of-flight issues will warrant cancellation or postponement of an approved, coordinated GPS test.

Since the areas are mostly military zones, unless you're an unlucky firefighter this information can probably be discarded.

## Printer module

I used my POS58 receipt printer in a previous project where I printed out my twitter feed as new tweets arrived. I'm still porting around and editing the same slim library originally written by Vince Patron (who works at Brain Corp and who doesn't have a public email so I can thank him!) so setting up the printer module was pretty plug n' play.

![My tweets being printed live.](printer-in-action.gif)

My friend has a POS58 receipt printer as well and we ping each other messages. These printers are quite hardy – not too many moving parts and thermal paper is cheap. When enabled, the printer module makes a form page available at `/printer`. It's also 98-styled and polls an endpoint until the Pi pings the server and confirms that the message has been printed (on the ever growing strip of paper in the corner of my living room).

![The confirmation page after a message is submitted.](printer-confirm.png)

A more human-readable timestamp is a TODO and also a good first issue!

## AM2302 module

The AM2302 temperature and humidity sensor is the Hello World of Pi sensors. I use the deprecated library [adafruit/Adafruit\_Python\_DHT](https://github.com/adafruit/Adafruit_Python_DHT) because I've worked with it before. Since Linux can't guarantee the timing of calls to the sensor, you can sometimes get a null result when using it. I correct for this by not reporting empty results to the server.

I've found the accuracy of the two AM2302 sensors I've used to be quite good. On par with the other household sensors I have around. And if you're buying someone a Raspberry Pi as a gift, I recommend bundling this sensor along with it so the Pi is more than just a small computer you can SSH into.

## Home module

The home module conditionally renders the other module sections when a user visits the dashboard. The styling of the dashboard is provided by [@jdan](https://twitter.com/jdan)'s [98.css](https://jdan.github.io/98.css/). The other modules make a HTTP API available and the home page data is pulled in as the page loads. I didn't want to include a build step for the JavaScript (and there's only about 60 lines of non-library code) so I just wrote plain ES6. The one larger-than-necessary dependency I pulled in was moment.js which provides the relative-time-in-human-language feature of `a few seconds ago`, `an hour ago`, etc. I'm looking to remove this library ASAP because for my use-case I'm trading a 18.2kb cost for what is effectively sentence generation. Apart from the printer confirmation, which needs to be AJAX (unless I let the page hang perhaps?), this could all be server-side rendered. However, I wanted to leave open the option of a live updating dashboard so I setup HTTP APIs from the start.

## Developer experience and testing

I like to write, and use, software with very little setup. So it was important that the local database was SQLite instead of PostgreSQL. Another step I took was to not include migrations as part of this project. There's a single schema and it's applied when you instantiate a database connection.

Deploying the server to Heroku should take ~one minute. The only configuration steps are toggling which modules that should be enabled, setting a password in the configuration variables, and adding a PostgreSQL database.

For development, you run the following commands to boot up the Flask app on a UNIX-like OS.

```bash
git pull https://github.com/healeycodes/pi
cd server
pip install -r requirements.txt
export FLASK_APP=wsgi:app ;python3.9 -m flask run
```

GitHub Actions is used for CI and there are some end to end tests that cover all of the server modules.

The client code is the similar to the server; pull, install, and run. It uses the Python 3 version that comes with the latest Raspbian (v10). However, unlike with Flask's debug mode, there isn't auto-reloading. And in a lot of cases I found myself `sudo reboot`ing after every code change because the GPS device would get 'stuck' for lack of a better word.

I think that's the main thing I'll investigate for future projects that run on my own hardware. How to better manage the deploys and how to get logs in a browser.

Star/fork/complain about my architecture choices in the issue tracker at [healeycodes/pi](https://github.com/healeycodes/pi)!
