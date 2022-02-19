import { GCScript } from "../components/gcScript";

function App({ Component, pageProps }) {

    return <>
        <GCScript siteUrl={"https://healeycodes.goatcounter.com/count"} />
        <Component {...pageProps} />
    </>
}

export default App