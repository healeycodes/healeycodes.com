---
title:  "Cloning Dominos Order Tracker as a Microservice with Node.js and Firebase!"
date:   "2019-02-20"
tags: ["javascript"]
path: "node/express/firebase/2019/02/20/order-tracking-micro.html"
description: "Writing an order tracker with Node, Express, and Firebase."
---

Order trackers are a great example of AJAX-ness: a web page updating itself fluidly in the background (even though customers will be spam refreshing!)

![Order Tracker](order-tracker-header.png)

This past week, I created a minimal order tracker, and I'm going to highlight some of my design choices and share some excerpts from the most important sections of the tiny codebase.

Working back to front, we start with a Firebase real-time database.

![Firebase](order-firebase.png)

Here we're defining five stages that an order can be in, and we're also tracking the time the order-tracking instance was created for future logging.

The only packages we need are Express and the Firebase API. We use environment variables where sensible so that our app can be tested without using the production database.

```javascript
/* Firebase */
const admin = require('firebase-admin');
const serviceAccount = require(process.env.KEY);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.DB
});
const db = admin.database();

/* Express */
const express = require('express');
const app = express();
const server = require('http').Server(app);
app.use(express.static('public'));
app.use(express.json());
```

There are just three short routes that create an API that we (the business) and our users' browsers can speak to. Note that authentication for public/private routes has been left as an exercise for the reader. As we'll see later, all web page content is statically hosted.

```javascript 
// Create a tracking instance
app.get('/private/orders', (req, res) => {
    const orderId = uuidv4();
    db.ref(`orders/${orderId}`).set({
        started: Date.now(),
        // Integer: 1-5 inclusive
        stage: 1
    })
        .then(() => {
            return res.send(orderId);
        })
        .catch((err) => {
            console.error(`Error creating tracking instance: ${err}`);
            return res.status(500).send('Server error');
        })
});

// Set a tracking instance's state
app.post('/private/orders', (req, res) => {
    db.ref('orders').child(req.body.orderId).set({
        // Clamp stage
        stage: Math.max(1, Math.min(5, req.body.stage))
    })
        .then(() => {
            return res.send('OK');
        })
        .catch((err) => {
            console.error(`Error setting tracking instance state: ${err}`);
            return res.status(500).send('Server error');
        })
});

// Client access to a tracking insance
app.get('/public/orders/:orderId', (req, res) => {
    const orderId = req.params.orderId;
    db.ref(`orders/${orderId}`)
        .once('value')
        .then(data => {
            order = data.val();
            if (order !== null) {
                return res.send(order);
            } else {
                console.error(`Unknown tracking instance requested: ${orderId}.`);
                return res.status(500).send('Server error');
            }
        })
        .catch((err) => console.error(`Order: ${orderId} errored: ${err}`));
});
```

On the front end, we grab some Font Awesome icons, throw them in some red/blue boxes with classes we can toggle, and we're almost done. In order to keep the scope as minimal as possible, we read the query parameter with JavaScript. This way, our microservice can host one static page, one .js file and one .css file.

```javascript 
// The query parameter `orderId` lets us provide order tracking
window.orderId = new URLSearchParams(window.location.search).get('orderId');

// If delivery in progress, check for new information every X seconds
window.localStage = null; // Integer: 1-5 inclusive
const checkStage = () => {
    fetch(`/public/orders/${window.orderId}`)
        .then(res => res.json())
        .then(data => {
            applyStage(data.stage);
        })
        .catch(err => console.error(`Error connecting to server: ${err}`))
    if (window.localStage < 5) {
        setTimeout(checkStage, 10000);
    }
}
```

A dash of CSS media queries for our mobile friends. This was as simple as flipping the flex grid and adding a little padding.

![Responsive](order-mobile.png)

I like to make sure that all of my projects are well tested. It helps me jump back into them after a break and stops me stomping through the code base breaking everything. For this app I chose SuperTest (which comes with Mocha).

For example, this test checks that all the data-plumbing is working correctly.

```javascript
/**
 * Test client accessing a tracking instance
 */
describe('GET /public/orders/:orderId', () => {
    it('respond with an order stage', (done) => {
        // Create an order instance
        request(app)
            .get('/private/orders')
            .end((err, res) => {
                request(app)
                    // Request this instance's stage from client route
                    .get(`/public/orders/${res.text}`)
                    .expect((res) => {
                        const stage = res.body.stage
                        // An integer within 1-5
                        assert(stage > 0 && stage < 6 );
                    })
                    .expect(200, done);
            });
    });
});
```

The [repo](https://github.com/healeycodes/order-tracking-microservice) uses Travis CI to run tests on every commit. Travis's offering to open source projects has been such a blessing to my journey as a developer, and helps me to build software that works (and tests) cross-platform!
