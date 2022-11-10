---
title:  "Cloning Memcached with Go"
date:   "2019-10-21"
tags: ["go"]
path: "go/tutorial/beginners/showdev/2019/10/21/cloning-memcached-with-go.html"
description: "I'm really starting to enjoy Go."
---

My [first program](https://github.com/healeycodes/conways-game-of-life) in Go was Conway's Game of Life. This time I made an [in-memory HTTP caching server](https://github.com/healeycodes/in-memory-cache-over-http) with similar methods to Memcached like increment/decrement and append/prepend.

I use caching pretty often but I had never coded up a Least Recently Used (LRU) cache by hand before. Neither had I used Go's `net/http` or `container/list` packages. Both packages are elegant and have great documentation and readable source code — the latter being one of my favorite things about Go.

With my first program, I threw everything in a file called `main.go` and called it a day. This time I created two packages.

- api — an HTTP server which responds to GET requests like `/set?key=name&value=Andrew&expire=1571577784` and `/get?key=name`.
- cache — an LRU cache that allows an expire time and a max number of keys.

## Caching

As an LRU cache fills up and needs to forget an item it will choose the one that was _last accessed_ the _longest time ago_. It also allows lookups in constant time. To build mine, I mapped strings to doubly linked list elements.

```go
// Store contains an LRU Cache
type Store struct {
	mutex *sync.Mutex
	store map[string]*list.Element
	ll    *list.List
	max   int // Zero for unlimited
}
```

Each list element is a Node. We also store the key inside the Node so that when the cache fills up, we can do a reverse lookup from the back of the list to remove that item from the map.

```go
// Node maps a value to a key
type Node struct {
	key     string
	value   string
	expire  int  // Unix time
}
```

The `mutex` field of the Store allows the cache to avoid having concurrent readers and writers to the data structures. The default behavior of `net/http` is to spawn a goroutine for every request. In [some cases](https://groups.google.com/forum/#!msg/golang-nuts/HpLWnGTp-n8/hyUYmnWJqiQJ) it appears to be okay to have multiple concurrent map readers but I played it safe and every cache operation is guarded by a mutex.

In a previous version of this article, I exported the mutex from the cache and locked/unlocked in the API's middleware. However, this meant that the application may be bottlenecked by HTTP read/write speeds (a friendly commentator pointed this out). Instead of changing where the middleware locked/unlocked to avoid the read/write limitation, I chose to hide the mutex inside the cache to make the application safer for future maintainers while also gaining the performance boost.

There is not much in the middleware right now apart from some basic logging that helps during development. Having an overall middleware usually cuts down on duplicate code.

```go
// Middleware
func handle(f func(http.ResponseWriter, *http.Request)) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		if getEnv("APP_ENV", "") != "production" {
			fmt.Println(time.Now(), r.URL)
		}
		f(w, r)
	}
}
```

## Give key, get value

In Go, the HTTP protocol is a first-class citizen. Clients and servers are simple (and extensible). Writing the `/get` method for my server uses six lines.

```go
// Get a key from the store
// Status code: 200 if present, else 404
// e.g. ?key=foo
func Get(w http.ResponseWriter, r *http.Request) {
	value, exist := s.Get(r.URL.Query().Get("key"))
	if !exist {
		http.Error(w, "", 404)
		return
	}
	w.Header().Set("content-type", "text/plain")
	w.Write([]byte(value))
}
```

The cache method that maps to this route is more complex. It looks for a key in the map and checks that it is valid (not expired or due for cleanup). It returns `(string, bool)` — (the value or an empty string, true if the value was found). If a string is found, its Node is moved to the front of the list because it is now the most recently accessed.

If the key is expired then it's passed to the delete method which will remove the key from the map and the Node will be passed to the garbage collector.

```go
// Get a key
func (s *Store) Get(key string) (string, bool) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	current, exist := s.store[key]
	if exist {
		expire := int64(current.Value.(*Node).expire)
		if expire == 0 || expire > time.Now().Unix() {
			s.ll.MoveToFront(current)
			return current.Value.(*Node).value, true
		}
	}
	return "", false
}
```

I've been reaching for `defer` in my other programming languages recently. It helps one better manage the lifetime of objects. It's explained in a Go [blog post](https://blog.golang.org/defer-panic-and-recover).

> Defer statements allow us to think about closing each file right after opening it, guaranteeing that, regardless of the number of return statements in the function, the files will be closed.

The syntax `current.Value.(*Node).value` performs a type assertion on the list element providing access to the underlying Node pointer. If it's the wrong type, this will trigger a panic. Type assertions can also return two values if requested, the second being a boolean whether the assertion succeeded: `value, ok := current.Value.(*Node).value`. 

## Insert into cache

Putting something into the cache means either creating a new Node at the front of the list or updating the details of a pre-existing Node and moving that to the front of the list. If we go over the maximum number of keys then we delete the Node with the oldest last-accessed time.

The expire parameter is optional.

```go
// Set a key
func (s *Store) Set(key string, value string, expire int) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.set(key, value, expire)
}

// Internal set
func (s *Store) set(key string, value string, expire int) {
	current, exist := s.store[key]
	if exist != true {
		s.store[key] = s.ll.PushFront(&Node{
			key:    key,
			value:  value,
			expire: expire,
		})
		if s.max != 0 && s.ll.Len() > s.max {
			s.delete(s.ll.Remove(s.ll.Back()).(*Node).key)
		}
		return
	}
	current.Value.(*Node).value = value
	current.Value.(*Node).expire = expire
	s.ll.MoveToFront(current)
}
```

Since many other cache methods require 'set' and 'delete' functionality, there are internal `set` and `delete` methods to avoid duplication of code. Terminology note: a method is a function on an instance of an object.

When removing all keys from the cache we can lean on the garbage collector to do the hard stuff for us by removing all existing references to the objects.

```go
// Flush all keys
func (s *Store) Flush() {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.store = make(map[string]*list.Element)
	s.ll = list.New()
}
```

The full list of methods is Set, Get, Delete, CheckAndSet, Increment, Decrement, Append, Prepend, Flush, and Stats.

<br>

This project took me two Sunday mornings and I continue to warm towards Go. It's not as terse as other languages but remains understandable. It tends to lead to vertical code as opposed to horizontal code which also aids readability. It also brings all of the benefits of a static language without requiring a lot of boilerplate.

So far, I've had a great 'Google experience' alongside my Go programming. Looking up solutions normally leads to a sensible and well-explained answer. When I'm heading in the wrong direction, I normally find out after searching rather than running into problems further down the line. But perhaps this is because the language is quite new and there are fewer results for the incorrect version!

Check out the code on [GitHub](https://github.com/healeycodes/in-memory-cache-over-http).
