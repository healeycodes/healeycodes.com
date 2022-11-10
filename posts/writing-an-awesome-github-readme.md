---
title:  "How to Write an Awesome GitHub README"
date:   "2019-04-14"
tags: ["career"]
path: "github/beginners/tutorial/productivity/2019/04/14/writing-an-awesome-github-readme.html"
description: "Attract and educate."
---

I read through the earliest README I could [find](http://pdp-10.trailing-edge.com/decuslib10-04/01/43,50322/read.me.html). Written in 1975 by William J. Earl at the CS department of UIC. The text is a little dry but also surprisingly relatable, some 44 years later. _"Due to a bug in the compiler, this function does not compile correctly"_.

A README is a reflection of how a repository is maintained. A good one doesn't necessarily mean an active, bug-free project with perfect tests. But it suggests that the owner cares about **you**, the user (or future maintainer). A good README tells you everything you need to know to use the project and get involved. It _sells_ the project — but concurrently respects a visitor's time by letting them know if they need a different solution.

When using your GitHub profile as part of an application, READMEs are important in a different way. They showcase technical writing skills — the ability to communicate well and put together a software-related document. Expecting someone to dive into your code without providing an abstraction explaining the project is a pretty big ask.

## Clear description

Someone should be able to use your software without reading a line of code.

First, change the default title that GitHub provides — turn `python-ml-project-for-cat-lovers-2` into `Cat Crawler - Classify Cat GIFs`. The next step is explaining your project in its simplest form. Many people use a one-liner at the very top.

> A bot that downloads and indexes Cat GIFs

As you add more content to your lead description, you raise the chance of cognitive overload. After editing the language down, use titles, line breaks, and spacing to further break it up. (Two new lines for a new paragraph and `<br>` for a break. [Cheatsheet](https://help.github.com/en/articles/basic-writing-and-formatting-syntax).) Don't shy away from product logos and screenshots. Unlike other technical documentation, multimedia performs well here. For the more esoteric repositories, a background reading section can help.

If your repository is fun or lighthearted then your description should show this! [Strunk & White](https://en.wikipedia.org/wiki/The_Elements_of_Style) have their place but the internet is also a hangout for cool coders being creative. Shoutout to [not-paid](https://github.com/kleampa/not-paid), which slowly fades a website until it becomes invisible at a certain date, should the client not pay their dues.

## Usage

How does someone use your project? If it's an API, have a section of code with the most basic interaction. Your full documentation can be further down the page or at another location. [facebook/react](https://github.com/facebook/react) shows their usage with an example — the smallest way someone could use React. Use single backticks to quote code, and three backticks on new lines for codes blocks. Put the language right after the first three backticks for specific highlighting.

```jsx
function HelloMessage({ name }) {
  return <div>Hello {name}</div>;
}

ReactDOM.render(
  <HelloMessage name="Taylor" />,
  document.getElementById('container')
);
```

Show the output of this interaction. If you can use a GIF in any way then do so! GIFs are easy for humans to parse and they transmit a lot of data into your reader's mind. [alexfoxy/laxxx](https://github.com/alexfoxy/laxxx), a library for smooth web animations, does this perfectly.

![alexfoxy/laxxx](laxjs.gif)

I use the open source tool [ShareX](https://getsharex.com/) to create my GIFs. It's as simple as selecting an area of your screen. Another solution I recommend, also open source, is [LICEcap](https://www.cockos.com/licecap/).

## Installing

Hopefully, after seeing your project in action, your visitor wants to install it. This section is sometimes titled as _Getting Started_. Every project should have this, even if it's just `npm install catcrawler`. If it's a static site then say so! `host the parent dir on a webserver`. Assume knowledge of the basic tools. You don't need to explain what `pip` or `npm` is but you should list every command that you would run on a new setup.

[DEV](https://github.com/thepracticaldev/dev.to/#getting-started) has a thorough section for getting a build up and running, which is a great model to follow if you're aiming to be accessible. It's good practice to spin up a virtual machine and try to replicate your installation guide — assuming you don't have automatic build tests to do this for you.

## Badges

![example badge](example-badge.png)

Mostly standardized by [badges/shields](https://github.com/badges/shields), GitHub badges are one of the first things a visitor sees as they scroll down. Build status badges describe the stability of a project. Other badges might show the activity of a repository with commits per month, or the number of maintainers. They aren't compulsory but much like GIFs, they are a huge bonus.

[shields.io](https://github.com/badges/shields) have an API for creating your own badges, and they also have an npm [package](https://www.npmjs.com/package/gh-badges) which is pleasant to use. I picked it up a few weeks ago and had some badges up and running in under an hour! Another npm alternative is [badger](http://badges.github.io/badgerbadgerbadger/). Python has [pybadges](https://github.com/google/pybadges) by Google.

If you're looking to earn your first `build: passed` badge, I wrote an [article](https://dev.to/healeycodes/earn-a-build-passing-badge-on-github--testing-your-express-app-with-travis-ci-1m2f) here on DEV that walks you through getting started with continuous integration on GitHub.

## Contributing

If you're seeking them, a section for contributors is helpful and welcoming. There is a GitHub [standard](https://help.github.com/en/articles/setting-guidelines-for-repository-contributors) for adding a `CONTRIBUTING.md` file to the root dir. This may include a code of conduct and general guidelines for finding issues and building a pull request. A lot of beginners are anxious about the process of helping out open source projects and walking them through step-by-step can alleviate some of this. If you're not sure where to start, I recently saw a code of conduct [generator](https://github.com/uyouthe/code-of-conduct) which I thought was pretty neat. I know that some of my friends will only support repositories with strict guidelines and rules for maintainer interaction.

## License

A license is the first thing I look for when I'm seeking a solution at work. When creating a repository through GitHub, there is an option for choosing a license which will generate a `LICENSE.md` file for you. GitHub also has a [page](https://help.github.com/en/articles/licensing-a-repository) on this file — and they are the creators of [choosealicense.com](https://choosealicense.com/), a fantastic guide walking you through all the options. I personally use MIT for my open source code. Some people have strong opinions about licensing, especially when it comes to [GPL](https://tldrlegal.com/license/gnu-general-public-license-v3-(gpl-3)). _"Any modifications to or software including (via compiler) GPL-licensed code must also be made available under the GPL along with build & install instructions."_

## Templates

[There](https://github.com/RichardLitt/standard-readme) [are](https://github.com/zalando/zalando-howto-open-source/blob/master/READMEtemplate.md) [many](https://github.com/noffle/common-readme) README templates out there. They're great in a pinch but I've found that smaller projects don't fit neatly into this kind of box and the resulting text comes across a little cold. Mature projects benefit more from templates but given the amount of developer time that has probably into the software, it's worth it to have a custom solution.

[This](https://gist.github.com/PurpleBooth/109311bb0361f32d87a2) is my favorite as it's straight to the point and also has two subsections on tests. If you have any tests, this should be mentioned in your README. When cloning a project, running tests is the first thing I do to make sure my setup is ready for development.

## Other sections

Once you're past all the important sections, fill your README to your heart's delight. I may be in the minority but I love browsing GitHub looking for new things and discovering how they're built. I appreciate a detailed repository with lots of example code. For me to get involved with a project, it's important to see that the maintainers care at least as much as I do.

Explore [trending](https://github.com/trending) for your programming language to get an idea for the standard layout. For inspiration, check out two of my recent favorites [Gatsyby](https://github.com/gatsbyjs/gatsby) and [lax.js](https://github.com/alexfoxy/laxxx). Most of all, make your documentation sing.
