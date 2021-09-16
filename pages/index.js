import siteConfig from "../siteConfig.json";
import meAvatar from "../public/assets/avatar-v1.jpg";

import Image from "next/image";
import Link from "next/link";

import Layout from "../components/layout";
import PostList from "../components/postList";
import Newsletter from "../components/newsletter";

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
  function numberWithCommas(x) {
    // https://stackoverflow.com/a/2901298
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  return (
    <Layout title="Home" description={description}>
      <main>
        <div className="avatar">
          <Image
            width={130}
            height={130}
            src={meAvatar}
            alt="Andrew Healey."
            quality={100}
          />
          <p className="avatar-text">
            Hey, I'm Andrew Healey. I'm a software engineer and writer. I build
            things that make people's lives easier. I've written{" "}
            {numberWithCommas(words)} words on this{" "}
            <a href={siteConfig.REPO_URL}>open source</a> website.
          </p>
        </div>

        <div className="posts">
          <section className="posts-section">
            <h2>
              Recent (
              <Link href="/articles">{`${allPostsData.length} articles`}</Link>)
            </h2>
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
      </main>
      <footer>
        <Newsletter />
      </footer>
      {/* This is global to be able to style <Image />*/}
      <style jsx global>{`
        .avatar {
          display: flex;
          align-items: center;
          padding-top: 36px;
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

        @media only screen and (max-width: 46rem) {
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
