---
title: "A Fair, Cancelable Semaphore in Go"
date: "2025-12-21"
tags: ["go"]
description: "Building a fair, cancelable semaphore in Go and the subtle concurrency issues involved."
---

They say that you don't fully understand something unless you can build it from scratch. To wit, my challenge to the more technical readers of this blog is: can you build a semaphore from scratch in your favorite programming language? Bonus points for also handling context cancellation.

I attempted this in Go and it was about 5x harder than I thought it would be. Largely due to concurrency/locking bugs – I assume you'll have an easier time in, say, JavaScript.

A brief reminder: semaphores are tools used in programming to limit how many tasks can run at the same time by controlling access to shared resources.

Here's a quick example of their use-case. Your operating system has limits on the amount of file descriptors that can be open but you didn't know this when you wrote the following program:

```go
g, ctx := errgroup.WithContext(context.Background())

for _, path := range files {
    g.Go(func(p string) error {
        f, err := os.Open(p)
        if err != nil {
            return err
        }
        defer f.Close()

        return processFile(f)
    }(path))
}

if err := g.Wait(); err != nil {
    return err
}
```

When there's a large amount of files, you hit an error like:

```text
panic: open /my/file: too many open files!
```

## Channels

In Go, channels are a built-in concurrency primitive for communicating between goroutines. Which is exactly what we need to do here: the goroutine that's finished using the resource needs to tell one of the goroutines that's waiting that it can start using it.

```go
g, ctx := errgroup.WithContext(context.Background())

// Initialize buffered channel with 10 empty structs
sema := make(chan struct{}, 10) 

for _, path := range files {
    g.Go(func(p string) error {

        // Acquire a semaphore slot (blocks if the buffer is full)
        sema <- struct{}{}
        defer func() {
            <-sema // Release the semaphore slot
        }()

        f, err := os.Open(p)
        if err != nil {
            return err
        }
        defer f.Close()

        return processFile(f)
    }(path))
}
```

This works great as a simple limiter but it's missing two features that I often need in the semaphores I use:

- First In First Out (FIFO) ordering. Requests are served in arrival order, which makes behavior easier to reason about and debug.
- Context cancellation. Waiting or in-progress operations can be aborted when they're no longer needed, preventing wasted work and resource leaks.

Why is the above snippet _not_ FIFO? Multiple goroutines sending to the channel compete with each other. The scheduler decides which send proceeds first, so ordering isn't guaranteed. There's no explicit queue.

Just using a `chan` isn't going to cut it.

## Adding a Queue

Go has a doubly linked list in the standard library that we can use as the queue. This queue will contain the channels that are used to wake up the blocked call to acquire the semaphore.

Trying to acquire a semaphore has one of two immediate outcomes:
- The fast path: there's an available permit and the call returns right away.
- The slow path: there's no permits, and we enqueue a channel and wait.

```text
When there are no available permits, G2 blocks on the Acquire() call
until an earlier goroutine, G1, calls Release().

Time →
────────────────────────────────────────

G2: Acquire() ──── blocks ─────▶ resumes
                     ▲
G1: Release() ───────┘
```

We need four bits of state:
- The maximum number of permits
- The available number of permits
- A queue structure that stores channels
- A lock to protect access to all the above

```go
import (
    "container/list"
    "sync"
)

type Semaphore struct {
    mu      sync.Mutex
    free    int64     // available permits
    max     int64     // maximum permits
    waiters list.List // queue of chan struct{}, closed to wake
}

// NewSemaphore creates a semaphore with n permits.
func NewSemaphore(n int64) *Semaphore {
    return &Semaphore{
        free: n,
        max:  n,
    }
}

// Acquire blocks until a permit is available, then takes it.
func (s *Semaphore) Acquire() {
    s.mu.Lock()

    // Fast path: permit available
    if s.free > 0 {
        s.free--
        s.mu.Unlock()
        return
    }

    // Slow path: enqueue ourselves and wait
    waiter := make(chan struct{})
    s.waiters.PushBack(waiter)
    s.mu.Unlock()

    <-waiter // blocks until Release closes the channel
}

// Release returns a permit. Panics if over-released.
func (s *Semaphore) Release() {
    s.mu.Lock()

    if s.free+1 > s.max {
        s.mu.Unlock()
        panic("semaphore: released more than acquired")
    }
    s.free++

    // Wake the first waiter if any
    if front := s.waiters.Front(); front != nil {
        s.waiters.Remove(front)
        s.free-- // reserve permit for waiter
        s.mu.Unlock()
        close(front.Value.(chan struct{})) // wake waiter (non-blocking)
        return
    }

    s.mu.Unlock()
}
```

I'm pretty happy with this. The only way I think I could use less LOC is by removing the panic on calling `Release()` too many times (then we don't need to track `max`).

The code would be easier to read if the `Acquire()` call reserved its own permit in all cases but I couldn't figure out a way to do this while keeping the FIFO constraint. Some semaphores do allow permit stealing behavior (sometimes called "barging") to increase throughput at the cost of fairness.

