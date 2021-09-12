import siteConfig from "../siteConfig.json";
import meAvatar from "../public/assets/avatar-v1.jpg";

import Image from "next/image";
import Link from "next/link";

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
            className="avatar-image"
            width={100}
            height={100}
            src={meAvatar}
            alt="Andrew Healey."
            quality={100}
          />
        </div>
        <p className="avatar-text">
          Hey, I'm Andrew Healey. I'm a software engineer and writer. I build
          things that make people's lives easier. This website is{" "}
          <a href={siteConfig.REPO_URL}>open source</a>.
        </p>
        <section>
          <h2>Recent</h2>
          <PostList posts={allPostsData.slice(0, 3)} />
          <Link href="/articles">
            {`Read all ${allPostsData.length} articles →`}
          </Link>
        </section>
        <section>
          <h2>Most Popular</h2>
          <PostList
            posts={allPostsData.filter((post) =>
              siteConfig.PINNED_POSTS.includes(post.id)
            )}
          />
        </section>
      </main>

      <footer></footer>
      <style jsx global>{`
        .avatar {
          display: inline;
        }
        .avatar-image {
          border-radius: 10px;
        }
        .avatar-text {
          display: inline;
        }
      `}</style>
    </Layout>
  );
}
