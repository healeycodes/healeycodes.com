import Link from "next/link";
import Date from "../components/date";

export default function PostList({ posts }) {
  return (
    <ul>
      {posts.map(({ id, description, date, title, tags }) => (
        <li key={id}>
          <Link href={`/${id}`}>
            <a>{title}</a>
          </Link>
          <p>{description}</p>
          <small>
            <Date dateString={date} /> in{" "}
            <Link href={`/tags/${tags[0]}`}>{`${tags[0]
              .charAt(0)
              .toUpperCase()}${tags[0].slice(1)}`}</Link>
          </small>
        </li>
      ))}
    </ul>
  );
}
