import { createSignal, onCleanup, onMount } from "solid-js";
import DirectAd from "./DirectAd.jsx";
import AdSenseAd from "./AdSenseAd.jsx";
import { DIRECT_ADS } from "../config/directAds.js";

export default function AdSwitcher(props) {
    const [showPoster, setShowPoster] = createSignal(isIndia(getCachedCountry()));

    function updateFromCountry(country) {
        setShowPoster(isIndia(country));
    }

    onMount(() => {
        const cached = getCachedCountry();
        if (cached) updateFromCountry(cached);

        const handler = (e) => {
            const { country } = e.detail || {};
            if (!country) return;
            localStorage.setItem("user_country", country);
            updateFromCountry(country);
        };

        window.addEventListener("adsConsentGiven", handler);

        if (!cached) {
            fetch("/api/location/")
                .then((res) => res.json())
                .then((data) => {
                    if (!data?.country) return;
                    localStorage.setItem("user_country", data.country);
                    updateFromCountry(data.country);
                })
                .catch(() => {});
        }

        onCleanup(() => {
            window.removeEventListener("adsConsentGiven", handler);
        });
    });

    return showPoster() ? (
        <DirectAd isHidden={props.isHidden} ad={DIRECT_ADS.lambdaClasses} />
    ) : (
        <AdSenseAd isHidden={props.isHidden} />
    );
}

function normalizeCountry(country) {
    return String(country || "").trim().replace(/^"+|"+$/g, "").toUpperCase();
}

function isIndia(country) {
    return normalizeCountry(country) === "IN";
}

function getCachedCountry() {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("user_country") || "";
}
