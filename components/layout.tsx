import siteConfig from "../siteConfig.json";

import Head from "next/head";

import Nav from "./nav";
import codeTheme from "./codeTheme";

export default function Layout({ children, title, description }) {
  return (
    <div className="container">
      <Head>
        <script
          data-goatcounter={`https://${siteConfig.GOAT_COUNTER}.goatcounter.com/count`}
          async
          src="//gc.zgo.at/count.js"
        />

        <title>
          {title} — {siteConfig.AUTHOR_NAME}
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
        html,
        body {
          font-family: "Inter", -apple-system, BlinkMacSystemFont, avenir, helvetica, helvetica neue, ubuntu, roboto, noto, segoe ui, arial, sans-serif;
          font-size: 16px;
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
          margin-bottom: 24px;
          line-height: 24px;
        }

        hr {
          margin-top: 48px;
          margin-bottom: 48px;
        }

        div[class*="language-"],
        div[class*="language-"] {
          line-height: 24px;
          padding-top: 8px;
          padding-left: 8px;
          padding-right: 8px;
          padding-bottom: 16px;
          overflow: overlay;
        }

        a {
          text-decoration: none;
        }

        a:hover {
          text-decoration: none;
        }

        li {
          padding-bottom: 6px;
          line-height: 24px;
        }
      `}</style>
      <style jsx>{`
        .container {
          margin-left: auto;
          margin-right: auto;
          max-width: ${siteConfig.LAYOUT_WIDTH}px;
          padding-top: 32px;
          padding-left: 16px;
          padding-right: 16px;
          padding-bottom: 96px;
        }
      `}</style>
    </div>
  );
}
