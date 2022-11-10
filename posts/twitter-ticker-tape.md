---
title: "Twitter Ticker Tape with a POS58 Receipt Printer"
date: "2020-04-10"
tags: ["python"]
description: "Building a fun toy with my Raspberry Pi, Python, and Tweepy."
---

Screens tend to keep me awake in the evening so I wondered if I could print out my Twitter home timeline, live, as I read a book in the evening.

Here's the final project in action:

![Ticket tape in action, a receipt printer printing out textual tweets](in-action.gif)

I was gifted a receipt printer for Christmas to use with my Raspberry Pi. A _POS58 USB Thermal Receipt Printer_ also known as a _ZJ-5890K_. It's sold by a few different brands under different names.

I couldn't get the drivers to work on Linux, MacOS, or Windows. I was stuck until I found [vpatron/usb\_receipt\_printer](https://github.com/vpatron/usb_receipt_printer) — a guide that walks through setting the device up on a Raspberry Pi. It shows how to write to the USB port directly (a tactic I previously tried and failed). The included demo program solved all of my printing problems. Thanks Vince Patron!

## Tweepy

Twitter has a powerful API but it's a little cryptic at first glance. Tweepy is a Python library for accessing the Twitter API — it has good documentation and community support.

In order to use Tweepy, we need to create an application on Twitter's Developer platform to get the keys and tokens we need to authenticate.

![Keys, secret keys and access token management page](keys-and-tokens.png)

We will have three files in total.

- `config.py` — for managing our keys.
- `poller.py` — for polling Twitter's API via Tweepy, and converting tweets to text.
- `posprint.py` — for calling the receipt printer.

We save the keys in a separate file. A better way of managing keys is for your application to access them at runtime through [environment values](https://en.wikipedia.org/wiki/Environment_variable). This can be safer (it avoids keys accidentally being pushed to GitHub) and lets our application use different keys in different environments (e.g. local versus live production deployment).

```python
# config.py

consumer_key = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
consumer_secret = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
access_token = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
access_token_secret = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
```

Twitter has a streaming data API but it was harder to set up than the chosen solution.

We ask for the latest 20 tweets every minute and check that we haven't seen them before. Then we format, clean, and print the new ones.

```python
# poller.py

import tweepy
from emoji import demojize
from time import sleep
from collections import OrderedDict

import config
import posprint

auth = tweepy.OAuthHandler(
    config.consumer_key,
    config.consumer_secret
)
auth.set_access_token(
    config.access_token,
    config.access_token_secret
)

api = tweepy.API(auth)

# we use an ordered dictionary so we can remove old tweets
# from the data structure. Our program may be long-running
# and we don't want to run out of memory
seen_statuses = OrderedDict()

while True:
    public_tweets = api.home_timeline(tweet_mode='extended')
    for status in public_tweets:

        # we're interested in statuses we haven't seen before
        if status.id not in seen_statuses:

            # store the statuses we use
            seen_statuses[status.id] = status

            # dump old statuses that can't appear again
            if len(seen_statuses) > 20:
                seen_statuses.popitem()

            user = status.user.screen_name + ':\n'

            # get the full tweet text regardless of type
            # https://github.com/tweepy/tweepy/issues/935
            if hasattr(status, 'retweeted_status'):
                tweet = user + status.retweeted_status.full_text
            else:
                tweet = user + status.full_text

            # trim unprintable characters that POS58 can't output
            # by turning emojis into textual representation.
            # 😅 becomes :grinning_face_with_sweat:
            tweet = demojize(tweet).encode(
                encoding='ascii',
                # throwaway non ascii characters
                errors='ignore'
            ).decode()

            posprint.output(tweet)

    # twitter restricts statuses/home_timeline to once per minute
    sleep(65)
```

Let's modify Vince's demo program [vpatron/usb\_receipt\_printer](https://github.com/vpatron/usb_receipt_printer) to export the function we call above — `posprint.output(tweet)` — with our textual tweet.

```python
# posprint.py

import usb.core
import usb.util
import textwrap

"""Demo program to print to the POS58 USB thermal receipt printer. This is
labeled under different companies, but is made by Zijiang. See
http://zijiang.com

MIT License — Copyright (c) 2019 Vince Patron
"""

# In Linux, you must:
#
# 1) Add your user to the Linux group "lp" (line printer), otherwise you will
#    get a user permissions error when trying to print.
#
# 2) Add a udev rule to allow all users to use this USB device, otherwise you
#    will get a permissions error also. Example:
#
#    In /etc/udev/rules.d create a file ending in .rules, such as
#    33-receipt-printer.rules with the contents:
#
#   # Set permissions to let anyone use the thermal receipt printer
#   SUBSYSTEM=="usb", ATTR{idVendor}=="0416", ATTR{idProduct}=="5011", MODE="666"

def output(data):
    # find our device
    # 0416:5011 is POS58 USB thermal receipt printer
    dev = usb.core.find(idVendor=0x0416, idProduct=0x5011)

    # was it found?
    if dev is None:
        raise ValueError('Device not found')

    # disconnect it from kernel
    needs_reattach = False
    if dev.is_kernel_driver_active(0):
        needs_reattach = True
        dev.detach_kernel_driver(0)

    # set the active configuration. With no arguments, the first
    # configuration will be the active one
    dev.set_configuration()

    # get an endpoint instance
    cfg = dev.get_active_configuration()
    intf = cfg[(0,0)]

    ep = usb.util.find_descriptor(
        intf,
        # match the first OUT endpoint
        custom_match = \
        lambda e: \
            usb.util.endpoint_direction(e.bEndpointAddress) == \
            usb.util.ENDPOINT_OUT)

    assert ep is not None

    # print!
    lines = textwrap.wrap(data, width=30)
    for line in lines:
        ep.write(line + '\n')
    ep.write('\n\n\n\n')

    # reattach if it was attached originally
    dev.reset()
    if needs_reattach:
        dev.attach_kernel_driver(0)
        print('Reattached USB device to kernel driver')
```

Our program is started by running `poller.py`.

If everything went correctly, our POS58 printer should output tweets as they arrive in the following width-restricted format which avoids breaking words where possible.

```text
jessfraz: Ive started using
Pocket to keep articles I want
to read later and also
combined it with a bot to read
RSS feeds. Its alright so far.
What are some tools like this
you cant live without?
```

Find the project files on [GitHub](https://github.com/healeycodes/twitter-ticker-tape). Thanks again to [Vince Patron](https://github.com/vpatron) for his comprehensive guide!
