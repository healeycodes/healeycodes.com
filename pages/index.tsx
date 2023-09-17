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

import { popularPosts } from "../data/posts";

export async function getStaticProps() {
  await generateRssFeed();

  const allPostsData = getSortedPostsData();
  // Count posts
  const words =
    allPostsData.reduce(
      (count, current) =>
        count + getPostData(current.id).content.split(" ").length,
      0
    ) +
    // Count notes
    getAllNotes().reduce(
      (count, current) => count + current.content.split(" ").length,
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
            alt="Chever John."
            quality={100}
            placeholder="blur"
            priority={true}
            style={{ borderRadius: "0.4em" }}
          />
          <p className="avatar-text">
            Hi, I am Chenwei Jiang(Chever John). I am a software engineer and
            currently work for SHEIN with both challenges and potential and
            build distributed cloud-native architecture for them. I've written{" "}
            {numberWithCommas(words)} words on this{" "}
            <a href={siteConfig.REPO_URL}>open source</a> website.
          </p>
        </div>

        <div className="posts">
          <section className="posts-section">
            <h2>
              Recent (
              <Link
                href="/articles"
                legacyBehavior
              >{`${allPostsData.length} articles`}</Link>
              )
            </h2>
            <PostList posts={allPostsData.slice(0, 3)} />
          </section>
          <section className="posts-section">
            <h2>Popular</h2>
            <PostList
              posts={allPostsData.filter((post) =>
                popularPosts.includes(post.id)
              )}
            />
          </section>
        </div>
      </main>
      <footer>
        <Newsletter />
        <div className="powered-by">
          <p>Powered By Vercel, Next.js</p>
        </div>
        <div className="special-thanks">
          Thanks to{" "}
          <a href="https://healeycodes.com/" target="_blank" rel="noreferrer">
            healeycodes.com
          </a>{" "}
          for the website's initial code; I forked it.
        </div>
      </footer>
      <style jsx>{`
        .avatar {
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
