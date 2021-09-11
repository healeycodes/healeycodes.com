import Link from "next/link";
import { getAllTags, getSortedPostsData } from "../lib/posts";
import Layout from "../components/layout";
import PostList from "../components/postList";

export function getStaticProps() {
  return {
    props: { tags: getAllTags(), posts: getSortedPostsData() },
  };
}

export default function Articles({ tags, posts }) {
  const title = `All Posts`;
  const formattedTags = tags.map(
    (tag) => `${tag.charAt(0).toUpperCase()}${tag.slice(1)}`
  );
  return (
    <Layout title={title}>
      <h1>{title}</h1>
      <p>
        Other tags:{" "}
        {formattedTags
          .map((formattedTag, i) => (
            <Link href={`/tags/${tags[i]}`} key={i}>
              {formattedTag}
            </Link>
          ))
          .reduce((prev, curr) => [prev, ", ", curr])}
      </p>
      <PostList posts={posts} />
    </Layout>
  );
}
