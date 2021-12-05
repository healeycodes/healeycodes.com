import Head from 'next/head';
import Link from "next/link";
import Script from 'next/script'
import { getAllTags, getSortedPostsData } from "../lib/posts";
import Layout from "../components/layout";
import PostList from "../components/postList";

export function getStaticProps() {
  return {
    props: { tags: getAllTags(), posts: getSortedPostsData() },
  };
}

export default function Articles({ tags, posts }) {
  const title = `Articles`;
  const formattedTags = tags.map(
    (tag) => `${tag.charAt(0).toUpperCase()}${tag.slice(1)}`
  );
  return (
    <Layout title={title} description="A list of every article I've written.">
      <Head>
        <link rel="stylesheet" href="https://files.stork-search.net/basic.css" />
      </Head>
      <h1 className="tag-desc">{title}</h1>
      <main>
        <p className="other-tags">
          Other tags:{" "}
          {formattedTags
            .map((formattedTag, i) => (
              <Link href={`/tags/${tags[i]}`} key={i}>
                {formattedTag}
              </Link>
            ))
            .reduce((prev, curr) => [prev, ", ", curr])}
        </p>
        <div className="stork">
          <div className="stork-wrapper">
            <input placeholder="Search all posts.." data-stork="posts" className="stork-input" />
            <div data-stork="posts-output" className="stork-output"></div>
          </div>
        </div>
        <Script
          src="https://files.stork-search.net/stork.js"
          onLoad={() => {
            // @ts-ignore
            window.stork.register(
              'posts',
              'stork-posts.st'
            );
            let elem: HTMLElement = document.querySelector('.stork')
            if (elem) {
              elem.style.visibility = 'visible'
            }
          }}
        />
        <PostList posts={posts} />
      </main>
      <style jsx>{`
        .tag-desc {
          margin-bottom: 0px;
          padding-bottom: 0px;
        }
        .other-tags {
          margin-top: 0px;
          color: var(--light-text);
          padding-bottom: 24px;
        }
        .stork {
          padding-bottom: 48px;
          visibility: hidden;
        }
      `}</style>

      {/* Ensure we don't show empty space for users without JS */}
      <noscript>
        <style>{`
          .stork {
            display: none;
          }`}
        </style>
      </noscript>
    </Layout>
  );
}
