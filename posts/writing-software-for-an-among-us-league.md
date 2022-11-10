---
title: "Writing Software for an Among Us League"
date: "2020-11-13"
tags: ["javascript"]
description: "Making a casual game more competitive and arguing with my friends about Elo systems."
---

Lately, I've been playing a lot of [Among Us](https://en.wikipedia.org/wiki/Among_Us) with my friends. It's a refreshing change of pace from the competitive FPS titles that we usually play. However, we've managed to inject a 'healthy' dose of competitiveness into our games in the form of a league that I built some software for. 

We recently crossed the 1000 games mark and players have been making feature requests and also submitting PRs! It has been open sourced at [healeycodes/among-us-friends](https://github.com/healeycodes/among-us-friends).

The league website is a React/Node/Express application that calculates a player's [Elo rating](https://en.wikipedia.org/wiki/Elo_rating_system) — a relative measure of one player's skill against another — as well as other performance statistics like crew/imposter win rate. It ranks players and graphs their recent performance on the home page. 

![The home page - a list of players, their win/loss rate, and Elo charts](preview.png)

When a player goes to their auto-generated player page, they can see a history of their games and who played on each side, the amount of Elo they won or lost each game, and an Elo history graph for the whole season. They also have a trophy section. Some of the trophies include: win streaks (5, 10, 15), being over 1300 Elo at the end of the season, best crew, best imposter, and more. As well as dynamic trophies, there are also manual trophies like Most Improved (which we vote on) and being a code contributor to the project.

![A player's trophy section](preview-trophies.png)

I manually track each game we play in a Google Sheets spreadsheet. This data is brought into the application via the Google Sheets API v4. To set this up, I grabbed the spreadsheets ID (which can be copied straight from the URL bar) and created a restricted API key via Google Console.

The data arrives in a series of rows with each row representing one game. An Among Us game can be split up into three parts of data. 

- The crew (7 or 8 players)
- The imposters (2 players)
- The winner (crew or imposters)
- The map short name (skeld, polus, mira)

Since a spreadsheet cannot be efficiently queried we bring in all the rows on every request (Sheets API usage is unlimited and free). If performance is ever an issue, caching can be added.

A player object is built for each person in the league and the following information is calculated.

- Crew wins/losses
- Imposter wins/losses
- Current Elo
- Elo history
- Their game history

A season object is built for each season that has been played (including the current season). This has information about trophies and other general stats such as map win/loss data.

## Elo ratings

For Elo calculations, I use the npm package `elo-rating`. In the Elo rating methodology, the _K-factor_ is the maximum possible adjustment for a game. I have based the league's system off the International Chess Federation's rules. Before a player reaches 30 games, their rating is more volatile. After 30 games, their K-factor drops from 40 to 20.

Elo was designed for games with two players. I was initially unsure how to solve the problem of Among Us having different team sizes. Other people have created rating systems for Among Us that separate a measure of a player's skill into crew/imposter. However, I made a product decision to reduce a player's performance down to a single number. This number is the average of a player's hidden crew Elo and hidden imposter Elo.

We alter our game settings (e.g. crew vision, kill cooldown) over time keep the game fun for impostors (so, making it harder for crew). By tracking map statistics, we have found data that goes against our commonly held beliefs. We thought The Skeld was easier to win as imposter than on Polus but it's actually the inverse (by ~10%).

Elo systems in video games are not tuned to be mathematically perfect but to reward and encourage players — a mixture of fun and correctness. Read more about this topic in [Analyzing Starcraft 2's Ranking System](http://sirlingames.squarespace.com/blog/2010/7/24/analyzing-starcraft-2s-ranking-system.html) by Sirlin.

We made the Elo system _less fair_ for players by rewarding those who play more with a tiny amount of Elo. Players that don't play for a long time in a season will have their Elo slowly decay over time. The players voted for these rules.

```javascript
const EloRating = require("elo-rating");

function EloChange(games) {
  // Based on https://ratings.fide.com/calculator_rtd.phtml
  // K = 40 for a player with less than 30 games
  // K = 20 afterwards
  const K = games > 30 ? 20 : 40;
  // From playerA's perspective, how much can be won or lost
  return function (playerA, playerB) {
    return [
      EloRating.calculate(playerA, playerB, true, K).playerRating - playerA,
      EloRating.calculate(playerA, playerB, false, K).playerRating - playerA
    ];
  };
}

// The tests for this look like:
// For new players
let eloChange = EloChange(0);
expect(eloChange(1200, 1400)[0]).toStrictEqual(30);
expect(eloChange(1200, 1400)[1]).toStrictEqual(-9);
// For everyone else
eloChange = EloChange(31);
expect(eloChange(1400, 1200)[0]).toStrictEqual(4);
expect(eloChange(1400, 1200)[1]).toStrictEqual(-15);
```

The frontend styling is mostly [water.css](https://watercss.kognise.dev/) with some in-line tweaking. The graphs are from the package [data-ui](https://github.com/williaster/data-ui) which has been depreciated in favor of [visx](https://github.com/airbnb/visx) — however, I found the data-ui examples easier to pick up and plug in.

The backend of the application is tested using Jest (w/ SuperTest for mocking requests to the server). The statistics functions are unit tested. All the tests are ran on commit/PR using GitHub Actions with the default Node YAML file that runs the following command against Node 14.x.

```yaml
    - run: cd back-end && yarn install && yarn test
```

## React

Initially, this application was hosted on Glitch and the pages were vanilla JavaScript. Over time, the league features grew and grew until it was taking a long time to add new functionality. It was also getting harder to onboard new contributors. I chose React because a few of us were familiar with it. I added react-router to handle the different pages (Ranking/Stats/About/Player).

I used Create React App to initialize the front-end and tried not to tweak it too much. With this project, my focus has been on the customers (e.g. my friends) over code quality. This is a refreshing change compared to the rest of my personal projects, where my focus is normally on clean code/testing/great patterns.

All the data comes in via a single `fetch` call to a serverless endpoint. It can take a few seconds to load but then there are no more API calls required. Clicking between the other pages is instant as the entire league data is stored in memory 🏃💨.

## Deployment

I refactored the Express application from Glitch to use [serverless-http](https://github.com/dougmoscrop/serverless-http) and [netlify-lambda](https://github.com/netlify/netlify-lambda). Now, it's a Jamstack app that deploys to Netlify on commits to the `main` branch. We also take advantage of the PR preview deployments.

When I was refactoring Glitch → Netlify I used these resources: [Netlify Functions + Express](https://github.com/netlify-labs/netlify-functions-express), [How to run Express.js apps with Netlify Functions](https://www.netlify.com/blog/2018/09/13/how-to-run-express.js-apps-with-netlify-functions/). One thing that tripped me up was fixing the API calls from the front-end to prepend `.netlify/functions/app/` to the routes.

## The Future

I have onboarded a few people to be able to use the Google Sheets system to add scores but it's tricky and there is no safety or restrictions on entering data. I have been looking at what kind of admin interfaces I could plug in while still using Google Sheets as a data source.
