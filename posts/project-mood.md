---
title:  "Creating Cute GitHub Badges Based Off a Project's Mood (Node.js)"
date:   "2019-03-11"
tags: ["javascript"]
path: "node/github/javascript/2019/03/11/project-mood.html"
description: "Creating GitHub badges based off the time when most people contribute to a GitHub project."
---

This Sunday, I worked on an API that creates a GitHub badge based off a **project's mood**. Mood meaning the average time of day that the repository is worked on. I find that I work on different projects at different times of the day. In the morning, I skew towards back-end focused repositories. Maybe it's the coffee? ☕

[![Project Mood](p-m-header.png)](https://github.com/healeycodes/project-mood)

GitHub badges can either be generated dynamically by a library or via third-party services like [shields.io](https://shields.io). For [Project Mood](https://github.com/healeycodes/project-mood), we use [gh-badges](https://www.npmjs.com/package/gh-badges) — an npm package. Here's how a badge is built.

```javascript
const bf = new BadgeFactory();

// ...        

// Customize badge
const format = {
    text: ['project mood', timeOfDay],
    colorA: '#555',
    colorB: color,
    template: 'flat',
}

// Create SVG/add title
const title = `<title>average commit: ${parseInt(average)}:${parseInt((average % 1) * 60)}</title>`;
const svg = bf.create(format).replace(/>/, `>${title}`);
```

It's a prototype, and the library doesn't allow custom attributes, so we inject titles in with a RegEx replace. The sole route we make avaliable is `/:owner/:repo.svg` for example: `/healeycodes/project-mood.svg`. With Express, SVGs can be sent back much like a string would be.

```javascript
return res
    .status(200)
    .send(svg)
    .end();
```

The color of these badges is decided by scanning recent commits and finding the average time of day. The GitHub API requires a user agent and a [personal access token](https://github.com/settings/tokens). We process the commits with a map/reduce. JavaScript's `Date` responds well to time zone correction.

```javascript
// Options for the request call
const options = {
    url: `${api}repos/${req.params.owner}/${req.params.repo}/commits?${token}`,
    headers: {
        'User-Agent': process.env.USERAGENT
    }
};

// ...

// As part of the request callback, commits are scanned
const times = json.map(item => item.commit.author.date);
const average = times.reduce((sum, time) => {
    const d = new Date(time);
    const hours = d.getHours() + (d.getMinutes() / 60) + (d.getSeconds() / 60 / 60);
    return hours + sum;
}, 0) / times.length;
```

It takes ~0.75ms to generate a badge on a modern PC — this includes our title insertion method. Since there is no state being managed, this project would respond well to horizontal scaling. However, the roadmap describes some ways that scale can be managed without throwing money at the problem.

```text
🚗🚗🚗

- Caching:
    - Repositories should be scanned infrequently rather than per request.
    - We can store the most recently requested SVGs in memory.
    - Basically, don't generate the SVG for every request (which is used for the prototype).
- Blended colors depending on average time rather than fixed colors.
```

No project is complete without tests! A simple test plan, executed by a cloud-build, is one of my favorite markers to pass during development. For [Project Mood](https://github.com/healeycodes/project-mood), Mocha and SuperTest are paired with Travis CI. The Express app is exported when the `NODE_ENV` is set to 'test'.

```javascript
if (process.env.NODE_ENV === 'test') {
    module.exports = app;
} else {
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log(`App listening on port ${PORT}`);
        console.log('Press Ctrl+C to quit.');
    });
}
```

This allows us to import it into `app.test.js` which will be called by `npm test`. Other enviromental values in use are `USERAGENT` which is required by the GitHub API, as well as `GHTOKEN`. The latter is set to be hidden by Travis CI so that public builds don't leak secrets.

![Travis CI](p-m-travis.png)

One of the lovely tests.

```javascript
// Entry - "mocha test/app.test.js --exit"

const request = require('supertest');
const app = require('../app');
const assert = require('assert');

/**
 * Test SVG request
 */
describe('GET /healeycodes/project-mood', () => {
    it('responds with an SVG', (done) => {
        request(app)
            .get('/healeycodes/project-mood.svg')
            .expect((res) => {
                // SVG XML Namespace
                assert(res.text.match(/http:\/\/www.w3.org\/2000\/svg/gmi) !== null);
                // Error message not present
                assert(res.text.match(/unknown/gmi) === null);
            })
            .expect(200, done);
    });
});
```

💬 [twitter/healeycodes](https://twitter.com/healeycodes) for complaints.
