import siteConfig from "../siteConfig.json";

import Head from "next/head";

import Nav from "../components/nav";
import codeTheme from "../components/codeTheme";

export default function Layout({ children, title, description }) {
  return (
    <div className="container">
      <Head>
        <title>
          {title} — {siteConfig.AUTHOR_NAME}
        </title>
        <meta name="description" content={description} />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter&display=optional"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto+Mono&display=optional"
          rel="stylesheet"
        />
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
          --link: #0265d5;
          --link-hover: #496495;
          --light-text: #9999b8;
          --border: #b6b6c2;
          --button: #4a7ddd;
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
          margin-bottom: 24px;
          line-height: 24px;
          color: #1d1d27;
        }

        pre,
        code {
          font-family: "Roboto Mono", monospace;
          font-size: 14px;
        }

        code {
          background-color: ${codeTheme.plain.backgroundColor};
          padding: 4px;
        }

        hr {
          border-top: 1px solid var(--border);
          margin-top: 48px;
          margin-bottom: 48px;
        }

        div[class*="language-"],
        div[class*="language-"] {
          line-height: 24px;
          padding-top: 16px;
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
        }

        a:hover {
          color: var(--link-hover);
          text-decoration: none;
        }

        ul {
          list-style-type: square;
        }

        li {
          padding-bottom: 6px;
        }

        blockquote {
          margin-left: 16px;
          border-left-color: var(--border);
          border-left-style: solid;
          border-left-width: 1px;
        }

        blockquote > p {
          padding-left: 16px;
        }
      `}</style>
      <style jsx>{`
        .container {
          margin-left: auto;
          margin-right: auto;
          max-width: 46rem;
          padding-top: 3rem;
          padding-left: 1rem;
          padding-right: 1rem;
          padding-bottom: 6rem;
        }
      `}</style>
    </div>
  );
}
