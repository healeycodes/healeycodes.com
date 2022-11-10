---
title:  "An Introduction to Caching on the Web, With Examples in Python"
date:   "2019-07-07"
tags: ["python"]
path: "webdev/python/beginners/tutorial/2019/07/07/introduction-to-caching-with-python.html"
description: "A high-level overview of caching."
---

## What's a cache?

A cache stores data so that future requests can receive it faster. Generating a component or view in a dynamic web application can be costly — especially when database calls are involved. Saving the computed result to a cache means that serving the next request for the same data will be much more efficient.

Web applications can use a cache running on the same web server, a remote cache, or a distributed system. Cloud service companies offer APIs for highly scalable distributed caching. In simple, single-threaded applications you could even use an object as a cache! I've seen this used in tiny Node.js services.

## Okay, give me an example

You may have heard of Memcached or Redis. They both allow key/value storage as well as storing data in other data-structures. Here's a high-level example of cache usage. Let's say our web application receives a request at `/books/312` where 312 is the id of a book entity. We want to return a dynamic page with details about this book and perhaps some reviews that people have left for the book.

In pseudocode, applying a cache to this situation looks like this:

```text
do we have key '/books/312' in our cache?
if so:
    return that value as a response
else:
    generate a page
    store page in cache at '/books/321/'
    return page as a response
```

In this example, getting the details of book 321 involves a call to our database. Grabbing recent reviews may involve a separate database call too. We then might generate the page through a server-side template. All of this computation can be avoided when a user visits the same page soon after this original request.

Database calls should be avoided when we can find the correct information in a different way. Local caches operate with sub-millisecond response time. Caches also remove the last used item when they fill up. Overall, they're pretty hardy but setting a sensible timeout value is important.

Memcached can be deployed using distributed servers that don't communicate with each other. Only the client (our web app) knows about the cache servers. Much like a hash table operates, a key is hashed and a server is chosen to get/set the key.

Here's a high-level example of that:


```text
call a hash function on 'books/321'
turn the hashed value into an index
check the corresponding cache server
get or set 'books/321/' from this server
```

The amount of cache servers that the web app knows about is unlimited. It scales horizontally — which means more servers can be added to deal with higher loads.

Here are some issues you might face when using a caching system:

- Users receive old data
- Caches fill up too fast
- Requests are too unique to be cached
- Race conditions

## A race condition?

Here's an example of a race condition involving a cache. We want to display an old school hit counter on our website. When a user requests the page, we'll check what the current hit count is, increase it by one, and overwrite the key.

Ideally, it works like this:

```text
get 'hit_count' from cache
increase by one
save new 'hit_count' to cache
```

If our web app is multithreaded or distributed in some way, the cache can be hit twice at the same time. Both server instances increase the hit count they receive back from the cache. Both server instances then save that value back. From the cache's perspective, a key is requested twice and then saved twice. Both instances of the web app request the current hit value, `10`, add one so that they both have `11` and then they save that to the cache. The true hit count is `12` and some data has been lost!

This problem is actually solved by Memcached which offers increment and decrement functions. For more complex situations where an atomic operation is required, Memcached has a Compare-And-Set feature. Where you use a retry-loop attempting to perform an operation without losing any data along the way.

Here's a [great blog post](http://neopythonic.blogspot.com/2011/08/compare-and-set-in-memcache.html) covering CAS in more detail.

## Give me examples in code

Let's take a look at some examples of this in real code. We'll be using Flask and Django, the most popular Python web frameworks. Both come with robust out-of-the-box solutions.

Flask is built on Werkzeug which means we can use APIs from `werkzeug.contrib.cache` without including any extra modules. Flask has a page on caching patterns [right here](http://flask.pocoo.org/docs/1.0/patterns/caching/).

Here's some code from a prototype app I wrote recently with added comments

```python
# SimpleCache is a dev tool and is not threadsafe
# but it's very easy to swap in MemcachedCache or GAEMemcachedCache
from werkzeug.contrib.cache import SimpleCache

def create_app():
    app = Flask(__name__)
    # this line could be `cache = MemcachedCache(['127.0.0.1:11211'])`
    cache = SimpleCache()

    @app.route('/nearby/<postcode>/<radius>')
    def nearby_stores(postcode, radius):
        # have we performed this calculation for these arguments?
        if cache.get('{}{}'.format(postcode, radius)) is not None:
            return cache.get('{}{}'.format(postcode, radius))

        # otherwise do some calculations
        # ..

        # store for next time we run with these arguments
        cache.set('{}{}'.format(postcode, radius), jsonified)
        return jsonified
```

A cache check in this app can save processing, a database call, and one third party request! However, using a cache module from Werkzeug does add some unnecessary lines that an extension like `Flask-Cache` gets rid of. Instead of manually checking the cache and setting the cache, we can use a decorator which uses `request.path` (which is configurable).

So the start of that function would look like this:

```python
    @app.route('/nearby/<postcode>/<radius>')
    @cache.cached(timeout=120)
    def nearby_stores(postcode, radius):
```

# What about Django?

Like Flask, Django has a [fantastic page](https://docs.djangoproject.com/en/2.2/topics/cache/) on setting up caching for your application. Its cache framework is very similar to the cases we've just seen. The largest difference will be the initial configuration. Django can also save your cached data in the database you're using. The configuration is more mature than Flask as well.

Here's an example from their docs:

```python
from django.views.decorators.cache import cache_page

@cache_page(60 * 15)
def my_view(request):
```

# The hardest part

Structuring your application and figuring out which computations can be saved and used at a later time is the hardest part! Caching web requests for simple web applications is a fairly solved problem. How you wield your caching sword is up to you.