---
title:  "Embed Your Latest DEV Posts Anywhere (Tutorial)"
date:   "2019-04-06"
tags: ["javascript"]
path: "javascript/beginners/webdev/tutorial/2019/04/06/embed-dev-posts.html"
description: "Using the DEV.to API with Node."
---

Let's look at how the DEV.to API can be used to embed a list of your recent posts. We'll also sort them by their positive reactions! All it takes is a splash of client-side JavaScript. The API is [not released](https://github.com/thepracticaldev/dev.to/issues/2187) yet, is not documented, and will likely change but I'll keep this post up to date.

Here's an [test page](https://healeycodes.github.io/embed-DEV-posts/example/) which uses the tiny library we'll be writing. We'll be creating a plain list to keep things extendable. You can also skip straight to the [repository](https://github.com/healeycodes/embed-DEV-posts) to check out the final code.

[![](test-embedded.png)](https://healeycodes.github.io/embed-DEV-posts/example/)

#### How easy is the DEV API to use?

[Easy](https://dev.to/api/articles?username=healeycodes). The articles route is `https://dev.to/api/articles?username=$user`. Originally, I experimented with getting more than the latest 30 posts, which is the default. This can be done by adding `&page=$pageNum` — but requesting multiple pages introduces a delay. Since it's impossible to know the number of pages of posts, you need to keep going until you hit an empty page. A late-loading list doesn't make for great UX.

Let's start by using the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) to make a request from the user's browser.

```javascript
fetch(`https://dev.to/api/articles?username=healeycodes`)
    .then(function (response) {

        // Parse it as JSON
        return response.json();
    }).then(function (posts) {

        // An array of posts
        console.log(posts);
    })
```

Looking good. Let's neaten this up with some [JSDoc](http://usejsdoc.org/about-getting-started.html) comments so the code is more accessible. We'll also wrap it in a function.

```javascript
/**
 * Get a DEV user's post objects.
 * Only fetches previously 30 posts. Using `&page=X` is too slow.
 * @param {string} username - DEV username, e.g. 'ben'.
 * @returns {array} User's post objects.
 */
function getPosts(username) {

    // Assume that `api` is defined as a constant
    return fetch(`${api}/articles?username=${username}`)
        .then(function (response) {
            return response.json();
        })
        .then(function (posts) {

            // Sort the array in place with a compare function
            return posts.sort((a, b) => b.positive_reactions_count - a.positive_reactions_count);
        });
}
```

A list of 30 posts is maybe a bit much. We'll cut it down later. For now, notice how we sorted the array in place with a [compareFunction](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Parameters). We used a shorthand version. Compare functions are typically written by returning `-1`, `1`, or `0` when comparing the two parameters. However, all that matters is that the compare function is consistent.

We want to create a simple list that can be styled with CSS. Sensible class names might be `dev-feed-list` and `dev-feed-item`. We'll need an element to attach this list to as well so that should be an argument that our library takes. With JavaScript, we can add classes, and create lists and attach them on the fly like this:

```javascript
// An unordered list
const list = document.createElement('ul');

// A list item
const item = document.createElement('li');
item.classList.add('dev-feed-item');
item.innerText = 'I am a list item.';

// Let's create a relation between them
list.appendChild(item);

// Now between the list and the document, rendering the list
// body -> ul -> li
document.body.appendChild(list);
```

Let's create a function that builds the elements that will make up our embedded list. We'll use the `getPosts` function from earlier to get our sorted array of posts.

```javascript
/** 
 * Creates a DEV feed of posts.
 * @constructor
 * @param {Element} elem - Place list of posts inside this element.
 * @param {string} username - DEV username, e.g. 'ben'.
 * @param {number} numberOfPosts - Number of posts to list. 
 */
function createFeed(elem, username, numberOfPosts = 5) {
    const feed = document.createElement('ul');
    feed.classList.add('dev-feed-list');
    getPosts(username)

        // With our posts array
        .then(function (posts) {
            posts.length = numberOfPosts;
            posts.forEach(function (post) {

                // We create an element for each item
                const item = document.createElement('li');
                item.classList.add('dev-feed-item');

                // As well as a link for users to click through
                const link = document.createElement('a');
                link.href = post.url;
                link.innerText = post.title;

                // ul -> li -> a
                item.appendChild(link);
                feed.appendChild(item);
            });

            // Attach the list of posts, rendering it
            elem.appendChild(feed);
        });
}
```

If we bundle this all together as a script, we can generate lists by calling `createFeed(element, username, numberOfPosts)` where `element` is the container for the list and `username` is a valid DEV user, and `numberOfPosts` is the number of posts we want to render.

By allowing a custom number of posts to be fetched, as well as using sensible CSS classes, our library is extensible and can be used as a tiny module!
