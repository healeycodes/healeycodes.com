import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <link
            rel="preload"
            href="https://fonts.googleapis.com/css2?family=Inter&display=swap"
            as="font"
          />
          <link
            rel="preload"
            href="https://fonts.googleapis.com/css2?family=Roboto+Mono&display=swap"
            as="font"
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
