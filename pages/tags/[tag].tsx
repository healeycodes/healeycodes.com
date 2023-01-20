import Link from "next/link";
import { getAllTags, getPostsFilteredByTag } from "../../lib/posts";
import Layout from "../../components/layout";
import PostList from "../../components/postList";
import { formatTag } from "../../lib/util";

export function getStaticPaths() {
  const tags = getAllTags();
  const paths = tags.map((tag) => ({
    params: { tag: tag },
  }));

  return { paths, fallback: false };
}

export function getStaticProps({ params }) {
  return {
    props: {
      otherTags: getAllTags().filter((tag) => tag !== params.tag),
      tag: params.tag,
      posts: getPostsFilteredByTag(params.tag),
    },
  };
}

export default function TagList({ otherTags, tag, posts }) {
  const formattedTag = formatTag(tag)
  const formattedTags = otherTags.map(
    (tag) => formatTag(tag)
  );
  const title = `${formattedTag} posts`;
  return (
    <Layout title={title} description={`All posts tagged with ${formattedTag}`}>
      <h1 className="tag-desc">{title}</h1>
      <main>
        <p className="other-tags">
          Other tags:{" "}
          {formattedTags
            .map((formattedTag, i) => (
              <Link href={`/tags/${otherTags[i]}`} key={i} legacyBehavior>
                {formattedTag}
              </Link>
            ))
            .reduce((prev, curr) => [prev, ", ", curr])}{" "}
          or <Link href="/articles" legacyBehavior>all articles</Link>.
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
