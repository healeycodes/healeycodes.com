---
title: "Gatsby Sparks Joy"
date: "2020-01-11"
tags: ["javascript"]
description: "Migrating from Jekyll to Gatsby."
---

I migrated from Jekyll to Gatsby recently and so far I've had a really neat time. The whole process took about a week of casual coding (a few hours here and there). The Gatsby ecosystem enabled me to quickly add a few features to my blog that I thought were missing; dark mode, better syntax highlighting, and the ability to design with components.

Gatsby starters are boilerplate Gatsby sites [maintained by the community](https://www.gatsbyjs.org/docs/starters/). One of the reasons I love them is that they use **Semantic HTML**. This is great because:

- It helps with search engine optimization — web crawlers are able to understand which parts of your pages are important.
- It helps with accessibility — for people who use non-traditional browsers and screenreaders.
- It helps with maintenance — I was able to pick up a starter and understand what the different parts of the template referred to due to the semantic tags.

Take this example from `gatsby-starter-blog` — the most popular starter and the base for my [current blog](https://healeycodes.com) (in-line styling removed).

```jsx
<article>
  <header>
    <h1>{post.frontmatter.title}</h1>
    <p>{post.frontmatter.date}</p>
  </header>
  <section dangerouslySetInnerHTML={{ __html: post.html }} />
  <hr />
  <footer>
    <Bio />
  </footer>
</article>
```

I've seen quite a few beginner web development resources that skip on semantic HTML and encourage what I'll call 'div-spamming'. The HTML5 spec weighs in on this [issue](https://html.spec.whatwg.org/multipage/grouping-content.html#the-div-element).

> Authors are strongly encouraged to view the div element as an element of last resort, for when no other element is suitable. Use of more appropriate elements instead of the div element leads to better accessibility for readers and easier maintainability for authors.

# Coming From Jekyll

I started blogging with Jekyll a year ago because I hosted my blog on GitHub pages and it was the static site generator with the least friction. It was a great choice at the time as it enabled me to get up and running straight away.

I've seen many people warning others (engineers in particular) to avoid rolling their own blogging solutions. The advice is that you should start writing and publishing first. This is because building a blog can function as procrastination and who knows if you actually enjoy blogging (the activity) or the idea of having blogged (the achievement).

With Jekyll, I used basic markdown and transferring written content to Gatsby wasn't too hard. Images had to be moved from one disorganized folder into separate folders. URLs were a bit of a pain and took 1.5hrs of manual work. I wanted all of my old posts to keep their location on the web so I added a front matter tag called `path` to override the default naming scheme. My old URLs were too long and included categories (which I'm still to implement) so the path scheme from now on will be the title only.

I extended `onCreateNode` in `gatsby-node.js`. I'm not sure if this is the best practice way to implement this feature but it works great so far. 

```js
exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions

  if (node.internal.type === `MarkdownRemark`) {
    // Check to use legacy path
    const slug = node.frontmatter.path || createFilePath({ node, getNode })
    createNodeField({
      node,
      name: `slug`,
      value: slug,
    })
  }
}
```

# Syntax Highlighting

Code excerpts show up in a lot of my posts and I like them to be easy to parse.

I installed [gatsby-remark-prismjs](https://www.gatsbyjs.org/packages/gatsby-remark-prismjs/) for syntax highlighting and was up and running in about an hour with another hour spent tinkering styles to match my light/dark mode toggle. I use [New Moon Theme](https://github.com/taniarascia/new-moon) by Tania Rascia for my code excerpts. I couldn't find a version of the theme for PrismJS so I extracted the styling from Tania's (MIT-licensed) [blog](https://www.taniarascia.com/). My site's general color theme is custom.

One of the reasons I'm mentioning plugins is that I found it hard to integrate them with Jekyll and I feel like it wasn't just my inexperience with Ruby that was holding me back. Perhaps it's due to the hype surrounding Gatsby which means there are up-to-date resources. I've contributed one (small) open-source fix to the Jekyll project and I would still recommend it for anyone looking for a sensible system for HTML/CSS that has wide community support e.g., GitHub pages, Netlify, etc. If you want to avoid JavaScript, Jekyll is the way to go.

For my light/dark mode I use `gatsby-plugin-dark-mode` which works well out of the box and has good (but not great) documentation. For theme-toggling, I researched and found that a common pattern was to declare CSS variables in body scope and then to override these variables in _class_ scope. This way, the `dark` class can be added to the `<body>` tag which means `dark` CSS variables take precedence due to CSS Specificity. Classes are then toggled on and off the `<body>`, storing the preference in local browser storage.

```css
body {
  --bg: #eaeaeb;
  --textNormal: #414158;
}

body.dark {
  --bg: #21212c;
  --textNormal: #eaeaeb;
}
```

### Designing With Components

The first React component I wrote for my blog was for wrapping the `<ThemeToggler />` from `gatsby-plugin-dark-mode` into a component. It switches between a sun and a moon to let the user know which theme can be switched to. The base for this is the example code from the [docs](https://www.gatsbyjs.org/packages/gatsby-plugin-dark-mode/).

```jsx
<ThemeToggler>
  {({ theme, toggleTheme }) => (
    <label style={{ cursor: `pointer`, opacity: 0.8 }}>
      <input
        style={{ display: `none` }}
        type="checkbox"
        onChange={e => toggleTheme(e.target.checked ? "dark" : "light")}
        checked={theme === "dark"}
      />
      {theme === "dark" ? `☀️` : `🌑`}
    </label>
  )}
</ThemeToggler>
```

I've never used React as part of a blogging solution. I like the hierarchical UI approach that's encouraged. Including CSS-in-JS makes sense for the scale of my website. It's easier for me to reason about and quickly tinker with.

# How I Deploy

My website source exists in a GitHub repository. I write in markdown in VS Code, commit, and push. Netlify is connected to the repository and builds and deploys every commit to master. The build process takes 2m50s (30s locally).

I previously used Netlify for Jekyll and setting up either static site generator involved about 10 clicks and entering one or two build commands. The walkthrough covers everything.

Overall, the Gatsby experience has been very enjoyable. Everywhere I look in my online bubble (Twitter, DEV, lobste.rs) people are talking about Gatsby. It's nice to be part of the crowd.

I'm also happy that my site (despite being React-based) works fine without JavaScript enabled (barring the theme toggle, which I might hide with `<noscript>` styling).