## Context Cancellation

Good programs don't keep doing work after it no longer matters. Adding context cancellation lets a blocked operation stop waiting when the surrounding task is canceled or times out, which prevents wasted effort and makes systems easier to reason about and shut down cleanly.

Inside `Acquire()`, when waiting on the signal from a `Release()` call via the channel, we need to race the context being cancelled.

When the context is cancelled, there are two possible outcomes:
- The `Acquire()` call is still queued and it needs to clean its state up (by removing itself from the queue), and then return a context error.
- The `Acquire()` call has already been granted a permit and owns it, and so it needs to release that permit before returning a context error.

In order to tell these cases apart, we need a new bit of data: a `granted` flag that tracks whether a permit has been granted. Which I've wrapped inside this `waiter` struct with the existing channel:

```go
type waiter struct {
    ch      chan struct{}
    granted bool
}
```

`Acquire()` checks `granted` under the lock on cancellation. If we were granted a permit but are canceling anyway, we must release it:

```go
func (s *Semaphore) Acquire(ctx context.Context) error {
    s.mu.Lock()

    // Fast path
    if s.free > 0 {
        s.free--
        s.mu.Unlock()
        return nil
    }

    w := &waiter{ch: make(chan struct{})}
    elem := s.waiters.PushBack(w)
    s.mu.Unlock()

    // Race the release signal and the context
    select {
    case <-w.ch:
        return nil

    case <-ctx.Done():
        s.mu.Lock()

        if w.granted {
            // Permit was reserved for us, but we're canceling
            // Must release the permit we own
            s.mu.Unlock()
            s.Release()
            return ctx.Err()
        }

        // Not yet granted, remove from queue
        s.waiters.Remove(elem)
        s.mu.Unlock()
        return ctx.Err()
    }
}
```

And `Release()` sets `granted = true` under the lock before waking the waiter:

```go
func (s *Semaphore) Release() {
    s.mu.Lock()

    if s.free+1 > s.max {
        s.mu.Unlock()
        panic("semaphore: released more than acquired")
    }
    s.free++

    // Wake the first waiter if any
    if front := s.waiters.Front(); front != nil {
        w := front.Value.(*waiter)
        s.waiters.Remove(front)
        s.free--        // reserve permit for waiter
        w.granted = true // mark granted under the lock
        s.mu.Unlock()
        close(w.ch) // wake waiter
        return
    }

    s.mu.Unlock()
}
```

To put it all together, here's the semaphore being used in my original example at the top:

```go
g, ctx := errgroup.WithContext(context.Background())
sema := NewSemaphore(10)

for _, path := range files {
    g.Go(func(p string) error {
        err := sema.Acquire(ctx) // acquire a permit (and wait if needed)
        if err != nil {
            return err
        }
        defer sema.Release() // release the permit when we return

        f, err := os.Open(p)
        if err != nil {
            return err
        }
        defer f.Close()

        return processFile(f)
    }(path))
}

if err := g.Wait(); err != nil {
    return err
}
```

In the end, a semaphore is "just" a counter plus a way to park goroutines until the counter says they can proceed. The surprising part is everything around that core: what order you unblock waiters in, what happens when work becomes irrelevant, and what invariants you need to keep to avoid deadlocks and leaks.

A plain buffered channel is a good-enough concurrency limiter but it doesn't give you FIFO semantics when many goroutines contend at once, and it doesn't naturally compose with cancellation.

## Bugs I Ran Into

While iterating on this semaphore, I ran into two particularly tricky bugs.

The first was a deadlock caused by `Release()` sending a message on an unbuffered channel without a listener:

1. `Release()` removes the waiter from the queue and is about to send the wake-up message
2. The waiter's `select` chooses `ctx.Done()` first and returns without receiving
3. `Release()` blocks forever on the send because nobody is receiving anymore!

I fixed this by closing the channel in `Release()` instead of sending an empty struct.

The second was a permit leak caused by trying to detect "was I granted a permit?" by checking whether the channel was closed. There was a race between `Release()` reserving the permit and the waiter observing that fact:

1. `Release()` reserves a permit for a waiter (`s.free--`)
2. The waiter's context is cancelled, the waiter re-locks
3. The waiter tries to infer "granted" from the channel state, gets the wrong answer
4. The waiter returns `ctx.Err()` without releasing the permit that was reserved for it

That permit is gone forever. I fixed this with the `granted` flag — it's set under the lock, so the waiter can reliably check whether it owns a permit.

After I had everything working, I looked up the source code of the semaphore I would typically use, [x/sync/semaphore](https://pkg.go.dev/golang.org/x/sync/semaphore) from Go's extended library. I found that it uses the same patterns: closing the channel to avoid the deadlock, and keeping all waiter state under the mutex to avoid the permit leak. The channel is just the notification mechanism, and the mutex-protected state is the source of truth.
