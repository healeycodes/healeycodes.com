import siteConfig from "../siteConfig.json";

import Link from "next/link";

export default function Nav() {
  return (
    <nav>
      <ul>
        <li>
          <Link href="/" legacyBehavior>{siteConfig.AUTHOR_NAME}</Link>
        </li>
        <li>
          <Link href="/articles" legacyBehavior>Articles</Link>
        </li>
        {/* <li>
          <Link href="/projects" legacyBehavior>Projects</Link>
        </li> */}
        {/* <li>
          <Link href="/notes" legacyBehavior>Notes</Link>
        </li> */}
        <li>
          <Link href="/about" legacyBehavior>About</Link>
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
          padding-right: 16px;
        }
      `}</style>
    </nav>
  );
}
