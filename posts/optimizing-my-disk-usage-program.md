---
title: "Optimizing My Disk Usage Program"
date: "2025-08-07"
tags: ["rust"]
description: "Increasing performance by reducing thread scheduling overhead and lock contention."
---

In my previous post, [Maybe the Fastest Disk Usage Program on macOS](https://healeycodes.com/maybe-the-fastest-disk-usage-program-on-macos), I wrote about [dumac](https://github.com/healeycodes/dumac). A very fast alternative to `du -sh` that uses a macOS-specific syscall [getattrlistbulk](https://man.freebsd.org/cgi/man.cgi?query=getattrlistbulk&sektion=2&manpath=macOS+13.6.5) to be much faster than the next leading disk usage program.

I received some great technical feedback in the [Lobsters thread](https://lobste.rs/s/ddphh5/maybe_fastest_disk_usage_program_on_macos). After implementing some of the suggestions, I was able to increase performance by ~28% on my [large benchmark](https://github.com/healeycodes/dumac/blob/a2901c6867f194be73f92486826f33d3cf7658cb/setup_benchmark.py#L90).

```text
hyperfine --warmup 3 --min-runs 5 './before temp/deep' './after temp/deep'
Benchmark 1: ./before temp/deep
  Time (mean ± σ):     910.4 ms ±  10.1 ms    [User: 133.4 ms, System: 3888.5 ms]
  Range (min … max):   894.5 ms … 920.0 ms    5 runs

Benchmark 2: ./after temp/deep
  Time (mean ± σ):     711.9 ms ±  10.5 ms    [User: 73.9 ms, System: 2705.6 ms]
  Range (min … max):   700.1 ms … 725.0 ms    5 runs

Summary
  ./after temp/deep ran
    1.28 ± 0.02 times faster than ./before temp/deep
```

The main performance gain came from reducing thread scheduling overhead, while minor gains were from optimizing access to the inode hash-set shards.

## Better Parallelism

The previous version of `dumac` used [Tokio](https://crates.io/crates/tokio) to spawn a task for each directory.

```rust
// Process subdirectories concurrently
if !dir_info.subdirs.is_empty() {
    let futures: Vec<_> = dir_info.subdirs.into_iter()
        .map(|subdir| {
            let subdir_path = Path::new(&root_dir)
	            .join(&subdir)
		          .to_string_lossy()
		          .to_string();
            tokio::spawn(async move {
                calculate_size(subdir_path).await
            })
        })
        .collect();

    // Collect all results
    for future in futures {
        match future.await {
            Ok(Ok(size)) => total_size += size,
            // ..
        }
    }
}
```

And then in the middle of this task, calling `getattrlistbulk` required a blocking call:

```rust
// In the middle of the async task
// ..

let dir_info = tokio::task::spawn_blocking({
    let root_dir = root_dir.clone();
    move || get_dir_info(&root_dir) // Calls getattrlistbulk
}).await.map_err(|_| "task join error".to_string())??;
```

Tokio runs many tasks on a few threads by swapping the running task at each `.await`. Blocking threads are spawned on demand to avoid blocking the core threads which are handling tasks. I learned this _after_ shipping the first version when I read [CPU-bound tasks and blocking code](https://docs.rs/tokio/latest/tokio/index.html#cpu-bound-tasks-and-blocking-code).

Spawning a new thread for each syscall is unnecessary overhead. Additionally, there aren't many opportunities to use non-blocking I/O since `getattrlistbulk` is blocking. Opening the file descriptor on the directory could be made async with something like [AsyncFd](https://docs.rs/tokio/latest/tokio/io/unix/struct.AsyncFd.html) but it's very quick and isn't the bottleneck.

To reiterate the problem: I'm using Tokio as a thread pool even though I'm not directly benefiting from the task scheduling overhead, and worse, I'm creating lots of new threads (one per directory).

YogurtGuy saw this issue and suggested using [Rayon](https://crates.io/crates/rayon) instead of Tokio:

> As it stands, each thread must operate on a semaphore resource to limit concurrency. If this was limited directly via the number of threads, each thread could perform operations without trampling on each other. […] In addition, each call to `spawn_blocking` appears to involve inter-thread communication. Work-stealing would allow each thread to create and consume work without communication.

By using Rayon, I can re-use threads from a thread pool, and avoid creating a new thread for each `getattrlistbulk` call. Using a work-stealing design, I can recursively call `calculate_size`:

```rust
// Calculate total size recursively using rayon work-stealing
pub fn calculate_size(root_dir: String) -> Result<i64, String> {
  // ..
	
	// Process subdirectories in parallel
	let subdir_size = if !dir_info.subdirs.is_empty() {
	    dir_info
	        .subdirs
	        
	        // Parallel iterator.
            // The recursive calculate_size calls are scheduled with
            // very little overhead!
	        .into_par_iter()
	        .map(|subdir| {
	            let subdir_path = Path::new(&root_dir)
	                .join(&subdir)
	                .to_string_lossy()
	                .to_string();
	            calculate_size(subdir_path)
	        })
	        .map(|result| match result {
	            Ok(size) => size,
	            Err(e) => {
	                eprintln!("dumac: {}", e);
	                0
	            }
	        })
	        .sum()
	} else {
	    0
	};
	
	// ..
```

I benchmarked and profiled these two approaches to see what changes I could observe. Tokio tasks with many blocking calls, and Rayon work-stealing.

Using macOS's Instruments, I checked that `dumac` was now using a fixed amount of threads:

![Comparing the system call trace view by thread](threads.png)

Additionally, the number of syscalls has been halved. Although the *count* of syscalls is not a perfect proxy for performance, in this case, it suggests we've achieved the simplicity we're after.

The macOS syscalls related to Tokio's thread scheduling are greatly reduced. Also, not pictured, the number of context switches was reduced by ~80% (1.2M -> 235k).

![Comparing the system call trace view by syscall](syscalls.png)

And finally, the most important result is the large benchmark.

```text
hyperfine --warmup 3 --min-runs 5 './before temp/deep' './after temp/deep'
Benchmark 1: ./before temp/deep
  Time (mean ± σ):     901.3 ms ±  47.1 ms    [User: 125.5 ms, System: 3394.6 ms]
  Range (min … max):   821.6 ms … 942.8 ms    5 runs

Benchmark 2: ./after temp/deep
  Time (mean ± σ):     731.6 ms ±  20.6 ms    [User: 76.5 ms, System: 2681.7 ms]
  Range (min … max):   717.4 ms … 767.1 ms    5 runs

Summary
  ./after temp/deep ran
    1.23 ± 0.07 times faster than ./before temp/deep
```

Why is it faster? Because we're creating and managing fewer threads, and we're waiting on less syscalls that are unrelated to the core work we're doing.

## Reducing Inode Lock Contention

YogurtGuy had [another point](https://lobste.rs/s/ddphh5/maybe_fastest_disk_usage_program_on_macos#c_fkix5i) on how `dumac` deduplicates inodes. In order to accurately report disk usage, hard links are deduplicated by their underlying inode. This means that, while our highly concurrent program is running, we need to read and write a data structure from all running threads.

I chose a sharded hash-set to reduce lock contention. Rather than a single hash-set with a single mutex, there are `128` hash-sets with `128` mutexes. The inode (a `u64`) is moduloed by `128` to find the hash-set that needs to be locked and accessed:

```rust
// Global sharded inode set for hardlink deduplication
static SEEN_INODES: LazyLock<[Mutex<HashSet<u64>>; SHARD_COUNT]> =
    LazyLock::new(|| std::array::from_fn(|_| Mutex::new(HashSet::new())));

fn shard_for_inode(inode: u64) -> usize {
    (inode % SHARD_COUNT as u64) as usize
}

// Returns the blocks to add (blocks if newly seen, 0 if already seen)
fn check_and_add_inode(inode: u64, blocks: i64) -> i64 {
    let shard_idx = shard_for_inode(inode);
    let shard = &SEEN_INODES[shard_idx];

    let mut seen = shard.lock();
    if seen.insert(inode) {
        blocks // Inode was newly added, count the blocks
    } else {
        0 // Inode already seen, don't count
    }
}
```

This is the correct solution if inodes are distributed randomly across the `u64` space but, as [YogurtGuy points out](https://lobste.rs/s/ddphh5/maybe_fastest_disk_usage_program_on_macos#c_fkix5i), they are not:

> I like the sharded hash-set approach, but I think the implementation may have some inefficiencies. First, the [shard is chosen by `inode % SHARD_COUNT`](https://github.com/healeycodes/dumac/blob/152dad272ae3e1c73ecaead23341fb32392729ee/src/main.rs#L42). Inodes tend to be sequential, so while this choice of shard will distribute requests across multiple hash sets, it will also increase contention, since a single directory will have its inodes distributed across every hash set. I wonder if `(inode >> K) % SHARD_COUNT` might therefore lead to better performance for some values of `K`. Especially if each thread batched its requests to each hash set.

I looked at the data, and saw that they were right.

```rust
// Inside calculate_size
// ..

all_inodes.sort();
println!("dir_info: {:?}, all_inodes: {:?}", dir_info, all_inodes);

// They're sequential!
// subdirs: [] }, all_inodes: [50075095, 50075096, 50075097, 50075098, 50075099, 50075100, 50075101, 50075102, 50075103, 50075104, 50075105, 50075106, 50075107, 50075108, 50075109, 50075110, 50075111, 50075112, 50075113, 50075114, 50075115, 50075116, 50075117, 50075118, 50075119, 50075120, 50075121, 50075122, 50075123, 50075124, 50075125, 50075126, 50075127, 50075128, 50075129, 50075130, 50075131, 50075132, 50075133, 50075134, 50075135, 50075136, 50075137, 50075138, 50075139, 50075140, 50075141, 50075142, 50075143, 50075144, 50075145, 50075146, 50075147, 50075148, 50075149, 50075150, 50075151, 50075152, 50075153, 50075154, 50075155, 50075156, 50075157, 50075158, 50075159, 50075160, 50075161, 50075162, 50075163, 50075164, 50075165, 50075166, 50075167, 50075168, 50075169, 50075170, 50075171, 50075172, 50075173, 50075174, 50075175, 50075176, 50075177, 50075178, 50075179, 50075180, 50075181, 50075182, 50075183, 50075184, 50075185, 50075186, 50075187, 50075188, 50075189, 50075190, 50075191, 50075192, 50075193, 50075194]
```

Each directory I spot-checked seemed to have sequential inodes. Inodes are created at the filesystem level (not at the directory level) and since my benchmark files were created in quick succession each directory's files are roughly sequential. 

This is true for many real-life cases. The contents of a directory are often written at the same time (e.g. `npm i`).

The reason this is a problem is that when we modulo by 128, we don't necessarily reduce the chance of lock collisions. Recall that we're trying to take our inodes and shard them across many hash-sets. This is what that looks like:

```text
# dir1 handled by thread1

50075095 % 128 = 87
50075096 % 128 = 88
50075097 % 128 = 89
50075098 % 128 = 90
50075099 % 128 = 91
```

But if there's a separate directory with inodes starting at an entirely different point, like, say `65081175`, they can modulo to the same hash-set:

```text
# dir2 handled by thread2

65081175 % 128 = 87 # same values as above
65081176 % 128 = 88
65081177 % 128 = 89
65081178 % 128 = 90
65081179 % 128 = 91
```

In the worst case, if thread1 and thread2 run at the same time, they could fight for the lock on each of the entries they are handling! You can imagine how many threads iterating over directories could hit this case.

I tested it while running my benchmark:

```rust
if shard.is_locked() {
    println!("shard is locked");
}
```

And found the average like so:

```bash
avg=$(sum=0; for i in {1..15}; do c=$(./target/release/dumac temp/deep | grep -c "shard is locked"); sum=$((sum + c)); done; echo "scale=2; $sum / 15" | bc); echo "Average: $avg"
# Average: 176.66
```

Since directories are handled one at a time (for each thread) it would be ideal if the shard was per directory — but this isn't possible. We can get close by removing some of the least significant bits, say, `8`.

```text
# dir1 handled by thread1

50075095 >> 8 = 195605 # this block of 256 entries share a key
50075096 >> 8 = 195605
50075097 >> 8 = 195605
50075098 >> 8 = 195605
50075099 >> 8 = 195605

# dir2 handled by thread2
65081175 >> 8 = 254223 # this separate block of 256 entries share a different key
65081176 >> 8 = 254223
65081177 >> 8 = 254223
65081178 >> 8 = 254223
65081179 >> 8 = 254223
```

I tested this idea using my benchmark:

```rust
fn shard_for_inode(inode: u64) -> usize {
    ((inode >> 8) % SHARD_COUNT as u64) as usize
}

// avg=$(sum=0; for i in {1..15}; do c=$(./target/release/dumac temp/deep | grep -c "shard is locked"); sum=$((sum + c)); done; echo "scale=2; $sum / 15" | bc); echo "Average: $avg"
// Average: 4.66
```

The average lock collision dropped dramatically from `176.66` to `4.66`. I was surprised at this result. I didn't expect the decrease to be so great.

I also tested with some hash functions that avalanche sequential integers but the results were comparable to my original idea with just the modulo.

So, what is so special about `inode >> 8`?

[APFS](https://developer.apple.com/support/downloads/Apple-File-System-Reference.pdf) hands out IDs sequentially so the bottom bits toggle fastest, causing threads that are scanning directory trees in creation order to pile into the same shard when using `inode % 128`.

Shifting by `8` groups `256` consecutive inodes together. This improves temporal locality and cuts down inter-shard contention in our multithreaded crawl even though the statistical distribution stays perfectly flat across the whole disk.

The ideal number of inodes to group together depends on the number of inodes that were created at the same time per directory. Since that's not possible to work out ahead of time, I will pick `256` (my gut says that most directories have fewer than `256` files) and will keep shifting by `8` bits.

As a result, the reduced lock contention improved the performance of the large benchmark by ~5% or so.

I just pushed up these performance improvements to `dumac`'s [repository](https://github.com/healeycodes/dumac). Let me know if you have any technical feedback!
