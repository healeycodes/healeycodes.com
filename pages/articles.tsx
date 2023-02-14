import { getAllTags, getSortedPostsData } from "../lib/posts";
import Layout from "../components/layout";
import PostList from "../components/postList";

export function getStaticProps() {
  return {
    props: { tags: getAllTags(), posts: getSortedPostsData() },
  };
}

// TODO: delete all tags code
export default function Articles({ tags, posts }) {
  const title = `Articles`;
  return (
    <Layout title={title} description="A list of every article I've written.">
      <h1>{title}</h1>
      <main>
        <p className="articles-intro">Here's a chronological list of all the posts on this website.
          A star means that I thought the post was pretty neat (or, that a lot of other people thought it was pretty neat).
        </p>
        <PostList posts={posts} showYears={true} />
      </main>
      <style jsx>{`
        .articles-intro {
          padding-bottom: 24px;
        }
      `}</style>
    </Layout>
  );
}
