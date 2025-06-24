import { onMount } from "solid-js";
import AdContainer from "./AdContainer.jsx";

const pubId = import.meta.env.PUBLIC_ADSENSE_PUB_ID ? `ca-${import.meta.env.PUBLIC_ADSENSE_PUB_ID}` : null;

export default function AdSenseAd(props) {
    onMount(() => {
        if (!pubId) return;

        const existingScript = document.querySelector(`script[src*="adsbygoogle.js?client=${pubId}"]`);

        function pushAd() {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (e) {
                console.error("AdsbyGoogle push error:", e);
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
                class="adsbygoogle"
                style="display:block"
                data-ad-client={pubId}
                data-ad-slot="1459633275"
                data-ad-format="auto"
                data-full-width-responsive="true"
            ></ins>
        </AdContainer>
    ) : null;
}
