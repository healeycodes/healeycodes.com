import siteConfig from "../siteConfig.json";

import Layout from "../components/layout";

export default function Custom404() {
  return (
    <Layout title="404" description="">
      <h1>404 - Page Not Found</h1>
      <p>Could you please let me know how you found this page?</p>
      <p>{siteConfig.AUTHOR_EMAIL}</p>
    </Layout>
  );
}
