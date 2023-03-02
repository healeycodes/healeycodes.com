import siteConfig from "../siteConfig.json";

import Head from "next/head";

import Nav from "./nav";
import codeTheme from "./codeTheme";

export default function Layout({ children, title, description }) {
  return (
    <div className="container">
      <Head>
        <title>
          {`${title} — ${siteConfig.AUTHOR_NAME}`}
        </title>
        <meta name="description" content={description} />
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`RSS Feed for ${siteConfig.SITE_URL}`}
          href="/feed.xml"
        />
        <link rel="shortcut icon" href="/favicon.ico" />

        <meta charSet="UTF-8" />

        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />

        <meta property="twitter:card" content="summary" />
        <meta
          property="twitter:site"
          content={`@${siteConfig.AUTHOR_TWITTER}`}
        />
        <meta
          property="twitter:creator"
          content={`@${siteConfig.AUTHOR_TWITTER}`}
        />
        <meta property="twitter:title" content={title} />
        <meta property="twitter:description" content={description} />

        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <Nav />
      {children}
      <style jsx global>{`
        :root {
          --text: #1d1d27;
          --input-background: #fff;
          --link: #0265d5;
          --link-hover: #496495;
          --light-text: #73738b;
          --border: #b6b6c2;
          --button: #4a7ddd;
          --button-text: #fff;
          --aside: #d7d5ce;
        }

        html,
        body {
          padding: 0;
          margin: 0;
          font-family: "Inter", sans-serif;
          font-size: 16px;
          letter-spacing: -0.01em;
        }

        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
          letter-spacing: -0.24px;
          font-weight: 400;
          padding-top: 16px;
          padding-bottom: 16px;
        }

        p {
          margin-top: 20px;
          margin-bottom: 20px;
          line-height: 25px;
          color: var(--text);
        }

        pre,
        code {
          font-family: "Roboto Mono", monospace;
          font-size: 14px;
          border-radius: 0.4em;
        }

        code {
          background-color: ${codeTheme.plain.backgroundColor};
          color: #e3116c;
          padding: 3px;
          border-radius: 0.4em;
        }

        .prism-code {
          border-radius: 0.4em;
        }

        hr {
          border-top: 1px solid var(--border);
          margin-top: 48px;
          margin-bottom: 48px;
        }

        div[class*="language-"],
        div[class*="language-"] {
          line-height: 25px;
          padding-top: 8px;
          padding-left: 8px;
          padding-right: 8px;
          padding-bottom: 16px;
          overflow: overlay;
        }

        * {
          box-sizing: border-box;
        }

        a {
          color: var(--link);
          text-decoration: none;
          word-wrap: break-word;
        }

        a:hover {
          color: var(--link-hover);
          text-decoration: none;
        }

        ul {
          padding-top: 3px;
          padding-bottom: 3px;
          padding-left: 24px;
        }

        li {
          padding-top: 3px;
          padding-bottom: 3px;
          line-height: 25px;
        }

        blockquote {
          color: var(--light-text);
          margin-left: 14px;
          margin-right: 0px;
          border-left-color: var(--border);
          border-left-style: solid;
          border-left-width: 2px;
        }

        blockquote > p {
          color: var(--light-text);
          padding-left: 14px;
        }
      `}</style>
      <style jsx>{`
        .container {
          margin-left: auto;
          margin-right: auto;
          max-width: ${siteConfig.LAYOUT_WIDTH}px;
          padding-top: 32px;
          padding-left: 14px;
          padding-right: 14px;
          padding-bottom: 96px;
        }
      `}</style>
    </div>
  );
}
