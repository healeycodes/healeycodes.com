import siteConfig from "../siteConfig.json";
import meAvatar from "../public/assets/avatar-v1.jpg";

import Image from "next/image";
import Link from "next/link";

import Layout from "../components/layout";
import PostList from "../components/postList";

import { getSortedPostsData, getPostData } from "../lib/posts";
import { generateRssFeed } from "../lib/rss";

export async function getStaticProps() {
  await generateRssFeed();
  const allPostsData = getSortedPostsData();
  const words = allPostsData.reduce(
    (count, current) =>
      count + getPostData(current.id).content.split(" ").length,
    0
  );
  return {
    props: {
      allPostsData,
      description: siteConfig.SITE_DESC,
      words,
    },
  };
}

export default function Home({ allPostsData, description, words }) {
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
          <p className="avatar-text">
            Hey, I'm Andrew Healey. I'm a software engineer and writer. I build
            things that make people's lives easier. I've written {words} words
            on this <a href={siteConfig.REPO_URL}>open source</a> website.
          </p>
        </div>

        <div className="posts">
          <section className="posts-section">
            <h2>Recent</h2>
            <PostList posts={allPostsData.slice(0, 3)} />
          </section>
          <section className="posts-section">
            <h2>Most Popular</h2>
            <PostList
              posts={allPostsData.filter((post) =>
                siteConfig.PINNED_POSTS.includes(post.id)
              )}
            />
          </section>
        </div>
        <div className="more-posts">
          <Link href="/articles">
            {`Read all ${allPostsData.length} articles ⟶`}
          </Link>
        </div>
      </main>
      <footer></footer>
      {/* This is global to be able to style <Image />*/}
      <style jsx global>{`
        .avatar {
          display: flex;
          align-items: center;
          padding-top: 38px;
          padding-bottom: 6px;
        }
        .avatar-text {
          margin-left: 16px;
        }
      `}</style>
      <style jsx>{`
        .posts {
          display: flex;
        }
        .posts-section {
          flex: 1;
          padding-right: 20px;
        }
        .more-posts {
          padding-top: 28px;
        }

        @media only screen and (max-width: 46rem) {
          .avatar {
            display: block;
          }
          .avatar-text {
            margin-left: initial;
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
