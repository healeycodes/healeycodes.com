import Link from "next/link";
import Date from "./date";

export default function PostList({ posts }) {
  return (
    <div>
      {posts.map(({ id, description, date, title, tags }) => (
        <div className="post" key={id}>
          <Link href={`/${id}`}>
            <a>{title}</a>
          </Link>
          <p className="post-desc">{description}</p>
          <p className="post-date">
            <Date dateString={date} /> in{" "}
            <Link href={`/tags/${tags[0]}`}>{`${tags[0]
              .charAt(0)
              .toUpperCase()}${tags[0].slice(1)}`}</Link>
          </p>
        </div>
      ))}
      <style jsx>{`
        .post {
          padding-bottom: 20px;
        }
        .post-desc {
          margin-top: 4px;
          margin-bottom: 0px;
        }
        .post-date {
          margin-top: 0px;
        }
      `}</style>
    </div>
  );
}
