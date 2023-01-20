import { GCScript } from "../components/gcScript";
import { Analytics } from '@vercel/analytics/react';

function MyApp({ Component, pageProps }) {

    return <>
        <Analytics />
        <GCScript siteUrl={"https://healeycodes.goatcounter.com/count"} />
        <Component {...pageProps} />
    </>
}

export default MyApp