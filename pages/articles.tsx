import Link from "next/link";
import { getAllTags, getSortedPostsData } from "../lib/posts";
import Layout from "../components/layout";
import PostList from "../components/postList";
import { formatTag } from "../lib/util";

export function getStaticProps() {
  return {
    props: { tags: getAllTags(), posts: getSortedPostsData() },
  };
}

export default function Articles({ tags, posts }) {
  const title = `All posts`;
  const formattedTags = tags.map(
    (tag) => formatTag(tag)
  );
  return (
    <Layout title={title} description="A list of every article I've written.">
      <h1 className="tag-desc">{title}</h1>
      <main>
        <p className="other-tags">
          Other tags:{" "}
          {formattedTags
            .map((formattedTag, i) => (
              <Link href={`/tags/${tags[i]}`} key={i} legacyBehavior>
                {formattedTag}
              </Link>
            ))
            .reduce((prev, curr) => [prev, ", ", curr])}
        </p>
        <PostList posts={posts} hideTags={false} />
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
      `}</style>
    </Layout>
  );
}
