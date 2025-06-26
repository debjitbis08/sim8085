import { onMount, createEffect } from "solid-js";
import AdContainer from "./AdContainer.jsx";
import { shouldLoadAds, loadAdSenseScript } from "../lib/adsense.js";

const pubId = import.meta.env.PUBLIC_ADSENSE_PUB_ID ? `ca-${import.meta.env.PUBLIC_ADSENSE_PUB_ID}` : null;

export default function AdSenseAd(props) {
    let ref = null;
    let initialized = false;
    let pushStatus = "NOT_STARTED";

    function pushAd() {
        if (props.isHidden && pushStatus !== "NOT_STARTED") return;

        pushStatus = "STARTED";
        let retries = 0;

        function tryPush() {
            if (!ref) {
                if (retries < 10) {
                    retries++;
                    setTimeout(tryPush, 200);
                } else {
                    console.warn("Ref not set after retries");
                    pushStatus = "NOT_STARTED";
                }
                return;
            }

            if (props.isHidden) {
                pushStatus = "NOT_STARTED";
                return;
            }

            if (ref.offsetWidth > 0) {
                try {
                    (window.adsbygoogle = window.adsbygoogle || []).push({});
                    pushStatus = "SUCCESS";
                    console.log("Push Ad Success");
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

        const country = localStorage.getItem("user_country");
        const consent = localStorage.getItem("cookie_consent");
        const shouldLoad = shouldLoadAds(country, consent);

        // For non EEA countries and cached consent
        if (shouldLoad) {
            loadAdSenseScript(pubId, {
                onLoad: () => {
                    setTimeout(() => {
                        console.log("Ref in onLoad", ref);
                        initialized = true;
                        if (!props.isHidden) pushAd();
                    });
                },
            });
        } else {
            // For EEA countries wait for fresh consent when not provided earlier
            const handler = (e) => {
                const { consent } = e.detail || {};
                if (consent !== "yes") return;

                loadAdSenseScript(pubId, {
                    onLoad: () => {
                        initialized = true;
                        if (!props.isHidden) pushAd();
                    },
                });

                window.removeEventListener("adsConsentGiven", handler);
            };

            window.addEventListener("adsConsentGiven", handler);
        }
    });

    createEffect(() => {
        if (!props.isHidden && initialized && ref && pushStatus == "NOT_STARTED") {
            pushAd();
        }
    });

    return pubId ? (
        <AdContainer isHidden={props.isHidden}>
            <ins
                ref={ref}
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
