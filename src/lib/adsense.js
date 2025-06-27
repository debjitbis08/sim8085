const EEA_COUNTRIES = [
    "AT",
    "BE",
    "BG",
    "HR",
    "CY",
    "CZ",
    "DK",
    "EE",
    "FI",
    "FR",
    "DE",
    "GR",
    "HU",
    "IS",
    "IE",
    "IT",
    "LV",
    "LI",
    "LT",
    "LU",
    "MT",
    "NL",
    "NO",
    "PL",
    "PT",
    "RO",
    "SK",
    "SI",
    "ES",
    "SE",
    "CH",
    "GB",
];

export function isEEACountry(code) {
    return EEA_COUNTRIES.includes((code || "").toUpperCase());
}

export function shouldLoadAds(country, consent) {
    if (country == null) return false;

    if (!isEEACountry(country)) return true; // Non-EEA — always load

    return consent === "yes"; // EEA — require explicit consent
}

export function loadAdSenseScript(pubId, { onLoad } = {}) {
    if (!pubId) return;

    const existing = document.querySelector(`script[src*="adsbygoogle.js?client=${pubId}"]`);

    console.log("Existing script", existing);

    if (existing?.hasAttribute("data-loaded")) {
        console.log("Adsense script already loaded. Calling onLoad");
        onLoad?.();
        return;
    }

    if (existing) {
        existing.addEventListener("load", () => {
            existing.setAttribute("data-loaded", "true");
            onLoad?.();
        });
        return;
    }

    const s = document.createElement("script");
    s.async = true;
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pubId}`;
    s.crossOrigin = "anonymous";
    s.onload = () => {
        s.setAttribute("data-loaded", "true");
        onLoad?.();
    };
    document.head.appendChild(s);
}
