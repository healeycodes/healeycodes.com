import siteConfig from "../siteConfig.json";
import Head from "next/head";
import Nav from "../components/nav";

export default function Layout({ children, title, description }) {
  return (
    <div className="container">
      <Head>
        <title>
          {title} — {siteConfig.AUTHOR_NAME}
        </title>
        <meta name="description" content={description} />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono&display=swap"
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
          --text: #0265d5;
          --light-text: #9999b8;
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
          font-weight: 400;
          padding-top: 16px;
          padding-bottom: 16px;
        }

        p {
          line-height: 24px;
          color: #1d1d27;
        }

        pre,
        code {
          font-family: "JetBrains Mono", monospace;
          font-size: 14px;
        }

        hr {
          margin-top: 32px;
          margin-bottom: 32px;
        }

        div[class*="language-"],
        div[class*="language-"] {
          line-height: 24px;
          padding: 8px;
          overflow: overlay;
        }

        * {
          box-sizing: border-box;
        }

        a {
          color: var(--text);
          text-decoration: none;
        }

        a:hover {
          text-decoration: underline;
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
