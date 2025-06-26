import { onMount, createEffect, onCleanup, createSignal, createMemo } from "solid-js";
import AdContainer from "./AdContainer.jsx";
import { shouldLoadAds, loadAdSenseScript } from "../lib/adsense.js";

const pubId = import.meta.env.PUBLIC_ADSENSE_PUB_ID ? `ca-${import.meta.env.PUBLIC_ADSENSE_PUB_ID}` : null;

function track(event, props = {}) {
    if (window.posthog) posthog.capture(event, props);
}

export default function AdSenseAd(props) {
    let ref = null;
    let initialized = false;
    let pushStatus = "NOT_STARTED";

    const [adKey, setAdKey] = createSignal(Math.random().toString(36).slice(2));

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
                    track("ad pushed");
                    startVisibilityTracking();
                } catch (e) {
                    console.error("AdsbyGoogle push error:", e);
                    track("ad push failed", { error: String(e) });
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

    let visibilityTimer = null;
    let visibleAccumulated = 0;
    let visibleStartTime = null;

    function rotateAd(elapsed) {
        if (props.isHidden) return;

        track("ad rotated", { totalVisibleTime: elapsed });

        visibleStartTime = null;
        visibleAccumulated = 0;
        pushStatus = "NOT_STARTED";
        setAdKey(Math.random().toString(36).slice(2));
        setTimeout(pushAd, 10);
    }

    function startVisibilityTracking() {
        if (visibilityTimer || props.isHidden) return;

        if (!visibleStartTime) {
            visibleStartTime = Date.now(); // only start if not already tracking
        }

        track("ad visibility started");

        function checkVisibility() {
            if (props.isHidden) {
                // accumulate visible time so far
                if (visibleStartTime) {
                    visibleAccumulated += (Date.now() - visibleStartTime) / 1000;
                    visibleStartTime = null;
                }
                visibilityTimer = null;
                track("ad visibility paused", { totalSoFar: visibleAccumulated });
                return;
            }

            const elapsed = visibleAccumulated + (Date.now() - visibleStartTime) / 1000;

            if (elapsed >= 180) {
                rotateAd(elapsed);
            } else {
                visibilityTimer = setTimeout(checkVisibility, 1000);
            }
        }

        visibilityTimer = setTimeout(checkVisibility, 1000);
    }

    function stopVisibilityTracking() {
        if (visibleStartTime) {
            visibleAccumulated += (Date.now() - visibleStartTime) / 1000;
            visibleStartTime = null;
        }

        clearTimeout(visibilityTimer);
        visibilityTimer = null;

        track("ad visibility stopped", { totalVisibleTime: visibleAccumulated });
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
                        track("ad loaded");
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
                        track("ad loaded");
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
        if (!props.isHidden && initialized && ref && pushStatus === "NOT_STARTED") {
            pushAd();
            startVisibilityTracking();
        } else if (props.isHidden) {
            stopVisibilityTracking();
        }
    });

    onCleanup(() => {
        stopVisibilityTracking();
    });

    const adNode = createMemo(() => {
        const key = adKey();
        return (
            <ins
                data-key={key}
                ref={(el) => (ref = el)}
                class="adsbygoogle"
                style="display:block"
                data-ad-client={pubId}
                data-ad-slot="1459633275"
                data-ad-format="fluid"
                data-full-width-responsive="false"
            ></ins>
        );
    });

    return pubId ? (
        <AdContainer isHidden={props.isHidden}>{adNode()}</AdContainer>
    ) : (
        <BlankAd isHidden={props.isHidden} />
    );
}

function BlankAd(props) {
    return (
        <AdContainer isHidden={props.isHidden}>
            <div class="w-[336px] h-[220px] border border-red-foreground"></div>
        </AdContainer>
    );
}
