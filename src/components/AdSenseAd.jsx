import { onMount, createEffect, onCleanup, createSignal, createMemo } from "solid-js";
import AdContainer from "./AdContainer.jsx";
import { shouldLoadAds, loadAdSenseScript } from "../lib/adsense.js";
import classes from "./AdSenseAd.module.css";

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

    let visibleAccumulated = 0;
    let visibleStartTime = null;

    function handleVisibilityChange() {
        if (document.visibilityState === "hidden" && visibleStartTime) {
            // Document became hidden — accumulate time
            visibleAccumulated += (Date.now() - visibleStartTime) / 1000;
            visibleStartTime = null;
            track("ad visibility paused (document hidden)", { totalSoFar: visibleAccumulated });
        } else if (document.visibilityState === "visible" && !props.isHidden) {
            // Document came back into view — resume
            visibleStartTime = Date.now();
            track("ad visibility resumed (document visible)");
        }
    }

    onMount(() => {
        if (!pubId) return;

        document.addEventListener("visibilitychange", handleVisibilityChange);

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

    let rotationCount = 0;
    const MAX_ROTATIONS = 6;

    function rotateAd(elapsed) {
        if (props.isHidden) return;

        if (rotationCount >= MAX_ROTATIONS) {
            console.warn("Ad rotation limit reached. Skipping.");
            track("ad rotation skipped", { reason: "limit", totalVisibleTime: elapsed });
            return;
        }

        rotationCount++;

        track("ad rotated", { totalVisibleTime: elapsed });

        visibleStartTime = null;
        visibleAccumulated = 0;
        pushStatus = "NOT_STARTED";
        ref = null;
        setAdKey(Math.random().toString(36).slice(2));
        setTimeout(pushAd, 10);
    }

    let prevHidden = props.isHidden;

    createEffect(() => {
        const nowHidden = props.isHidden;

        if (prevHidden && !nowHidden) {
            // User just showed the ad panel

            track("ad visibility started");

            const now = Date.now();

            // Accumulate time from last session
            if (visibleStartTime) {
                visibleAccumulated += (now - visibleStartTime) / 1000;
            }

            if (visibleAccumulated >= 180) {
                rotateAd(visibleAccumulated);
            }

            visibleStartTime = now;

            if (initialized && ref && pushStatus === "NOT_STARTED") {
                pushAd();
            }
        }

        if (!prevHidden && nowHidden) {
            // Ad panel just got hidden

            if (visibleStartTime) {
                visibleAccumulated += (Date.now() - visibleStartTime) / 1000;
                visibleStartTime = null;
            }

            track("ad visibility paused", { totalSoFar: visibleAccumulated });
        }

        prevHidden = nowHidden;
    });

    onCleanup(() => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
    });

    const adNode = createMemo(() => {
        const key = adKey();
        return (
            <ins
                data-key={key}
                ref={(el) => (ref = el)}
                class={`adsbygoogle self-center ${classes.bottomRightSlot}`}
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
            <div class={`w-[336px] h-[250px] border border-red-foreground self-center`}></div>
        </AdContainer>
    );
}
