import { useRouter } from "next/router";
import { useEffect } from "react";
import Script from "next/script";


// Almost a direct copy of https://github.com/haideralipunjabi/next-goatcounter
export function GCScript({ siteUrl, scriptSrc = "//gc.zgo.at/count.js" }) {
    const router = useRouter();
    useEffect(() => {
        const handleRouteChange = (url) => {
            // @ts-ignore
            if (!window.goatcounter) return;
            // @ts-ignore
            window.goatcounter.count({
                path: url.slice(1),
                event: false,
            });
        };
        router.events.on("routeChangeComplete", handleRouteChange);
        return () => {
            router.events.off("routeChangeComplete", handleRouteChange);
        };
    }, [router.events]);
    return (
        <Script
            data-goatcounter={siteUrl}
            src={scriptSrc}
            strategy="afterInteractive"
        />
    );
}