import siteConfig from "../siteConfig.json";
import Link from "next/link";

import Layout from "../components/layout";
import Date from "../components/date";
import { getSortedPostsData } from "../lib/posts";
import { generateRssFeed } from "../lib/rss";

export async function getStaticProps() {
  await generateRssFeed();
  const allPostsData = getSortedPostsData();
  return {
    props: {
      allPostsData,
      title: siteConfig.SITE_TITLE,
      description: siteConfig.SITE_DESC,
    },
  };
}

export default function Home({ allPostsData, title, description }) {
  const seo = {
    title,
    description,
  };

  return (
    <Layout {...seo}>
      <main>
        <h1 className="title">
          Welcome to <a href="https://nextjs.org">Next.js!</a>
        </h1>
        <section>
          <h2>Blog</h2>
          <ul>
            {allPostsData.map(({ id, date, title }) => (
              <li key={id}>
                <Link href={`/${id}`}>
                  <a>{title}</a>
                </Link>
                <br />
                <small>
                  <Date dateString={date} />
                </small>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer></footer>
    </Layout>
  );
}
