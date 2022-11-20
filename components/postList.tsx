import Link from "next/link";
import { formatTag } from "../lib/util";
import Date from "./date";

export default function PostList({ posts, hideTags }) {
  return (
    <div>
      {posts.map(({ id, description, date, title, tags }) => (
        <div className="post" key={id}>
          <Link href={`/${id}`}>
            <a>{title}</a>
          </Link>
          <p className="post-desc">{description}</p>
          <p className="post-date">
            <Date dateString={date} /> {!hideTags && <>in <Link href={`/tags/${tags[0]}`}>{formatTag(tags[0])}</Link></>}
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
          color: var(--light-text);
        }
      `}</style>
    </div>
  );
}
