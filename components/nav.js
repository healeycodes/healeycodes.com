import siteConfig from "../siteConfig.json";
import Link from "next/link";

export default function Nav() {
  return (
    <nav>
      <ul>
        <li>
          <Link href="/">Home</Link>
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
          <a href="/feed.xml" target="_blank">
            RSS
          </a>
        </li>
      </ul>
    </nav>
  );
}
