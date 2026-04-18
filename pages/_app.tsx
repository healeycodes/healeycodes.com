import { GCScript } from "../components/gcScript";
import { Analytics } from "@vercel/analytics/next";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
      <GCScript siteUrl={"https://healeycodes.goatcounter.com/count"} />
    </>
  );
}

export default MyApp;
