import { onMount } from "solid-js";
import AdContainer from "./AdContainer.jsx";

const pubId = import.meta.env.PUBLIC_ADSENSE_PUB_ID ? `ca-${import.meta.env.PUBLIC_ADSENSE_PUB_ID}` : null;

export default function AdSenseAd(props) {
    let ref = null;
    onMount(() => {
        if (!pubId) return;

        const existingScript = document.querySelector(`script[src*="adsbygoogle.js?client=${pubId}"]`);

        let retries = 0;
        function pushAd() {
            if (ref && ref.offsetWidth > 0) {
                try {
                    (window.adsbygoogle = window.adsbygoogle || []).push({});
                } catch (e) {
                    console.error("AdsbyGoogle push error:", e);
                }
            } else if (retries < 10) {
                retries++;
                setTimeout(pushAd, 500);
            } else {
                console.warn("AdSense container never became visible.");
            }
        }

        if (!existingScript) {
            const script = document.createElement("script");
            script.async = true;
            script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pubId}`;
            script.crossOrigin = "anonymous";
            script.onload = pushAd;
            document.head.appendChild(script);
        } else {
            pushAd();
        }
    });

    return pubId ? (
        <AdContainer isHidden={props.isHidden}>
            <ins
                ref={(el) => (ref = el)}
                class="adsbygoogle"
                style="display:block"
                data-ad-client={pubId}
                data-ad-slot="1459633275"
                data-ad-format="fluid"
                data-full-width-responsive="false"
            ></ins>
        </AdContainer>
    ) : null;
}
