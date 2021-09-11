import fs from "fs";
import { Feed } from "feed";
import { getSortedPostsData } from "./posts";

export async function generateRssFeed() {
  const posts = await getSortedPostsData();
  const siteURL = process.env.SITE_URL;
  const date = new Date();
  const author = {
    name: process.env.AUTHOR_NAME,
    email: process.env.AUTHOR_EMAIL,
    link: process.env.AUTHOR_TWITTER,
  };

  const feed = new Feed({
    title: process.env.SITE_TITLE,
    description: process.env.SITE_DESC,
    id: siteURL,
    link: siteURL,
    updated: date,
    generator: "Feed for Node.js",
    feedLinks: {
      rss2: `${siteURL}/feed.xml`,
    },
    author,
  });

  posts.forEach((post) => {
    const url = `${siteURL}/${post.id}`;

    feed.addItem({
      title: post.title,
      id: url,
      link: url,
      description: post.description,
      author: [author],
      contributor: [author],
      date: new Date(post.date),
    });
  });

  fs.mkdirSync("./public", { recursive: true });
  fs.writeFileSync("./public/feed.xml", feed.rss2());
}
