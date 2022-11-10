---
title: "Adding Comments to Gatsby with Netlify Serverless Functions + GitHub"
date: "2020-05-08"
tags: ["javascript"]
description: "Use Netlify serverless functions to let users add comments to a static website."
---

I wanted to accept user comments on a Gatsby website and store them on GitHub. As in, I wanted the comments to go straight into a file called `comments.json` in my repository. So I could use something as simple as

```javascript
import comments from "../comments.json"
```

in my site's code. Without any databases. No third-party plugins making tens of networks requests.

[Netlify serverless functions](https://docs.netlify.com/functions/overview/) allowed me to use GitHub's API to make this repository change with the data from a submitted comment. It also hid my secret API credentials.

I built a prototype — [healeycodes/gatsby-serverless-comments](https://github.com/healeycodes/gatsby-serverless-comments) — that uses this flow:

1. 👩 User enters a comment and clicks submit.
2. ⚙️ A serverless function receives the data and hits GitHub's API.
3. 🔧 It reads the existing `comments.json` , appends the new comment, and saves.
4. 🚧 A new commit triggers a Netlify build.
5. ✅ The new version of the website is deployed!

The new comment is visible to users ~30 seconds ⏰ after the first click.

## The serverless function

Let's pick through the serverless function that receives the user's comment. It will make use of some constants that can be set through Netlify's website on _settings_ → _deploys_.

![GITHUB_PAT_TOKEN, GITHUB_REPO, GITHUB_USER](env-vars.png)

The function is written with _Node.js_ and exports a `handler` function, which is explained in [Netlify's documentation](https://docs.netlify.com/functions/build-with-javascript/#format).

```javascript
// comment.js

const fetch = require("node-fetch")

const auth = process.env.GITHUB_PAT_TOKEN
const repo = process.env.GITHUB_REPO
const user = process.env.GITHUB_USER
const api =
  "https://api.github.com/repos/" +
  user +
  "/" +
  repo +
  "/contents/src/comments.json"

exports.handler = async function(event, context, callback) {
  // Use the Contents API from GitHub
  // https://developer.github.com/v3/repos/contents/#get-contents
  const existingFile = JSON.parse(
    await fetch(api, {
      headers: {
        // Pass some kind of authorization
        // I'm using a personal access token
        Authorization:
          "Basic " + Buffer.from(user + ":" + auth)
            .toString("base64"),
      },
    }).then(res => res.text())
  )

  // The file's content is stored in base64 encoding
  // Decode that into utf-8 and then parse into an object
  let comments = JSON.parse(
    Buffer.from(existingFile.content, "base64").toString("utf-8")
  )

  // This is the user submitted comment
  // Perhaps we would do some validation here
  const newComment = JSON.parse(event.body)

  // Update the comments
  comments.push({
    author: newComment.author,
    email: newComment.email,
    message: newComment.message,
    date: Date.now(),
  })

  // Use the Contents API to save the changes
  const res = await fetch(api, {
    method: "PUT",
    headers: {
      Authorization:
        "Basic " + Buffer.from(user + ":" + auth).toString("base64"),
    },
    body: JSON.stringify({
      message: "New comment on " + new Date().toDateString(),

      // Turn that object back into a string and encoded it
      content: Buffer(JSON.stringify(comments)).toString("base64"),

      // Required: the blob SHA of the existing file
      sha: existingFile.sha,
    }),
  }).then(res => res.text())

  callback(null, {
    statusCode: 204,
  })
}
```

## Potential downsides

What if someone spams comments on your website? Well, you'll hit your build time limits pretty fast.

There's also a small window (10-100s of milliseconds between API calls) where two people comment at the same time and the older comment will be overwritten.

The fix for both of these is to alter our serverless function to open a pull-request with the comment change. Comments are now delayed but we've protected ourselves from malicious behavior and we can also screen comments for appropriateness. We won't lose any data but might rarely need to handle merge conflicts.

## My Netlify review

Netlify are betting big on [Jamstack](https://jamstack.org/) applications. It's a bet I would make too.

Their developer experience (DX) is up there with the best right now. It's rare I read about a product _just working_ and then it ends up doing so! Recently, Netlify's snappy deployments let me rush out changes to fix live issues within minutes.

What does this mean for their future success? Well, Tiny.cloud [points out](https://www.tiny.cloud/blog/developer-experience/) that:

> DX is kind of a big deal. Developers can play a huge role in the uptake of your product, especially when you consider they are likely to provide guidance on what tools their organization should invest in, even though the final decision usually happens at the executive level. 

Netlify's developer tooling lets me create prototypes like the one you're reading about without having to mess with configuration. [My Gatsby website](https://healeycodes.com/) is hosted with their generous free tier and transferring and hosting it has been hiccup-free.

I recommend them.
