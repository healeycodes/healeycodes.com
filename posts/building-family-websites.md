---
title: "Building Family Websites"
date: "2023-05-29"
tags: ["javascript"]
description: "The highest user-joy-per-visit than any other project I'll ever work on."
---

We run a few websites just for our friends and family. Like a recipe website with all of our favourite recipes (mostly stolen from other recipe websites because recipe websites are the worst), and a family album website (so we don't need to share pictures via social media), and a few other small experiments.

I built the current version of the album website in a few hours and my family visit it often to see what we've all been up to. It's the worst software I've ever written but it also has the highest user-joy-per-visit than any other project I'll ever work on.

Here's why it's the worst: every time we want to update it, we need to log onto Google Drive (where we store our photos), download a zip file, extract the photos, run two scripts (turn HEIC files into JPG, resize with a max width), run the build script, and push everything into source control (the HTML pages and the images).

There's a few problems here. It's manual when it should be automated, and storing large binary files in source control is bad practice and we'll run into some kind of GitHub limit soon. Also, it's annoying to wait for the image processing scripts to run and I wish they ran in the cloud.

It's also riddled with tech debt because I quickly built it after our first child was born – and then quickly rewrote it in the days following our second child because it didn't support multiple children!

The album names in Google Drive are written in natural language. I haven't been able to find a library that can parse the names so the ordering is hardcoded (!) in a `config.json` file:

```jsx
{
  "albumOrder": [
    "two years and four months old",
    "two years and three months old",
// etc.
```

I have to update that JSON file every month.

## The Rewrite

My wife is attending the [Recurse Center](https://www.recurse.com/) at the moment and has taken on the challenge of rewriting the album website. She has removed everything manual about it. A scheduled GitHub workflow pulls the latest images and rebuilds it at midnight. She also migrated the existing albums to use a sensible naming scheme so that any sort function *just works*.

There was a bump in the road about midway through the rewrite when she found that Google Drive's ratelimiting was a little aggressive and adding exponential backoff meant builds didn't complete in time.

We brainstormed and came up with an idea to cache the immutable HTTP requests in a service. We realized that, given we never edit or delete images, they can live in a permanent cache.

I built a pull-through cache with Deno that accepted URLs (Google Drive supports sending the API as a query param) and then either reads from disk or makes an upstream request.

The core logic is commented below.

```typescript
// Keys are stored in memory and the value
// is stored on disk at `./store/$key`.
// The map value is a promise so that concurrent requests
// only make a single upstream request.
const store: Map<string, Promise<void>> = new Map();
export async function loadStore() {
  for await (const file of Deno.readDir(STORE_PATH)) {
    if (file.isFile) store.set(file.name, Promise.resolve());
  }
}

export async function proxy(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (url === null) {
    return new Response("missing `url` query", { status: 400 });
  }

  // Encode the URL via URI encoding to get a valid filename.
  // Hashing or base64ing would work too but URI encoding
  // means that it's human-readable!
  const filename = encodeURIComponent(url);

  console.log(url, store.has(filename) ? "hit" : "miss");
  if (!store.has(filename)) {
    // For URLs not in our cache, store them with a promise
    // so that concurrent requests will await
    store.set(
      filename,
      (async () => {
        try {
          const res = await fetch(url);
          const file = await Deno.create(join(STORE_PATH, filename));

          // Stream the upstream request to disk
          await res.body?.pipeTo(writableStreamFromWriter(file));
        } catch (e) {
          console.log(url, e);
          store.delete(filename);

          // Throw an error so that concurrent requests
          // will all error (and can optionally retry)
          throw e;
        }
      })(),
    );
  }

  // Either wait for an existing upstream request to complete
  // or skip over the already resolved promise
  await store.get(filename);
  const file = await Deno.open(join(STORE_PATH, filename));
  return new Response(readableStreamFromReader(file));
}
```

I was pretty happy with this MVP pull-through cache; it's got some cute and concise concurrent logic, and worked great in our tests.

But my wife came up with an easier solution that required no code (which, let's be honest, is the ultimate goal). She moved the photo store to Dropbox – which supports [downloading a zip of an entire folder](https://www.dropbox.com/developers/documentation/http/documentation#files-download_zip) (Google Drive let's you do this in the browser but not via API sadly).

## Upcoming Projects

On our recipe website, we store recipes in markdown files with metric units (e.g. milliliters and celsius). But, even though I might not agree with the imperial system, I still want to provide a good experience for my friends and family who live in the US.

Until recently (I think OpenAI released their first API in 2020), this would have been a thorny problem to solve, kinda like internationalization, and the recipe files would need markers or macros to handle metric and imperial substitutions.

However, the prompt "rewrite this recipe from metric to imperial units" does the entire job. The harder parts are things like wiring together API calls at build time and creating a toggle button to let people switch between the two.

Another AI project I want to build is getting our bin pickup times programatically. I was inspired when I saw Alasdair Monk build a deadly cool [Hampstead Heath Pond Bot](https://ponds.alasdairmonk.com/) that tracks the temperatures of the ponds and Lido at Hampstead Heath. It parses human-written tweets from a government twitter account through a custom ML model.

In the case of my personal bin app idea, there's a website that provides local bin collection information in natural language – and I figure I can just scrape it and get a large language model to parse it and pick out the right information. I'm hopeful but need to do more prototyping.

In [An App Can Be a Homecooked Meal](https://www.robinsloan.com/notes/home-cooked-app/), Robin Sloan writes about a messaging app he built for, and with, his family.

> Have you heard about this new app called BoopSnoop?
> 
> It launched in the first week of January 2020, and almost immediately, it was downloaded by four people in three different time zones. In the years since, it has remained steady at four daily active users, with zero churn: a resounding success, exceeding every one of its creator's expectations.

For me, this is peak software making. Deeply understanding your users and generously spreading joy.
