import { onMount, createEffect } from "solid-js";
import AdContainer from "./AdContainer.jsx";

const pubId = import.meta.env.PUBLIC_ADSENSE_PUB_ID ? `ca-${import.meta.env.PUBLIC_ADSENSE_PUB_ID}` : null;

export default function AdSenseAd(props) {
    let ref = null;
    let initialized = false;
    let pushStatus = "NOT_STARTED";

    function pushAd() {
        if (!ref || props.isHidden || pushStatus !== "NOT_STARTED") return;

        pushStatus = "STARTED";
        let retries = 0;
        function tryPush() {
            if (ref.offsetWidth > 0) {
                try {
                    (window.adsbygoogle = window.adsbygoogle || []).push({});
                    pushStatus = "SUCCESS";
                } catch (e) {
                    console.error("AdsbyGoogle push error:", e);
                    pushStatus = "NOT_STARTED";
                }
            } else if (retries < 10) {
                retries++;
                setTimeout(tryPush, 500);
            } else {
                console.warn("AdSense container never became visible.");
                pushStatus = "NOT_STARTED";
            }
        }

        tryPush();
    }

    onMount(() => {
        if (!pubId) return;

        function loadScript() {
            const existingScript = document.querySelector(`script[src*="adsbygoogle.js?client=${pubId}"]`);
            if (!existingScript) {
                const script = document.createElement("script");
                script.async = true;
                script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pubId}`;
                script.crossOrigin = "anonymous";
                script.onload = () => {
                    initialized = true;
                    if (!props.isHidden) pushAd();
                };
                document.head.appendChild(script);
            } else {
                initialized = true;
                if (!props.isHidden) pushAd();
            }
        }

        const country = localStorage.getItem("user_country");
        const consent = localStorage.getItem("cookie_consent");
        const shouldLoad = country && consent && (!isEEACountry(country) || consent === "yes");

        if (shouldLoad) {
            loadScript();
        } else {
            const handler = (e) => {
                const detail = e.detail || {};
                if (!detail.country || !detail.consent) return;
                if (!isEEACountry(detail.country) || detail.consent === "yes") {
                    loadScript();
                    window.removeEventListener("adsConsentGiven", handler);
                }
            };
            window.addEventListener("adsConsentGiven", handler);
        }
    });

    createEffect(() => {
        if (!props.isHidden && initialized) {
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
