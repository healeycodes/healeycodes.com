import siteConfig from "../siteConfig.json";
import Link from "next/link";

export default function Nav() {
  return (
    <nav>
      <ul>
        <li>
          <Link href="/">{siteConfig.AUTHOR_NAME}</Link>
        </li>
        <li>
          <Link href="/articles">Articles</Link>
        </li>
        <li>
          <Link href="/projects">Projects</Link>
        </li>
        <li>
          <Link href="/about">About</Link>
        </li>
        <li>
          <a
            href={`https://github.com/${siteConfig.AUTHOR_GITHUB}`}
            target="_blank"
          >
            GitHub
          </a>
        </li>
        <li>
          <a
            href={`https://twitter.com/${siteConfig.AUTHOR_TWITTER}`}
            target="_blank"
          >
            Twitter
          </a>
        </li>
        <li>
          <a href="/feed.xml">RSS</a>
        </li>
      </ul>
      <style jsx>{`
        ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-wrap: wrap;
        }
        li {
          padding-top: 16px;
          padding-right: 16px;
        }
      `}</style>
    </nav>
  );
}
