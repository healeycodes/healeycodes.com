---
title:  "A Tiny Project, From Inception to Deployment"
date:   "2019-05-12"
tags: ["javascript"]
path: "javascript/webdev/glitch/tutorial/2019/05/12/tiny-project-to-completion.html"
description: "A JavaScript webscraper for MDN."
---

When I was starting out, I never understood how to tackle 'projects'. It was hard to understand the scope of a project from a glance, as well as the steps and considerations. I wanted to see behind the scenes. We all work differently but in this article I'm showing how I work when I get an idea-spark for something tiny. Come watch me scratch an itch.

I was on the MDN Web Docs earlier looking for something to spark a research journey for this week's article when I found that there was no random page link. A random page function would be useful for general revision of web technologies, allowing you to click through to things that sounded interesting.

![The project's main/only page](rnd-mdn-preview.png)

I began my journey by hacking away at the [index page](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Index) for JavaScript. This is often how I tackle front end web problems at my job too, using DevTools as the draft version of a site.

![Looking at the table rows](index-hacking.png)

In the HTML there's a table body located at `document.querySelector("#wikiArticle > table > tbody")`. On Chrome, you can right-click an element and go `Copy -> Copy JS Path` to find this. Each entry uses three table rows. I'm after the page link and also the summary. Let's separate the rows into groups that make up one entry each.

You can run these lines in your console.

```javascript
// Index table
const indexTable = document.querySelector("#wikiArticle > table > tbody");

// There are three <tr>s to a row
const allRows = indexTable.querySelectorAll('tr');
const chunkRows = [];
for (let i = 0; i < allRows.length; i += 3) {
    chunkRows.push([allRows[i], allRows[i + 1], allRows[i + 2]]);
}
```

I need to store a copy of the index page's data somewhere. Scraping the page per each request would be wasteful and slow. Storing them as JSON makes the most sense as I'll be delivering this over the web. A page snippet should have a link property and a text property. I'll take care of some of the templating here too.

```javascript
// Map these chunked rows into a row object
const pageEntries = [];
chunkRows.forEach(row => {
    const a = row[0].querySelector('a');
    const page = {
        link: `<a class="page-link "href="${a.href}">${a.innerText}</a>`,
        text: `<div class="page-text">${row[1].querySelector('td').innerText}</div>`
    }
    pageEntries.push(page);
})
```

I needed to decide how I was going to deliver this to users. I considered a Chrome extension but I wanted to prototype faster so I turned to Glitch and used their Express template.

I packaged the scraping logic into an async function and used [puppeteer](https://github.com/GoogleChrome/puppeteer) to run these commands in the context of the index page. (On Glitch, you have to use `--no-sandbox` which can be a security risk.). In the finished project, this script can be called manually with `node getNewPages.js` to update the entries on disk. (This would fit neatly into a cron job!).

From Chrome DevTool hackery to something a little more cohesive.

```javascript
// getNewPages.js

const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox'] // Required for Glitch
    });
    const page = await browser.newPage();
    await page.goto('https://developer.mozilla.org/en-US/docs/Web/JavaScript/Index');

    // Scan index table, gather links and summaries
    const pageEntries = await page.evaluate(() => {

        // Index table
        const indexTable = document.querySelector("#wikiArticle > table > tbody");

        // There are three <tr>s to a row
        const allRows = indexTable.querySelectorAll('tr');
        const chunkRows = [];
        for (let i = 0; i < allRows.length; i += 3) {
            chunkRows.push([allRows[i], allRows[i + 1], allRows[i + 2]]);
        }

        // Map these chunked rows into a row object
        const pageEntries = [];
        chunkRows.forEach(row => {
            const a = row[0].querySelector('a');
            const page = {
                link: `<a class="page-link "href="${a.href}">${a.innerText}</a>`,
                text: `<div class="page-text">${row[1].querySelector('td').innerText}</div>`
            }
            pageEntries.push(page);
        })
        return pageEntries;
    });

    // Save page objects to JSON on disk
    const pageJSON = JSON.stringify(pageEntries);
    fs.writeFile('./data/pages.json', pageJSON, function (err) {
        if (err) {
            return console.log(err);
        }
        console.log(`New pages saved! (JSON length: ${pageJSON.length})`);
    });

    await browser.close();
})();
```

You can load JSON files into Node with `require('./data/pages.json')` which keeps all of our page entries in memory for faster access (this is possible due to the fixed, small size of ~300kb). The rest of our web app is a wrapper around a random function.

```javascript
// server.js

// init project
const express = require('express');
const app = express();
app.use(express.static('public'));

const pages = require('./data/pages.json');
const rndPage = () => pages[Math.floor(Math.random() * pages.length)];

app.get('/', (req, res) => res.sendFile(__dirname + '/views/index.html'));

app.get('/rnd', (req, res) => res.send(rndPage()));

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
```

The only client-side JavaScript we need is a `fetch` call to update the page link and summary. As well as a button with a cute wobble animation to flip through the entries. There's a 1 in 897 chance of getting the same snippet twice, how would you solve this Let me know in the comments!

**Where to go from here:** there are other pages on the MDN Docs (other than JavaScript) that follow the same row pattern, meaning they can be scraped simply by changing the URL in our script.

You can [remix ](https://random-mdn-page.glitch.me/) the project to play with a copy of the code live or clone the repo: [healeycodes/random-mdn-page](https://github.com/healeycodes/random-mdn-page).