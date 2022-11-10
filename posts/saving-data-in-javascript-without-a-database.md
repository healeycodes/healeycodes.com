---
title:  "Saving Data in JavaScript Without a Database"
date:   "2019-06-03"
tags: ["javascript"]
path: "javascript/webdev/beginners/tutorial/2019/06/03/saving-data-in-javascript-without-a-database.html"
description: "The title is a lie I also show how to use SQLite."
---

You've just written a great piece of JavaScript. But when the running process stops, or the user refreshes, all of that nice data **disappears into the ether**.

Is this you?

When prototyping, or otherwise working on tiny projects, it can be helpful to manage some state without resorting to a database solution that wasn't designed for that creative itch you're trying to scratch.

We're going to explore some options that I wish I knew about when I started tinkering on the web. We'll look at JavaScript in the browser and Node.js on the back end. We'll also look at some lightweight databases that use the local file system.

## Node.js

First up is JSON serializing your data and saving it to disk. The MDN Docs have a great [article](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/JSON) if you haven't worked with JSON before.

```javascript
const fs = require('fs');

const users = {
    'Bob': {
        age: 25,
        language: 'Python'
    },
    'Alice': {
        age: 36,
        language: 'Haskell'
    }
}

fs.writeFile('users.json', JSON.stringify(users), (err) => {  
    // Catch this!
    if (err) throw err;

    console.log('Users saved!');
});
```

We created our users object, converted it to JSON with [JSON#stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) and called [fs#writeFile](https://nodejs.org/api/fs.html#fs_fs_writefile_file_data_options_callback). We passed in a filename, our serialized data, and an arrow function as a callback to execute when the write operation finishes. Your program will continue executing code in the meanwhile.

You can also use this method to write normal serialized data by passing in anything that can be cast to a string. If you're storing text data, you may find [fs#appendFile](https://nodejs.org/api/fs.html#fs_fs_appendfile_path_data_options_callback) useful. It uses an almost identical API but sends the data to the end of the file, keeping the existing contents.

There is a synchronous option, [fs#writeFileSync](https://nodejs.org/api/fs.html#fs_fs_writefilesync_file_data_options) but it isn't recommended as your program will be unresponsive until the write operation finishes. In JavaScript, you should aim to [Never Block](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop#Never_blocking).

If you're dealing with CSV files, reach for the battle-hardened [node-csv](https://github.com/adaltas/node-csv) project.

Let's load those users back into our program with [fs#readFile](https://nodejs.org/api/fs.html#fs_fs_readfile_path_options_callback).

```javascript
fs.readFile('users.json', (err, data) => {
    // Catch this!
    if (err) throw err;
  
    const loadedUsers = JSON.parse(data);
    console.log(loadedUsers);
});
```

### Lightweight databases

SQLite uses a local file as a database — and is one of my favorite pieces of software in the world. It enables many of my smaller projects to exist with low maintenance and little deploying hassle.

Here are some facts about SQLite:
- The project has [711 times](https://www.sqlite.org/testing.html) as much test code and test scripts compared to other code.
- The developers pledge to keep it backward compatible through at least the year 2050.
- It's used on planes, in Android, and you probably interacted with it in [some way](https://www.sqlite.org/famous.html) on your way to this article today.

Seriously, [How SQLite Is Tested](https://www.sqlite.org/testing.html) is a wild ride.

In Node.js, we commonly use the `sqlite3` [npm package](https://www.npmjs.com/package/sqlite3). I'll be using some code from Glitch's `hello-sqlite` template, which you can [play around with and remix](https://glitch.com/edit/#!/remix/hello-sqlite) without an account.

```javascript
// hello-sqlite
let fs = require('fs');
let dbFile = './.data/sqlite.db'; // Our database file
let exists = fs.existsSync(dbFile); // Sync is okay since we're booting up
let sqlite3 = require('sqlite3').verbose(); // For long stack traces
let db = new sqlite3.Database(dbFile);
```

Through this `db` object, we can interact with our local database like we would through a connection to an outside database.

We can create tables.

```javascript
db.run('CREATE TABLE Dreams (dream TEXT)');
```

Insert data (with error handling).

```javascript
db.run('INSERT INTO Dreams (dream) VALUES (?)', ['Well tested code'], function(err) {
  if (err) {
    console.error(err);
  } else {
    console.log('Dream saved!');
    }
});
```

Select that data back.

```javascript
db.all('SELECT * from Dreams', function(err, rows) {
  console.log(JSON.stringify(rows));
});
```

You may want to consider [serializing some of your database queries](https://stackoverflow.com/a/42946402). _Each command inside the serialize() function is guaranteed to finish executing before the next one starts._ The sqlite3 [documentation](https://github.com/mapbox/node-sqlite3/wiki) is expansive. Keep an eye on the SQLite [Data Types](https://www.sqlite.org/datatype3.html) as they can be a little different to other databases.

If even SQLite seems like too much overhead for your project, consider [lowdb](https://github.com/typicode/lowdb) (also [remixable on Glitch](https://glitch.com/edit/#!/low-db)). lowdb is exciting because it's _a small local JSON database powered by Lodash (supports Node, Electron and **the browser**)_. Not only does it work as a wrapper for JSON files on the back end it also provides an API which wraps localStorage in the browser.

From their [examples](https://github.com/typicode/lowdb/tree/master/examples#browser):

```javascript
import low from 'lowdb'
import LocalStorage from 'lowdb/adapters/LocalStorage'

const adapter = new LocalStorage('db')
const db = low(adapter)

db.defaults({ posts: [] })
  .write()

// Data is automatically saved to localStorage
db.get('posts')
  .push({ title: 'lowdb' })
  .write()
```

## Browser

This brings us to the front end. [window#localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) is the modern solution to storing data in HTTP cookies — which MDN [doesn't recommend](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Client-side_web_APIs/Client-side_storage#Old_fashioned_cookies) for storing things anymore.

Let's interact with them right now. If you're on desktop, open your dev console (F12 on Chrome) and see what DEV is storing for you:

```javascript
for (const thing in localStorage) {
  console.log(thing, localStorage.getItem(thing))
}

// Example of one thing:
// pusherTransportTLS {"timestamp":1559581571665,"transport":"ws","latency":543}
```

We saw how lowdb interacted with localStorage but for our small projects it's probably easier to talk to the API directly. Like this:

```javascript
// As a script, or in console
localStorage.setItem('Author', 'Andrew') // returns undefined
localStorage.getItem('Author') // returns "Andrew"
localStorage.getItem('Unset key') // returns null
```

It gets easier still: you can treat it like an object. Although, MDN recommends the API over this [shortcut](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API#Basic_concepts).

```javascript
console.log(localStorage['Author']); // prints "Andrew"
```

If you don't want to store data on the user's computer forever (which can be cleared with `localStorage.clear()` **but don't run this on DEV**) you may be interested in [sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) which has a near identical API and only stores data while the user is on the page.

## End notes

I read somewhere that SQLite is used onboard the Internation Space Station in some capacity but I haven't been able to find a source. My fiancée wants you to know that SQLite _is_ a database and the title of this post is incorrect.
