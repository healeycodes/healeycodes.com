import siteConfig from "../siteConfig.json";
import fs from "fs";
import { Feed } from "feed";
import { getSortedPostsData } from "./posts";

export async function generateRssFeed() {
  const posts = await getSortedPostsData();
  const date = new Date();
  const author = {
    name: siteConfig.AUTHOR_NAME,
    email: siteConfig.AUTHOR_EMAIL,
    link: siteConfig.AUTHOR_TWITTER,
  };

  const feed = new Feed({
    title: siteConfig.SITE_TITLE,
    description: siteConfig.SITE_DESC,
    id: siteConfig.SITE_URL,
    link: siteConfig.SITE_URL,
    updated: date,
    generator: "Feed for Node.js",
    feedLinks: {
      rss2: `${siteConfig.SITE_URL}/feed.xml`,
    },
    author,
  });

  posts.forEach((post) => {
    const url = `${siteConfig.SITE_URL}/${post.id}`;

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
