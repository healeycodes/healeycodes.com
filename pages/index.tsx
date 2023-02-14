import siteConfig from "../siteConfig.json";
import meAvatar from "../public/assets/avatar-v1.jpg";

import Image from "next/image";
import Link from "next/link";

import Layout from "../components/layout";
import PostList from "../components/postList";
import Newsletter from "../components/newsletter";

import { getSortedPostsData, getPostData } from "../lib/posts";
import { generateRssFeed } from "../lib/rss";
import { getAllNotes } from "../lib/notes";

export async function getStaticProps() {
  await generateRssFeed();

  const allPostsData = getSortedPostsData();
  // Count posts
  const words = allPostsData.reduce(
    (count, current) =>
      count + getPostData(current.id).content.split(" ").length,
    0
  ) +
  // Count notes
  getAllNotes().reduce((count, current) => count + current.content.split(" ").length, 0)
  return {
    props: {
      allPostsData,
      description: siteConfig.SITE_DESC,
      words,
    },
  };
}

export default function Home({ allPostsData, description, words }) {
  function numberWithCommas(x: number) {
    // https://stackoverflow.com/a/2901298
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  return (
    <Layout title="Blog" description={description}>
      <main>
        <div className="avatar">
          <Image
            width={140}
            height={140}
            src={meAvatar}
            alt="Andrew Healey."
            quality={100}
            placeholder="blur"
            priority={true}
            style={{ borderRadius: '0.25em' }}
          />
          <p className="avatar-text">
            Hey, I'm Andrew Healey. I'm a software engineer at Vercel, and I'm interested in the joy of computing. I've written{" "}
            {numberWithCommas(words)} words on this{" "}
            <a href={siteConfig.REPO_URL}>open source</a> website.
          </p>
        </div>

        <div className="posts">
          <section className="posts-section">
            <h2>
              Recent (
              <Link href="/articles" legacyBehavior>{`${allPostsData.length} articles`}</Link>)
            </h2>
            <PostList posts={allPostsData.slice(0, 3)} />
          </section>
          <section className="posts-section">
            <h2>Popular</h2>
            <PostList
              posts={allPostsData.filter((post) =>
                siteConfig.PINNED_POSTS.includes(post.id)
              )}
            />
          </section>
        </div>
      </main>
      <footer>
        <Newsletter />
      </footer>
      <style jsx>{`.avatar {
          display: flex;
          align-items: center;
          padding-top: 36px;
          padding-bottom: 6px;
        }
        .avatar-text {
          margin-left: 28px;
          max-width: 480px;
        }
        .posts {
          display: flex;
        }
        .posts-section {
          flex: 1;
          padding-right: 20px;
        }

        @media only screen and (max-width: ${siteConfig.LAYOUT_WIDTH}px) {
          .avatar {
            display: block;
            padding-top: 38px;
          }
          .avatar-text {
            margin-left: initial;
            margin-bottom: 0px;
          }
          .posts {
            display: block;
          }
          .posts-section {
            padding-right: 0px;
          }
        }
      `}</style>
    </Layout>
  );
}
