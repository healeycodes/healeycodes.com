---
title: "CodeGuessr"
date: "2022-11-20"
tags: ["javascript"]
description: "Building a guessing game for popular open source projects."
---

I recently shipped [CodeGuessr](https://codeguessr.vercel.app/). It's like GeoGuessr .. but for code. Given a random code snippet, you have to guess which popular open source project it belongs to.

![A notebook sketch of the CodeGuessr UI, and the final UI in a web browser.](codeguessr.jpeg)

It took about a day to go from a quick sketch to live-on-the-net. It's similar in size to another tech quiz I built called [TLD Quiz](https://tld-quiz.vercel.app/). The development for CodeGuessr looked like this:

- Searched "top github repos by stars" and found [https://gitstar-ranking.com](https://gitstar-ranking.com/)
- Manually picked 100 repositories from the top 200
- Created a Next.js app (`npx create-next-app@latest`)
- Wrestled with the GitHub API to get the contents of a random file
- Wrote the game logic with a few `useState`s and `useEffect`s
- Deployed to Vercel with zero config (shout-out to my day job)

My initial plan had gameplay that was closer to that of GeoGuessr, where the user would be shown a few lines and then would lose points as they expanded their search. Or, they could browse other files from the repository (losing points for each additional file they viewed). I didn't go for these because the payoff didn't seem worth it. The game isn't super skill-based, it's kinda based on having good luck, and knowing about a few popular projects. Fancy features that assume that there is skill involved would take away the whimsy.

## Getting a Random GitHub File

Originally, I had the GitHub API logic in a [Next.js API Route](https://nextjs.org/docs/api-routes/introduction) and I was about to add a GitHub token to authenticate my API requests when I realised:

1. If thousands of people load the website (I wish, right?) then I'll be rated limited
2. GitHub's API allows a small number of unauthed requests per minute (like 30 or 60?)

Rate limiting is handled by IP address. Since someone can play CodeGuessr a few times and not hit the rate limit (and this scales because most users have different IPs), I moved all the API logic client-side. Out of paranoia, just in case GitHub does some kind of rate limiting by checking the referrer, I set `referrerPolicy: 'no-referrer'` on my requests.

With my manually compiled list of repository names like `tensorflow/tensorflow` and `twbs/bootstrap`, I needed to get a random file from these projects and, unsurprisingly, there isn't a "random file API" like `repos/{owner}/{repo}/random` ha ha.

I searched "get random github file" and came across [this suggestion](https://github.com/orgs/community/discussions/24597#discussioncomment-3244605) — which is to get a file list by searching for a space character `%20` (most code files contain a space) from a repository. Then you get a response like this:

```json
{
  "items": [
    {
      "url": "https://api.github.com/repositories/133442384/contents/cli/npm/resolution/graph.rs"
    },
    ...
  ],
  ...
}
```

We can pick a random item and hit its `url` to get the download link:

```json
{
  "download_url": "https://raw.githubusercontent.com/denoland/deno/5867a12920e95265a6532f1b4ee358d9b4ed4599/cli/npm/resolution/graph.rs",
  ...
}
```

Then we can download the source code from `download_url` and display it to the user. This method feels like we're making one too many requests to get the file content but I believe it's due to things like submodules — the search API can't return "download links" but it can return "item pointers" from which we can get a download link. Let me know if there's a better way.

I track the already-seen repositories so avoid the rare case of getting the same project twice in a game.

## User Interface

Armed with a function to get a random code snippet, I needed just enough UI to make the game playable. It didn't need to be polished, I just wanted to ship this idea and send it to a few friends.

The code snippet is rendered with `<pre>` and `<code>` tags so that [highlight.js](https://highlightjs.org/) can find it in the DOM.

```jsx
<pre className={styles.snippet}>
  <code>{snippet}</code>
</pre>
```

Ideally, I would have spent some time integrating highlight.js in my React code so that I don't have something-that's-not-React mutating the DOM. Whenever the snippet changes, highlight.js greps the page and syntax highlights all the code blocks it finds.

```jsx
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';

// ..

useEffect(() => {
  hljs.highlightAll()
}, [snippet])
```

While highlight.js supports 197 languages, the automatic language detection isn't perfect. There's an optimization that I didn't try, where I could use the file extension of the code file to "guess" at the language.

Users will need to be vaguely familiar with popular open source projects but I can't expect them to know how to type the exact form of the owner/repository combo. I needed a search and select component and I picked the first one I came across: [react-select-search](https://www.npmjs.com/package/react-select-search).

This library comes with necessary styling to make the select-search component functional but it also bundles in some opinionated decisions about color and hover styles. Normally, this would be a little annoying as I would need to undo these decisions and plug in my own design system. Except I have no design system; just plain HTML elements. So I did the *opposite* and copied the opinionated styles so that the rest of the UI looked cohesive!

In true MVP fashion, after finishing the tenth round of the game there isn't a "game completed" modal, or a replay button. Instead I just hide the snippet and alter the guess text to say: *Thanks for playing! Refresh to play again :)*

## On Gameplay

Open source code files often have a comment header that literally says the project name. I considered two workarounds for this: blurring the top of the snippet, or search and replacing the project name. Both of these ideas seemed less fun than giving people a few easy guesses.

The most fun snippets to guess are those with little clues that hint towards the project e.g. via variable naming, the language itself (like [JuliaLang/julia](https://github.com/JuliaLang/julia)), or a comment that suggests what platform the code is running on.

One big red herring is any file that has `react` everywhere. There's many popular repositories that are libraries *for* React but *aren't* [facebook/react](https://github.com/facebook/react).

The way the files are found (hitting the search API, filtering by those with a space character) may be introducing some bias in the results. The API call is paginated and a random result from the first page is chosen. I imagine that the search API might have some heuristics to return popular files.

Overall, people are scoring higher than I thought they would! But I‘ve only shared the link with people who are familiar with a good chunk of these projects.

The highest score among my friends so far is 7 (out of a possible 10).
