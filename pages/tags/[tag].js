import Link from "next/link";
import { getAllTags, getPostsFilteredByTag } from "../../lib/posts";
import Layout from "../../components/layout";
import PostList from "../../components/postList";

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
  const title = `${tag.charAt(0).toUpperCase()}${tag.slice(1)} posts`;
  const formattedTags = otherTags.map(
    (tag) => `${tag.charAt(0).toUpperCase()}${tag.slice(1)}`
  );
  return (
    <Layout title={title}>
      <h1>{title}</h1>
      <p>
        Other tags:{" "}
        {formattedTags
          .map((formattedTag, i) => (
            <Link href={`/tags/${otherTags[i]}`} key={i}>
              {formattedTag}
            </Link>
          ))
          .reduce((prev, curr) => [prev, ", ", curr])}{" "}
        or <Link href="/articles">all articles</Link>.
      </p>
      <PostList posts={posts} />
    </Layout>
  );
}
