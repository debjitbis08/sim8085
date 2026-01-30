import { createSignal, onCleanup, onMount } from "solid-js";
import LambdaClassesPoster from "./LambdaClassesPoster.jsx";
import AdSenseAd from "./AdSenseAd.jsx";

export default function AdSwitcher(props) {
    const [showPoster, setShowPoster] = createSignal(false);

    function updateFromCountry(country) {
        setShowPoster((country || "").toUpperCase() === "IN");
    }

    onMount(() => {
        const cached = localStorage.getItem("user_country");
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
        <LambdaClassesPoster isHidden={props.isHidden} />
    ) : (
        <AdSenseAd isHidden={props.isHidden} />
    );
}
