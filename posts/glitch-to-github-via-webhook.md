---
title:  "Continuous Deployment to Glitch via GitHub Webhooks"
date:   "2019-05-06"
tags: ["javascript"]
path: "glitch/github/tutorial/javascript/2019/05/06/glitch-to-github-via-webhook.html"
description: "Joining two of my favorite ecosystems together."
---

We're going to use Glitch as a free container platform to host our application. Better yet, it will have continuous deployment! Whenever we commit to our `master` branch on GitHub, a secure webhook will be sent to our project, which will update, build, and restart itself.

The route that receives this webhook is built into our Node.js/Express application. We'll be using Glitch's `hello-express` template to keep things simple. Inside the route, we need to run our git commands to get our updated files as well as any build and install commands.

*Note: Glitch auto-restarts Node.js projects by running `npm start`.*

![Choosing the template](create-express.png)

Create a new `hello-express` project on Glitch and add your secret to the `.env` file by adding `SECRET='randomized password here'`. There's one additional package we need, which can be installed via the Glitch UI inside package.json, or via console with `npm install body-parser`.

This is the `POST` route, along with including extra imports:

```javascript
const bodyParser = require('body-parser');
app.use(bodyParser.json());
const crypto = require('crypto');
const { execSync } = require('child_process');

app.post('/git', (req, res) => {
  const hmac = crypto.createHmac('sha1', process.env.SECRET);
  const sig  = 'sha1=' + hmac.update(JSON.stringify(req.body)).digest('hex');
  if (req.headers['x-github-event'] === 'push' &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(req.headers['x-hub-signature']))) {
    res.sendStatus(200);
    const commands = ['git fetch origin master',
                      'git reset --hard origin/master',
                      'git pull origin master --force',
                      'npm install',
                      // your build commands here
                      'refresh']; // fixes glitch ui
    for (const cmd of commands) {
      console.log(execSync(cmd).toString());
    }
    console.log('updated with origin/master!');
    return;
  } else {
    console.log('webhook signature incorrect!');
    return res.sendStatus(403);
  }
});
```

We're interested in push events so we check the header. After, we perform a security check by creating an HMACSHA1 keyed hash with our secret and the webhook's body which will be repository information from GitHub. GitHub sends over a signature of the same body using our secret. We compare the signature with `timingSafeEqual` to avoid timing attacks. Hopefully, all is well and the two match up. Otherwise, we'll send a `403` code and skip the update.

If all is well, we send a `200` code back to GitHub and run our commands. We do this synchronously, using `execSync` since they depend upon each other, and we log the results in case there's any errors or information we need later. `refresh` is a Glitch environment command that resets the UI and fixes the file-tree in the sidebar (which plagued me for about half an hour this weekend!). The update process generally takes 5-15 seconds for small changes. Your application won't be available during this time.

![Exporting to GitHub](export-to-github.png)

Creating the GitHub webhook is actually quite straightforward but first some preparation. You'll need a repository with at least one file so that Glitch can export to it. Once you've got your repository set up, add it as the remote origin via Glitch console `git remote add origin {url}` and send over your project. It will become the `glitch` branch. Create a pull request and merge this to `master`. Otherwise, when the webhook fires, your project might load the wrong `master` changes and reset itself!

*I've seen some people set up this process pulling straight from the `glitch` branch but I prefer having `master` as the production version of a project.*

![Creating the webhook](create-webhook.png)

Head into the repository settings and create a new webhook with your Glitch project's secret. Make sure to choose `application/json` as the content-type. And that's it. Any `push` events with the correct signature will trigger an update/install/restart cycle of your Glitch project 🎉.

You can see what this looks like in a live project on the [PairCode repository](https://github.com/healeycodes/PairCode). It's a lightweight CodePen clone that I wrote at university and have been tinkering with lately. Glitch helped bring it back to life!

Reach out if you're having any tricky issues 👍.
