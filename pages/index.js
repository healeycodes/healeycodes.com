import siteConfig from "../siteConfig.json";
import meAvatar from "../public/assets/avatar-v1.jpg";

import Image from "next/image";

import Layout from "../components/layout";
import PostList from "../components/postList";

import { getSortedPostsData } from "../lib/posts";
import { generateRssFeed } from "../lib/rss";

export async function getStaticProps() {
  await generateRssFeed();
  const allPostsData = getSortedPostsData();
  return {
    props: {
      allPostsData,
      description: siteConfig.SITE_DESC,
    },
  };
}

export default function Home({ allPostsData, description }) {
  return (
    <Layout title="Home" description={description}>
      <main>
        <div className="avatar">
          <Image
            className="inline-image"
            src={meAvatar}
            alt="Andrew Healey."
            quality={100}
          />
        </div>
        <p className="avatar-text">
          Hey, I'm Andrew. I'm a software engineer and writer. I build things
          that make people's lives easier.
        </p>
        <section>
          <h2>Most Popular</h2>
          <PostList
            posts={allPostsData.filter((post) =>
              siteConfig.PINNED_POSTS.includes(post.id)
            )}
          />
        </section>
        <section>
          <h2>Recent</h2>
          <PostList posts={allPostsData.slice(3)} />
        </section>
      </main>

      <footer></footer>
      <style jsx>{`
        .avatar {
          display: inline;
        }
        .avatar-text {
          display: inline;
        }
      `}</style>
    </Layout>
  );
}
