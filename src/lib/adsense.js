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
    // Unknown country — fall back to requiring consent.
    if (!country) return consent === "yes";

    if (!isEEACountry(country)) return true; // Non-EEA — always load

    return consent === "yes"; // EEA — require explicit consent
}

const COUNTRY_KEY = "user_country";

let countryPromise = null;

// Resolves the visitor's country, caching it in localStorage. Callers must
// await this before calling shouldLoadAds — on a first visit nothing is cached
// yet, and reading localStorage synchronously would look like "no country".
export function getCountry() {
    const cached = localStorage.getItem(COUNTRY_KEY);
    if (cached) return Promise.resolve(cached);

    countryPromise ||= fetch("/api/location/")
        .then((res) => res.json())
        .then((data) => {
            const country = data.country || "";
            if (country) localStorage.setItem(COUNTRY_KEY, country);
            return country;
        })
        .catch(() => "");

    return countryPromise;
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
